import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { getCurrentUser } from '@/lib/auth/helpers';
import {
  calculateCategoryScores,
  calculateSectionScores,
  calculateSurveyScore,
} from '@/lib/scoring/calculate';
import {
  checkAnonymityThreshold,
  getFilterableOptions,
  validateFilteredAnonymity,
} from '@/lib/scoring/anonymity';
import type { Response } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch campaign
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.campaignId },
      include: {
        organization: true,
        invitations: {
          include: {
            user: true,
            responses: true,
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

    // Role-based access: ORG_ADMIN can only view their org's campaigns
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

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey content not found' },
        { status: 404 }
      );
    }

    // Check anonymity threshold for Survey 7
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

    // Collect all responses from filtered invitations
    const allResponses: Response[] = [];
    for (const invitation of filteredInvitations) {
      allResponses.push(...invitation.responses);
    }

    // Prepare question definitions
    const questions = survey.sections.flatMap((section) =>
      section.questions.map((q) => ({
        _id: q._id,
        questionNumber: q.number,
        isReversed: q.isReversed,
        category: q.category,
        section: { _id: section._id, title: section.title },
      }))
    );

    // Determine scale max
    const scaleMax = survey.surveyType === 'likert3' ? 3 : 5;

    // Calculate scores
    const surveyScore = calculateSurveyScore(allResponses, questions, scaleMax);
    const categoryScores = calculateCategoryScores(
      allResponses,
      questions,
      scaleMax
    );
    const sectionScores = calculateSectionScores(
      allResponses,
      questions,
      scaleMax
    );

    // Calculate response metrics
    const totalInvitations = campaign.invitations.length;
    const completedCount = filteredInvitations.length;
    const completionRate =
      totalInvitations > 0
        ? Math.round((completedCount / totalInvitations) * 100 * 10) / 10
        : 0;

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
        totalInvitations,
        completedCount,
        completionRate,
        filteredCount: filteredInvitations.length,
      },
      scores: {
        overall: surveyScore.averageScore,
        categories: categoryScores,
        sections: sectionScores,
      },
      filters: {
        applied: filters,
        available: filterOptions,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
