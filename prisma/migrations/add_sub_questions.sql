-- Add sub-question support to questions table
-- parentQuestionId: references parent question for sub-questions (null for standalone/parent questions)
-- subQuestionLetter: empty string for parents, "a"/"b"/"c" for sub-questions

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "parentQuestionId" UUID REFERENCES "questions"("id") ON DELETE CASCADE;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "subQuestionLetter" VARCHAR(5) NOT NULL DEFAULT '';

-- Drop old unique constraint and create new composite one
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_surveyId_questionNumber_key";
ALTER TABLE "questions" ADD CONSTRAINT "questions_surveyId_questionNumber_subQuestionLetter_key" UNIQUE ("surveyId", "questionNumber", "subQuestionLetter");

-- Index for efficient sub-question lookups
CREATE INDEX IF NOT EXISTS "questions_parentQuestionId_idx" ON "questions"("parentQuestionId");
