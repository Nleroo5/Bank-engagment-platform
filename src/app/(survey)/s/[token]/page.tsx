import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { SurveyShell } from '@/components/survey/SurveyShell';
import { SurveyError } from '@/components/survey/SurveyError';

interface SurveyPageProps {
  params: {
    token: string;
  };
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { token } = params;

  // Validate token format
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token
    )
  ) {
    notFound();
  }

  // Look up invitation by token
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      campaign: true,
      responses: true,
      user: true,
    },
  });

  if (!invitation) {
    return (
      <SurveyError
        icon="error"
        title="Survey Not Found"
        message="This survey link is not valid or has been removed from the system."
      />
    );
  }

  // Check if already completed
  if (invitation.status === 'COMPLETED') {
    const completedDate = invitation.completedAt
      ? new Date(invitation.completedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'recently';

    return (
      <SurveyError
        icon="completed"
        title="Survey Already Completed"
        message="You have already submitted your responses for this survey. Thank you for your participation!"
        details={`Completed on ${completedDate}`}
      />
    );
  }

  // Check if campaign is active
  if (invitation.campaign.status !== 'ACTIVE') {
    return (
      <SurveyError
        icon="locked"
        title="Survey Not Available"
        message="This survey is not currently active. It may be in draft mode or has been archived."
      />
    );
  }

  const now = new Date();

  // Check if not yet started
  if (invitation.campaign.startDate && new Date(invitation.campaign.startDate) > now) {
    const startDate = new Date(invitation.campaign.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <SurveyError
        icon="calendar"
        title="Survey Not Yet Available"
        message="This survey has not started yet. Please check back on the start date."
        details={`Available starting ${startDate}`}
      />
    );
  }

  // Check if expired
  if (invitation.campaign.endDate && new Date(invitation.campaign.endDate) < now) {
    const endDate = new Date(invitation.campaign.endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <SurveyError
        icon="locked"
        title="Survey Has Closed"
        message="This survey has expired and is no longer accepting responses."
        details={`Survey closed on ${endDate}`}
      />
    );
  }

  // Update invitation status to OPENED if it's still PENDING or SENT
  if (invitation.status === 'PENDING' || invitation.status === 'SENT') {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'OPENED',
        openedAt: new Date(),
      },
    });
  }

  // Fetch the survey from Sanity
  const survey = await getSurveyById(invitation.campaign.sanitysurveyId);

  if (!survey) {
    return (
      <SurveyError
        icon="error"
        title="Survey Content Not Found"
        message="The survey content could not be loaded. This may be a temporary issue."
        details="Please try refreshing the page or contact your survey administrator."
      />
    );
  }

  // Build existing responses map (handle both numeric and text values)
  const existingResponses: Record<string, number | string> = {};
  for (const response of invitation.responses) {
    // Use textValue if present, otherwise use numeric value
    existingResponses[response.sanityQuestionId] =
      response.textValue ?? response.value ?? 0;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <SurveyShell
        survey={survey}
        invitationToken={token}
        existingResponses={existingResponses}
        isCompleted={invitation.status === 'COMPLETED'}
      />
    </div>
  );
}
