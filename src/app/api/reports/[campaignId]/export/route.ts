import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
import { requireAdmin } from '@/lib/auth/helpers';
import {
  calculateCategoryScores,
  prepareResponsesForScoring,
} from '@/lib/scoring/categoryScoring';
import { checkAnonymityThreshold } from '@/lib/scoring/anonymity';
// ExcelJS, jsPDF, and jspdf-autotable are imported dynamically inside the handler
// to prevent Next.js from loading these heavy libraries during the build
// page-data collection phase, which would cause worker timeouts.

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';

    if (format !== 'xlsx' && format !== 'pdf') {
      return NextResponse.json(
        { error: 'Invalid format. Use xlsx or pdf.' },
        { status: 400 }
      );
    }

    // Fetch campaign with all anonymous response data
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.campaignId },
      include: {
        organization: true,
        anonymousResponses: {
          where: { completedAt: { not: null }, flaggedForReview: false },
          include: {
            responses: {
              orderBy: { questionNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Fetch survey with full question and category data
    let survey;
    try {
      survey = await getSurveyById(campaign.surveyId);
    } catch (fetchError) {
      console.error('[export] Survey fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Survey content could not be loaded.' },
        { status: 503 }
      );
    }

    if (!survey || !survey.scale) {
      return NextResponse.json(
        { error: 'Survey content not found or incomplete' },
        { status: 404 }
      );
    }

    // Check anonymity threshold
    const meetsThreshold = await checkAnonymityThreshold(
      campaign.id,
      survey.surveyType
    );

    if (!meetsThreshold) {
      return NextResponse.json(
        {
          error: 'Insufficient respondents',
          message:
            'This survey requires a minimum of 5 completed responses before exporting results.',
        },
        { status: 403 }
      );
    }

    // Extract questions with full metadata
    const questions = survey.sections.flatMap((section) =>
      section.questions.map((q) => ({
        _id: q._id,
        number: q.number,
        text: q.text,
        isReversed: q.isReversed,
        category: {
          _id: q.category._id,
          _type: 'category' as const,
          name: q.category.name,
          weight: q.category.weight,
          colorCode: q.category.colorCode,
          sortOrder: q.category.sortOrder,
        },
        section: { _id: section._id, title: section.title },
      }))
    );

    // Extract unique categories
    const categoriesMap = new Map(
      questions.map((q) => [q.category._id, q.category])
    );
    const categories = Array.from(categoriesMap.values()).sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });

    // Build a set of valid question IDs from the current survey definition
    const validQuestionIds = new Set(questions.map((q) => q._id));

    // Calculate weighted scores for each anonymous respondent
    const individualResults = campaign.anonymousResponses.map(
      (anonResponse, index) => {
        const preparedResponses = prepareResponsesForScoring(
          anonResponse.responses
            .filter(
              (r) => r.value !== null && validQuestionIds.has(r.questionId)
            )
            .map((r) => ({
              questionId: r.questionId,
              questionNumber: r.questionNumber,
              value: r.value!,
            })),
          questions
        );

        const scoringResult = calculateCategoryScores(
          preparedResponses,
          categories,
          survey._id,
          survey.title,
          anonResponse.id,
          survey.scale!.min,
          survey.scale!.max,
          survey.surveyType as 'likert3' | 'likert5'
        );

        return {
          respondentLabel: `Respondent ${index + 1}`,
          ...scoringResult,
        };
      }
    );

    // Calculate aggregate statistics
    const aggregateStats = categories.map((category) => {
      const categoryScores = individualResults
        .map((result) =>
          result.categoryScores.find((cs) => cs.categoryId === category._id)
        )
        .filter((cs) => cs !== undefined);

      if (categoryScores.length === 0) {
        return {
          categoryName: category.name,
          categoryWeight: category.weight,
          questionCount: 0,
          respondentCount: 0,
          averageWeightedScore: 0,
          averageRawScore: 0,
          minWeightedScore: 0,
          maxWeightedScore: 0,
          standardDeviation: 0,
          averagePercentage: 0,
        };
      }

      const weightedScores = categoryScores.map((cs) => cs!.weightedScore);
      const rawScores = categoryScores.map((cs) => cs!.rawTotal);

      const averageWeighted =
        weightedScores.reduce((sum, score) => sum + score, 0) /
        weightedScores.length;
      const averageRaw =
        rawScores.reduce((sum, score) => sum + score, 0) / rawScores.length;

      const mean = averageWeighted;
      const squaredDiffs = weightedScores.map((score) =>
        Math.pow(score - mean, 2)
      );
      const variance =
        squaredDiffs.reduce((sum, diff) => sum + diff, 0) /
        weightedScores.length;
      const stdDev = Math.sqrt(variance);

      const maxPossibleWeighted = categoryScores[0]?.maxPossibleWeighted || 1;

      return {
        categoryName: category.name,
        categoryWeight: category.weight,
        questionCount: categoryScores[0]?.questionCount || 0,
        respondentCount: weightedScores.length,
        averageWeightedScore: Math.round(averageWeighted * 10) / 10,
        averageRawScore: Math.round(averageRaw * 10) / 10,
        minWeightedScore:
          weightedScores.length > 0 ? Math.min(...weightedScores) : 0,
        maxWeightedScore:
          weightedScores.length > 0 ? Math.max(...weightedScores) : 0,
        standardDeviation: Math.round(stdDev * 10) / 10,
        averagePercentage:
          Math.round((averageWeighted / maxPossibleWeighted) * 100 * 10) / 10,
      };
    });

    const completedCount = campaign.anonymousResponses.length;

    // ================================================================================
    // EXCEL EXPORT
    // ================================================================================
    if (format === 'xlsx') {
      const ExcelJS = await import('exceljs').then((m) => m.default);
      const workbook = new ExcelJS.Workbook();

      const overallWeightedScore =
        individualResults.length > 0
          ? individualResults.reduce(
              (sum, r) => sum + r.overallMetrics.totalWeightedScore,
              0
            ) / individualResults.length
          : 0;

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRows([
        ['WEIGHTED SCORING REPORT'],
        [''],
        ['Survey Information'],
        ['Survey Title', campaign.surveyTitle],
        ['Organization', campaign.organization.name],
        ['Survey Type', survey.surveyType],
        ['Survey Number', survey.surveyNumber || 'N/A'],
        [
          'Start Date',
          campaign.startDate
            ? new Date(campaign.startDate).toLocaleDateString()
            : 'N/A',
        ],
        [
          'End Date',
          campaign.endDate
            ? new Date(campaign.endDate).toLocaleDateString()
            : 'N/A',
        ],
        ['Status', campaign.status],
        [''],
        ['Response Metrics'],
        ['Completed Responses', completedCount],
        [''],
        ['Overall Weighted Score'],
        ['Average Weighted Score', overallWeightedScore.toFixed(1)],
        ['Scale Range', `${survey.scale.min} - ${survey.scale.max}`],
      ]);

      // Sheet 2: Weighted Category Scores
      const categorySheet = workbook.addWorksheet('Category Scores');
      categorySheet.addRows([
        ['WEIGHTED CATEGORY SCORES'],
        [''],
        [
          'Category',
          'Weight (×)',
          'Avg Weighted Score',
          'Avg Raw Score',
          'Min',
          'Max',
          'Std Dev',
          'Percentage',
          'Questions',
          'Respondents',
        ],
        ...aggregateStats.map((cat) => [
          cat.categoryName,
          cat.categoryWeight,
          cat.averageWeightedScore,
          cat.averageRawScore,
          cat.minWeightedScore.toFixed(1),
          cat.maxWeightedScore.toFixed(1),
          cat.standardDeviation,
          `${cat.averagePercentage}%`,
          cat.questionCount,
          cat.respondentCount,
        ]),
        [''],
        ['Legend:'],
        ['Weight (×) = Multiplier applied to raw score totals'],
        ['Avg Weighted Score = (Sum of adjusted responses) × Weight'],
        ['Avg Raw Score = Sum of adjusted responses (before weight)'],
        ['Percentage = (Avg Weighted / Max Possible Weighted) × 100'],
        [
          'Note: Individual scores are not shown to preserve respondent anonymity',
        ],
      ]);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${campaign.surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Weighted_Report.xlsx"`,
        },
      });
    }

    // ================================================================================
    // PDF EXPORT
    // ================================================================================
    if (format === 'pdf') {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Weighted Scoring Report', 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Survey info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Survey: ${campaign.surveyTitle}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Organization: ${campaign.organization.name}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Completed: ${completedCount} respondents`, 20, yPosition);
      yPosition += 15;

      // Category scores table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Category Weighted Scores', 20, yPosition);
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [
          ['Category', 'Weight', 'Weighted Score', 'Raw Score', 'Percentage'],
        ],
        body: aggregateStats.map((cat) => [
          cat.categoryName,
          `×${cat.categoryWeight}`,
          cat.averageWeightedScore.toFixed(1),
          cat.averageRawScore.toFixed(1),
          `${cat.averagePercentage.toFixed(1)}%`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount} - Generated ${new Date().toLocaleString()}`,
          105,
          285,
          { align: 'center' }
        );
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${campaign.surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Weighted_Report.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      { error: 'Failed to generate export. Please try again.' },
      { status: 500 }
    );
  }
}
