/**
 * One-time migration script: rename `demo_*` prefixed keys to short keys
 * in all existing AnonymousResponse.demographics JSON.
 *
 * e.g., demo_bankName → bankName, demo_country → country
 *
 * Run with: npx tsx scripts/backfill-demographics-keys.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEY_MAP: Record<string, string> = {
  demo_bankName: 'bankName',
  demo_country: 'country',
  demo_state: 'state',
  demo_metroArea: 'metroArea',
  demo_city: 'city',
  demo_bankSize: 'bankSize',
  demo_device: 'device',
  demo_employmentStatus: 'employmentStatus',
  demo_gender: 'gender',
  demo_timeAtBank: 'timeAtBank',
  demo_bankExperience: 'bankExperience',
  demo_division: 'division',
  demo_jobRole: 'jobRole',
};

async function main() {
  const responses = await prisma.anonymousResponse.findMany({
    where: { demographics: { not: null } },
    select: { id: true, demographics: true },
  });

  let updated = 0;

  for (const response of responses) {
    const demographics = response.demographics as Record<string, unknown> | null;
    if (!demographics) continue;

    let changed = false;
    const newDemographics: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(demographics)) {
      const newKey = KEY_MAP[key];
      if (newKey) {
        newDemographics[newKey] = value;
        changed = true;
      } else {
        newDemographics[key] = value;
      }
    }

    if (changed) {
      await prisma.anonymousResponse.update({
        where: { id: response.id },
        data: { demographics: newDemographics },
      });
      updated++;
    }
  }

  console.log(`Done. Updated ${updated} of ${responses.length} responses.`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
