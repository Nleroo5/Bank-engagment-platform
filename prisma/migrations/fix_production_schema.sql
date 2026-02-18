-- ============================================================
-- PRODUCTION SCHEMA REPAIR
-- Safe to run multiple times (all operations use IF NOT EXISTS /
-- existence checks before acting).
--
-- Run this in Supabase SQL Editor to fix any column mismatches
-- between the Prisma schema and the live database.
-- ============================================================

-- ─── 1. survey_campaigns: ensure all columns exist ──────────────────────────

ALTER TABLE "survey_campaigns"
  ADD COLUMN IF NOT EXISTS "surveyId"    TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy"   TEXT,
  ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "accessCode"  TEXT,
  ADD COLUMN IF NOT EXISTS "maxResponses" INTEGER;

-- Indexes for the columns added above (idempotent)
CREATE INDEX IF NOT EXISTS "survey_campaigns_surveyId_idx"   ON "survey_campaigns"("surveyId");
CREATE INDEX IF NOT EXISTS "survey_campaigns_deletedAt_idx"  ON "survey_campaigns"("deletedAt");
CREATE INDEX IF NOT EXISTS "survey_campaigns_status_idx"     ON "survey_campaigns"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "survey_campaigns_accessCode_key" ON "survey_campaigns"("accessCode");
CREATE INDEX IF NOT EXISTS "survey_campaigns_accessCode_idx" ON "survey_campaigns"("accessCode");


-- ─── 2. responses: fix sanityQuestionId → questionId ────────────────────────

DO $$
BEGIN
  -- Case A: old column name exists, new one does not → rename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'responses' AND column_name = 'sanityQuestionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'responses' AND column_name = 'questionId'
  ) THEN
    ALTER TABLE "responses" RENAME COLUMN "sanityQuestionId" TO "questionId";
    RAISE NOTICE 'responses: renamed sanityQuestionId → questionId';
  END IF;
END $$;

-- Ensure questionId exists regardless (no-op if already present)
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "questionId" TEXT;
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "adjustedValue" INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS "responses_questionId_idx" ON "responses"("questionId");


-- ─── 3. anonymous_response_items: fix sanityQuestionId → questionId ──────────

DO $$
BEGIN
  -- Drop the old unique constraint that references sanityQuestionId (if present)
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'anonymous_response_items'
      AND indexname = 'anonymous_response_items_anonymousResponseId_sanityQuestio_key'
  ) THEN
    DROP INDEX IF EXISTS "anonymous_response_items_anonymousResponseId_sanityQuestio_key";
    RAISE NOTICE 'anonymous_response_items: dropped old unique index on sanityQuestionId';
  END IF;

  -- Case A: old column name exists, new one does not → rename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anonymous_response_items' AND column_name = 'sanityQuestionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anonymous_response_items' AND column_name = 'questionId'
  ) THEN
    ALTER TABLE "anonymous_response_items" RENAME COLUMN "sanityQuestionId" TO "questionId";
    RAISE NOTICE 'anonymous_response_items: renamed sanityQuestionId → questionId';
  END IF;
END $$;

-- Ensure questionId exists regardless
ALTER TABLE "anonymous_response_items" ADD COLUMN IF NOT EXISTS "questionId" TEXT;
ALTER TABLE "anonymous_response_items" ADD COLUMN IF NOT EXISTS "adjustedValue" INTEGER;

-- Recreate unique constraint on the correct column name
CREATE UNIQUE INDEX IF NOT EXISTS "anonymous_response_items_anonymousResponseId_questionId_key"
  ON "anonymous_response_items"("anonymousResponseId", "questionId");

-- Indexes
CREATE INDEX IF NOT EXISTS "anonymous_response_items_questionId_idx" ON "anonymous_response_items"("questionId");


-- ─── 4. Verify ──────────────────────────────────────────────────────────────

SELECT
  'survey_campaigns columns' AS check_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_name = 'survey_campaigns'

UNION ALL

SELECT
  'responses columns' AS check_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_name = 'responses'

UNION ALL

SELECT
  'anonymous_response_items columns' AS check_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_name = 'anonymous_response_items';
