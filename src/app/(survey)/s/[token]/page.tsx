import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
import { SingleQuestionSurveyShell } from '@/components/survey/SingleQuestionSurveyShell';
import { SurveyError } from '@/components/survey/SurveyError';

interface SurveyPageProps {
  params: {
    token: string;
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { token } = params;

  // Validate token format
  if (!UUID_REGEX.test(token)) {
    notFound();
  }

  // Look up invitation by token
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
  // DEMOGRAPHICS — shown inline before every non-demographics survey
  //
  // If the user hasn't completed demographics yet, fetch the
  // demographics questions from the published demographics survey
  // and pass them to the shell. The shell shows them as stage 1
  // before the actual survey questions.
  // ============================================================
  type DemographicsQuestion = {
    _id: string;
    number: number;
    text: string;
    fieldType: string;
  };

  const isDemographicsSurvey =
    invitation.campaign.survey.surveyType === 'demographics';

  let demographicsQuestions: DemographicsQuestion[] = [];

  if (!isDemographicsSurvey && invitation.demographicsCompletedAt === null) {
    const demoSurvey = await prisma.survey.findFirst({
      where: { surveyType: 'demographics', status: 'PUBLISHED' },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
          select: { id: true, questionNumber: true, text: true, config: true },
        },
      },
    });

    if (demoSurvey) {
      demographicsQuestions = demoSurvey.questions
        .map((q) => ({
          _id: q.id,
          number: q.questionNumber,
          text: q.text,
          fieldType:
            ((q.config as { fieldType?: string }) ?? {}).fieldType ?? '',
        }))
        .filter((q) => q.fieldType !== '');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <SingleQuestionSurveyShell
        survey={survey}
        invitationToken={token}
        existingResponses={existingResponses}
        isCompleted={invitation.status === 'COMPLETED'}
        demographicsQuestions={demographicsQuestions}
      />
    </div>
  );
}
