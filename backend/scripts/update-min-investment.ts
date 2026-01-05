/**
 * Update minimum investment to $300 for all vaults
 * Run: npx ts-node scripts/update-min-investment.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating minimum investment to $300 for all vaults...\n')

  const result = await prisma.vault.updateMany({
    data: {
      minInvestment: 300
    }
  })

  console.log(`✅ Updated ${result.count} vaults\n`)

  // Show final state
  const vaults = await prisma.vault.findMany({
    orderBy: [{ tier: 'asc' }, { duration: 'asc' }],
    select: {
      name: true,
      tier: true,
      duration: true,
      minInvestment: true,
      miningThreshold: true
    }
  })

  console.log('📊 Final Vault Configuration:\n')
  console.log('| Vault | Min Investment | Threshold |')
  console.log('|-------|----------------|-----------|')
  for (const v of vaults) {
    console.log(`| ${v.name.padEnd(20)} | $${Number(v.minInvestment).toLocaleString().padStart(5)} | $${Number(v.miningThreshold).toLocaleString()} |`)
  }

  console.log('\n✅ Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
