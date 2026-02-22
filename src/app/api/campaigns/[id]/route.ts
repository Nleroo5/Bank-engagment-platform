import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SplashConfigSchema = z.object({
  bankName: z.string().max(100).optional(),
  logoUrl: z.string().url().max(500).optional(),
  welcomeTitle: z.string().max(200).optional(),
  welcomeMessage: z.string().max(500).optional(),
  buttonText: z.string().max(50).optional(),
}).strict();

const updateCampaignSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reminderDays: z.number().int().min(1).max(30).optional(),
  splashConfig: SplashConfigSchema.nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        invitations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

    // Return 404 if campaign is deleted (unless explicitly requesting deleted campaigns)
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
    const body = await request.json();
    const data = updateCampaignSchema.parse(body);

    // Check if campaign exists
    const existingCampaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Run the update without an inline include — avoids UPDATE...RETURNING
    // issues with pgbouncer and ensures the write succeeds independently.
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

    // Fetch the updated campaign in a separate read query (same pattern the
    // page uses, which is known to work in production).
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        invitations: true,
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
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if campaign exists and is not already deleted
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
      include: {
        invitations: {
          where: {
            status: 'COMPLETED',
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

    if (campaign.deletedAt) {
      return NextResponse.json(
        { error: 'Campaign is already deleted' },
        { status: 400 }
      );
    }

    // Soft delete: Mark campaign as deleted with timestamp
    // Note: In production, you'd get the user ID from the auth session
    // For now, using the createdById as a fallback or 'system'
    const deletedBy = campaign.createdById || 'system';

    const updatedCampaign = await prisma.surveyCampaign.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: deletedBy,
      },
    });

    // Return success with deletion metadata
    return NextResponse.json({
      success: true,
      campaignId: updatedCampaign.id,
      deletedAt: updatedCampaign.deletedAt,
      deletedBy: updatedCampaign.deletedBy,
      completedResponses: campaign.invitations.length,
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
