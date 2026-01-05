/**
 * Update Vaults v2.5
 *
 * 1. Change miningThreshold from $100,000 to $25,000 for all vaults
 * 2. Add new 20-month vault tier (18% Total Return = 10.8% APY)
 *
 * Run: npx ts-node scripts/update-vaults-v2-5.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Vault Update v2.5...\n')

  // 1. Update miningThreshold for all existing vaults
  console.log('📊 Updating miningThreshold to $25,000...')
  const thresholdUpdate = await prisma.vault.updateMany({
    data: {
      miningThreshold: 25000
    }
  })
  console.log(`✅ Updated ${thresholdUpdate.count} vaults with new threshold\n`)

  // 2. Add new 20-month vaults
  console.log('📦 Adding 20-month vaults...')

  const newVaults = [
    {
      name: 'Starter Vault 20M',
      tier: 'STARTER' as const,
      duration: 20,
      payoutSchedule: 'MONTHLY' as const,
      minInvestment: 100,
      maxInvestment: 999999999,
      baseAPY: 10.8,
      maxAPY: 12.8,
      baseTakaraAPY: 85,
      maxTakaraAPY: 170,
      requireTAKARA: true,
      takaraRatio: 15,
      miningThreshold: 25000,
      isActive: true,
      acceptedPayments: 'USDT,TAKARA'
    },
    {
      name: 'Pro Vault 20M',
      tier: 'PRO' as const,
      duration: 20,
      payoutSchedule: 'MONTHLY' as const,
      minInvestment: 1000,
      maxInvestment: 999999999,
      baseAPY: 10.8,
      maxAPY: 13.3,
      baseTakaraAPY: 180,
      maxTakaraAPY: 360,
      requireTAKARA: true,
      takaraRatio: 22,
      miningThreshold: 25000,
      isActive: true,
      acceptedPayments: 'USDT,TAKARA'
    },
    {
      name: 'Elite Vault 20M',
      tier: 'ELITE' as const,
      duration: 20,
      payoutSchedule: 'MONTHLY' as const,
      minInvestment: 5000,
      maxInvestment: 999999999,
      baseAPY: 10.8,
      maxAPY: 14.0,
      baseTakaraAPY: 230,
      maxTakaraAPY: 460,
      requireTAKARA: true,
      takaraRatio: 30,
      miningThreshold: 25000,
      isActive: true,
      acceptedPayments: 'USDT,TAKARA'
    }
  ]

  for (const vault of newVaults) {
    // Check if vault already exists
    const existing = await prisma.vault.findFirst({
      where: {
        name: vault.name,
        duration: vault.duration,
        tier: vault.tier
      }
    })

    if (existing) {
      console.log(`⚠️  ${vault.name} already exists, skipping...`)
      continue
    }

    await prisma.vault.create({ data: vault })
    console.log(`✅ Created: ${vault.name}`)
  }

  // 3. Show final state
  console.log('\n📊 Final Vault Configuration:')
  const allVaults = await prisma.vault.findMany({
    orderBy: [
      { tier: 'asc' },
      { duration: 'asc' }
    ],
    select: {
      name: true,
      tier: true,
      duration: true,
      baseAPY: true,
      miningThreshold: true,
      requireTAKARA: true,
      isActive: true
    }
  })

  console.log('\n| Vault | Tier | Duration | APY | Threshold | TAKARA |')
  console.log('|-------|------|----------|-----|-----------|--------|')
  for (const v of allVaults) {
    console.log(`| ${v.name.padEnd(20)} | ${v.tier.padEnd(7)} | ${v.duration}M | ${Number(v.baseAPY).toFixed(1)}% | $${Number(v.miningThreshold).toLocaleString()} | ${v.requireTAKARA ? 'Yes' : 'No'} |`)
  }

  console.log(`\n✨ Total vaults: ${allVaults.length}`)
  console.log('✅ Vault update v2.5 complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
