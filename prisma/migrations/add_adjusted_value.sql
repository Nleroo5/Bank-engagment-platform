-- Migration: Add adjustedValue column to responses table
-- Date: 2026-02-07
-- Purpose: Store reverse-scored values for weighted scoring calculations

-- Add the adjustedValue column
ALTER TABLE "responses"
ADD COLUMN IF NOT EXISTS "adjustedValue" INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN "responses"."adjustedValue" IS 'Value after reverse-scoring applied (if question has isReversed=true). Used for weighted category scoring calculations.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'responses'
  AND column_name IN ('value', 'adjustedValue');
