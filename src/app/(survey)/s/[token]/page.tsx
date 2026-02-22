import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
import { SingleQuestionSurveyShell } from '@/components/survey/SingleQuestionSurveyShell';
import { SurveyError } from '@/components/survey/SurveyError';
import type { DemographicsQuestion } from '@/types/survey';
import { parseSplashConfig } from '@/types/splash';

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

  // Look up invitation by token.
  // Explicit select (not include) so that demographicsCompletedAt and
  // demographicsInvitationId are excluded from the SQL SELECT. This means
  // the query succeeds even if those columns haven't been migrated to the DB
  // yet. Demographics completion is checked via saved responses instead.
  // splashConfig is fetched with a fallback: if the column doesn't exist in the
  // DB yet, the query retries without it (returns null for splashConfig).
  const baseSelect = {
    id: true,
    status: true,
    completedAt: true,
    userId: true,
    campaign: {
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        surveyId: true,
        organizationId: true,
        survey: {
          select: { surveyType: true },
        },
      },
    },
    responses: {
      select: {
        questionId: true,
        value: true,
        textValue: true,
      },
    },
    user: {
      select: {
        id: true,
        division: true,
        jobRole: true,
        employmentStatus: true,
        gender: true,
        timeAtBank: true,
        bankExperience: true,
      },
    },
  } as const;

  const invitationRaw = await (async () => {
    try {
      return await prisma.invitation.findUnique({
        where: { token },
        select: {
          ...baseSelect,
          campaign: {
            select: {
              ...baseSelect.campaign.select,
              splashConfig: true,
            },
          },
        },
      });
    } catch {
      // splashConfig column may not exist yet — retry without it
      const row = await prisma.invitation.findUnique({
        where: { token },
        select: baseSelect,
      });
      if (!row) return null;
      return { ...row, campaign: { ...row.campaign, splashConfig: null } };
    }
  })();
  const invitation = invitationRaw;

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

  // Check if invitation has been explicitly expired
  if (invitation.status === 'EXPIRED') {
    return (
      <SurveyError
        icon="locked"
        title="Survey Invitation Expired"
        message="This survey invitation has expired and can no longer be accessed."
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
  // Demographics questions are hardcoded here — they never change
  // and do not depend on a survey record existing in the database.
  // Stable IDs (demo_*) are used so PATCH /api/responses can upsert
  // them via the invitationId+questionId unique constraint without
  // needing a matching row in the questions table.
  // ============================================================
  const DEMOGRAPHICS_QUESTIONS: DemographicsQuestion[] = [
    { _id: 'demo_bankName', number: 1, text: 'Name of Bank', fieldType: 'bankName' },
    { _id: 'demo_country', number: 2, text: 'Country', fieldType: 'country' },
    { _id: 'demo_state', number: 3, text: 'State / Province', fieldType: 'state' },
    { _id: 'demo_metroArea', number: 4, text: 'Metro City Area', fieldType: 'metroArea' },
    { _id: 'demo_city', number: 5, text: 'City', fieldType: 'city' },
    { _id: 'demo_bankSize', number: 6, text: 'Size of Bank (Assets)', fieldType: 'bankSize' },
    { _id: 'demo_device', number: 7, text: 'Device Used', fieldType: 'device' },
    { _id: 'demo_employmentStatus', number: 8, text: 'Employment Status', fieldType: 'employmentStatus' },
    { _id: 'demo_gender', number: 9, text: 'Gender', fieldType: 'gender' },
    { _id: 'demo_timeAtBank', number: 10, text: 'Time at This Bank', fieldType: 'timeAtBank' },
    { _id: 'demo_bankExperience', number: 11, text: 'Total Banking Industry Experience', fieldType: 'bankExperience' },
    { _id: 'demo_division', number: 12, text: 'Bank Division', fieldType: 'division' },
    { _id: 'demo_jobRole', number: 13, text: 'Job Role', fieldType: 'jobRole' },
  ];

  const isDemographicsSurvey =
    invitation.campaign.survey.surveyType === 'demographics';

  // Check demographics completion via saved responses.
  // This is robust: works without the demographicsCompletedAt DB column.
  const demoQuestionIds = new Set(DEMOGRAPHICS_QUESTIONS.map((q) => q._id));
  const savedDemoIds = new Set(
    invitation.responses
      .filter((r) => demoQuestionIds.has(r.questionId))
      .map((r) => r.questionId)
  );
  const demographicsAlreadyCompleted = savedDemoIds.size >= demoQuestionIds.size;

  const demographicsQuestions: DemographicsQuestion[] =
    !isDemographicsSurvey && !demographicsAlreadyCompleted
      ? DEMOGRAPHICS_QUESTIONS
      : [];
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
        splashConfig={parseSplashConfig(invitation.campaign.splashConfig)}
        campaignEndDate={invitation.campaign.endDate}
      />
    </div>
  );
}
