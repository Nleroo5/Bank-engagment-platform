import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test organization
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Bank',
      sizeRange: '$1B - $5B',
      locationCountry: 'United States',
      locationState: 'California',
      locationMetro: 'San Francisco Bay Area',
      locationCity: 'San Francisco',
    },
  });

  console.log('✅ Created organization:', organization.name);

  // Hash the password
  const passwordHash = await hash('password123', 10);

  // Create a SUPER_ADMIN user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      email: 'admin@test.com',
      name: 'Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log('✅ Created SUPER_ADMIN user:', adminUser.email);

  // Create an ORG_ADMIN user
  const orgAdminUser = await prisma.user.upsert({
    where: { email: 'orgadmin@test.com' },
    update: {
      passwordHash,
      role: 'ORG_ADMIN',
      isActive: true,
    },
    create: {
      email: 'orgadmin@test.com',
      name: 'Organization Admin',
      passwordHash,
      role: 'ORG_ADMIN',
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log('✅ Created ORG_ADMIN user:', orgAdminUser.email);

  // Create a VIEWER user
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@test.com' },
    update: {
      passwordHash,
      role: 'VIEWER',
      isActive: true,
    },
    create: {
      email: 'viewer@test.com',
      name: 'Viewer User',
      passwordHash,
      role: 'VIEWER',
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log('✅ Created VIEWER user:', viewerUser.email);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Super Admin: admin@test.com / password123');
  console.log('   Org Admin:   orgadmin@test.com / password123');
  console.log('   Viewer:      viewer@test.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
