/**
 * Sync vault values with config
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Syncing vault configuration...\n')

  // Starter 18M - no TAKARA required
  await prisma.vault.updateMany({
    where: { duration: 18 },
    data: {
      baseAPY: 7.6,
      maxAPY: 9.6,
      takaraRatio: 0,
      requireTAKARA: false
    }
  })
  console.log('✅ Starter 18M: baseAPY=7.6, maxAPY=9.6, takaraRatio=0')

  // Beginner 20M
  await prisma.vault.updateMany({
    where: { duration: 20 },
    data: {
      baseAPY: 8.5,
      maxAPY: 10.5,
      takaraRatio: 15,
      requireTAKARA: true
    }
  })
  console.log('✅ Beginner 20M: baseAPY=8.5, maxAPY=10.5, takaraRatio=15')

  // Pro 30M
  await prisma.vault.updateMany({
    where: { duration: 30 },
    data: {
      baseAPY: 13.43,
      maxAPY: 16.43,
      takaraRatio: 25,
      requireTAKARA: true
    }
  })
  console.log('✅ Pro 30M: baseAPY=13.43, maxAPY=16.43, takaraRatio=25')

  // Elite 36M
  await prisma.vault.updateMany({
    where: { duration: 36 },
    data: {
      baseAPY: 15.2,
      maxAPY: 19.2,
      takaraRatio: 40,
      requireTAKARA: true
    }
  })
  console.log('✅ Elite 36M: baseAPY=15.2, maxAPY=19.2, takaraRatio=40')

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
