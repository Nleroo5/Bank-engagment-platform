import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS "demographicsCompletedAt" TIMESTAMP WITH TIME ZONE
  `);
  console.log('Added demographicsCompletedAt column');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS "demographicsInvitationId" TEXT
  `);
  console.log('Added demographicsInvitationId column');

  console.log('Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
