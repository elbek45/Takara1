/**
 * Cleanup Test Data Script
 * Removes all test users, investments, claims, marketplace listings, etc.
 * Run with: npx ts-node scripts/cleanup-test-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting database cleanup...\n')

  // 1. Delete TakaraBoosts
  const boostsDeleted = await prisma.takaraBoost.deleteMany({})
  console.log(`✅ Deleted ${boostsDeleted.count} TakaraBoosts`)

  // 2. Delete ClaimRequests
  const claimsDeleted = await prisma.claimRequest.deleteMany({})
  console.log(`✅ Deleted ${claimsDeleted.count} ClaimRequests`)

  // 3. Delete WithdrawalRequests (legacy)
  const withdrawalsDeleted = await prisma.withdrawalRequest.deleteMany({})
  console.log(`✅ Deleted ${withdrawalsDeleted.count} WithdrawalRequests`)

  // 4. Delete MarketplaceListings
  const listingsDeleted = await prisma.marketplaceListing.deleteMany({})
  console.log(`✅ Deleted ${listingsDeleted.count} MarketplaceListings`)

  // 5. Delete Investments
  const investmentsDeleted = await prisma.investment.deleteMany({})
  console.log(`✅ Deleted ${investmentsDeleted.count} Investments`)

  // 5.5 Delete TaxRecords (before users due to FK constraint)
  const taxRecordsDeleted = await prisma.taxRecord.deleteMany({})
  console.log(`✅ Deleted ${taxRecordsDeleted.count} TaxRecords`)

  // 6. Delete all Users (except admin which is in AdminUser table)
  const usersDeleted = await prisma.user.deleteMany({})
  console.log(`✅ Deleted ${usersDeleted.count} Users`)

  // 7. Reset all Vaults to empty state
  const vaultsReset = await prisma.vault.updateMany({
    data: {
      currentFilled: 0,
      isActive: true,
      isMining: false
    }
  })
  console.log(`✅ Reset ${vaultsReset.count} Vaults to empty state`)

  // 8. Delete duplicate vaults (keep only original 9)
  // First get all vaults ordered by creation
  const allVaults = await prisma.vault.findMany({
    orderBy: { createdAt: 'asc' }
  })

  // Group by tier+duration, keep only first of each
  const seen = new Set<string>()
  const toDelete: string[] = []

  for (const vault of allVaults) {
    const key = `${vault.tier}-${vault.duration}`
    if (seen.has(key)) {
      toDelete.push(vault.id)
    } else {
      seen.add(key)
    }
  }

  if (toDelete.length > 0) {
    const duplicatesDeleted = await prisma.vault.deleteMany({
      where: { id: { in: toDelete } }
    })
    console.log(`✅ Deleted ${duplicatesDeleted.count} duplicate Vaults`)
  }

  // 9. Reset Treasury balance (if table exists)
  try {
    const treasuryReset = await prisma.treasuryBalance.deleteMany({})
    console.log(`✅ Deleted ${treasuryReset.count} Treasury balance records`)
  } catch (e) {
    console.log(`⚠️ TreasuryBalance table not found or empty`)
  }

  // 10. Reset MiningStats (test mining data)
  const miningStatsReset = await prisma.miningStats.deleteMany({})
  console.log(`✅ Deleted ${miningStatsReset.count} MiningStats records`)

  // 10. Show final state
  const finalStats = {
    users: await prisma.user.count(),
    investments: await prisma.investment.count(),
    vaults: await prisma.vault.count(),
    claims: await prisma.claimRequest.count(),
    boosts: await prisma.takaraBoost.count(),
    listings: await prisma.marketplaceListing.count()
  }

  console.log('\n📊 Final Database State:')
  console.log(`   Users: ${finalStats.users}`)
  console.log(`   Investments: ${finalStats.investments}`)
  console.log(`   Vaults: ${finalStats.vaults}`)
  console.log(`   Claims: ${finalStats.claims}`)
  console.log(`   Boosts: ${finalStats.boosts}`)
  console.log(`   Listings: ${finalStats.listings}`)

  console.log('\n✨ Database cleanup complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
