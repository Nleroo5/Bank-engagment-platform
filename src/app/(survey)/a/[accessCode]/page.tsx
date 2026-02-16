import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import AnonymousSurveyShell from '@/components/survey/AnonymousSurveyShell';
import AccessCodeEntry from '@/components/survey/AccessCodeEntry';

interface AnonymousSurveyPageProps {
  params: {
    accessCode: string;
  };
}

/**
 * Anonymous Survey Page
 *
 * Route: /a/[accessCode]
 *
 * Public page for anonymous surveys:
 * 1. If no session cookie: Show access code entry + CAPTCHA
 * 2. If session cookie exists: Load partial responses and show survey
 * 3. If already completed: Show thank you message
 */
export default async function AnonymousSurveyPage({
  params,
}: AnonymousSurveyPageProps) {
  const { accessCode } = params;
  const normalizedCode = accessCode.toUpperCase();

  // ============================================
  // 1. Lookup campaign by access code
  // ============================================
  const campaign = await prisma.surveyCampaign.findUnique({
    where: {
      accessCode: normalizedCode,
      deletedAt: null,
    },
    select: {
      id: true,
      surveyTitle: true,
      surveyId: true,
      isAnonymous: true,
      status: true,
      startDate: true,
      endDate: true,
      maxResponses: true,
    },
  });

  if (!campaign) {
    notFound();
  }

  // Verify this is an anonymous campaign
  if (!campaign.isAnonymous) {
    // Redirect to error page or show message
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Invalid Survey Type
          </h1>
          <p className="text-gray-700">
            This survey uses personalized invitations. Please use the link sent
            to your email.
          </p>
        </div>
      </div>
    );
  }

  // Check if campaign is active
  const now = new Date();
  const isActive =
    campaign.status === 'ACTIVE' &&
    (!campaign.startDate || now >= campaign.startDate) &&
    (!campaign.endDate || now <= campaign.endDate);

  if (!isActive) {
    const message =
      campaign.status !== 'ACTIVE'
        ? 'This survey is not currently active.'
        : now < (campaign.startDate || now)
          ? 'This survey has not started yet.'
          : 'This survey has ended. Thank you for your interest.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">
            Survey Unavailable
          </h1>
          <p className="text-gray-700">{message}</p>
        </div>
      </div>
    );
  }

  // Check max responses limit
  if (campaign.maxResponses) {
    const completedCount = await prisma.anonymousResponse.count({
      where: {
        campaignId: campaign.id,
        completedAt: { not: null },
      },
    });

    if (completedCount >= campaign.maxResponses) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
            <h1 className="mb-4 text-2xl font-bold text-gray-800">
              Survey Full
            </h1>
            <p className="text-gray-700">
              This survey has reached its maximum number of responses. Thank you
              for your interest.
            </p>
          </div>
        </div>
      );
    }
  }

  // ============================================
  // 2. Check for existing session cookie
  // ============================================
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('anonymous_session')?.value;

  if (sessionToken) {
    // Verify session exists and belongs to this campaign
    const anonymousResponse = await prisma.anonymousResponse.findUnique({
      where: { sessionToken },
      include: {
        responses: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (anonymousResponse && anonymousResponse.campaignId === campaign.id) {
      // Session exists for this campaign
      if (anonymousResponse.completedAt) {
        // Already completed
        return (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
              <h1 className="mb-4 text-2xl font-bold text-green-600">
                Thank You!
              </h1>
              <p className="mb-4 text-gray-700">
                Your anonymous responses have been recorded.
              </p>
              <p className="text-sm text-gray-600">
                You may now close this window. Your feedback is valuable and
                will help improve our organization.
              </p>
            </div>
          </div>
        );
      }

      // Resume partial survey
      return (
        <AnonymousSurveyShell
          campaign={campaign}
          existingResponses={anonymousResponse.responses}
          sessionToken={sessionToken}
          demographics={
            anonymousResponse.demographics as Record<string, unknown> | null
          }
        />
      );
    }
  }

  // ============================================
  // 3. No session: Show access code entry
  // ============================================
  return (
    <AccessCodeEntry
      accessCode={normalizedCode}
      surveyTitle={campaign.surveyTitle}
    />
  );
}
