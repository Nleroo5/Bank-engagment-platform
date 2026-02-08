import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import {
  calculateCategoryScores,
  prepareResponsesForScoring,
} from '@/lib/scoring/categoryScoring';
import {
  checkAnonymityThreshold,
  getFilterableOptions,
  validateFilteredAnonymity,
  ANONYMOUS_SURVEY_TYPES,
} from '@/lib/scoring/anonymity';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    // Fetch campaign with all related data
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.campaignId },
      include: {
        organization: true,
        invitations: {
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
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Fetch survey from Sanity with full question and category data
    let survey;
    try {
      survey = await getSurveyById(campaign.sanitysurveyId);
    } catch (sanityError) {
      console.error('Sanity fetch error:', sanityError);
      return NextResponse.json(
        {
          error: 'Sanity CMS not configured',
          message:
            'Survey content could not be loaded from Sanity CMS. Please configure your Sanity project and ensure survey content exists.\n\n' +
            'Steps to fix:\n' +
            '1. Set SANITY_API_TOKEN in your environment variables\n' +
            '2. Create survey content in Sanity Studio\n' +
            '3. Ensure the survey ID matches: ' +
            campaign.sanitysurveyId,
        },
        { status: 503 }
      );
    }

    if (!survey) {
      return NextResponse.json(
        {
          error: 'Survey content not found',
          message:
            `Survey with ID "${campaign.sanitysurveyId}" was not found in Sanity.\n\n` +
            'Please create the survey content in Sanity Studio first, or update the campaign to reference an existing survey.',
        },
        { status: 404 }
      );
    }

    // Validate survey has scale information
    if (!survey.scale) {
      return NextResponse.json(
        {
          error: 'Survey configuration incomplete',
          message:
            'Survey is missing scale information. Please configure the scale in Sanity Studio.',
        },
        { status: 400 }
      );
    }

    // Check anonymity threshold for Survey 7 (Associate 180)
    const meetsThreshold = await checkAnonymityThreshold(
      campaign.id,
      survey.surveyType
    );

    if (!meetsThreshold) {
      return NextResponse.json(
        {
          error: 'Insufficient respondents',
          message:
            'This survey requires a minimum of 5 completed responses before viewing results to protect respondent anonymity.',
          requiresAnonymity: true,
          threshold: 5,
        },
        { status: 403 }
      );
    }

    // Get filter options for demographics
    const filterOptions = await getFilterableOptions(
      campaign.id,
      survey.surveyType
    );

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const filters: Record<string, string> = {};

    const division = searchParams.get('division');
    const jobRole = searchParams.get('jobRole');
    const timeAtBank = searchParams.get('timeAtBank');
    const bankExperience = searchParams.get('bankExperience');

    if (division) filters.division = division;
    if (jobRole) filters.jobRole = jobRole;
    if (timeAtBank) filters.timeAtBank = timeAtBank;
    if (bankExperience) filters.bankExperience = bankExperience;

    // Validate filters maintain anonymity
    if (Object.keys(filters).length > 0) {
      const validation = await validateFilteredAnonymity(
        campaign.id,
        survey.surveyType,
        filters
      );

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Filter results in too few respondents',
            message: `Only ${validation.count} respondents match these filters. Minimum 5 required for anonymity protection.`,
            count: validation.count,
          },
          { status: 400 }
        );
      }
    }

    // Filter invitations based on demographics
    let filteredInvitations = campaign.invitations.filter(
      (inv) => inv.status === 'COMPLETED'
    );

    if (Object.keys(filters).length > 0) {
      filteredInvitations = filteredInvitations.filter((inv) => {
        return Object.entries(filters).every(([key, value]) => {
          return inv.user[key as keyof typeof inv.user] === value;
        });
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
    const individualResults = filteredInvitations.map((invitation) => {
      // Prepare responses for scoring
      const preparedResponses = prepareResponsesForScoring(
        invitation.responses.map((r) => ({
          sanityQuestionId: r.sanityQuestionId,
          questionNumber: r.questionNumber,
          value: r.value!,
        })),
        questions
      );

      // Calculate weighted category scores
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
        userId: invitation.userId,
        userName: invitation.user.name || invitation.user.email,
        ...scoringResult,
      };
    });

    // Calculate aggregate statistics across all respondents
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

      // Calculate standard deviation
      const mean = averageWeighted;
      const squaredDiffs = weightedScores.map((score) =>
        Math.pow(score - mean, 2)
      );
      const variance =
        squaredDiffs.reduce((sum, diff) => sum + diff, 0) /
        weightedScores.length;
      const stdDev = Math.sqrt(variance);

      return {
        categoryId: category._id,
        categoryName: category.name,
        categoryWeight: category.weight,
        colorCode: category.colorCode,
        sortOrder: category.sortOrder,
        respondentCount: weightedScores.length,
        questionCount: categoryScores[0]?.questionCount || 0,
        averageWeightedScore: Math.round(averageWeighted * 10) / 10,
        minWeightedScore: Math.min(...weightedScores),
        maxWeightedScore: Math.max(...weightedScores),
        standardDeviation: Math.round(stdDev * 10) / 10,
        averageRawScore: Math.round(averageRaw * 10) / 10,
        averagePercentage:
          Math.round(
            (averageWeighted / categoryScores[0]!.maxPossibleWeighted) *
              100 *
              10
          ) / 10,
      };
    });

    // Calculate overall metrics
    const totalInvitations = campaign.invitations.length;
    const completedCount = filteredInvitations.length;
    const completionRate =
      totalInvitations > 0
        ? Math.round((completedCount / totalInvitations) * 100 * 10) / 10
        : 0;

    const overallWeightedScore =
      individualResults.reduce(
        (sum, r) => sum + r.overallMetrics.totalWeightedScore,
        0
      ) / individualResults.length;

    // Determine if individual scores should be shown (not for Associate 180)
    const showIndividualScores = !ANONYMOUS_SURVEY_TYPES.includes(
      survey.surveyType.toLowerCase()
    );

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
      },
      metrics: {
        totalInvitations,
        completedCount,
        completionRate,
        filteredCount: filteredInvitations.length,
        averageOverallWeightedScore: Math.round(overallWeightedScore * 10) / 10,
      },
      categoryAggregates: aggregateStats,
      individualScores: showIndividualScores ? individualResults : undefined,
      filters: {
        applied: filters,
        available: filterOptions,
      },
      scale: {
        min: survey.scale.min,
        max: survey.scale.max,
        type: survey.surveyType,
      },
    });
  } catch (error) {
    console.error('Error generating weighted scoring report:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
