import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestOrganization() {
  console.log('🏢 Creating test organization...\n');

  try {
    // Check if test org already exists
    const existing = await prisma.organization.findFirst({
      where: { name: 'Test Bank' },
    });

    if (existing) {
      console.log('✓ Test organization already exists');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.name}`);
      return existing;
    }

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Bank',
        sizeRange: '$1B - $2.5B',
        locationCountry: 'United States',
        locationState: 'California',
        locationMetro: 'San Francisco Bay Area',
        locationCity: 'San Francisco',
      },
    });

    console.log('✅ Test organization created successfully!');
    console.log(`   ID: ${org.id}`);
    console.log(`   Name: ${org.name}`);
    console.log(`   Size: ${org.sizeRange}`);
    console.log(`   Location: ${org.locationCity}, ${org.locationState}`);

    return org;
  } catch (error) {
    console.error('❌ Error creating test organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrganization()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
