-- Migration: Add Survey Management System (Replace Sanity)
-- Execute this in Supabase SQL Editor

DO $$
BEGIN
  -- Create scales table
  CREATE TABLE IF NOT EXISTS "scales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scaleType" TEXT NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "labels" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scales_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "scales_name_key" ON "scales"("name");

  -- Create surveys table
  CREATE TABLE IF NOT EXISTS "surveys" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "surveyType" TEXT NOT NULL,
    "surveyNumber" TEXT,
    "surveyjsSchema" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "scaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "surveys_status_idx" ON "surveys"("status");
  CREATE INDEX IF NOT EXISTS "surveys_surveyType_idx" ON "surveys"("surveyType");

  -- Create sections table
  CREATE TABLE IF NOT EXISTS "sections" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "sections_surveyId_idx" ON "sections"("surveyId");

  -- Create questions table
  CREATE TABLE IF NOT EXISTS "questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "sectionId" TEXT,
    "questionNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "surveyjsName" TEXT NOT NULL,
    "config" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "questions_surveyId_questionNumber_key" ON "questions"("surveyId", "questionNumber");
  CREATE INDEX IF NOT EXISTS "questions_surveyId_idx" ON "questions"("surveyId");
  CREATE INDEX IF NOT EXISTS "questions_sectionId_idx" ON "questions"("sectionId");
  CREATE INDEX IF NOT EXISTS "questions_surveyjsName_idx" ON "questions"("surveyjsName");

  -- Create categories table
  CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "colorCode" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");

  -- Create question_categories junction table
  CREATE TABLE IF NOT EXISTS "question_categories" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_categories_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "question_categories_questionId_categoryId_key"
    ON "question_categories"("questionId", "categoryId");
  CREATE INDEX IF NOT EXISTS "question_categories_questionId_idx" ON "question_categories"("questionId");
  CREATE INDEX IF NOT EXISTS "question_categories_categoryId_idx" ON "question_categories"("categoryId");

  -- Add foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surveys_scaleId_fkey') THEN
    ALTER TABLE "surveys" ADD CONSTRAINT "surveys_scaleId_fkey"
      FOREIGN KEY ("scaleId") REFERENCES "scales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sections_surveyId_fkey') THEN
    ALTER TABLE "sections" ADD CONSTRAINT "sections_surveyId_fkey"
      FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_surveyId_fkey') THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_surveyId_fkey"
      FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_sectionId_fkey') THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_sectionId_fkey"
      FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_categories_questionId_fkey') THEN
    ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_categories_categoryId_fkey') THEN
    ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Update survey_campaigns table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'survey_campaigns' AND column_name = 'surveyId') THEN
    ALTER TABLE "survey_campaigns" ADD COLUMN "surveyId" TEXT;
    CREATE INDEX "survey_campaigns_surveyId_idx" ON "survey_campaigns"("surveyId");
  END IF;

  -- Update responses table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'questionId') THEN
    ALTER TABLE "responses" ADD COLUMN "questionId" TEXT;
    CREATE INDEX "responses_questionId_idx" ON "responses"("questionId");
  END IF;

  -- Update anonymous_response_items table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anonymous_response_items' AND column_name = 'questionId') THEN
    ALTER TABLE "anonymous_response_items" ADD COLUMN "questionId" TEXT;
    CREATE INDEX "anonymous_response_items_questionId_idx" ON "anonymous_response_items"("questionId");
  END IF;

  -- Insert default scales
  INSERT INTO "scales" ("id", "name", "scaleType", "min", "max", "labels", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'Likert 3-Point', 'likert3', 1, 3,
     '{"1": "Rarely", "2": "Sometimes", "3": "Frequently"}'::jsonb, NOW(), NOW()),
    (gen_random_uuid()::text, 'Likert 5-Point', 'likert5', 1, 5,
     '{"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}'::jsonb, NOW(), NOW())
  ON CONFLICT ("name") DO NOTHING;

  -- Insert default categories
  INSERT INTO "categories" ("id", "name", "description", "weight", "colorCode", "sortOrder", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'Communication', 'Communication effectiveness', 1.75, '#3B82F6', 1, NOW(), NOW()),
    (gen_random_uuid()::text, 'Leadership', 'Leadership capabilities', 1.0, '#8B5CF6', 2, NOW(), NOW()),
    (gen_random_uuid()::text, 'Culture', 'Organizational culture', 2.3, '#10B981', 3, NOW(), NOW()),
    (gen_random_uuid()::text, 'Accountability', 'Accountability practices', 1.7, '#F59E0B', 4, NOW(), NOW()),
    (gen_random_uuid()::text, 'Execution', 'Execution effectiveness', 1.4, '#EF4444', 5, NOW(), NOW()),
    (gen_random_uuid()::text, 'Associate', 'Associate engagement', 1.4, '#14B8A6', 6, NOW(), NOW()),
    (gen_random_uuid()::text, 'Team Dynamics', 'Team collaboration', 1.4, '#EC4899', 7, NOW(), NOW())
  ON CONFLICT ("name") DO NOTHING;

END $$;

-- Verification
SELECT
  'Survey Management System Migration Completed' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'surveys')::int as surveys_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'sections')::int as sections_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'questions')::int as questions_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'categories')::int as categories_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'question_categories')::int as question_categories_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'scales')::int as scales_table,
  (SELECT COUNT(*) FROM "scales") as default_scales_count,
  (SELECT COUNT(*) FROM "categories") as default_categories_count;
