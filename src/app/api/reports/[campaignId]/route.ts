import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
import {
  calculateCategoryScores,
  prepareResponsesForScoring,
} from '@/lib/scoring/categoryScoring';
import {
  getFilterableOptions,
  ANONYMOUS_SURVEY_TYPES,
  getFilterableOptionsAnonymous,
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
        anonymousResponses: {
          where: { completedAt: { not: null } },
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

    // Determine if this is an anonymous campaign
    const isAnonymous = campaign.isAnonymous;

    // Fetch survey from Sanity with full question and category data
    let survey;
    try {
      survey = await getSurveyById(campaign.surveyId);
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
            campaign.surveyId,
        },
        { status: 503 }
      );
    }

    if (!survey) {
      return NextResponse.json(
        {
          error: 'Survey content not found',
          message:
            `Survey with ID "${campaign.surveyId}" was not found in Sanity.\n\n` +
            'Please create the survey content in Sanity Studio first, or update the campaign to reference an existing survey.',
        },
        { status: 404 }
      );
    }

    // Check if this is a demographics survey (doesn't need scoring)
    const isDemographicsSurvey = survey.surveyType === 'demographics';

    // Validate survey has scale information (skip for demographics)
    if (!isDemographicsSurvey && !survey.scale) {
      return NextResponse.json(
        {
          error: 'Survey configuration incomplete',
          message:
            'Survey is missing scale information. Please configure the scale in Sanity Studio.',
        },
        { status: 400 }
      );
    }

    // DISABLED: Anonymity threshold check removed per user request
    // Users want to view reports immediately regardless of response count
    // const meetsThreshold = isAnonymous
    //   ? campaign.anonymousResponses.length >= 5
    //   : await checkAnonymityThreshold(campaign.id, survey.surveyType);
    //
    // if (!meetsThreshold) {
    //   return NextResponse.json(
    //     {
    //       error: 'Insufficient respondents',
    //       message:
    //         'This survey requires a minimum of 5 completed responses before viewing results to protect respondent anonymity.',
    //       requiresAnonymity: true,
    //       threshold: 5,
    //     },
    //     { status: 403 }
    //   );
    // }

    // Get filter options for demographics
    const filterOptions = isAnonymous
      ? await getFilterableOptionsAnonymous(campaign.id)
      : await getFilterableOptions(campaign.id, survey.surveyType);

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

    // ============================================
    // DEMOGRAPHICS SURVEY HANDLING
    // ============================================
    if (isDemographicsSurvey) {
      // Get all responses (tracked or anonymous)
      const responses = isAnonymous
        ? campaign.anonymousResponses
        : campaign.invitations.filter((inv) => inv.status === 'COMPLETED');

      // Extract demographics data from each response
      const demographicsData: Record<string, unknown>[] = responses.map((r) => {
        if (isAnonymous) {
          // For anonymous responses, extract demographics JSON field
          const anonResp = r as typeof campaign.anonymousResponses[number];
          return (anonResp.demographics as Record<string, unknown>) || {};
        } else {
          // For tracked invitations, extract user demographic fields
          // Note: Only fields that exist on the User model (per schema)
          const invitation = r as typeof campaign.invitations[number];
          return {
            division: invitation.user.division,
            jobRole: invitation.user.jobRole,
            employmentStatus: invitation.user.employmentStatus,
            gender: invitation.user.gender,
            timeAtBank: invitation.user.timeAtBank,
            bankExperience: invitation.user.bankExperience,
          };
        }
      });

      // Calculate frequency distributions for each field
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
        // Count occurrences of each value
        const counts = new Map<string, number>();
        demographicsData.forEach((data) => {
          const value = data[field.key];
          if (value && typeof value === 'string') {
            counts.set(value, (counts.get(value) || 0) + 1);
          }
        });

        // Convert to array with percentages
        const total = demographicsData.length;
        const distribution = Array.from(counts.entries())
          .map(([value, count]) => ({
            value,
            count,
            percentage: Math.round((count / total) * 1000) / 10, // 1 decimal place
          }))
          .sort((a, b) => b.count - a.count); // Sort by count descending

        return {
          field: field.key,
          label: field.label,
          total,
          distribution,
        };
      });

      // Return demographics report data
      return NextResponse.json({
        campaign: {
          id: campaign.id,
          surveyTitle: campaign.surveyTitle,
          surveyType: survey.surveyType,
          organizationName: campaign.organization.name,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: campaign.status,
          isAnonymous,
        },
        metrics: {
          totalInvitations: isAnonymous
            ? campaign.anonymousResponses.length
            : campaign.invitations.length,
          completedCount: responses.length,
          completionRate:
            responses.length > 0
              ? Math.round(
                  (responses.length /
                    (isAnonymous
                      ? campaign.anonymousResponses.length
                      : campaign.invitations.length)) *
                    100
                )
              : 0,
        },
        demographics: {
          respondentCount: demographicsData.length,
          distributions,
        },
      });
    }

    // DISABLED: Filter anonymity validation removed per user request
    // Users want to view all reports regardless of respondent count
    // if (Object.keys(filters).length > 0) {
    //   const validation = isAnonymous
    //     ? await validateFilteredAnonymityAnonymous(campaign.id, filters)
    //     : await validateFilteredAnonymity(
    //         campaign.id,
    //         survey.surveyType,
    //         filters
    //       );
    //
    //   if (!validation.valid) {
    //     return NextResponse.json(
    //       {
    //         error: 'Filter results in too few respondents',
    //         message: `Only ${validation.count} respondents match these filters. Minimum 5 required for anonymity protection.`,
    //         count: validation.count,
    //       },
    //       { status: 400 }
    //     );
    //   }
    // }

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

    // Prepare data based on campaign type
    let filteredData: Array<{
      id: string;
      responses: Array<{
        questionId: string;
        questionNumber: number;
        value: number | null;
        adjustedValue: number | null;
      }>;
      demographics?: Record<string, unknown>;
      user?: { name?: string; email: string } & Record<string, unknown>;
    }>;

    if (isAnonymous) {
      // Filter anonymous responses based on demographics JSON
      filteredData = campaign.anonymousResponses
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
    } else {
      // Filter tracked invitations based on User demographics
      filteredData = campaign.invitations
        .filter((inv) => inv.status === 'COMPLETED')
        .filter((inv) => {
          if (Object.keys(filters).length === 0) return true;

          return Object.entries(filters).every(([key, value]) => {
            return inv.user[key as keyof typeof inv.user] === value;
          });
        })
        .map((inv) => ({
          id: inv.id,
          responses: inv.responses,
          user: {
            ...inv.user,
            name: inv.user.name ?? undefined,
          },
        }));
    }

    // Calculate weighted scores for each respondent
    const individualResults = filteredData.map((data) => {
      // Prepare responses for scoring
      const preparedResponses = prepareResponsesForScoring(
        data.responses.map((r) => ({
          questionId: r.questionId,
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
        data.id,
        survey.scale!.min,
        survey.scale!.max,
        survey.surveyType as 'likert3' | 'likert5'
      );

      return {
        userId: isAnonymous ? 'anonymous' : data.user?.email || 'unknown',
        userName: isAnonymous
          ? 'Anonymous'
          : data.user?.name || data.user?.email || 'Unknown',
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
    const totalCount = isAnonymous
      ? campaign.anonymousResponses.length
      : campaign.invitations.length;
    const completedCount = filteredData.length;
    const completionRate =
      totalCount > 0
        ? Math.round((completedCount / totalCount) * 100 * 10) / 10
        : 0;

    // Calculate section-level aggregates
    const sectionAggregates = survey.sections.map((section) => {
      const sectionQuestionIds = section.questions.map((q) => q._id);

      // Collect all responses for this section
      const allSectionResponses: number[] = [];

      filteredData.forEach((data) => {
        const sectionResponses = data.responses.filter((r) =>
          sectionQuestionIds.includes(r.questionId)
        );

        sectionResponses.forEach((response) => {
          // Use adjustedValue if available (for reverse-scored), otherwise use raw value
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

    // Map categories to the expected format
    const categoryScores = aggregateStats.map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      averageScore: cat.averageWeightedScore,
      questionCount: cat.questionCount,
      responseCount: cat.respondentCount,
    }));

    // Calculate simple overall score (average of all adjusted responses)
    const allResponses = filteredData.flatMap((data) =>
      data.responses.map((r) => (r.adjustedValue ?? r.value ?? 0) as number)
    );
    const overallScore =
      allResponses.length > 0
        ? allResponses.reduce((sum: number, val: number) => sum + val, 0) /
          allResponses.length
        : 0;

    // Determine if individual scores should be shown
    // Never show for anonymous campaigns or Associate 180
    const showIndividualScores =
      !isAnonymous &&
      !ANONYMOUS_SURVEY_TYPES.includes(survey.surveyType.toLowerCase());

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
        isAnonymous,
      },
      metrics: {
        totalInvitations: totalCount,
        completedCount: isAnonymous
          ? campaign.anonymousResponses.length
          : campaign.invitations.filter((inv) => inv.status === 'COMPLETED')
              .length,
        completionRate,
        filteredCount: filteredData.length,
      },
      scores: {
        overall: Math.round(overallScore * 10) / 10,
        categories: categoryScores,
        sections: sectionAggregates,
      },
      categoryAggregates: aggregateStats,
      individualScores: showIndividualScores ? individualResults : undefined,
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
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
