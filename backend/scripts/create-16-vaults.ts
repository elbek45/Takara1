/**
 * Create 16 Vaults (4 durations × 4 tiers)
 *
 * Structure:
 * - 18M: 13% max Total Return
 * - 20M: 18% max Total Return
 * - 30M: 45% max Total Return
 * - 36M: 60% max Total Return
 *
 * Tiers: STARTER, BASIC, PRO, ELITE
 * Only 18M STARTER has no TAKARA requirement
 */

import { PrismaClient, VaultTier } from '@prisma/client'

const prisma = new PrismaClient()

const VAULTS = [
  // ==================== 18 Months (Max 13% Total Return) ====================
  {
    name: '18M Starter Vault',
    tier: VaultTier.STARTER,
    duration: 18,
    minInvestment: 300,
    baseAPY: 6.5,
    maxAPY: 7.5,
    baseTakaraAPY: 50,
    maxTakaraAPY: 60,
    requireTAKARA: false,
    takaraRatio: 0,
  },
  {
    name: '18M Basic Vault',
    tier: VaultTier.BASIC,
    duration: 18,
    minInvestment: 500,
    baseAPY: 7,
    maxAPY: 8,
    baseTakaraAPY: 60,
    maxTakaraAPY: 70,
    requireTAKARA: true,
    takaraRatio: 5,
  },
  {
    name: '18M Pro Vault',
    tier: VaultTier.PRO,
    duration: 18,
    minInvestment: 750,
    baseAPY: 7.5,
    maxAPY: 8.3,
    baseTakaraAPY: 70,
    maxTakaraAPY: 80,
    requireTAKARA: true,
    takaraRatio: 8,
  },
  {
    name: '18M Elite Vault',
    tier: VaultTier.ELITE,
    duration: 18,
    minInvestment: 1000,
    baseAPY: 8,
    maxAPY: 8.67,
    baseTakaraAPY: 80,
    maxTakaraAPY: 90,
    requireTAKARA: true,
    takaraRatio: 10,
  },

  // ==================== 20 Months (Max 18% Total Return) ====================
  {
    name: '20M Starter Vault',
    tier: VaultTier.STARTER,
    duration: 20,
    minInvestment: 500,
    baseAPY: 8.5,
    maxAPY: 9.5,
    baseTakaraAPY: 75,
    maxTakaraAPY: 85,
    requireTAKARA: true,
    takaraRatio: 5,
  },
  {
    name: '20M Basic Vault',
    tier: VaultTier.BASIC,
    duration: 20,
    minInvestment: 1000,
    baseAPY: 9,
    maxAPY: 10,
    baseTakaraAPY: 85,
    maxTakaraAPY: 95,
    requireTAKARA: true,
    takaraRatio: 8,
  },
  {
    name: '20M Pro Vault',
    tier: VaultTier.PRO,
    duration: 20,
    minInvestment: 1500,
    baseAPY: 9.5,
    maxAPY: 10.4,
    baseTakaraAPY: 95,
    maxTakaraAPY: 105,
    requireTAKARA: true,
    takaraRatio: 12,
  },
  {
    name: '20M Elite Vault',
    tier: VaultTier.ELITE,
    duration: 20,
    minInvestment: 2000,
    baseAPY: 10,
    maxAPY: 10.8,
    baseTakaraAPY: 100,
    maxTakaraAPY: 110,
    requireTAKARA: true,
    takaraRatio: 15,
  },

  // ==================== 30 Months (Max 45% Total Return) ====================
  {
    name: '30M Starter Vault',
    tier: VaultTier.STARTER,
    duration: 30,
    minInvestment: 1000,
    baseAPY: 13,
    maxAPY: 15,
    baseTakaraAPY: 150,
    maxTakaraAPY: 175,
    requireTAKARA: true,
    takaraRatio: 10,
  },
  {
    name: '30M Basic Vault',
    tier: VaultTier.BASIC,
    duration: 30,
    minInvestment: 2000,
    baseAPY: 14,
    maxAPY: 16,
    baseTakaraAPY: 175,
    maxTakaraAPY: 200,
    requireTAKARA: true,
    takaraRatio: 15,
  },
  {
    name: '30M Pro Vault',
    tier: VaultTier.PRO,
    duration: 30,
    minInvestment: 3500,
    baseAPY: 15,
    maxAPY: 17,
    baseTakaraAPY: 200,
    maxTakaraAPY: 225,
    requireTAKARA: true,
    takaraRatio: 20,
  },
  {
    name: '30M Elite Vault',
    tier: VaultTier.ELITE,
    duration: 30,
    minInvestment: 5000,
    baseAPY: 16,
    maxAPY: 18,
    baseTakaraAPY: 225,
    maxTakaraAPY: 250,
    requireTAKARA: true,
    takaraRatio: 30,
  },

  // ==================== 36 Months (Max 60% Total Return) ====================
  {
    name: '36M Starter Vault',
    tier: VaultTier.STARTER,
    duration: 36,
    minInvestment: 2500,
    baseAPY: 14,
    maxAPY: 16,
    baseTakaraAPY: 250,
    maxTakaraAPY: 300,
    requireTAKARA: true,
    takaraRatio: 15,
  },
  {
    name: '36M Basic Vault',
    tier: VaultTier.BASIC,
    duration: 36,
    minInvestment: 5000,
    baseAPY: 15,
    maxAPY: 17,
    baseTakaraAPY: 300,
    maxTakaraAPY: 350,
    requireTAKARA: true,
    takaraRatio: 25,
  },
  {
    name: '36M Pro Vault',
    tier: VaultTier.PRO,
    duration: 36,
    minInvestment: 7500,
    baseAPY: 17,
    maxAPY: 19,
    baseTakaraAPY: 350,
    maxTakaraAPY: 400,
    requireTAKARA: true,
    takaraRatio: 35,
  },
  {
    name: '36M Elite Vault',
    tier: VaultTier.ELITE,
    duration: 36,
    minInvestment: 10000,
    baseAPY: 18,
    maxAPY: 20,
    baseTakaraAPY: 400,
    maxTakaraAPY: 450,
    requireTAKARA: true,
    takaraRatio: 40,
  },
]

