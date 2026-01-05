/**
 * Rollback to 9 vaults (before Beginner 20M was added)
 * 3 tiers × 3 durations: 18M, 30M, 36M
 */

import { PrismaClient, VaultTier } from '@prisma/client'

const prisma = new PrismaClient()

const VAULTS = [
  // ===== 18 Months =====
  {
    name: 'Starter Vault 18M',
    tier: VaultTier.STARTER,
    duration: 18,
    baseAPY: 8,
    maxAPY: 10,
    baseTakaraAPY: 75,
    maxTakaraAPY: 100,
    requireTAKARA: false,
    takaraRatio: 0,
  },
  {
    name: 'Pro Vault 18M',
    tier: VaultTier.PRO,
    duration: 18,
    baseAPY: 8,
    maxAPY: 10,
    baseTakaraAPY: 75,
    maxTakaraAPY: 100,
    requireTAKARA: true,
    takaraRatio: 10,
  },
  {
    name: 'Elite Vault 18M',
    tier: VaultTier.ELITE,
    duration: 18,
    baseAPY: 8,
    maxAPY: 11,
    baseTakaraAPY: 75,
    maxTakaraAPY: 100,
    requireTAKARA: true,
    takaraRatio: 15,
  },

  // ===== 30 Months =====
  {
    name: 'Starter Vault 30M',
    tier: VaultTier.STARTER,
    duration: 30,
    baseAPY: 24,
    maxAPY: 26,
    baseTakaraAPY: 200,
    maxTakaraAPY: 250,
    requireTAKARA: false,
    takaraRatio: 0,
  },
  {
    name: 'Pro Vault 30M',
    tier: VaultTier.PRO,
    duration: 30,
    baseAPY: 24,
    maxAPY: 27,
    baseTakaraAPY: 200,
    maxTakaraAPY: 250,
    requireTAKARA: true,
    takaraRatio: 25,
  },
  {
    name: 'Elite Vault 30M',
    tier: VaultTier.ELITE,
    duration: 30,
    baseAPY: 24,
    maxAPY: 28,
    baseTakaraAPY: 200,
    maxTakaraAPY: 250,
    requireTAKARA: true,
    takaraRatio: 30,
  },

  // ===== 36 Months =====
  {
    name: 'Starter Vault 36M',
    tier: VaultTier.STARTER,
    duration: 36,
    baseAPY: 25,
    maxAPY: 27,
    baseTakaraAPY: 350,
    maxTakaraAPY: 400,
    requireTAKARA: false,
    takaraRatio: 0,
  },
  {
    name: 'Pro Vault 36M',
    tier: VaultTier.PRO,
    duration: 36,
    baseAPY: 25,
    maxAPY: 28,
    baseTakaraAPY: 350,
    maxTakaraAPY: 400,
    requireTAKARA: true,
    takaraRatio: 35,
  },
  {
    name: 'Elite Vault 36M',
    tier: VaultTier.ELITE,
    duration: 36,
    baseAPY: 25,
    maxAPY: 29,
    baseTakaraAPY: 350,
    maxTakaraAPY: 400,
    requireTAKARA: true,
    takaraRatio: 40,
  },
]

async function main() {
  console.log('🔄 Rolling back to 9 vaults (removing 20M Beginner)...\n')

  // Delete all existing vaults
  await prisma.vault.deleteMany({})
  console.log('🗑️ Cleared all vaults')

  // Create 9 vaults
  for (const vault of VAULTS) {
    await prisma.vault.create({
      data: {
        name: vault.name,
        tier: vault.tier,
        duration: vault.duration,
        payoutSchedule: 'MONTHLY',
        minInvestment: 300,
        maxInvestment: 999999999,
        baseAPY: vault.baseAPY,
        maxAPY: vault.maxAPY,
        baseTakaraAPY: vault.baseTakaraAPY,
        maxTakaraAPY: vault.maxTakaraAPY,
        requireTAKARA: vault.requireTAKARA,
        takaraRatio: vault.takaraRatio,
        miningThreshold: 25000,
        currentFilled: 0,
        isActive: true,
        isMining: false,
        acceptedPayments: 'USDT',
      }
    })
    console.log(`✅ Created: ${vault.name} (${vault.tier})`)
  }

  // Show final state
  const vaults = await prisma.vault.findMany({
    orderBy: [{ duration: 'asc' }, { tier: 'asc' }],
    select: { name: true, tier: true, duration: true, baseAPY: true, maxAPY: true }
  })

  console.log('\n📊 Final Vault Configuration:\n')
  console.log('| Name | Tier | Duration | Base APY | Max APY |')
  console.log('|------|------|----------|----------|---------|')
  for (const v of vaults) {
    console.log(`| ${v.name.padEnd(18)} | ${v.tier.padEnd(7)} | ${v.duration}M | ${v.baseAPY}% | ${v.maxAPY}% |`)
  }

  console.log(`\n✨ Total vaults: ${vaults.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
