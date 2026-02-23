import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SplashConfigSchema = z.object({
  bankName: z.string().max(100).optional(),
  logoUrl: z.string().url().max(500).optional(),
  welcomeTitle: z.string().max(200).optional(),
  welcomeMessage: z.string().max(500).optional(),
  welcomeMessageFontSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  buttonText: z.string().max(50).optional(),
}).strict();

export async function GET() {
  try {
    const campaigns = await prisma.surveyCampaign.findMany({
      where: { deletedAt: null },
      include: {
        organization: true,
        anonymousResponses: true,
      },
      orderBy: { createdAt: 'desc' },
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
      accessCode,
      maxResponses,
      splashConfig,
    } = body;

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { title: true },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    let finalOrganizationId = organizationId;

    if (!organizationId && organizationName) {
      const newOrganization = await prisma.organization.create({
        data: { name: organizationName },
      });
      finalOrganizationId = newOrganization.id;
    } else if (organizationId) {
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

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }

    const existingCampaign = await prisma.surveyCampaign.findUnique({
      where: { accessCode: accessCode.toUpperCase() },
    });

    if (existingCampaign) {
      return NextResponse.json(
        { error: 'This access code is already in use' },
        { status: 400 }
      );
    }

    let validatedSplashConfig: z.infer<typeof SplashConfigSchema> | null = null;
    if (splashConfig != null) {
      const parsed = SplashConfigSchema.safeParse(splashConfig);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid splash configuration: ' + parsed.error.issues[0]?.message },
          { status: 400 }
        );
      }
      validatedSplashConfig = parsed.data;
    }

    const campaign = await prisma.surveyCampaign.create({
      data: {
        surveyId,
        surveyTitle: survey.title,
        organizationId: finalOrganizationId,
        status: 'DRAFT',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        accessCode: accessCode.toUpperCase(),
        maxResponses: maxResponses ? parseInt(maxResponses) : null,
        splashConfig: validatedSplashConfig ?? Prisma.JsonNull,
      },
      include: { organization: true },
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
