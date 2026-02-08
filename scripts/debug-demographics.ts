import { sanityClient } from '../src/lib/sanity/client';

async function debugDemographics() {
  console.log('🔍 Debugging Demographics Survey...\n');

  // Find the demographics survey
  const demographicsSurvey = await sanityClient.fetch(`
    *[_type == "survey" && surveyType == "demographics"][0]{
      _id,
      title,
      surveyType,
      "sections": sections[]->{
        _id,
        title,
        "questions": questions[]->{
          _id,
          "number": coalesce(questionNumber, number),
          "text": coalesce(questionText, text),
          fieldType,
          slug
        }
      }
    }
  `);

  if (!demographicsSurvey) {
    console.error('❌ No demographics survey found!');
    console.log(
      '   Make sure you have a survey with surveyType="demographics" in Sanity'
    );
    return;
  }

  console.log(`✅ Found survey: ${demographicsSurvey.title}`);
  console.log(`   ID: ${demographicsSurvey._id}`);
  console.log(`   Type: ${demographicsSurvey.surveyType}\n`);

  let totalQuestions = 0;
  let questionsWithFieldType = 0;
  let questionsMissingFieldType: any[] = [];

  for (const section of demographicsSurvey.sections) {
    console.log(`📋 Section: ${section.title}`);
    console.log(`   Questions: ${section.questions.length}\n`);

    for (const question of section.questions) {
      totalQuestions++;
      console.log(
        `   Q${question.number}: ${question.text.substring(0, 50)}...`
      );

      if (question.fieldType) {
        questionsWithFieldType++;
        console.log(`      ✅ fieldType: ${question.fieldType}`);
      } else {
        console.log(`      ❌ Missing fieldType!`);
        questionsMissingFieldType.push(question);
      }

      if (question.slug) {
        console.log(`      Slug: ${question.slug.current}`);
      }
      console.log('');
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total Questions: ${totalQuestions}`);
  console.log(`   With fieldType: ${questionsWithFieldType}`);
  console.log(`   Missing fieldType: ${questionsMissingFieldType.length}`);

  if (questionsMissingFieldType.length > 0) {
    console.log('\n⚠️  Questions missing fieldType:');
    questionsMissingFieldType.forEach((q) => {
      console.log(`   - Q${q.number}: ${q.text.substring(0, 60)}...`);
      console.log(`     ID: ${q._id}`);
    });
    console.log(
      '\n💡 Fix: Open these questions in Sanity Studio and set the "Demographics Field Type" field'
    );
  } else {
    console.log('\n✅ All questions have fieldType set!');
  }
}

debugDemographics().catch(console.error);
