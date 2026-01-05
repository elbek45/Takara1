/**
 * Rename vaults by duration:
 * - 18M = Starter
 * - 20M = Beginner
 * - 30M = Pro
 * - 36M = Elite
 *
 * Run: npx ts-node scripts/rename-vaults.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Renaming vaults by duration...\n')

  // 18M → Starter
  await prisma.vault.updateMany({
    where: { duration: 18 },
    data: { name: 'Starter Vault 18M', tier: 'STARTER' }
  })
  console.log('✅ 18M vaults → Starter')

  // 20M → Beginner (using STARTER tier in DB, but name says Beginner)
  await prisma.vault.updateMany({
    where: { duration: 20 },
    data: { name: 'Beginner Vault 20M', tier: 'STARTER' }
  })
  console.log('✅ 20M vaults → Beginner')

  // 30M → Pro
  await prisma.vault.updateMany({
    where: { duration: 30 },
    data: { name: 'Pro Vault 30M', tier: 'PRO' }
  })
  console.log('✅ 30M vaults → Pro')

  // 36M → Elite
  await prisma.vault.updateMany({
    where: { duration: 36 },
    data: { name: 'Elite Vault 36M', tier: 'ELITE' }
  })
  console.log('✅ 36M vaults → Elite')

  // Delete duplicate vaults (keep only one per duration)
  console.log('\n🧹 Removing duplicate vaults...')

  const allVaults = await prisma.vault.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const seen = new Set<number>()
  const toDelete: string[] = []

  for (const vault of allVaults) {
    if (seen.has(vault.duration)) {
      toDelete.push(vault.id)
    } else {
      seen.add(vault.duration)
    }
  }

  if (toDelete.length > 0) {
    await prisma.vault.deleteMany({
      where: { id: { in: toDelete } }
    })
    console.log(`✅ Deleted ${toDelete.length} duplicate vaults`)
  }

  // Show final state
  const vaults = await prisma.vault.findMany({
    orderBy: { duration: 'asc' },
    select: {
      name: true,
      duration: true,
      baseAPY: true,
      maxAPY: true,
      minInvestment: true,
      miningThreshold: true
    }
  })

  console.log('\n📊 Final Vault Configuration:\n')
  console.log('| Vault | Duration | APY | Max APY | Min | Threshold |')
  console.log('|-------|----------|-----|---------|-----|-----------|')
  for (const v of vaults) {
    console.log(`| ${v.name.padEnd(18)} | ${v.duration}M | ${Number(v.baseAPY)}% | ${Number(v.maxAPY)}% | $${Number(v.minInvestment)} | $${Number(v.miningThreshold).toLocaleString()} |`)
  }

  console.log(`\n✨ Total vaults: ${vaults.length}`)
  console.log('✅ Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
