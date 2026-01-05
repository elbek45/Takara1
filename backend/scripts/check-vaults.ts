import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const vaults = await prisma.vault.findMany({
    orderBy: { duration: 'asc' },
    select: { name: true, baseAPY: true, maxAPY: true, takaraRatio: true }
  })
  console.log(JSON.stringify(vaults, null, 2))
}

main().finally(() => prisma.$disconnect())
