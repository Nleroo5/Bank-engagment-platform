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

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey content not found' },
        { status: 404 }
      );
    }

    const isDemographicsSurvey = survey.surveyType === 'demographics';

    if (!isDemographicsSurvey && !survey.scale) {
      return NextResponse.json(
        { error: 'Survey configuration incomplete — missing scale information.' },
        { status: 400 }
      );
    }

    // Check anonymity threshold for scored surveys
    if (!isDemographicsSurvey) {
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
    }

    // ============================================
    // BUILD DEMOGRAPHICS DISTRIBUTIONS
    // ============================================
    const DEMO_FIELDS = isDemographicsSurvey
      ? [
          { key: 'bankSize', label: 'Bank Size' },
          { key: 'device', label: 'Device Used' },
          { key: 'employmentStatus', label: 'Employment Status' },
          { key: 'gender', label: 'Gender' },
          { key: 'timeAtBank', label: 'Time at Bank' },
          { key: 'bankExperience', label: 'Banking Industry Experience' },
          { key: 'division', label: 'Division' },
          { key: 'jobRole', label: 'Job Role/Title' },
          { key: 'country', label: 'Country' },
          { key: 'state', label: 'State' },
          { key: 'metroArea', label: 'Metro Area' },
          { key: 'city', label: 'City' },
        ]
      : [
          { key: 'bankSize', label: 'Bank Size' },
          { key: 'device', label: 'Device Used' },
          { key: 'employmentStatus', label: 'Employment Status' },
          { key: 'gender', label: 'Gender' },
          { key: 'timeAtBank', label: 'Time at Bank' },
          { key: 'bankExperience', label: 'Banking Industry Experience' },
          { key: 'division', label: 'Division' },
          { key: 'jobRole', label: 'Job Role/Title' },
        ];

    const demoData: Record<string, unknown>[] = campaign.anonymousResponses.map(
      (r) => (r.demographics as Record<string, unknown>) || {}
    );

    const demoDistributions = DEMO_FIELDS.map((field) => {
      const counts = new Map<string, number>();
      demoData.forEach((data) => {
        const value = data[field.key];
        if (value && typeof value === 'string') {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      });

      const total = demoData.length;
      const distribution = Array.from(counts.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return { field: field.key, label: field.label, total, distribution };
    }).filter((d) => d.distribution.length > 0);

    const completedCount = campaign.anonymousResponses.length;

    // ============================================
    // SCORED SURVEY DATA (skip for demographics)
    // ============================================
    let aggregateStats: Array<{
      categoryName: string;
      categoryWeight: number;
      questionCount: number;
      respondentCount: number;
      averageWeightedScore: number;
      averageRawScore: number;
      minWeightedScore: number;
      maxWeightedScore: number;
      standardDeviation: number;
      averagePercentage: number;
    }> = [];
    let overallWeightedScore = 0;

    if (!isDemographicsSurvey) {
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

      const categoriesMap = new Map(
        questions.map((q) => [q.category._id, q.category])
      );
      const categories = Array.from(categoriesMap.values()).sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });

      const validQuestionIds = new Set(questions.map((q) => q._id));

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

      aggregateStats = categories.map((category) => {
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

      overallWeightedScore =
        individualResults.length > 0
          ? individualResults.reduce(
              (sum, r) => sum + r.overallMetrics.totalWeightedScore,
              0
            ) / individualResults.length
          : 0;
    }

    // ================================================================================
    // EXCEL EXPORT
    // ================================================================================
    if (format === 'xlsx') {
      const ExcelJS = await import('exceljs').then((m) => m.default);
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      const summaryRows: (string | number | null)[][] = [
        [isDemographicsSurvey ? 'DEMOGRAPHICS SURVEY REPORT' : 'WEIGHTED SCORING REPORT'],
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
      ];

      if (!isDemographicsSurvey) {
        summaryRows.push(
          [''],
          ['Overall Weighted Score'],
          ['Average Weighted Score', overallWeightedScore.toFixed(1)],
          ['Scale Range', `${survey.scale!.min} - ${survey.scale!.max}`]
        );
      } else {
        summaryRows.push(
          [''],
          ['Demographics Fields Collected', demoDistributions.length]
        );
      }

      summarySheet.addRows(summaryRows);

      // Sheet 2: Category Scores (scored surveys only)
      if (!isDemographicsSurvey) {
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
      }

      // Demographics sheet (both survey types)
      if (demoDistributions.length > 0) {
        const demoSheet = workbook.addWorksheet('Demographics');
        const demoRows: (string | number)[][] = [
          ['RESPONDENT DEMOGRAPHICS'],
          [''],
          ['Total Respondents', completedCount],
          [''],
        ];

        for (const dist of demoDistributions) {
          demoRows.push(
            [dist.label],
            ['Value', 'Count', 'Percentage']
          );
          for (const item of dist.distribution) {
            demoRows.push([item.value, item.count, `${item.percentage}%`]);
          }
          demoRows.push(['Total', dist.total, '100%'], ['']);
        }

        demoSheet.addRows(demoRows);
      }

      const buffer = await workbook.xlsx.writeBuffer();

      const fileLabel = isDemographicsSurvey ? 'Demographics_Report' : 'Weighted_Report';
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${campaign.surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${fileLabel}.xlsx"`,
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
      doc.text(
        isDemographicsSurvey ? 'Demographics Survey Report' : 'Weighted Scoring Report',
        105,
        yPosition,
        { align: 'center' }
      );
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

      // Category scores table (scored surveys only)
      if (!isDemographicsSurvey) {
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Demographics tables (both survey types)
      if (demoDistributions.length > 0) {
        // Check if we need a new page
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Respondent Demographics', 20, yPosition);
        yPosition += 10;

        for (const dist of demoDistributions) {
          // Check if we need a new page before each table
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(dist.label, 20, yPosition);
          yPosition += 8;

          autoTable(doc, {
            startY: yPosition,
            head: [['Value', 'Count', 'Percentage']],
            body: [
              ...dist.distribution.map((item) => [
                item.value,
                item.count.toString(),
                `${item.percentage}%`,
              ]),
              ['Total', dist.total.toString(), '100%'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 61, 165], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            styles: { fontSize: 9 },
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          yPosition = (doc as any).lastAutoTable.finalY + 12;
        }
      }

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

      const fileLabel = isDemographicsSurvey ? 'Demographics_Report' : 'Weighted_Report';
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${campaign.surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${fileLabel}.pdf"`,
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
