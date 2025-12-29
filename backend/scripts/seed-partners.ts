/**
 * Seed Partners for "Powered By" slider
 * Run: npx ts-node scripts/seed-partners.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const partners = [
  {
    name: 'COPPAM',
    logoUrl: '/images/partners/coppam.png',
    websiteUrl: 'https://coppam.com',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Digital Commerce Bank',
    logoUrl: '/images/partners/dcb.svg',
    websiteUrl: 'https://digitalcommercebank.com',
    displayOrder: 2,
    isActive: true,
  },
];

async function seedPartners() {
  console.log('Seeding partners...\n');

  for (const partner of partners) {
    const existing = await prisma.partner.findFirst({
      where: { name: partner.name },
    });

    if (existing) {
      console.log(`Partner "${partner.name}" already exists, updating...`);
      await prisma.partner.update({
        where: { id: existing.id },
        data: partner,
      });
    } else {
      console.log(`Creating partner: ${partner.name}`);
      await prisma.partner.create({
        data: partner,
      });
    }
  }

  console.log('\nPartners seeded successfully!');

  // List all partners
  const allPartners = await prisma.partner.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  console.log('\nCurrent partners:');
  allPartners.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} - ${p.logoUrl} (${p.isActive ? 'active' : 'inactive'})`);
  });
}

seedPartners()
  .catch((e) => {
    console.error('Failed to seed partners:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
