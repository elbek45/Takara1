/**
 * Database Seed Script
 * Populates the database with initial data including all 9 Vaults
 */

import { PrismaClient } from '@prisma/client';
import { VAULTS } from '../src/config/vaults.config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==================== CLEAN EXISTING DATA ====================
  console.log('🧹 Cleaning existing data...');

  await prisma.takaraMining.deleteMany();
  await prisma.laikaBoost.deleteMany();
  await prisma.marketplaceListing.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.vault.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.user.deleteMany();
  await prisma.miningStats.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.systemConfig.deleteMany();

  console.log('✅ Existing data cleaned');

  // ==================== SEED VAULTS ====================
  console.log('📦 Seeding 9 Vaults...');

  for (const vault of VAULTS) {
    await prisma.vault.create({
      data: {
        name: vault.name,
        tier: vault.tier,
        duration: vault.duration,
        payoutSchedule: vault.payoutSchedule,
        minInvestment: vault.minInvestment,
        maxInvestment: vault.maxInvestment,
        requireTAKARA: vault.requireTAKARA,
        takaraRatio: vault.takaraRatio,
        baseAPY: vault.baseAPY,
        maxAPY: vault.maxAPY,
        takaraAPY: vault.takaraAPY,
        isActive: true
      }
    });

    console.log(`  ✓ Created: ${vault.name}`);
  }

  console.log('✅ All 9 Vaults seeded');

  // ==================== SEED INITIAL MINING STATS ====================
  console.log('📊 Initializing mining stats...');

  await prisma.miningStats.create({
    data: {
      date: new Date(),
      totalMined: 0,
      activeMiners: 0,
      currentDifficulty: 1.0
    }
  });

  console.log('✅ Mining stats initialized');

  // ==================== SEED SYSTEM CONFIG ====================
  console.log('⚙️ Seeding system configuration...');

  const systemConfigs = [
    {
      key: 'PLATFORM_FEE_PERCENT',
      value: '2.5',
      description: 'Marketplace platform fee percentage'
    },
    {
      key: 'ACTIVATION_DELAY_HOURS',
      value: '72',
      description: 'Investment activation delay in hours'
    },
    {
      key: 'TAKARA_TOTAL_SUPPLY',
      value: '600000000',
      description: 'Total TAKARA supply'
    },
    {
      key: 'TAKARA_MINING_PERIOD_MONTHS',
      value: '60',
      description: 'TAKARA mining period in months'
    },
    {
      key: 'MIN_WITHDRAWAL_USDT',
      value: '10',
      description: 'Minimum USDT withdrawal amount'
    },
    {
      key: 'MIN_WITHDRAWAL_TAKARA',
      value: '100',
      description: 'Minimum TAKARA withdrawal amount'
    }
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.create({ data: config });
    console.log(`  ✓ Config: ${config.key} = ${config.value}`);
  }

  console.log('✅ System configuration seeded');

  // ==================== SEED ADMIN USER ====================
  console.log('👤 Creating admin user...');

  const bcrypt = await import('bcrypt');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  await prisma.adminUser.create({
    data: {
      username: 'admin',
      email: 'admin@takaragold.io',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });

  console.log('✅ Admin user created (username: admin, password: admin123)');

  // ==================== SUMMARY ====================
  console.log('\n📋 Seed Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const vaultCount = await prisma.vault.count();
  const configCount = await prisma.systemConfig.count();
  const adminCount = await prisma.adminUser.count();

  console.log(`  Vaults: ${vaultCount}`);
  console.log(`  System Configs: ${configCount}`);
  console.log(`  Admin Users: ${adminCount}`);

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('  1. Start backend: npm run dev');
  console.log('  2. Visit: http://localhost:3000/health');
  console.log('  3. Admin login: admin / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
