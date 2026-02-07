import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  const email = 'admin@test.com';
  const password = 'password123'; // Matches the test credentials shown on login page
  const name = 'Test Admin';

  console.log('Creating admin user...');
  console.log('Email:', email);
  console.log('Password:', password);

  // Hash the password
  const passwordHash = await hash(password, 10);

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('\n❌ User already exists!');
      console.log('Updating password instead...');

      // Update existing user
      const user = await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });

      console.log('\n✅ Admin user updated successfully!');
      console.log('User ID:', user.id);
      console.log('\nLogin credentials:');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      // Create new user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });

      console.log('\n✅ Admin user created successfully!');
      console.log('User ID:', user.id);
      console.log('\nLogin credentials:');
      console.log('Email:', email);
      console.log('Password:', password);
    }

    console.log('\n🌐 You can now log in at:');
    console.log('https://bank-engagment-platform.vercel.app/admin/login');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
