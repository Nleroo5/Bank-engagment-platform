import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      organizationName,
      startDate,
      endDate,
      reminderDays,
      isAnonymous,
      accessCode,
      maxResponses,
    } = body;

    // Fetch survey from PostgreSQL to get the title
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { title: true },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Handle organization - either find existing or create new
    let finalOrganizationId = organizationId;

    if (!organizationId && organizationName) {
      // Create new organization
      const newOrganization = await prisma.organization.create({
        data: {
          name: organizationName,
        },
      });
      finalOrganizationId = newOrganization.id;
    } else if (organizationId) {
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
    } else {
      return NextResponse.json(
        { error: 'Organization name or ID is required' },
        { status: 400 }
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
        surveyId: surveyId,
        surveyTitle: survey.title,
        organizationId: finalOrganizationId,
        status: 'DRAFT',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reminderDays: parseInt(reminderDays) || 3,
        isAnonymous: Boolean(isAnonymous),
        accessCode: isAnonymous && accessCode ? accessCode.toUpperCase() : null,
        maxResponses: maxResponses ? parseInt(maxResponses) : null,
        // Note: maxInvitationUses would be stored per-invitation, not per-campaign
        // This can be implemented when creating invitations
      },
      include: {
        organization: true,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
