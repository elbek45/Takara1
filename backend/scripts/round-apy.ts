/**
 * Round APY values to whole numbers
 * Run: npx ts-node scripts/round-apy.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Rounding APY values to whole numbers...\n')

  // Update 18M vaults: 7.73% → 8%, maxAPY accordingly
  await prisma.vault.updateMany({
    where: { duration: 18 },
    data: { baseAPY: 8 }
  })

  // Update Starter 18M maxAPY
  await prisma.vault.updateMany({
    where: { duration: 18, tier: 'STARTER' },
    data: { maxAPY: 10 }
  })

  // Update Pro 18M maxAPY
  await prisma.vault.updateMany({
    where: { duration: 18, tier: 'PRO' },
    data: { maxAPY: 10 }
  })

  // Update Elite 18M maxAPY
  await prisma.vault.updateMany({
    where: { duration: 18, tier: 'ELITE' },
    data: { maxAPY: 11 }
  })

  // Update 20M vaults: 10.8% → 11%
  await prisma.vault.updateMany({
    where: { duration: 20 },
    data: { baseAPY: 11 }
  })

  // Update 20M maxAPY values
  await prisma.vault.updateMany({
    where: { duration: 20, tier: 'STARTER' },
    data: { maxAPY: 13 }
  })

  await prisma.vault.updateMany({
    where: { duration: 20, tier: 'PRO' },
    data: { maxAPY: 13 }
  })

  await prisma.vault.updateMany({
    where: { duration: 20, tier: 'ELITE' },
    data: { maxAPY: 14 }
  })

  // Update 30M vaults maxAPY
  await prisma.vault.updateMany({
    where: { duration: 30, tier: 'STARTER' },
    data: { baseAPY: 24, maxAPY: 26 }
  })

  await prisma.vault.updateMany({
    where: { duration: 30, tier: 'PRO' },
    data: { baseAPY: 24, maxAPY: 27 }
  })

  await prisma.vault.updateMany({
    where: { duration: 30, tier: 'ELITE' },
    data: { baseAPY: 24, maxAPY: 28 }
  })

  // Update 36M vaults maxAPY
  await prisma.vault.updateMany({
    where: { duration: 36, tier: 'STARTER' },
    data: { baseAPY: 25, maxAPY: 27 }
  })

  await prisma.vault.updateMany({
    where: { duration: 36, tier: 'PRO' },
    data: { baseAPY: 25, maxAPY: 28 }
  })

  await prisma.vault.updateMany({
    where: { duration: 36, tier: 'ELITE' },
    data: { baseAPY: 25, maxAPY: 29 }
  })

  console.log('✅ APY values rounded\n')

  // Show final state
  const vaults = await prisma.vault.findMany({
    orderBy: [{ tier: 'asc' }, { duration: 'asc' }],
    select: {
      name: true,
      baseAPY: true,
      maxAPY: true
    }
  })

  console.log('📊 Final APY Configuration:\n')
  console.log('| Vault | Base APY | Max APY |')
  console.log('|-------|----------|---------|')
  for (const v of vaults) {
    console.log(`| ${v.name.padEnd(20)} | ${Number(v.baseAPY).toString().padStart(4)}% | ${Number(v.maxAPY).toString().padStart(4)}% |`)
  }

  console.log('\n✅ Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
