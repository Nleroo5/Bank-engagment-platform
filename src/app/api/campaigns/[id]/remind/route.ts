import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { sendReminder } from '@/lib/email/send';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Only allow sending reminders for ACTIVE campaigns
    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign must be ACTIVE to send reminders' },
        { status: 400 }
      );
    }

    // Fetch survey details from Sanity
    const survey = await getSurveyById(campaign.sanitysurveyId);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey content not found in CMS' },
        { status: 404 }
      );
    }

    // Find invitations that need reminders
    // Send to users who have SENT or OPENED status (not COMPLETED or IN_PROGRESS)
    const invitationsToRemind = campaign.invitations.filter(
      (inv) => inv.status === 'SENT' || inv.status === 'OPENED'
    );

    if (invitationsToRemind.length === 0) {
      return NextResponse.json({
        success: true,
        remindersSent: 0,
        message: 'No invitations need reminders at this time.',
      });
    }

    // Send reminder emails
    let remindersSent = 0;
    const emailErrors: string[] = [];

    for (const invitation of invitationsToRemind) {
      try {
        if (!invitation.user) {
          emailErrors.push(`Failed to send reminder for invitation ${invitation.id}: User not found`);
          continue;
        }

        await sendReminder(invitation, campaign, survey);

        // Update the invitation to track that a reminder was sent
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            reminderSentAt: new Date(),
          },
        });

        remindersSent++;
      } catch (error) {
        console.error(`Failed to send reminder email to ${invitation.userId}:`, error);
        emailErrors.push(
          `Failed to send to ${invitation.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      message: `Successfully sent ${remindersSent} reminder emails.`,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
