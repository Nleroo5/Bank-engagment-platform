import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get the appropriate database URL for the environment
// In production/serverless, use pooled connection to avoid prepared statement errors
function getDatabaseUrl(): string | undefined {
  // If explicitly set, use the pooled URL for serverless
  if (process.env.POOLED_DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // For Vercel/production, ensure we have pgbouncer parameter
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const url = process.env.DATABASE_URL;
    if (url && !url.includes('pgbouncer=true')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}pgbouncer=true&connection_limit=1`;
    }
  }

  return process.env.DATABASE_URL;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
