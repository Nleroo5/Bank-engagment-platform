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
    let sectionAggregates: Array<{
      sectionTitle: string;
      questionCount: number;
      averageScore: number;
    }> = [];
    const engagementDistribution = { highlyEngaged: 0, moderatelyEngaged: 0, disengaged: 0 };

    let responseDistribution: Array<{
      categoryName: string;
      total: number;
      distribution: Record<string, number>;
    }> = [];

    const demographicBreakdowns: Record<string, {
      dimensionLabel: string;
      groups: Array<{
        group: string;
        respondentCount: number;
        overallScore: number;
        categoryScores: Array<{ categoryName: string; averageScore: number }>;
      }>;
    }> = {};

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

      // Section averages
      sectionAggregates = survey.sections.map((section) => {
        const sectionQuestionIds = section.questions.map((q) => q._id);
        const allSectionResponses: number[] = [];

        campaign.anonymousResponses.forEach((anonResp) => {
          anonResp.responses
            .filter((r) => sectionQuestionIds.includes(r.questionId))
            .forEach((r) => {
              const value = (r.adjustedValue ?? r.value ?? 0) as number;
              allSectionResponses.push(value);
            });
        });

        const averageScore =
          allSectionResponses.length > 0
            ? allSectionResponses.reduce((sum, val) => sum + val, 0) /
              allSectionResponses.length
            : 0;

        return {
          sectionTitle: section.title,
          questionCount: section.questions.length,
          averageScore: Math.round(averageScore * 10) / 10,
        };
      });

      // Engagement distribution
      const scaleMax = survey.scale!.max;
      campaign.anonymousResponses.forEach((anonResp) => {
        const values = anonResp.responses
          .filter((r) => r.value !== null && validQuestionIds.has(r.questionId))
          .map((r) => ((r.adjustedValue ?? r.value ?? 0) as number));
        if (values.length === 0) return;

        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const pct = (avg / scaleMax) * 100;

        if (pct >= 80) engagementDistribution.highlyEngaged++;
        else if (pct >= 40) engagementDistribution.moderatelyEngaged++;
        else engagementDistribution.disengaged++;
      });

      // ============================================
      // RESPONSE DISTRIBUTION (for diverging bar export)
      // ============================================
      const questionCategoryMap = new Map(
        questions.map((q) => [q._id, q.category._id])
      );

      const categoryDistCounts = new Map<string, Map<string, number>>();
      categories.forEach((cat) => {
        categoryDistCounts.set(cat._id, new Map());
      });

      campaign.anonymousResponses.forEach((anonResp) => {
        anonResp.responses.forEach((r) => {
          if (r.value === null) return;
          const catId = questionCategoryMap.get(r.questionId);
          if (!catId) return;
          const catMap = categoryDistCounts.get(catId);
          if (!catMap) return;
          const adjustedVal = r.adjustedValue ?? r.value;
          const key = String(adjustedVal);
          catMap.set(key, (catMap.get(key) || 0) + 1);
        });
      });

      responseDistribution = categories.map((cat) => {
        const catMap = categoryDistCounts.get(cat._id) ?? new Map<string, number>();
        const distribution: Record<string, number> = {};
        catMap.forEach((count, value) => {
          distribution[value] = count;
        });
        const total = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
        return { categoryName: cat.name, total, distribution };
      });

      // ============================================
      // DEMOGRAPHIC BREAKDOWNS (for heatmap / grouped bar export)
      // ============================================
      const BREAKDOWN_DIMENSIONS = [
        { key: 'division', label: 'Division' },
        { key: 'jobRole', label: 'Job Role' },
        { key: 'gender', label: 'Gender' },
        { key: 'timeAtBank', label: 'Time at Bank' },
      ];

      for (const dim of BREAKDOWN_DIMENSIONS) {
        const groupMap = new Map<string, typeof campaign.anonymousResponses>();

        campaign.anonymousResponses.forEach((anonResp) => {
          const demographics = (anonResp.demographics as Record<string, unknown>) || {};
          const dimValue = demographics[dim.key];
          if (!dimValue || typeof dimValue !== 'string') return;
          if (!groupMap.has(dimValue)) groupMap.set(dimValue, []);
          groupMap.get(dimValue)!.push(anonResp);
        });

        if (groupMap.size < 2) {
          demographicBreakdowns[dim.key] = { dimensionLabel: dim.label, groups: [] };
          continue;
        }

        const groups = Array.from(groupMap.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 10)
          .map(([groupName, groupRespondents]) => {
            const catScores = categories.map((cat) => {
              const catQuestionIds = questions
                .filter((q) => q.category._id === cat._id)
                .map((q) => q._id);

              const values: number[] = [];
              groupRespondents.forEach((resp) => {
                resp.responses
                  .filter((r) => catQuestionIds.includes(r.questionId) && r.value !== null)
                  .forEach((r) => {
                    values.push((r.adjustedValue ?? r.value ?? 0) as number);
                  });
              });

              const avg = values.length > 0
                ? values.reduce((s, v) => s + v, 0) / values.length
                : 0;

              return {
                categoryName: cat.name,
                averageScore: Math.round(avg * 10) / 10,
              };
            });

            const allValues: number[] = [];
            groupRespondents.forEach((resp) => {
              resp.responses
                .filter((r) => r.value !== null && validQuestionIds.has(r.questionId))
                .forEach((r) => {
                  allValues.push((r.adjustedValue ?? r.value ?? 0) as number);
                });
            });

            const overallGroupScore = allValues.length > 0
              ? allValues.reduce((s, v) => s + v, 0) / allValues.length
              : 0;

            return {
              group: groupName,
              respondentCount: groupRespondents.length,
              overallScore: Math.round(overallGroupScore * 10) / 10,
              categoryScores: catScores,
            };
          });

        demographicBreakdowns[dim.key] = { dimensionLabel: dim.label, groups };
      }
    }

    // ================================================================================
    // EXCEL EXPORT
    // ================================================================================
    if (format === 'xlsx') {
      const ExcelJS = await import('exceljs').then((m) => m.default);
      const workbook = new ExcelJS.Workbook();

      const BLUE = '003DA5';
      const LIGHT_GRAY = 'F5F7FA';
      const WHITE = 'FFFFFF';

      type ExcelWorksheet = ReturnType<typeof workbook.addWorksheet>;

      // Helper: style a header row
      const styleHeaderRow = (
        sheet: ExcelWorksheet,
        rowNumber: number,
        colCount: number
      ) => {
        const row = sheet.getRow(rowNumber);
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c);
          cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.border = {
            bottom: { style: 'thin', color: { argb: '999999' } },
          };
        }
      };

      // Helper: auto-set column widths from data
      const autoWidth = (sheet: ExcelWorksheet, minWidth: number = 12) => {
        sheet.columns.forEach((col: { width?: number; eachCell?: (opts: { includeEmpty: boolean }, cb: (cell: { value: unknown }) => void) => void }) => {
          let maxLen = minWidth;
          col.eachCell?.({ includeEmpty: false }, (cell: { value: unknown }) => {
            const len = cell.value ? cell.value.toString().length : 0;
            if (len > maxLen) maxLen = len;
          });
          col.width = Math.min(maxLen + 4, 40);
        });
      };

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      const titleRow = summarySheet.addRow([
        isDemographicsSurvey ? 'DEMOGRAPHICS SURVEY REPORT' : 'WEIGHTED SCORING REPORT',
      ]);
      titleRow.getCell(1).font = { bold: true, size: 16 };
      summarySheet.addRow([]);

      const infoHeader = summarySheet.addRow(['Survey Information']);
      infoHeader.getCell(1).font = { bold: true, size: 12, underline: true };

      const infoRows: [string, string | number][] = [
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
      ];
      for (const [label, value] of infoRows) {
        const row = summarySheet.addRow([label, value]);
        row.getCell(1).font = { bold: true };
      }

      summarySheet.addRow([]);
      const metricsHeader = summarySheet.addRow(['Response Metrics']);
      metricsHeader.getCell(1).font = { bold: true, size: 12, underline: true };
      const crRow = summarySheet.addRow(['Completed Responses', completedCount]);
      crRow.getCell(1).font = { bold: true };

      if (!isDemographicsSurvey) {
        summarySheet.addRow([]);
        const scoreHeader = summarySheet.addRow(['Overall Weighted Score']);
        scoreHeader.getCell(1).font = { bold: true, size: 12, underline: true };
        const wsRow = summarySheet.addRow(['Average Weighted Score', overallWeightedScore.toFixed(1)]);
        wsRow.getCell(1).font = { bold: true };
        const srRow = summarySheet.addRow(['Scale Range', `${survey.scale!.min} - ${survey.scale!.max}`]);
        srRow.getCell(1).font = { bold: true };

        // Engagement summary
        const totalClassified =
          engagementDistribution.highlyEngaged +
          engagementDistribution.moderatelyEngaged +
          engagementDistribution.disengaged;

        if (totalClassified > 0) {
          summarySheet.addRow([]);
          const engHeader = summarySheet.addRow(['Engagement Distribution']);
          engHeader.getCell(1).font = { bold: true, size: 12, underline: true };
          const heRow = summarySheet.addRow([
            'Highly Engaged (≥80%)',
            engagementDistribution.highlyEngaged,
            `${Math.round((engagementDistribution.highlyEngaged / totalClassified) * 1000) / 10}%`,
          ]);
          heRow.getCell(1).font = { bold: true };
          const meRow = summarySheet.addRow([
            'Moderately Engaged (40-79%)',
            engagementDistribution.moderatelyEngaged,
            `${Math.round((engagementDistribution.moderatelyEngaged / totalClassified) * 1000) / 10}%`,
          ]);
          meRow.getCell(1).font = { bold: true };
          const deRow = summarySheet.addRow([
            'Disengaged (<40%)',
            engagementDistribution.disengaged,
            `${Math.round((engagementDistribution.disengaged / totalClassified) * 1000) / 10}%`,
          ]);
          deRow.getCell(1).font = { bold: true };
        }
      } else {
        summarySheet.addRow([]);
        const dfRow = summarySheet.addRow(['Demographics Fields Collected', demoDistributions.length]);
        dfRow.getCell(1).font = { bold: true };
      }

      autoWidth(summarySheet, 20);

      // Sheet 2: Category Scores (scored surveys only)
      if (!isDemographicsSurvey) {
        const categorySheet = workbook.addWorksheet('Category Scores');
        const catTitle = categorySheet.addRow(['WEIGHTED CATEGORY SCORES']);
        catTitle.getCell(1).font = { bold: true, size: 14 };
        categorySheet.addRow([]);

        const catHeaderRow = categorySheet.addRow([
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
        ]);
        styleHeaderRow(categorySheet, catHeaderRow.number, 10);

        aggregateStats.forEach((cat, idx) => {
          const row = categorySheet.addRow([
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
          ]);
          if (idx % 2 === 1) {
            for (let c = 1; c <= 10; c++) {
              row.getCell(c).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: LIGHT_GRAY },
              };
            }
          }
        });

        categorySheet.addRow([]);
        categorySheet.addRow(['Legend:']);
        categorySheet.addRow(['Weight (×) = Multiplier applied to raw score totals']);
        categorySheet.addRow(['Avg Weighted Score = (Sum of adjusted responses) × Weight']);
        categorySheet.addRow(['Avg Raw Score = Sum of adjusted responses (before weight)']);
        categorySheet.addRow(['Percentage = (Avg Weighted / Max Possible Weighted) × 100']);
        categorySheet.addRow([
          'Note: Individual scores are not shown to preserve respondent anonymity',
        ]);

        autoWidth(categorySheet);
      }

      // Sheet 3: Section Scores (scored surveys only)
      if (!isDemographicsSurvey && sectionAggregates.length > 0) {
        const sectionSheet = workbook.addWorksheet('Section Scores');
        const secTitle = sectionSheet.addRow(['SCORES BY SECTION']);
        secTitle.getCell(1).font = { bold: true, size: 14 };
        sectionSheet.addRow([]);

        const secHeaderRow = sectionSheet.addRow([
          'Section',
          'Items',
          'Average Score',
          'Score %',
        ]);
        styleHeaderRow(sectionSheet, secHeaderRow.number, 4);

        sectionAggregates.forEach((sec, idx) => {
          const scorePct = Math.round((sec.averageScore / (survey.scale?.max ?? 5)) * 1000) / 10;
          const row = sectionSheet.addRow([
            sec.sectionTitle,
            sec.questionCount,
            sec.averageScore,
            `${scorePct}%`,
          ]);
          if (idx % 2 === 1) {
            for (let c = 1; c <= 4; c++) {
              row.getCell(c).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: LIGHT_GRAY },
              };
            }
          }
        });

        autoWidth(sectionSheet);
      }

      // Sheet 4: Response Distribution (scored surveys only)
      if (!isDemographicsSurvey && responseDistribution.some((r) => r.total > 0)) {
        const rdSheet = workbook.addWorksheet('Response Distribution');
        const rdTitle = rdSheet.addRow(['RESPONSE DISTRIBUTION BY CATEGORY']);
        rdTitle.getCell(1).font = { bold: true, size: 14 };
        rdSheet.addRow([]);

        const isLikert3 = survey.scale!.max === 3;
        const scaleLabels = isLikert3
          ? ['1 (Rarely)', '2 (Sometimes)', '3 (Frequently)']
          : ['1 (Strongly Disagree)', '2 (Disagree)', '3 (Neutral)', '4 (Agree)', '5 (Strongly Agree)'];

        const rdHeaderRow = rdSheet.addRow(['Category', ...scaleLabels, 'Total Responses']);
        styleHeaderRow(rdSheet, rdHeaderRow.number, scaleLabels.length + 2);

        responseDistribution.forEach((cat, idx) => {
          const values = scaleLabels.map((_, i) => {
            const key = String(i + 1);
            const count = cat.distribution[key] || 0;
            const pct = cat.total > 0 ? Math.round((count / cat.total) * 1000) / 10 : 0;
            return `${count} (${pct}%)`;
          });
          const row = rdSheet.addRow([cat.categoryName, ...values, cat.total]);
          if (idx % 2 === 1) {
            for (let c = 1; c <= scaleLabels.length + 2; c++) {
              row.getCell(c).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: LIGHT_GRAY },
              };
            }
          }
        });

        rdSheet.addRow([]);
        rdSheet.addRow([
          isLikert3
            ? 'Scale: 1 = Rarely, 2 = Sometimes, 3 = Frequently'
            : 'Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree',
        ]);

        autoWidth(rdSheet);
      }

      // Sheet 5: Score Breakdown by Demographics (scored surveys only)
      if (!isDemographicsSurvey) {
        const hasBreakdownData = Object.values(demographicBreakdowns).some(
          (b) => b.groups.length > 0
        );

        if (hasBreakdownData) {
          const bdSheet = workbook.addWorksheet('Score Breakdown');
          const bdTitle = bdSheet.addRow(['CATEGORY SCORES BY DEMOGRAPHIC GROUP']);
          bdTitle.getCell(1).font = { bold: true, size: 14 };
          bdSheet.addRow([]);

          for (const breakdown of Object.values(demographicBreakdowns)) {
            if (breakdown.groups.length === 0) continue;

            const dimLabel = bdSheet.addRow([breakdown.dimensionLabel]);
            dimLabel.getCell(1).font = { bold: true, size: 12 };

            const groupNames = breakdown.groups.map(
              (g) => `${g.group} (n=${g.respondentCount})`
            );
            const bdHeaderRow = bdSheet.addRow(['Category', ...groupNames]);
            styleHeaderRow(bdSheet, bdHeaderRow.number, groupNames.length + 1);

            const categoryNames =
              breakdown.groups[0]?.categoryScores.map((cs) => cs.categoryName) ?? [];

            categoryNames.forEach((catName, idx) => {
              const scores = breakdown.groups.map((g) => {
                const cs = g.categoryScores.find((c) => c.categoryName === catName);
                return cs ? cs.averageScore.toFixed(1) : '-';
              });
              const row = bdSheet.addRow([catName, ...scores]);
              if (idx % 2 === 1) {
                for (let c = 1; c <= groupNames.length + 1; c++) {
                  row.getCell(c).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: LIGHT_GRAY },
                  };
                }
              }
            });

            const overallScores = breakdown.groups.map((g) => g.overallScore.toFixed(1));
            const overallRow = bdSheet.addRow(['Overall', ...overallScores]);
            for (let c = 1; c <= groupNames.length + 1; c++) {
              overallRow.getCell(c).font = { bold: true };
            }
            bdSheet.addRow([]);
          }

          autoWidth(bdSheet);
        }
      }

      // Demographics sheet (both survey types)
      if (demoDistributions.length > 0) {
        const demoSheet = workbook.addWorksheet('Demographics');
        const demoTitle = demoSheet.addRow(['RESPONDENT DEMOGRAPHICS']);
        demoTitle.getCell(1).font = { bold: true, size: 14 };
        demoSheet.addRow([]);
        const trRow = demoSheet.addRow(['Total Respondents', completedCount]);
        trRow.getCell(1).font = { bold: true };
        demoSheet.addRow([]);

        for (const dist of demoDistributions) {
          const labelRow = demoSheet.addRow([dist.label]);
          labelRow.getCell(1).font = { bold: true, size: 12 };

          const headerRow = demoSheet.addRow(['Value', 'Count', 'Percentage']);
          styleHeaderRow(demoSheet, headerRow.number, 3);

          dist.distribution.forEach((item, idx) => {
            const row = demoSheet.addRow([item.value, item.count, `${item.percentage}%`]);
            if (idx % 2 === 1) {
              for (let c = 1; c <= 3; c++) {
                row.getCell(c).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: LIGHT_GRAY },
                };
              }
            }
          });

          const totalRow = demoSheet.addRow(['Total', dist.total, '100%']);
          totalRow.getCell(1).font = { bold: true };
          totalRow.getCell(2).font = { bold: true };
          totalRow.getCell(3).font = { bold: true };
          demoSheet.addRow([]);
        }

        autoWidth(demoSheet);
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
      doc.text(`Type: ${survey.surveyType}${survey.surveyNumber ? ` (Survey ${survey.surveyNumber})` : ''}`, 20, yPosition);
      yPosition += 7;
      if (campaign.startDate && campaign.endDate) {
        doc.text(
          `Period: ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`,
          20,
          yPosition
        );
        yPosition += 7;
      }
      doc.text(`Completed Responses: ${completedCount}`, 20, yPosition);
      yPosition += 7;
      if (!isDemographicsSurvey) {
        const responseRate = completedCount > 0
          ? Math.round((completedCount / completedCount) * 100)
          : 0;
        doc.text(`Response Rate: ${responseRate}%`, 20, yPosition);
        yPosition += 7;
      }
      yPosition += 8;

      // Engagement Distribution summary (scored surveys only)
      if (!isDemographicsSurvey) {
        const totalClassified =
          engagementDistribution.highlyEngaged +
          engagementDistribution.moderatelyEngaged +
          engagementDistribution.disengaged;

        if (totalClassified > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Engagement Distribution', 20, yPosition);
          yPosition += 10;

          autoTable(doc, {
            startY: yPosition,
            head: [['Engagement Level', 'Count', 'Percentage']],
            body: [
              [
                'Highly Engaged (80%+)',
                engagementDistribution.highlyEngaged.toString(),
                `${Math.round((engagementDistribution.highlyEngaged / totalClassified) * 1000) / 10}%`,
              ],
              [
                'Moderately Engaged (40-79%)',
                engagementDistribution.moderatelyEngaged.toString(),
                `${Math.round((engagementDistribution.moderatelyEngaged / totalClassified) * 1000) / 10}%`,
              ],
              [
                'Disengaged (under 40%)',
                engagementDistribution.disengaged.toString(),
                `${Math.round((engagementDistribution.disengaged / totalClassified) * 1000) / 10}%`,
              ],
            ],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
      }

      // Category scores table (scored surveys only)
      if (!isDemographicsSurvey) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

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

      // Section Scores table (scored surveys only)
      if (!isDemographicsSurvey && sectionAggregates.length > 0) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Scores by Section', 20, yPosition);
        yPosition += 10;

        autoTable(doc, {
          startY: yPosition,
          head: [['Section', 'Items', 'Average Score', 'Score %']],
          body: sectionAggregates.map((sec) => [
            sec.sectionTitle,
            sec.questionCount.toString(),
            sec.averageScore.toFixed(1),
            `${Math.round((sec.averageScore / (survey.scale?.max ?? 5)) * 1000) / 10}%`,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Response Distribution table (scored surveys only)
      if (!isDemographicsSurvey && responseDistribution.some((r) => r.total > 0)) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Response Distribution by Category', 20, yPosition);
        yPosition += 10;

        const isLikert3Pdf = survey.scale!.max === 3;
        const pdfScaleLabels = isLikert3Pdf
          ? ['Rarely', 'Sometimes', 'Frequently']
          : ['SD', 'D', 'N', 'A', 'SA'];

        autoTable(doc, {
          startY: yPosition,
          head: [['Category', ...pdfScaleLabels]],
          body: responseDistribution.map((cat) => [
            cat.categoryName,
            ...pdfScaleLabels.map((_, i) => {
              const count = cat.distribution[String(i + 1)] || 0;
              const pct = cat.total > 0 ? Math.round((count / cat.total) * 1000) / 10 : 0;
              return `${count} (${pct}%)`;
            }),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          styles: { fontSize: 8 },
          columnStyles: { 0: { cellWidth: 35 } },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Score Breakdown by Demographics (scored surveys only)
      if (!isDemographicsSurvey) {
        const hasBdData = Object.values(demographicBreakdowns).some(
          (b) => b.groups.length > 0
        );

        if (hasBdData) {
          for (const breakdown of Object.values(demographicBreakdowns)) {
            if (breakdown.groups.length === 0) continue;

            if (yPosition > 200) {
              doc.addPage();
              yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Scores by ${breakdown.dimensionLabel}`, 20, yPosition);
            yPosition += 8;

            const groupNames = breakdown.groups.map((g) => g.group);
            const categoryNames =
              breakdown.groups[0]?.categoryScores.map((cs) => cs.categoryName) ?? [];

            const bodyRows = categoryNames.map((catName) => [
              catName,
              ...breakdown.groups.map((g) => {
                const cs = g.categoryScores.find((c) => c.categoryName === catName);
                return cs ? cs.averageScore.toFixed(1) : '-';
              }),
            ]);

            bodyRows.push([
              'Overall',
              ...breakdown.groups.map((g) => g.overallScore.toFixed(1)),
            ]);

            autoTable(doc, {
              startY: yPosition,
              head: [['Category', ...groupNames]],
              body: bodyRows,
              theme: 'grid',
              headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold', fontSize: 7 },
              alternateRowStyles: { fillColor: [245, 247, 250] },
              styles: { fontSize: 7 },
              columnStyles: { 0: { cellWidth: 30 } },
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            yPosition = (doc as any).lastAutoTable.finalY + 12;
          }
        }
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
