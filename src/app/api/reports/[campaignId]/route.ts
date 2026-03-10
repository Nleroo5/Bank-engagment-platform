import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
import { requireAdmin } from '@/lib/auth/helpers';
import {
  calculateCategoryScores,
  prepareResponsesForScoring,
} from '@/lib/scoring/categoryScoring';
import { getFilterableOptionsAnonymous } from '@/lib/scoring/anonymity';

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

    const flaggedCount = await prisma.anonymousResponse.count({
      where: { campaignId: params.campaignId, flaggedForReview: true },
    });

    // Fetch survey with full question and category data
    let survey;
    try {
      survey = await getSurveyById(campaign.surveyId);
    } catch (fetchError) {
      console.error('Survey fetch error:', fetchError);
      return NextResponse.json(
        {
          error: 'Failed to load survey data',
          message: 'Survey content could not be loaded. Survey ID: ' + campaign.surveyId,
        },
        { status: 503 }
      );
    }

    if (!survey) {
      return NextResponse.json(
        {
          error: 'Survey not found',
          message: `Survey with ID "${campaign.surveyId}" was not found. Please ensure the campaign references a valid survey.`,
        },
        { status: 404 }
      );
    }

    const isDemographicsSurvey = survey.surveyType === 'demographics';

    if (!isDemographicsSurvey && !survey.scale) {
      return NextResponse.json(
        {
          error: 'Survey configuration incomplete',
          message: 'Survey is missing scale information. Please add a scale to this survey.',
        },
        { status: 400 }
      );
    }

    const filterOptions = await getFilterableOptionsAnonymous(campaign.id);

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const filters: Record<string, string> = {};

    const division = searchParams.get('division');
    const jobRole = searchParams.get('jobRole');
    const timeAtBank = searchParams.get('timeAtBank');
    const bankExperience = searchParams.get('bankExperience');
    const gender = searchParams.get('gender');

    if (division) filters.division = division;
    if (jobRole) filters.jobRole = jobRole;
    if (timeAtBank) filters.timeAtBank = timeAtBank;
    if (bankExperience) filters.bankExperience = bankExperience;
    if (gender) filters.gender = gender;

    // ============================================
    // DEMOGRAPHICS SURVEY HANDLING
    // ============================================
    if (isDemographicsSurvey) {
      // Apply demographic filters (same as scored surveys)
      const filteredDemoResponses = campaign.anonymousResponses.filter(
        (anonResp) => {
          if (Object.keys(filters).length === 0) return true;
          const demographics =
            (anonResp.demographics as Record<string, unknown>) || {};
          return Object.entries(filters).every(
            ([key, value]) => demographics[key] === value
          );
        }
      );

      const demographicsData: Record<string, unknown>[] =
        filteredDemoResponses.map((r) => {
          return (r.demographics as Record<string, unknown>) || {};
        });

      const fields = [
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
      ];

      const distributions = fields.map((field) => {
        const counts = new Map<string, number>();
        demographicsData.forEach((data) => {
          const value = data[field.key];
          if (value && typeof value === 'string') {
            counts.set(value, (counts.get(value) || 0) + 1);
          }
        });

        const total = demographicsData.length;
        const distribution = Array.from(counts.entries())
          .map(([value, count]) => ({
            value,
            count,
            percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          field: field.key,
          label: field.label,
          total,
          distribution,
        };
      });

      const totalCount = campaign.anonymousResponses.length;

      return NextResponse.json({
        campaign: {
          id: campaign.id,
          surveyTitle: campaign.surveyTitle,
          surveyType: survey.surveyType,
          organizationName: campaign.organization.name,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: campaign.status,
        },
        metrics: {
          totalInvitations: totalCount,
          completedCount: totalCount,
          completionRate: 100,
          filteredCount: filteredDemoResponses.length,
          flaggedCount,
        },
        respondentDemographics: {
          respondentCount: demographicsData.length,
          distributions,
        },
        filters: {
          applied: filters,
          available: filterOptions,
        },
      });
    }

    // Extract all questions with their metadata
    const questions = survey.sections.flatMap((section) =>
      section.questions.map((q) => ({
        _id: q._id,
        number: q.number,
        isReversed: q.isReversed,
        category: {
          _id: q.category._id,
          _type: 'category' as const,
          name: q.category.name,
          weight: q.category.weight,
          colorCode: q.category.colorCode,
          sortOrder: q.category.sortOrder,
        },
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

    // Filter anonymous responses based on demographics JSON
    const filteredData = campaign.anonymousResponses
      .filter((anonResp) => {
        if (Object.keys(filters).length === 0) return true;

        const demographics =
          (anonResp.demographics as Record<string, unknown>) || {};
        return Object.entries(filters).every(([key, value]) => {
          return demographics[key] === value;
        });
      })
      .map((anonResp) => ({
        id: anonResp.id,
        responses: anonResp.responses,
        demographics: anonResp.demographics as Record<string, unknown>,
      }));

    // ============================================
    // BUILD RESPONDENT DEMOGRAPHICS SUMMARY
    // ============================================
    const DEMO_FIELDS = [
      { key: 'bankSize', label: 'Bank Size' },
      { key: 'device', label: 'Device Used' },
      { key: 'employmentStatus', label: 'Employment Status' },
      { key: 'gender', label: 'Gender' },
      { key: 'timeAtBank', label: 'Time at Bank' },
      { key: 'bankExperience', label: 'Banking Industry Experience' },
      { key: 'division', label: 'Division' },
      { key: 'jobRole', label: 'Job Role / Title' },
      { key: 'country', label: 'Country' },
      { key: 'state', label: 'State' },
      { key: 'metroArea', label: 'Metro Area' },
      { key: 'city', label: 'City' },
    ];

    const respondentDemoData: Record<string, unknown>[] = filteredData.map(
      (item) => (item.demographics as Record<string, unknown>) || {}
    );

    const respondentDemographics = {
      respondentCount: filteredData.length,
      distributions: DEMO_FIELDS.map((field) => {
        const counts = new Map<string, number>();
        respondentDemoData.forEach((demo) => {
          const value = demo[field.key];
          if (value && typeof value === 'string') {
            counts.set(value, (counts.get(value) || 0) + 1);
          }
        });

        const total = filteredData.length;
        const distribution = Array.from(counts.entries())
          .map(([value, count]) => ({
            value,
            count,
            percentage: Math.round((count / total) * 1000) / 10,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          field: field.key,
          label: field.label,
          total,
          distribution,
        };
      }),
    };

    const validQuestionIds = new Set(questions.map((q) => q._id));

    const individualResults = filteredData.map((data) => {
      const preparedResponses = prepareResponsesForScoring(
        data.responses
          .filter((r) => r.value !== null && validQuestionIds.has(r.questionId))
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
        data.id,
        survey.scale!.min,
        survey.scale!.max,
        survey.surveyType as 'likert3' | 'likert5'
      );

      return {
        userId: 'anonymous',
        userName: 'Anonymous',
        ...scoringResult,
      };
    });

    const aggregateStats = categories.map((category) => {
      const categoryScores = individualResults
        .map((result) =>
          result.categoryScores.find((cs) => cs.categoryId === category._id)
        )
        .filter((cs) => cs !== undefined);

      if (categoryScores.length === 0) {
        return {
          categoryId: category._id,
          categoryName: category.name,
          categoryWeight: category.weight,
          colorCode: category.colorCode,
          sortOrder: category.sortOrder,
          respondentCount: 0,
          questionCount: 0,
          averageWeightedScore: 0,
          minWeightedScore: 0,
          maxWeightedScore: 0,
          standardDeviation: 0,
          averageRawScore: 0,
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
        categoryId: category._id,
        categoryName: category.name,
        categoryWeight: category.weight,
        colorCode: category.colorCode,
        sortOrder: category.sortOrder,
        respondentCount: weightedScores.length,
        questionCount: categoryScores[0]?.questionCount || 0,
        averageWeightedScore: Math.round(averageWeighted * 10) / 10,
        minWeightedScore: weightedScores.length > 0 ? Math.min(...weightedScores) : 0,
        maxWeightedScore: weightedScores.length > 0 ? Math.max(...weightedScores) : 0,
        standardDeviation: Math.round(stdDev * 10) / 10,
        averageRawScore: Math.round(averageRaw * 10) / 10,
        averagePercentage:
          Math.round((averageWeighted / maxPossibleWeighted) * 100 * 10) / 10,
      };
    });

    const totalCount = campaign.anonymousResponses.length;
    // completionRate is total completions / total completions (all loaded responses are completed)
    // filteredCount separately tracks how many match the current demographic filters
    const completionRate = 100;

    const sectionAggregates = survey.sections.map((section) => {
      const sectionQuestionIds = section.questions.map((q) => q._id);

      const allSectionResponses: number[] = [];

      filteredData.forEach((data) => {
        const sectionResponses = data.responses.filter((r) =>
          sectionQuestionIds.includes(r.questionId)
        );

        sectionResponses.forEach((response) => {
          const value = response.adjustedValue ?? response.value ?? 0;
          allSectionResponses.push(value);
        });
      });

      const averageScore =
        allSectionResponses.length > 0
          ? allSectionResponses.reduce(
              (sum: number, val: number) => sum + val,
              0
            ) / allSectionResponses.length
          : 0;

      return {
        sectionId: section._id,
        sectionTitle: section.title,
        averageScore: Math.round(averageScore * 10) / 10,
        questionCount: section.questions.length,
        responseCount: filteredData.length,
      };
    });

    const categoryScores = aggregateStats.map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      averageScore: cat.averageWeightedScore,
      questionCount: cat.questionCount,
      responseCount: cat.respondentCount,
    }));

    const allResponses = filteredData.flatMap((data) =>
      data.responses.map((r) => (r.adjustedValue ?? r.value ?? 0) as number)
    );
    const overallScore =
      allResponses.length > 0
        ? allResponses.reduce((sum: number, val: number) => sum + val, 0) /
          allResponses.length
        : 0;

    // Compute engagement distribution — classify each respondent by their
    // average score as a percentage of scaleMax
    const scaleMax = survey.scale!.max;
    let highlyEngaged = 0;
    let moderatelyEngaged = 0;
    let disengaged = 0;

    filteredData.forEach((data) => {
      const values = data.responses
        .filter((r) => r.value !== null)
        .map((r) => (r.adjustedValue ?? r.value ?? 0) as number);
      if (values.length === 0) return;

      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const pct = (avg / scaleMax) * 100;

      if (pct >= 80) highlyEngaged++;
      else if (pct >= 40) moderatelyEngaged++;
      else disengaged++;
    });

    const totalClassified = highlyEngaged + moderatelyEngaged + disengaged;
    const scoreDistribution = {
      highlyEngaged: {
        count: highlyEngaged,
        percentage: totalClassified > 0 ? Math.round((highlyEngaged / totalClassified) * 1000) / 10 : 0,
      },
      moderatelyEngaged: {
        count: moderatelyEngaged,
        percentage: totalClassified > 0 ? Math.round((moderatelyEngaged / totalClassified) * 1000) / 10 : 0,
      },
      disengaged: {
        count: disengaged,
        percentage: totalClassified > 0 ? Math.round((disengaged / totalClassified) * 1000) / 10 : 0,
      },
    };

    // ============================================
    // RESPONSE DISTRIBUTION (for diverging stacked bar)
    // Count how many responses per Likert value for each category
    // ============================================
    const questionCategoryMap = new Map(
      questions.map((q) => [q._id, q.category._id])
    );

    const categoryDistCounts = new Map<string, Map<string, number>>();
    categories.forEach((cat) => {
      categoryDistCounts.set(cat._id, new Map());
    });

    filteredData.forEach((data) => {
      data.responses.forEach((r) => {
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

    const responseDistribution = categories.map((cat) => {
      const catMap = categoryDistCounts.get(cat._id) ?? new Map<string, number>();
      const distribution: Record<string, number> = {};
      catMap.forEach((count, value) => {
        distribution[value] = count;
      });
      const total = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
      return {
        categoryId: cat._id,
        categoryName: cat.name,
        colorCode: cat.colorCode,
        total,
        distribution,
      };
    });

    // ============================================
    // DEMOGRAPHIC BREAKDOWNS (for heatmap + grouped bar)
    // Compute category scores grouped by demographic dimension
    // ============================================
    const BREAKDOWN_DIMENSIONS = [
      { key: 'division', label: 'Division' },
      { key: 'jobRole', label: 'Job Role' },
      { key: 'gender', label: 'Gender' },
      { key: 'timeAtBank', label: 'Time at Bank' },
    ];

    const demographicBreakdowns: Record<string, {
      dimension: string;
      dimensionLabel: string;
      groups: Array<{
        group: string;
        respondentCount: number;
        overallScore: number;
        categoryScores: Array<{
          categoryId: string;
          categoryName: string;
          averageScore: number;
        }>;
      }>;
    }> = {};

    for (const dim of BREAKDOWN_DIMENSIONS) {
      // Group respondents by this demographic dimension
      const groupMap = new Map<string, typeof filteredData>();

      filteredData.forEach((item) => {
        const demographics = (item.demographics as Record<string, unknown>) || {};
        const dimValue = demographics[dim.key];
        if (!dimValue || typeof dimValue !== 'string') return;
        if (!groupMap.has(dimValue)) groupMap.set(dimValue, []);
        groupMap.get(dimValue)!.push(item);
      });

      // Skip dimensions with fewer than 2 groups
      if (groupMap.size < 2) {
        demographicBreakdowns[dim.key] = {
          dimension: dim.key,
          dimensionLabel: dim.label,
          groups: [],
        };
        continue;
      }

      const groups = Array.from(groupMap.entries())
        .sort((a, b) => b[1].length - a[1].length) // largest groups first
        .slice(0, 10) // limit to top 10 groups
        .map(([groupName, groupRespondents]) => {
          // Compute category averages for this group
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
              categoryId: cat._id,
              categoryName: cat.name,
              averageScore: Math.round(avg * 10) / 10,
            };
          });

          // Compute overall score for this group
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

      demographicBreakdowns[dim.key] = {
        dimension: dim.key,
        dimensionLabel: dim.label,
        groups,
      };
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        surveyTitle: campaign.surveyTitle,
        surveyType: survey.surveyType,
        surveyNumber: survey.surveyNumber,
        organizationName: campaign.organization.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        isAnonymous: true,
      },
      metrics: {
        totalInvitations: totalCount,
        completedCount: campaign.anonymousResponses.length,
        completionRate,
        filteredCount: filteredData.length,
        flaggedCount,
      },
      scores: {
        overall: Math.round(overallScore * 10) / 10,
        categories: categoryScores,
        sections: sectionAggregates,
      },
      categoryAggregates: aggregateStats,
      scoreDistribution,
      responseDistribution,
      demographicBreakdowns,
      individualScores: undefined,
      respondentDemographics,
      filters: {
        applied: filters,
        available: filterOptions,
      },
      scale: {
        min: survey.scale?.min ?? 1,
        max: survey.scale?.max ?? 5,
        type: survey.surveyType,
      },
    });
  } catch (error) {
    console.error('Error generating weighted scoring report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report. Please try again.' },
      { status: 500 }
    );
  }
}
