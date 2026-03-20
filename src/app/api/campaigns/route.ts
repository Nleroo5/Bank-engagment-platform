import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/helpers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Accepts https:// URLs (legacy) and data: URLs (base64 from upload route)
const logoUrlSchema = z
  .string()
  .max(2_000_000)
  .refine(
    (v) => /^https?:\/\//.test(v) || v.startsWith('data:image/'),
    'Must be an HTTP URL or image data URL'
  );

const SplashConfigSchema = z.object({
  bankName: z.string().max(100).optional(),
  logoUrl: logoUrlSchema.optional(),
  logoHeight: z.number().int().min(24).max(200).optional(),
  welcomeTitle: z.string().max(200).optional(),
  titleFontSize: z.number().int().min(20).max(60).optional(),
  welcomeMessage: z.string().max(2000).optional(),
  welcomeMessageFontSize: z.number().int().min(6).max(32).optional(),
  welcomeMessageAlignment: z.enum(['left', 'center', 'right']).optional(),
  buttonText: z.string().max(50).optional(),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  cardBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  titleAlignment: z.enum(['left', 'center', 'right']).optional(),
  anonymityNotice: z.string().max(300).optional(),
  footerNotes: z.string().max(1000).optional(),
  footerNotesAlignment: z.enum(['left', 'center', 'right']).optional(),
  platformLogoUrl: logoUrlSchema.optional(),
  platformLogoHeight: z.number().int().min(24).max(200).optional(),
  logoArrangement: z.enum(['side-by-side', 'stacked']).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const where = { deletedAt: null };

    const [campaigns, total] = await Promise.all([
      prisma.surveyCampaign.findMany({
        where,
        include: {
          organization: true,
          anonymousResponses: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.surveyCampaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let adminUserId: string | null = null;
  try {
    const admin = await requireAdmin();
    adminUserId = admin.id;
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 30 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const {
      surveyId,
      organizationId,
      organizationName,
      startDate,
      endDate,
      accessCode,
      maxResponses,
      splashConfig,
      allowBackNavigation,
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

    const existingCampaign = await prisma.surveyCampaign.findFirst({
      where: { accessCode: accessCode.toUpperCase(), deletedAt: null },
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
        allowBackNavigation: allowBackNavigation === true,
        splashConfig: validatedSplashConfig ?? Prisma.JsonNull,
        createdById: adminUserId,
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
