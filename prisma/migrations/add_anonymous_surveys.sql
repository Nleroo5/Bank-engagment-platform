-- Add anonymous survey fields to survey_campaigns table
ALTER TABLE "survey_campaigns"
ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "accessCode" TEXT,
ADD COLUMN IF NOT EXISTS "maxResponses" INTEGER;

-- Add unique constraint on accessCode
CREATE UNIQUE INDEX IF NOT EXISTS "survey_campaigns_accessCode_key" ON "survey_campaigns"("accessCode");

-- Add index for accessCode lookups
CREATE INDEX IF NOT EXISTS "survey_campaigns_accessCode_idx" ON "survey_campaigns"("accessCode");

-- Create anonymous_responses table
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

-- Create anonymous_response_items table
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

-- Add unique constraint on anonymousResponseId + sanityQuestionId
CREATE UNIQUE INDEX IF NOT EXISTS "anonymous_response_items_anonymousResponseId_sanityQuestio_key"
ON "anonymous_response_items"("anonymousResponseId", "sanityQuestionId");

-- Add unique constraint on sessionToken
CREATE UNIQUE INDEX IF NOT EXISTS "anonymous_responses_sessionToken_key" ON "anonymous_responses"("sessionToken");

-- Add indexes for anonymous_responses
CREATE INDEX IF NOT EXISTS "anonymous_responses_campaignId_idx" ON "anonymous_responses"("campaignId");
CREATE INDEX IF NOT EXISTS "anonymous_responses_sessionToken_idx" ON "anonymous_responses"("sessionToken");
CREATE INDEX IF NOT EXISTS "anonymous_responses_ipHash_idx" ON "anonymous_responses"("ipHash");
CREATE INDEX IF NOT EXISTS "anonymous_responses_browserFingerprint_idx" ON "anonymous_responses"("browserFingerprint");

-- Add index for anonymous_response_items
CREATE INDEX IF NOT EXISTS "anonymous_response_items_anonymousResponseId_idx" ON "anonymous_response_items"("anonymousResponseId");

-- Add foreign key constraints
ALTER TABLE "anonymous_responses"
ADD CONSTRAINT "anonymous_responses_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "survey_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "anonymous_response_items"
ADD CONSTRAINT "anonymous_response_items_anonymousResponseId_fkey"
FOREIGN KEY ("anonymousResponseId") REFERENCES "anonymous_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verify migration completed successfully
SELECT
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'anonymous_responses') as anonymous_responses_table_created,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'anonymous_response_items') as anonymous_response_items_table_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'survey_campaigns' AND column_name = 'isAnonymous') as isAnonymous_column_added,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'survey_campaigns' AND column_name = 'accessCode') as accessCode_column_added;
