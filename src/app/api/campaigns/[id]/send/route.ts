import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { sendInvitation } from '@/lib/email/send';
import { rateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - use campaign ID as identifier to prevent abuse per campaign
    const rateLimitResult = rateLimit(
      `email-send-campaign-${params.id}`,
      RATE_LIMITS.EMAIL_SEND
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message:
            'Too many email requests for this campaign. Please try again later.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Fetch the campaign
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        invitations: {
          include: {
            user: true,
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

    // Fetch survey details from Sanity
    const survey = await getSurveyById(campaign.sanitysurveyId);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey content not found in CMS' },
        { status: 404 }
      );
    }

    // Send invitation emails
    let emailsSent = 0;
    const emailErrors: string[] = [];

    for (const invitation of invitations) {
      try {
        // Fetch the full invitation with user data
        const invitationWithUser = await prisma.invitation.findUnique({
          where: { id: invitation.id },
          include: { user: true },
        });

        if (!invitationWithUser || !invitationWithUser.user) {
          emailErrors.push(
            `Failed to send to invitation ${invitation.id}: User not found`
          );
          continue;
        }

        await sendInvitation(invitationWithUser, campaign, survey);
        emailsSent++;
      } catch (error) {
        console.error(
          `Failed to send invitation email to ${invitation.userId}:`,
          error
        );
        emailErrors.push(
          `Failed to send to ${invitation.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      invitationsSent: invitations.length,
      emailsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      totalInvitations: campaign.invitations.length + invitations.length,
      message: `Created ${invitations.length} new invitations. Successfully sent ${emailsSent} emails.`,
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
