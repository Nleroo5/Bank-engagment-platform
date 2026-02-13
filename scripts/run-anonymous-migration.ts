import { PrismaClient } from '@prisma/client';

const directConnectionUrl = process.env.DATABASE_URL?.replace(
  'aws-1-us-east-2.pooler.supabase.com:6543',
  'aws-1-us-east-2.connect.supabase.com:5432'
);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directConnectionUrl,
    },
  },
});

async function runMigration() {
  try {
    console.log('Running anonymous survey migration...\n');

    // Step 1: Add fields to survey_campaigns
    console.log('1. Adding fields to survey_campaigns table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "survey_campaigns"
      ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "accessCode" TEXT,
      ADD COLUMN IF NOT EXISTS "maxResponses" INTEGER;
    `);
    console.log('✓ Fields added\n');

    // Step 2: Create indexes
    console.log('2. Creating indexes on survey_campaigns...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "survey_campaigns_accessCode_key" ON "survey_campaigns"("accessCode");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "survey_campaigns_accessCode_idx" ON "survey_campaigns"("accessCode");
    `);
    console.log('✓ Indexes created\n');

    // Step 3: Create anonymous_responses table
    console.log('3. Creating anonymous_responses table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anonymous_responses" (
        "id" TEXT NOT NULL,
        "campaignId" TEXT NOT NULL,
        "sessionToken" TEXT NOT NULL,
        "ipHash" TEXT,
        "browserFingerprint" TEXT,
        "demographics" JSONB,
        "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
        "flagReason" TEXT,
        "device" TEXT,
        "userAgent" TEXT,
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "anonymous_responses_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ Table created\n');

    // Step 4: Create indexes on anonymous_responses
    console.log('4. Creating indexes on anonymous_responses...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anonymous_responses_sessionToken_key" ON "anonymous_responses"("sessionToken");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anonymous_responses_campaignId_idx" ON "anonymous_responses"("campaignId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anonymous_responses_sessionToken_idx" ON "anonymous_responses"("sessionToken");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anonymous_responses_ipHash_idx" ON "anonymous_responses"("ipHash");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anonymous_responses_browserFingerprint_idx" ON "anonymous_responses"("browserFingerprint");
    `);
    console.log('✓ Indexes created\n');

    // Step 5: Create anonymous_response_items table
    console.log('5. Creating anonymous_response_items table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anonymous_response_items" (
        "id" TEXT NOT NULL,
        "anonymousResponseId" TEXT NOT NULL,
        "sanityQuestionId" TEXT NOT NULL,
        "questionNumber" INTEGER NOT NULL,
        "value" INTEGER,
        "adjustedValue" INTEGER,
        "textValue" TEXT,
        "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "anonymous_response_items_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ Table created\n');

    // Step 6: Create indexes on anonymous_response_items
    console.log('6. Creating indexes on anonymous_response_items...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anonymous_response_items_anonymousResponseId_sanityQuestio_key"
      ON "anonymous_response_items"("anonymousResponseId", "sanityQuestionId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anonymous_response_items_anonymousResponseId_idx" ON "anonymous_response_items"("anonymousResponseId");
    `);
    console.log('✓ Indexes created\n');

    // Step 7: Add foreign key constraints
    console.log('7. Adding foreign key constraints...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "anonymous_responses"
      ADD CONSTRAINT IF NOT EXISTS "anonymous_responses_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "survey_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "anonymous_response_items"
      ADD CONSTRAINT IF NOT EXISTS "anonymous_response_items_anonymousResponseId_fkey"
      FOREIGN KEY ("anonymousResponseId") REFERENCES "anonymous_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `);
    console.log('✓ Foreign keys added\n');

    // Verify migration
    console.log('8. Verifying migration...');
    const verification = await prisma.$queryRaw<Array<{ status: string; count: number }>>`
      SELECT
        'Migration completed successfully' as status,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'anonymous_responses')::int as count
    `;
    console.log('✓ Verification:', verification);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
