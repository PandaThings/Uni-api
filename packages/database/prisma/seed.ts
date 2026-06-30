import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with mock user and project...');

  // Create the mock user (IDP placeholder)
  const user = await prisma.user.upsert({
    where: { id: 'mock_user_1' },
    update: {},
    create: {
      id: 'mock_user_1',
      email: 'dev@uniai.dev',
      name: 'Dev User',
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create a default project for the mock user
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'My First AI App',
      ownerId: user.id,
    },
  });

  console.log(`✅ Project created: ${project.name} (${project.id})`);
  console.log('🎉 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
