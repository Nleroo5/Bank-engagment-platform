import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Survey - Bank Engagement Survey Platform',
  description: 'Complete your survey',
};

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
