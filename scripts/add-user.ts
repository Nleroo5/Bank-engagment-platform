/**
 * Add User Script
 *
 * Creates a new user for an organization
 */

import { prisma } from '@/lib/prisma';

async function addUser() {
  console.log('👤 Adding user to Test Bank...\n');

  try {
    // Find Test Bank organization
    const testBank = await prisma.organization.findFirst({
      where: { name: 'Test Bank' },
    });

    if (!testBank) {
      console.error('❌ Test Bank organization not found!');
      return;
    }

    console.log(`✅ Found organization: ${testBank.name} (${testBank.id})\n`);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'nicolasleroo@gmail.com',
        name: 'Nicolas Leroo',
        role: 'RESPONDENT',
        organizationId: testBank.id,
      },
    });

    console.log('✅ User created successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('User Details:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Organization: ${testBank.name}`);
    console.log(`Created: ${user.createdAt}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ Error: User with this email already exists!');
      console.log('\nTrying to find existing user...\n');

      const existingUser = await prisma.user.findUnique({
        where: { email: 'nicolasleroo@gmail.com' },
        include: { organization: true },
      });

      if (existingUser) {
        console.log('✅ Found existing user:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`ID: ${existingUser.id}`);
        console.log(`Name: ${existingUser.name}`);
        console.log(`Email: ${existingUser.email}`);
        console.log(`Role: ${existingUser.role}`);
        console.log(`Organization: ${existingUser.organization.name}`);
        console.log('═══════════════════════════════════════════════════════════\n');
      }
    } else {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }
}

addUser()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
