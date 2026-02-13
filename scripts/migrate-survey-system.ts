import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Starting Survey Management System migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/add_survey_management_system.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      // Show progress
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/"(\w+)"/);
        if (match) {
          console.log(`  ✓ Creating table: ${match[1]}`);
        }
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/"(\w+)"/);
        if (match) {
          console.log(`  ✓ Creating index: ${match[1]}`);
        }
      } else if (statement.includes('INSERT INTO')) {
        const match = statement.match(/"(\w+)"/);
        if (match) {
          console.log(`  ✓ Inserting default data into: ${match[1]}`);
        }
      } else if (statement.includes('ALTER TABLE')) {
        console.log(`  ✓ Altering table structure...`);
      }

      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error: unknown) {
        const err = error as Error;
        // Some errors are okay (e.g., "already exists")
        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate key')
        ) {
          console.log(`    ⚠️  Skipped (already exists)`);
        } else {
          console.error(`\n❌ Error executing statement:`);
          console.error(statement.substring(0, 200) + '...');
          console.error(err.message);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!\n');

    // Verify the migration
    console.log('📊 Verifying migration results:\n');

    const verification = await prisma.$queryRaw<
      Array<{
        status: string;
        surveys_table: number;
        sections_table: number;
        questions_table: number;
        categories_table: number;
        question_categories_table: number;
        scales_table: number;
        default_scales_count: bigint;
        default_categories_count: bigint;
      }>
    >`
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
    `;

    console.log('Results:');
    console.log(JSON.stringify(verification[0], null, 2));

    const result = verification[0];
    if (
      result.surveys_table === 1 &&
      result.sections_table === 1 &&
      result.questions_table === 1 &&
      result.categories_table === 1 &&
      result.scales_table === 1
    ) {
      console.log('\n✅ All tables created successfully!');
      console.log(
        `   Scales: ${result.default_scales_count} (Likert 3 & 5)`
      );
      console.log(
        `   Categories: ${result.default_categories_count} (Communication, Leadership, etc.)`
      );
    } else {
      console.warn('\n⚠️  Some tables may not have been created. Please verify manually.');
    }

    console.log('\n🎉 Migration complete! Ready to generate Prisma client.\n');
    console.log('Next steps:');
    console.log('  1. Run: npx prisma generate');
    console.log('  2. Install SurveyJS: npm install survey-react survey-creator-react');
    console.log('  3. Build admin survey management UI\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();
