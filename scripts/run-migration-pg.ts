import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting Survey Management System migration...\n');

    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/add_survey_management_system.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...\n');

    // Execute the entire SQL as a single query
    await client.query(migrationSQL);

    console.log('✅ Migration SQL executed successfully!\n');

    // Verify the migration
    console.log('📊 Verifying migration results:\n');

    const verification = await client.query(`
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
    `);

    console.log('Results:');
    console.log(JSON.stringify(verification.rows[0], null, 2));

    const result = verification.rows[0];
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
    console.log('  2. Build admin survey management UI\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration();
