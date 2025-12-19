/**
 * Initialize TAKARA in Treasury Balance
 * Run this script on production to add TAKARA to the treasury
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initTakaraTreasury() {
  try {
    console.log('💎 Initializing TAKARA in Treasury');

    const takaraBalance = 10_000_000; // 10 million TAKARA

    // Check if TAKARA already exists
    const existing = await prisma.treasuryBalance.findUnique({
      where: { tokenSymbol: 'TAKARA' }
    });

    if (existing) {
      // Update existing
      const updated = await prisma.treasuryBalance.update({
        where: { tokenSymbol: 'TAKARA' },
        data: {
          balance: takaraBalance,
          totalCollected: takaraBalance
        }
      });

      console.log('✅ Updated TAKARA treasury balance:', Number(updated.balance).toLocaleString());
    } else {
      // Create new
      const created = await prisma.treasuryBalance.create({
        data: {
          tokenSymbol: 'TAKARA',
          balance: takaraBalance,
          totalCollected: takaraBalance,
          totalWithdrawn: 0
        }
      });

      console.log('✅ Created TAKARA treasury balance:', Number(created.balance).toLocaleString());
    }

    // Show all balances
    console.log('');
    console.log('📊 All Treasury Balances:');
    const allBalances = await prisma.treasuryBalance.findMany();
    allBalances.forEach(balance => {
      console.log(`   ${balance.tokenSymbol}: ${Number(balance.balance).toLocaleString()}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initTakaraTreasury();
