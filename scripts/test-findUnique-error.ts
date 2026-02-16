/**
 * Test Script: Demonstrates findUnique vs findFirst
 *
 * This proves that findUnique() CANNOT use additional filters
 * beyond the unique field, causing PrismaClientValidationError
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFindUniqueError() {
  console.log('\n🧪 Testing Prisma findUnique with additional filter...\n');

  try {
    // This will FAIL with PrismaClientValidationError
    console.log('❌ Attempting: findUnique with deletedAt filter');
    const campaign1 = await prisma.surveyCampaign.findUnique({
      where: {
        accessCode: 'TEST123',
        // @ts-expect-error - Testing invalid query
        deletedAt: null, // This causes PrismaClientValidationError!
      },
    });
    console.log('✅ Result:', campaign1);
  } catch (error) {
    console.log('💥 ERROR CAUGHT:');
    console.log('   Name:', error instanceof Error ? error.name : 'Unknown');
    console.log('   Message:', error instanceof Error ? error.message : String(error));
    console.log('\n');
  }

  try {
    // This will SUCCEED
    console.log('✅ Attempting: findFirst with deletedAt filter');
    const campaign2 = await prisma.surveyCampaign.findFirst({
      where: {
        accessCode: 'TEST123',
        deletedAt: null, // This works perfectly!
      },
    });
    console.log('✅ Result:', campaign2 ? 'Found campaign' : 'No campaign found');
  } catch (error) {
    console.log('💥 ERROR CAUGHT:');
    console.log('   Name:', error instanceof Error ? error.name : 'Unknown');
    console.log('   Message:', error instanceof Error ? error.message : String(error));
  }

  await prisma.$disconnect();
}

testFindUniqueError();
