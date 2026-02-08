import { getAllSurveys } from '../src/lib/sanity/queries';

async function checkSurveys() {
  try {
    console.log('Fetching surveys from Sanity...');
    const surveys = await getAllSurveys();

    console.log(`\nTotal surveys found: ${surveys.length}\n`);

    if (surveys.length === 0) {
      console.log('❌ NO SURVEYS FOUND IN SANITY CMS!');
      console.log('\nYou need to create surveys in Sanity Studio.');
      console.log('Run: npm run sanity:dev');
    } else {
      console.log('Surveys:');
      surveys.forEach((survey) => {
        console.log(`\n  - ${survey.title}`);
        console.log(`    ID: ${survey._id}`);
        console.log(`    Active: ${survey.isActive ? '✅ YES' : '❌ NO'}`);
        console.log(`    Survey #: ${survey.surveyNumber || 'N/A'}`);
      });

      const activeCount = surveys.filter((s) => s.isActive).length;
      console.log(`\n✅ Active surveys: ${activeCount}/${surveys.length}`);

      if (activeCount === 0) {
        console.log('\n⚠️  WARNING: No surveys are marked as active!');
        console.log(
          'Mark surveys as active in Sanity Studio to see them in the campaign form.'
        );
      }
    }
  } catch (error) {
    console.error('❌ Error fetching surveys:', error);
  }
}

checkSurveys();
