/**
 * Update APY to make each vault more attractive progressively
 *
 * Boost limits:
 * - Starter (18M): max 15%
 * - Beginner (20M): max 20%
 * - Pro (30M): max 45%
 * - Elite (36M): max 60%
 *
 * Each tier within duration gets better rates:
 * STARTER < PRO < ELITE
 */

import { PrismaClient, VaultTier } from '@prisma/client'

const prisma = new PrismaClient()

const VAULT_CONFIG = [
  // ===== Starter 18M (max boost 15%) =====
  { duration: 18, tier: VaultTier.STARTER, baseAPY: 7, maxAPY: 8 },    // 7 * 1.15 = 8.05
  { duration: 18, tier: VaultTier.PRO, baseAPY: 8, maxAPY: 9 },        // 8 * 1.15 = 9.2
  { duration: 18, tier: VaultTier.ELITE, baseAPY: 9, maxAPY: 10 },     // 9 * 1.15 = 10.35

  // ===== Beginner 20M (max boost 20%) =====
  { duration: 20, tier: VaultTier.STARTER, baseAPY: 10, maxAPY: 12 },  // 10 * 1.20 = 12
  { duration: 20, tier: VaultTier.PRO, baseAPY: 11, maxAPY: 13 },      // 11 * 1.20 = 13.2
  { duration: 20, tier: VaultTier.ELITE, baseAPY: 12, maxAPY: 14 },    // 12 * 1.20 = 14.4

  // ===== Pro 30M (max boost 45%) =====
  { duration: 30, tier: VaultTier.STARTER, baseAPY: 22, maxAPY: 32 },  // 22 * 1.45 = 31.9
  { duration: 30, tier: VaultTier.PRO, baseAPY: 24, maxAPY: 35 },      // 24 * 1.45 = 34.8
  { duration: 30, tier: VaultTier.ELITE, baseAPY: 26, maxAPY: 38 },    // 26 * 1.45 = 37.7

  // ===== Elite 36M (max boost 60%) =====
  { duration: 36, tier: VaultTier.STARTER, baseAPY: 24, maxAPY: 38 },  // 24 * 1.60 = 38.4
  { duration: 36, tier: VaultTier.PRO, baseAPY: 26, maxAPY: 42 },      // 26 * 1.60 = 41.6
  { duration: 36, tier: VaultTier.ELITE, baseAPY: 28, maxAPY: 45 },    // 28 * 1.60 = 44.8
]

async function main() {
  console.log('🔄 Updating APY for progressive earnings...\n')

  for (const config of VAULT_CONFIG) {
    await prisma.vault.updateMany({
      where: { duration: config.duration, tier: config.tier },
      data: { baseAPY: config.baseAPY, maxAPY: config.maxAPY }
    })
    console.log(`✅ ${config.duration}M ${config.tier}: ${config.baseAPY}% → ${config.maxAPY}%`)
  }

  // Show final state with total returns
  const vaults = await prisma.vault.findMany({
    orderBy: [{ duration: 'asc' }, { tier: 'asc' }],
    select: { name: true, tier: true, duration: true, baseAPY: true, maxAPY: true }
  })

  console.log('\n📊 Final APY Configuration:\n')
  console.log('| Vault | Tier | Base | Max | Total Return (base) | Total Return (max) |')
  console.log('|-------|------|------|-----|---------------------|---------------------|')

  for (const v of vaults) {
    const years = v.duration / 12
    const totalBase = (Number(v.baseAPY) * years).toFixed(0)
    const totalMax = (Number(v.maxAPY) * years).toFixed(0)
    console.log(`| ${v.name.padEnd(18)} | ${v.tier.padEnd(7)} | ${v.baseAPY}% | ${v.maxAPY}% | ${totalBase}% | ${totalMax}% |`)
  }

  console.log('\n✨ Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
