import { createClient, type ClientConfig } from '@sanity/client';

// Validate required environment variables
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  console.warn(
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID environment variable. ' +
    'Sanity client will not function correctly. ' +
    'Please add this variable to your Vercel environment variables and redeploy.'
  );
}

const config: ClientConfig = {
  projectId: projectId || 'placeholder', // Fallback to prevent build errors
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
  if (!projectId || projectId === 'placeholder') {
    throw new Error(
      'Sanity client is not configured. Please set NEXT_PUBLIC_SANITY_PROJECT_ID environment variable in Vercel and redeploy.'
    );
  }

  return sanityClient.fetch<T>(query, params, {
    cache: 'force-cache',
    next: { tags },
  });
}
