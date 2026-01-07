/**
 * Sync vault values with config
 * v2.7 - Different APY by tier (ELITE max, PRO -1%, BASIC -2%, STARTER -3%)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// APY configuration by duration and tier
// Total Return = maxAPY × (duration / 12)
// ELITE targets: 18M=14.4%, 20M=16.8%, 30M=46.5%, 36M=57.6%
const vaultConfig = {
  18: { elite: { base: 7.6, max: 9.6 }, takaraRatio: 0, requireTAKARA: false },      // 14.4% total
  20: { elite: { base: 8.08, max: 10.08 }, takaraRatio: 15, requireTAKARA: true },   // 16.8% total
  30: { elite: { base: 15.6, max: 18.6 }, takaraRatio: 25, requireTAKARA: true },    // 46.5% total
  36: { elite: { base: 15.2, max: 19.2 }, takaraRatio: 40, requireTAKARA: true }     // 57.6% total
}

// Tier offsets from ELITE
const tierOffsets = {
  ELITE: 0,
  PRO: 1,
  BASIC: 2,
  STARTER: 3
}

async function main() {
  console.log('Syncing vault configuration v2.7...\n')

  for (const [duration, config] of Object.entries(vaultConfig)) {
    const dur = Number(duration)

    for (const [tier, offset] of Object.entries(tierOffsets)) {
      const baseAPY = Number((config.elite.base - offset).toFixed(2))
      const maxAPY = Number((config.elite.max - offset).toFixed(2))

      await prisma.vault.updateMany({
        where: { duration: dur, tier },
        data: {
          baseAPY,
          maxAPY,
          takaraRatio: config.takaraRatio,
          requireTAKARA: config.requireTAKARA
        }
      })
      console.log(`✅ ${dur}M ${tier}: baseAPY=${baseAPY}, maxAPY=${maxAPY}`)
    }
  }

  console.log('\n📊 Final values:')
  const vaults = await prisma.vault.findMany({
    orderBy: { duration: 'asc' },
    select: { name: true, baseAPY: true, maxAPY: true, takaraRatio: true, requireTAKARA: true }
  })
  console.log(JSON.stringify(vaults, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
