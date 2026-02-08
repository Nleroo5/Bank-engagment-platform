import { createClient, type ClientConfig } from '@sanity/client';

// Validate required environment variables
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '4z8cbios';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  console.warn(
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID environment variable. ' +
    'Using default project ID. ' +
    'Please add this variable to your Vercel environment variables.'
  );
}

const config: ClientConfig = {
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
};

export const sanityClient = createClient(config);

// Helper for fetching with Next.js caching
export async function sanityFetch<T>({
  query,
  params = {},
  tags = [],
}: {
  query: string;
  params?: Record<string, unknown>;
  tags?: string[];
}): Promise<T> {
  if (!projectId) {
    throw new Error(
      'Sanity client is not configured. Please set NEXT_PUBLIC_SANITY_PROJECT_ID environment variable in Vercel and redeploy.'
    );
  }

  return sanityClient.fetch<T>(query, params, {
    cache: 'no-store', // Changed from 'force-cache' to always fetch fresh data
    next: { tags },
  });
}
