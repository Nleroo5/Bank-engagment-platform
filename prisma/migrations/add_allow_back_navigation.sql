-- Add allowBackNavigation column to survey_campaigns
-- Defaults to false (no back navigation) for existing campaigns
ALTER TABLE "survey_campaigns" ADD COLUMN IF NOT EXISTS "allowBackNavigation" BOOLEAN NOT NULL DEFAULT false;
