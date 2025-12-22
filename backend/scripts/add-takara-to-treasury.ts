/**
 * Add TAKARA token to Treasury Balance
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function addTakaraToTreasury() {
  try {
    // Read token info
    const tokenInfoPath = path.join(__dirname, '..', '..', '.keys', 'token-info.json');
    const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));

    const takaraMint = tokenInfo.solana.takara.mintAddress;
    const takaraBalance = tokenInfo.solana.takara.supply;

    console.log('💎 Adding TAKARA to Treasury');
    console.log('   Mint:', takaraMint);
    console.log('   Balance:', takaraBalance.toLocaleString());
    console.log('');

    // Check if TAKARA already exists in treasury
    const existing = await prisma.treasuryBalance.findUnique({
      where: { tokenSymbol: 'TAKARA' }
    });

    if (existing) {
      console.log('✅ TAKARA already exists in treasury');
      console.log('   Current balance:', Number(existing.balance).toLocaleString());

      // Update balance
      const updated = await prisma.treasuryBalance.update({
        where: { tokenSymbol: 'TAKARA' },
        data: {
          balance: takaraBalance,
          totalCollected: takaraBalance,
          updatedAt: new Date()
        }
      });

      console.log('✅ Updated TAKARA balance:', Number(updated.balance).toLocaleString());
    } else {
      // Create new treasury balance entry
      const created = await prisma.treasuryBalance.create({
        data: {
          tokenSymbol: 'TAKARA',
          tokenName: 'TAKARA',
          balance: takaraBalance,
          totalCollected: takaraBalance,
          totalWithdrawn: 0,
          blockchain: 'SOLANA',
          contractAddress: takaraMint
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
  } finally {
    await prisma.$disconnect();
  }
}

addTakaraToTreasury().catch(console.error);
