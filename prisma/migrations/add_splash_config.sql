-- Add splashConfig JSON column to survey_campaigns
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Prisma uses camelCase column names (matching the field names in schema.prisma).
-- The column must be named "splashConfig" (camelCase with quotes), NOT "splash_config".

ALTER TABLE survey_campaigns
ADD COLUMN IF NOT EXISTS "splashConfig" JSONB;
