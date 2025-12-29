/**
 * Create Test Vault with 100000% APY
 * Run: npx ts-node scripts/create-test-vault.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestVault() {
  console.log('Creating Test Vault 100000% APY...');

  // Check if test vault already exists
  const existing = await prisma.vault.findFirst({
    where: { name: 'Test Vault 100000%' }
  });

  if (existing) {
    console.log('Test Vault already exists with ID:', existing.id);
    return existing;
  }

  const vault = await prisma.vault.create({
    data: {
      name: 'Test Vault 100000%',
      tier: 'STARTER',
      duration: 1, // 1 month
      payoutSchedule: 'MONTHLY',
      minInvestment: 1, // Min 1 USDT (or equivalent in TRX)
      maxInvestment: 100, // Max 100 USDT for testing
      requireTAKARA: false, // No TAKARA required
      takaraRatio: null,
      baseAPY: 100000.0, // 100000% APY for testing!
      maxAPY: 100000.0,
      baseTakaraAPY: 0,
      maxTakaraAPY: 0,
      isActive: true
    }
  });

  console.log('Test Vault created successfully!');
  console.log('Vault ID:', vault.id);
  console.log('Name:', vault.name);
  console.log('APY:', vault.baseAPY, '%');
  console.log('Min Investment:', vault.minInvestment, 'USDT');
  console.log('Max Investment:', vault.maxInvestment, 'USDT');
  console.log('Duration:', vault.duration, 'months');

  return vault;
}

createTestVault()
  .catch((e) => {
    console.error('Failed to create test vault:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