async function main() {
  console.log('🔄 Creating 16 vaults (4 durations × 4 tiers)...\n')

  // Delete existing vaults
  await prisma.vault.deleteMany({})
  console.log('🗑️ Cleared existing vaults\n')

  // Create all 16 vaults
  for (const vault of VAULTS) {
    await prisma.vault.create({
      data: {
        name: vault.name,
        tier: vault.tier,
        duration: vault.duration,
        payoutSchedule: 'MONTHLY',
        minInvestment: vault.minInvestment,
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
    const takaraReq = vault.requireTAKARA ? `${vault.takaraRatio} per 100` : 'None'
    console.log(`✅ ${vault.name} | Min: $${vault.minInvestment} | TAKARA: ${takaraReq} | APY: ${vault.baseAPY}%-${vault.maxAPY}%`)
  }

  // Show summary by duration
  console.log('\n' + '='.repeat(70))
  console.log('📊 Summary by Duration:\n')

  const durations = [18, 20, 30, 36]
  for (const dur of durations) {
    const vaults = await prisma.vault.findMany({
      where: { duration: dur },
      orderBy: { tier: 'asc' },
      select: { name: true, tier: true, minInvestment: true, baseAPY: true, maxAPY: true, takaraRatio: true }
    })

    const years = dur / 12
    const maxReturn = vaults.reduce((max, v) => Math.max(max, Number(v.maxAPY) * years), 0)

    console.log(`${dur} Months (Max ${maxReturn.toFixed(0)}% Total Return):`)
    for (const v of vaults) {
      console.log(`  ${v.tier.padEnd(7)} | Min $${Number(v.minInvestment).toLocaleString().padStart(6)} | TAKARA: ${v.takaraRatio} | ${v.baseAPY}%-${v.maxAPY}%`)
    }
    console.log('')
  }

  console.log('='.repeat(70))
  console.log(`\n✨ Total vaults created: ${VAULTS.length}`)
  console.log('✅ Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
