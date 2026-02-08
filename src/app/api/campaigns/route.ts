import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';

const createCampaignSchema = z.object({
  surveyId: z.string(),
  organizationId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reminderDays: z.string().transform((val) => parseInt(val, 10)),
});

export async function GET() {
  try {
    const campaigns = await prisma.surveyCampaign.findMany({
      include: {
        organization: true,
        invitations: true,
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
    const { surveyId, organizationId, startDate, endDate, reminderDays } =
      createCampaignSchema.parse(body);

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
