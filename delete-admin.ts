import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAdminUser() {
  const email = 'admin@test.com';

  try {
    console.log('Looking for admin user...');
    
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ Admin user not found.');
      return;
    }

    // Delete the user
    await prisma.user.delete({
      where: { email },
    });

    console.log('✅ Admin user deleted successfully!');
    console.log('Email:', email);
  } catch (error) {
    console.error('❌ Error deleting admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAdminUser();
