import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch the campaign
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        invitations: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Only allow sending for ACTIVE campaigns
    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign must be ACTIVE to send invitations' },
        { status: 400 }
      );
    }

    // Get all users in the organization
    const users = await prisma.user.findMany({
      where: {
        organizationId: campaign.organizationId,
        isActive: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No active users found in this organization' },
        { status: 400 }
      );
    }

    // Create invitations for users who don't already have one
    const existingUserIds = campaign.invitations.map((inv) => inv.userId);
    const newUsers = users.filter((user) => !existingUserIds.includes(user.id));

    const invitations = await Promise.all(
      newUsers.map((user) =>
        prisma.invitation.create({
          data: {
            campaignId: campaign.id,
            userId: user.id,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      )
    );

    // TODO: Send invitation emails
    // This would integrate with Resend or SendGrid
    // For now, we just create the invitations

    // Placeholder for email sending
    console.log(
      `Would send ${invitations.length} invitation emails for campaign ${campaign.id}`
    );

    return NextResponse.json({
      success: true,
      invitationsSent: invitations.length,
      totalInvitations: campaign.invitations.length + invitations.length,
      message: `Created ${invitations.length} new invitations. Email sending is not yet implemented.`,
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
