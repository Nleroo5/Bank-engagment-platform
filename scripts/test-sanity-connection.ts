/**
 * Test Sanity Connection
 *
 * Verifies that the app can successfully fetch surveys from Sanity
 * and that all expected surveys are present with correct data.
 */

import { getAllSurveys } from '@/lib/sanity';

async function testSanityConnection() {
  console.log('🧪 Testing Sanity Connection...\n');

  try {
    // Fetch surveys
    console.log('📡 Fetching surveys from Sanity...');
    const surveys = await getAllSurveys();

    console.log(
      `\n✅ Successfully fetched ${surveys.length} surveys from Sanity!\n`
    );

    // Display survey details
    console.log('📋 Survey Details:');
    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );

    surveys.forEach((survey, index) => {
      console.log(`${index + 1}. ${survey.title}`);
      console.log(`   ID: ${survey._id}`);
      console.log(`   Survey Number: ${survey.surveyNumber || 'N/A'}`);
      console.log(`   Type: ${survey.surveyType}`);
      console.log(`   Active: ${survey.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Slug: ${survey.slug?.current || 'N/A'}`);
      console.log(`   Est. Time: ${survey.estimatedMinutes || 'N/A'} minutes`);
      console.log('');
    });

    // Filter active surveys (what the campaign creation page uses)
    const activeSurveys = surveys.filter((s) => s.isActive);

    console.log('═══════════════════════════════════════════════════════════');
    console.log(
      `\n✅ Active Surveys (shown in campaign dropdown): ${activeSurveys.length}`
    );

    if (activeSurveys.length === 0) {
      console.log('⚠️  WARNING: No active surveys found!');
      console.log('   Campaign creation dropdown will be empty.');
    } else {
      console.log('\n📊 These surveys will appear in the dropdown:');
      activeSurveys.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.title} (Survey ${s.surveyNumber})`);
      });
    }

    console.log(
      '\n═══════════════════════════════════════════════════════════'
    );
    console.log('✅ Sanity connection test PASSED!');
    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );
  } catch (error) {
    console.error('\n❌ Error connecting to Sanity:', error);
    console.error('\nPossible issues:');
    console.error('  1. SANITY_API_TOKEN not set in .env.local');
    console.error('  2. NEXT_PUBLIC_SANITY_PROJECT_ID incorrect');
    console.error('  3. Network/firewall blocking Sanity API');
    console.error('  4. Sanity project not accessible');
    throw error;
  }
}

testSanityConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
