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

const updateCampaignSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  splashConfig: SplashConfigSchema.nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
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
      where: { id: params.id },
      include: {
        organization: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.deletedAt) {
      return NextResponse.json(
        {
          error: 'Campaign has been deleted',
          deletedAt: campaign.deletedAt,
          deletedBy: campaign.deletedBy,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/campaigns/:id] Error:', message, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 30 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const data = updateCampaignSchema.parse(body);

    const existingCampaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    await prisma.surveyCampaign.update({
      where: { id: params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        splashConfig:
          data.splashConfig === null
            ? Prisma.JsonNull
            : data.splashConfig ?? undefined,
      },
    });

    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[PUT /api/campaigns/:id] Error:', message, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 30 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.deletedAt) {
      return NextResponse.json(
        { error: 'Campaign is already deleted' },
        { status: 400 }
      );
    }

    const deletedBy = campaign.createdById || 'system';

    const updatedCampaign = await prisma.surveyCampaign.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: deletedBy,
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: updatedCampaign.id,
      deletedAt: updatedCampaign.deletedAt,
      deletedBy: updatedCampaign.deletedBy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[DELETE /api/campaigns/:id] Error:', message, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
