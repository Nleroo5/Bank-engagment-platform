import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EditCampaignForm } from '@/components/admin/EditCampaignForm';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditCampaignPageProps {
  params: {
    id: string;
  };
}

export default async function EditCampaignPage({
  params,
}: EditCampaignPageProps) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: params.id },
    include: {
      organization: true,
    },
  });

  if (!campaign) {
    notFound();
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href={`/admin/campaigns/${params.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaign
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update campaign settings and dates
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <EditCampaignForm campaign={campaign} />
      </div>
    </div>
  );
}
