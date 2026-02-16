/**
 * Fix Survey IDs Migration
 *
 * Updates survey_campaigns table to use correct Sanity document IDs
 * instead of random UUIDs that don't exist in Sanity.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of survey titles to correct Sanity IDs
const SURVEY_ID_MAPPING: Record<string, string> = {
  "Associate 180° Assessment": "associate-180-assessment",
  "Managerial Assessment": "managerial-assessment",
  "Operational Team Effectiveness (OTE)": "operational-team-effectiveness",
  "Leadership Team Effectiveness (LTE)": "RWKE91TPgcMXQVTdKRJxTZ",
  "Employee Demographics": "BV7Sm6F4lThNfRDi4TmPrY",
};

async function main() {
  console.log('🔍 Fetching all campaigns with incorrect survey IDs...\n');

  const campaigns = await prisma.surveyCampaign.findMany({
    select: {
      id: true,
      surveyTitle: true,
      surveyId: true,
      accessCode: true,
    },
  });

  console.log(`Found ${campaigns.length} campaigns\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const campaign of campaigns) {
    const correctSurveyId = SURVEY_ID_MAPPING[campaign.surveyTitle];

    if (!correctSurveyId) {
      console.log(`⚠️  Skipped: "${campaign.surveyTitle}" - No mapping found`);
      skippedCount++;
      continue;
    }

    if (campaign.surveyId === correctSurveyId) {
      console.log(`✅ OK: "${campaign.surveyTitle}" already has correct ID`);
      skippedCount++;
      continue;
    }

    console.log(`🔧 Fixing: "${campaign.surveyTitle}"`);
    console.log(`   Access Code: ${campaign.accessCode}`);
    console.log(`   Old ID: ${campaign.surveyId}`);
    console.log(`   New ID: ${correctSurveyId}`);

    await prisma.surveyCampaign.update({
      where: { id: campaign.id },
      data: { surveyId: correctSurveyId },
    });

    fixedCount++;
    console.log(`   ✅ Updated\n`);
  }

  console.log('\n📊 Summary:');
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${campaigns.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
