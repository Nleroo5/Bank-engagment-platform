/**
 * Create Admin User Script
 *
 * Creates a SUPER_ADMIN user with login credentials
 */

import { prisma } from '../src/lib/prisma/client';
import { hash } from 'bcryptjs';

async function createAdminUser() {
  console.log('👤 Creating admin user...\n');

  try {
    // Create or find Test Bank organization
    let organization = await prisma.organization.findFirst({
      where: { name: 'Test Bank' },
    });

    if (!organization) {
      console.log('Creating Test Bank organization...');
      organization = await prisma.organization.create({
        data: {
          name: 'Test Bank',
          domain: 'testbank.com',
        },
      });
      console.log(`✅ Organization created: ${organization.name}\n`);
    } else {
      console.log(`✅ Found organization: ${organization.name}\n`);
    }

    // Admin credentials
    const email = 'admin@testbank.com';
    const password = 'admin123'; // Change this in production!
    const name = 'Admin User';

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await hash(password, 12);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  User ${email} already exists. Updating password...`);
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });

      console.log('\n✅ Admin user updated successfully!\n');
      console.log(
        '═══════════════════════════════════════════════════════════'
      );
      console.log('Login Credentials:');
      console.log(
        '═══════════════════════════════════════════════════════════'
      );
      console.log(`Email:    ${updatedUser.email}`);
      console.log(`Password: ${password}`);
      console.log(`Role:     ${updatedUser.role}`);
      console.log(
        '═══════════════════════════════════════════════════════════\n'
      );
    } else {
      // Create new admin user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'SUPER_ADMIN',
          organizationId: organization.id,
          isActive: true,
        },
      });

      console.log('\n✅ Admin user created successfully!\n');
      console.log(
        '═══════════════════════════════════════════════════════════'
      );
      console.log('Login Credentials:');
      console.log(
        '═══════════════════════════════════════════════════════════'
      );
      console.log(`Email:    ${user.email}`);
      console.log(`Password: ${password}`);
      console.log(`Role:     ${user.role}`);
      console.log(`Name:     ${user.name}`);
      console.log(
        '═══════════════════════════════════════════════════════════\n'
      );
    }

    console.log('🌐 Login URL: http://localhost:3000/admin/login\n');
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
