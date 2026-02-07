import { Resend } from 'resend';
import { render } from '@react-email/components';
import type { Invitation, SurveyCampaign, User } from '@prisma/client';
import type { Survey } from '@/types/survey';
import { InvitationEmail } from './templates/InvitationEmail';
import { ReminderEmail } from './templates/ReminderEmail';
import { ConfirmationEmail } from './templates/ConfirmationEmail';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const IS_DEVELOPMENT = !RESEND_API_KEY || process.env.NODE_ENV === 'development';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Mock email sending for development - logs to console instead of sending
 */
async function mockSendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  console.log('\n📧 [DEV MODE] Email would be sent:');
  console.log('  From:', params.from);
  console.log('  To:', params.to);
  console.log('  Subject:', params.subject);
  console.log('  Preview: Open your terminal to see full HTML\n');

  return {
    id: `mock-${Date.now()}`,
    from: params.from,
    to: params.to,
    created_at: new Date().toISOString(),
  };
}

interface InvitationWithUser extends Invitation {
  user: User;
}

/**
 * Sends a survey invitation email
 */
export async function sendInvitation(
  invitation: InvitationWithUser,
  campaign: SurveyCampaign,
  survey: Survey
) {
  try {
    const surveyLink = `${BASE_URL}/s/${invitation.token}`;
    const deadline = campaign.endDate
      ? new Date(campaign.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined;

    const html = await render(
      InvitationEmail({
        surveyTitle: survey.title,
        surveyLink,
        organizationName: campaign.organizationId, // This should be organization name
        deadline,
        estimatedMinutes: survey.estimatedMinutes,
      })
    );

    // Use mock email in development mode
    if (IS_DEVELOPMENT || !resend) {
      const mockData = await mockSendEmail({
        from: EMAIL_FROM,
        to: invitation.user.email,
        subject: `Survey Invitation: ${survey.title}`,
        html,
      });
      return mockData;
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: invitation.user.email,
      subject: `Survey Invitation: ${survey.title}`,
      html,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}

/**
 * Sends a reminder email for incomplete surveys
 */
export async function sendReminder(
  invitation: InvitationWithUser,
  campaign: SurveyCampaign,
  survey: Survey
) {
  try {
    const surveyLink = `${BASE_URL}/s/${invitation.token}`;

    // Calculate days remaining
    const now = new Date();
    const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
    const daysRemaining = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 7; // Default to 7 days if no end date

    const deadline = endDate
      ? endDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined;

    const html = await render(
      ReminderEmail({
        surveyTitle: survey.title,
        surveyLink,
        organizationName: campaign.organizationId, // This should be organization name
        daysRemaining: Math.max(0, daysRemaining),
        deadline,
      })
    );

    // Use mock email in development mode
    if (IS_DEVELOPMENT || !resend) {
      const mockData = await mockSendEmail({
        from: EMAIL_FROM,
        to: invitation.user.email,
        subject: `Reminder: ${survey.title} - ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`,
        html,
      });
      return mockData;
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: invitation.user.email,
      subject: `Reminder: ${survey.title} - ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`,
      html,
    });

    if (error) {
      console.error('Error sending reminder email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    throw error;
  }
}

/**
 * Sends a confirmation email after survey completion
 */
export async function sendConfirmation(
  invitation: InvitationWithUser,
  campaign: SurveyCampaign,
  survey: Survey
) {
  try {
    const completedAt = invitation.completedAt
      ? new Date(invitation.completedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        });

    const html = await render(
      ConfirmationEmail({
        surveyTitle: survey.title,
        organizationName: campaign.organizationId, // This should be organization name
        completedAt,
      })
    );

    // Use mock email in development mode
    if (IS_DEVELOPMENT || !resend) {
      const mockData = await mockSendEmail({
        from: EMAIL_FROM,
        to: invitation.user.email,
        subject: `Thank you for completing: ${survey.title}`,
        html,
      });
      return mockData;
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: invitation.user.email,
      subject: `Thank you for completing: ${survey.title}`,
      html,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    throw error;
  }
}
