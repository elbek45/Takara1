/**
 * Update maxAPY based on boost limits:
 * - Starter (18M): max boost 15% → maxAPY = 9%
 * - Beginner (20M): max boost 20% → maxAPY = 13%
 * - Pro (30M): max boost 45% → maxAPY = 35%
 * - Elite (36M): max boost 60% → maxAPY = 40%
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating maxAPY based on boost limits...\n')

  // Starter 18M: base 8%, boost 15% → max 9%
  await prisma.vault.updateMany({
    where: { duration: 18 },
    data: { maxAPY: 9 }
  })
  console.log('✅ Starter 18M: maxAPY = 9% (8% + 15% boost)')

  // Beginner 20M: base 11%, boost 20% → max 13%
  await prisma.vault.updateMany({
    where: { duration: 20 },
    data: { maxAPY: 13 }
  })
  console.log('✅ Beginner 20M: maxAPY = 13% (11% + 20% boost)')

  // Pro 30M: base 24%, boost 45% → max 35%
  await prisma.vault.updateMany({
    where: { duration: 30 },
    data: { maxAPY: 35 }
  })
  console.log('✅ Pro 30M: maxAPY = 35% (24% + 45% boost)')

  // Elite 36M: base 25%, boost 60% → max 40%
  await prisma.vault.updateMany({
    where: { duration: 36 },
    data: { maxAPY: 40 }
  })
  console.log('✅ Elite 36M: maxAPY = 40% (25% + 60% boost)')

  // Show final state
  const vaults = await prisma.vault.findMany({
    orderBy: [{ duration: 'asc' }, { tier: 'asc' }],
    select: { name: true, tier: true, baseAPY: true, maxAPY: true }
  })

  console.log('\n📊 Updated APY Configuration:\n')
  console.log('| Name | Tier | Base APY | Max APY | Boost |')
  console.log('|------|------|----------|---------|-------|')
  for (const v of vaults) {
    const boost = ((Number(v.maxAPY) / Number(v.baseAPY) - 1) * 100).toFixed(0)
    console.log(`| ${v.name.padEnd(18)} | ${v.tier.padEnd(7)} | ${v.baseAPY}% | ${v.maxAPY}% | +${boost}% |`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
