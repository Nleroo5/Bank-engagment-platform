import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';

const createCampaignSchema = z.object({
  surveyId: z.string(),
  organizationId: z.string().uuid(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  reminderDays: z.number().int().min(1).max(30).default(3),
  isAnonymous: z.boolean().default(false),
  accessCode: z.string().min(6).max(20).optional(),
  maxResponses: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  try {
    // Fetch only non-deleted campaigns
    const campaigns = await prisma.surveyCampaign.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        organization: true,
        invitations: true,
        anonymousResponses: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      surveyId,
      organizationId,
      startDate,
      endDate,
      reminderDays,
      isAnonymous,
      accessCode,
      maxResponses,
    } = createCampaignSchema.parse(body);

    // Fetch survey from Sanity to get the title
    const survey = await getSurveyById(surveyId);

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Validate anonymous survey requirements
    if (isAnonymous) {
      if (!accessCode) {
        return NextResponse.json(
          { error: 'Access code is required for anonymous surveys' },
          { status: 400 }
        );
      }

      // Check access code uniqueness
      const existingCampaign = await prisma.surveyCampaign.findUnique({
        where: { accessCode: accessCode.toUpperCase() },
      });

      if (existingCampaign) {
        return NextResponse.json(
          { error: 'This access code is already in use' },
          { status: 400 }
        );
      }
    }

    // Create the campaign
    const campaign = await prisma.surveyCampaign.create({
      data: {
        sanitysurveyId: surveyId,
        surveyTitle: survey.title,
        organizationId,
        status: 'DRAFT',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reminderDays,
        isAnonymous,
        accessCode: isAnonymous && accessCode ? accessCode.toUpperCase() : null,
        maxResponses: isAnonymous ? maxResponses : null,
      },
      include: {
        organization: true,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
