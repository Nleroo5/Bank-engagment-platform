-- Migration: Add soft delete columns to survey_campaigns
-- Run this in Supabase SQL Editor

-- Add deletedAt column
ALTER TABLE "survey_campaigns"
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add deletedBy column
ALTER TABLE "survey_campaigns"
ADD COLUMN "deletedBy" TEXT;

-- Add index on deletedAt for efficient filtering
CREATE INDEX "survey_campaigns_deletedAt_idx" ON "survey_campaigns"("deletedAt");

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'survey_campaigns'
  AND column_name IN ('deletedAt', 'deletedBy')
ORDER BY column_name;
