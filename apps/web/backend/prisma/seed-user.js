import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/auth.js';

async function seed() {
  console.log('Pushing user Sugan to database...');
  const user = await prisma.user.upsert({
    where: { username: 'Sugan' },
    update: {
      password: hashPassword('Sugan@123'),
      name: 'Sugan',
    },
    create: {
      username: 'Sugan',
      password: hashPassword('Sugan@123'),
      name: 'Sugan',
    },
  });

  console.log('✅ User successfully stored in DB:', {
    id: user.id,
    username: user.username,
    name: user.name,
    createdAt: user.createdAt,
  });

  const totalUsers = await prisma.user.findMany({
    select: { id: true, username: true, name: true, createdAt: true },
  });
  console.log('👥 Current Users in DB:', totalUsers);
}

seed()
  .catch((err) => {
    console.error('❌ Failed to seed user:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
