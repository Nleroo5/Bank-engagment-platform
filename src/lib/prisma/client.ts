import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get the appropriate database URL for the environment
// Always use pgbouncer parameter to avoid prepared statement errors
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return undefined;
  }

  // Always add pgbouncer parameter to prevent "prepared statement already exists" errors
  // This happens in both dev and production with hot reloading and serverless functions
  if (!url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}pgbouncer=true&connection_limit=1`;
  }

  return url;
}

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    // Only override the datasource URL when DATABASE_URL is actually present.
    // Passing `url: undefined` makes the PrismaClient constructor throw at import
    // time, which crashes `next build` — page-data collection imports this module
    // even for `force-dynamic` pages. When omitted, Prisma falls back to the
    // schema's env("DATABASE_URL"), so a missing URL fails at query time (runtime)
    // instead of breaking the build.
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
