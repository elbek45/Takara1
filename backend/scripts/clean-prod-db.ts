/**
 * Clean Production Database Script
 * Deletes test data and resets for fresh start
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CLEANING PRODUCTION DATABASE ===');

  // Get user Elbek
  const elbek = await prisma.user.findFirst({ where: { username: 'Elbek' }});
  if (!elbek) {
    console.log('User Elbek not found');
  } else {
    console.log('Found user Elbek:', elbek.id);

    // Delete all related records first (due to foreign keys)

    // 1. Delete marketplace listings for user's investments
    const deletedListings = await prisma.marketplaceListing.deleteMany({
      where: { investment: { userId: elbek.id } }
    });
    console.log('Deleted marketplace listings:', deletedListings.count);

    // 2. Delete LAIKA boosts
    const deletedLaikaBoosts = await prisma.laikaBoost.deleteMany({
      where: { investment: { userId: elbek.id } }
    });
    console.log('Deleted LAIKA boosts:', deletedLaikaBoosts.count);

    // 3. Delete TAKARA boosts
    const deletedTakaraBoosts = await prisma.takaraBoost.deleteMany({
      where: { investment: { userId: elbek.id } }
    });
    console.log('Deleted TAKARA boosts:', deletedTakaraBoosts.count);

    // 4. Delete TAKARA mining records
    const deletedMining = await prisma.takaraMining.deleteMany({
      where: { investment: { userId: elbek.id } }
    });
    console.log('Deleted mining records:', deletedMining.count);

    // 5. Delete tax records
    const deletedTax = await prisma.taxRecord.deleteMany({
      where: { userId: elbek.id }
    });
    console.log('Deleted tax records:', deletedTax.count);

    // 6. Delete withdrawal requests
    const deletedWithdrawals = await prisma.withdrawalRequest.deleteMany({
      where: { userId: elbek.id }
    });
    console.log('Deleted withdrawals:', deletedWithdrawals.count);

    // 7. Delete investments
    const deletedInvestments = await prisma.investment.deleteMany({
      where: { userId: elbek.id }
    });
    console.log('Deleted investments:', deletedInvestments.count);

    // 8. Delete user
    const deletedUser = await prisma.user.delete({
      where: { id: elbek.id }
    });
    console.log('Deleted user:', deletedUser.username);
  }

  // 9. Delete Test Vault 100000% vaults
  const deletedVaults = await prisma.vault.deleteMany({
    where: { name: { contains: 'Test Vault 100000%' } }
  });
  console.log('Deleted test vaults:', deletedVaults.count);

  // 10. Delete mining stats
  const deletedStats = await prisma.miningStats.deleteMany({});
  console.log('Deleted mining stats:', deletedStats.count);

  // 11. Reset treasury balances
  await prisma.treasuryBalance.deleteMany({});
  await prisma.treasuryBalance.createMany({
    data: [
      { tokenSymbol: 'TAKARA', balance: 0, totalCollected: 0, totalWithdrawn: 0 },
      { tokenSymbol: 'USDT', balance: 0, totalCollected: 0, totalWithdrawn: 0 }
    ]
  });
  console.log('Reset treasury balances');

  console.log('\n=== VERIFICATION ===');
  const users = await prisma.user.count();
  const investments = await prisma.investment.count();
  const vaults = await prisma.vault.findMany({ select: { name: true, tier: true }});
  console.log('Users remaining:', users);
  console.log('Investments remaining:', investments);
  console.log('Vaults remaining:', vaults.length);
  vaults.forEach(v => console.log('  -', v.name, '(' + v.tier + ')'));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
