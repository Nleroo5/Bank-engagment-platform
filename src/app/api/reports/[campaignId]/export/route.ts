import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { getCurrentUser } from '@/lib/auth/helpers';
import {
  calculateCategoryScores,
  prepareResponsesForScoring,
} from '@/lib/scoring/categoryScoring';
import {
  checkAnonymityThreshold,
  ANONYMOUS_SURVEY_TYPES,
} from '@/lib/scoring/anonymity';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';

    if (format !== 'xlsx' && format !== 'pdf') {
      return NextResponse.json(
        { error: 'Invalid format. Use xlsx or pdf.' },
        { status: 400 }
      );
    }

    // Fetch campaign with all data
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.campaignId },
      include: {
        organization: true,
        invitations: {
          where: { status: 'COMPLETED' },
          include: {
            user: true,
            responses: {
              orderBy: { questionNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Role-based access
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      campaign.organizationId !== currentUser.organizationId
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch survey from Sanity
    const survey = await getSurveyById(campaign.sanitysurveyId);

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

    // Calculate weighted scores for each respondent
    const individualResults = campaign.invitations.map((invitation) => {
      const preparedResponses = prepareResponsesForScoring(
        invitation.responses.map((r) => ({
          sanityQuestionId: r.sanityQuestionId,
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
        invitation.id,
        survey.scale!.min,
        survey.scale!.max,
        survey.surveyType as 'likert3' | 'likert5'
      );

      return {
        invitationId: invitation.id,
        userName: invitation.user.name || invitation.user.email,
        ...scoringResult,
      };
    });

    // Calculate aggregate statistics
    const aggregateStats = categories.map((category) => {
      const categoryScores = individualResults
        .map((result) =>
          result.categoryScores.find((cs) => cs.categoryId === category._id)
        )
        .filter((cs) => cs !== undefined);

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

      return {
        categoryName: category.name,
        categoryWeight: category.weight,
        questionCount: categoryScores[0]?.questionCount || 0,
        respondentCount: weightedScores.length,
        averageWeightedScore: Math.round(averageWeighted * 10) / 10,
        averageRawScore: Math.round(averageRaw * 10) / 10,
        minWeightedScore: Math.min(...weightedScores),
        maxWeightedScore: Math.max(...weightedScores),
        standardDeviation: Math.round(stdDev * 10) / 10,
        averagePercentage:
          Math.round(
            (averageWeighted / categoryScores[0]!.maxPossibleWeighted) *
              100 *
              10
          ) / 10,
      };
    });

    const isAnonymousSurvey = ANONYMOUS_SURVEY_TYPES.includes(
      survey.surveyType.toLowerCase()
    );

    // ================================================================================
    // EXCEL EXPORT
    // ================================================================================
    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary
      const totalInvitations = campaign.invitations.length + (await prisma.invitation.count({
        where: { campaignId: campaign.id }
      })) - campaign.invitations.length;

      const completionRate = totalInvitations > 0
        ? Math.round((campaign.invitations.length / totalInvitations) * 100 * 10) / 10
        : 0;

      const overallWeightedScore =
        individualResults.reduce(
          (sum, r) => sum + r.overallMetrics.totalWeightedScore,
          0
        ) / individualResults.length;

      const summaryData = [
        ['WEIGHTED SCORING REPORT'],
        [''],
        ['Survey Information'],
        ['Survey Title', campaign.surveyTitle],
        ['Organization', campaign.organization.name],
        ['Survey Type', survey.surveyType],
        ['Survey Number', survey.surveyNumber || 'N/A'],
        ['Start Date', campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'],
        ['End Date', campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'N/A'],
        ['Status', campaign.status],
        [''],
        ['Response Metrics'],
        ['Total Invitations', totalInvitations],
        ['Completed Responses', campaign.invitations.length],
        ['Completion Rate', `${completionRate}%`],
        [''],
        ['Overall Weighted Score'],
        ['Average Weighted Score', overallWeightedScore.toFixed(1)],
        ['Scale Range', `${survey.scale.min} - ${survey.scale.max}`],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Sheet 2: Weighted Category Scores ⭐ NEW!
      const categoryData = [
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
      ];

      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Scores');

      // Sheet 3: Individual Scores (if not anonymous)
      if (!isAnonymousSurvey) {
        const individualHeaders = [
          'Respondent',
          ...categories.map((c) => `${c.name} (×${c.weight})`),
          'Total Weighted',
          'Completion',
        ];

        const individualRows = individualResults.map((result) => {
          const categoryValues = categories.map((cat) => {
            const catScore = result.categoryScores.find(
              (cs) => cs.categoryId === cat._id
            );
            return catScore ? catScore.weightedScore.toFixed(1) : 'N/A';
          });

          return [
            result.userName,
            ...categoryValues,
            result.overallMetrics.totalWeightedScore.toFixed(1),
            `${result.overallMetrics.completionRate.toFixed(0)}%`,
          ];
        });

        const individualData = [
          ['INDIVIDUAL WEIGHTED SCORES'],
          [''],
          individualHeaders,
          ...individualRows,
        ];

        const individualSheet = XLSX.utils.aoa_to_sheet(individualData);
        XLSX.utils.book_append_sheet(workbook, individualSheet, 'Individual Scores');
      }

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
      doc.text(
        `Completed: ${campaign.invitations.length} respondents`,
        20,
        yPosition
      );
      yPosition += 15;

      // Category scores table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Category Weighted Scores', 20, yPosition);
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [['Category', 'Weight', 'Weighted Score', 'Raw Score', 'Percentage']],
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
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
