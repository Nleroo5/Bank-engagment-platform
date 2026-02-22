import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
import { SingleQuestionSurveyShell } from '@/components/survey/SingleQuestionSurveyShell';
import { SurveyError } from '@/components/survey/SurveyError';

interface SurveyPageProps {
  params: {
    token: string;
  };
  searchParams: {
    returnTo?: string;
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SurveyPage({
  params,
  searchParams,
}: SurveyPageProps) {
  const { token } = params;

  // Validate token format
  if (!UUID_REGEX.test(token)) {
    notFound();
  }

  // Look up invitation by token — include campaign.survey for gate check
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      campaign: {
        include: { survey: true },
      },
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
  if (
    invitation.campaign.startDate &&
    new Date(invitation.campaign.startDate) > now
  ) {
    const startDate = new Date(
      invitation.campaign.startDate
    ).toLocaleDateString('en-US', {
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
  if (
    invitation.campaign.endDate &&
    new Date(invitation.campaign.endDate) < now
  ) {
    const endDate = new Date(invitation.campaign.endDate).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );

    return (
      <SurveyError
        icon="locked"
        title="Survey Has Closed"
        message="This survey has expired and is no longer accepting responses."
        details={`Survey closed on ${endDate}`}
      />
    );
  }

  // ============================================================
  // DEMOGRAPHICS GATE
  // Non-demographics surveys require demographics to be completed
  // first. Gate is enforced here (server) — not just in the UI.
  // ============================================================
  const isDemographicsSurvey =
    invitation.campaign.survey.surveyType === 'demographics';

  if (!isDemographicsSurvey) {
    const needsGate = invitation.demographicsCompletedAt === null;

    if (needsGate) {
      const orgId = invitation.campaign.organizationId;

      // Check if demographics was already completed (self-healing for
      // respondents who existed before this gate was introduced)
      const completedDemo = await prisma.invitation.findFirst({
        where: {
          userId: invitation.userId,
          status: 'COMPLETED',
          campaign: {
            organizationId: orgId,
            survey: { surveyType: 'demographics' },
          },
        },
        select: { id: true, completedAt: true },
      });

      if (completedDemo) {
        // Stamp the flag so future page loads skip this lookup
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            demographicsCompletedAt: completedDemo.completedAt,
            demographicsInvitationId: completedDemo.id,
          },
        });
        // Fall through — demographics already done, allow access
      } else {
        // Find their pending demographics invitation for this org
        const pendingDemo = await prisma.invitation.findFirst({
          where: {
            userId: invitation.userId,
            status: { not: 'COMPLETED' },
            campaign: {
              organizationId: orgId,
              survey: { surveyType: 'demographics' },
            },
          },
          select: { token: true },
        });

        if (pendingDemo) {
          // Redirect to demographics; returnTo brings them back here after
          redirect(`/s/${pendingDemo.token}?returnTo=${token}`);
        }

        // No demographics invitation found — admin needs to create one
        return (
          <SurveyError
            icon="locked"
            title="Prerequisites Not Set Up"
            message="You must complete the Demographics survey before accessing this survey. Please contact your survey administrator."
          />
        );
      }
    }
  }
  // ============================================================

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

  // Fetch the survey content from Postgres
  const survey = await getSurveyById(invitation.campaign.surveyId);

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
    existingResponses[response.questionId] =
      response.textValue ?? response.value ?? 0;
  }

  // Validate returnTo param: must be a valid UUID (security: never a full URL)
  let validatedReturnTo: string | undefined;
  if (searchParams?.returnTo && UUID_REGEX.test(searchParams.returnTo)) {
    validatedReturnTo = searchParams.returnTo;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <SingleQuestionSurveyShell
        survey={survey}
        invitationToken={token}
        existingResponses={existingResponses}
        isCompleted={invitation.status === 'COMPLETED'}
        returnTo={validatedReturnTo}
      />
    </div>
  );
}
