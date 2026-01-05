/**
 * Fix maxAPY values to match config
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating maxAPY values...')

  // Pro 30M: maxAPY 27
  await prisma.vault.updateMany({
    where: { duration: 30 },
    data: { maxAPY: 27 }
  })

  // Elite 36M: maxAPY 29
  await prisma.vault.updateMany({
    where: { duration: 36 },
    data: { maxAPY: 29 }
  })

  console.log('✅ Updated')

  const vaults = await prisma.vault.findMany({
    orderBy: { duration: 'asc' },
    select: { name: true, baseAPY: true, maxAPY: true }
  })

  for (const v of vaults) {
    console.log(`${v.name}: baseAPY=${v.baseAPY}, maxAPY=${v.maxAPY}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
