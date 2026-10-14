import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding initial categories and groups (JavaScript)...');

  const count = await prisma.category.count();
  if (count > 0) {
    console.log('Categories already exist, skipping seed.');
    return;
  }

  // 1. Snacks with groups (Tea, Coffee, Puffs, Samosa / Chaat)
  await prisma.category.create({
    data: {
      name: 'Snacks',
      type: 'expense',
      description: 'Daily snacks, beverages, and quick bites',
      groups: {
        create: [
          { name: 'Tea', description: 'Chai & tea stalls' },
          { name: 'Coffee', description: 'Coffee shops' },
          { name: 'Puffs', description: 'Bakery items & puffs' },
          { name: 'Samosa / Chaat', description: 'Street food' },
        ],
      },
    },
  });

  console.log('✅ JavaScript seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
