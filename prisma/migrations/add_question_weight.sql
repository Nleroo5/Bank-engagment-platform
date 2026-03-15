-- Migration: Add weight column to questions table
-- Purpose: Move scoring weights from category-level to question-level
-- Backfill: Copy each question's weight from its category so existing surveys are unchanged

-- Add the weight column with default 1.0
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0;

-- Backfill existing questions with their category's weight
UPDATE "questions" q
SET "weight" = c."weight"
FROM "question_categories" qc
JOIN "categories" c ON c."id" = qc."categoryId"
WHERE qc."questionId" = q."id";
