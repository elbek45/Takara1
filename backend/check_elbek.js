require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findFirst({
    where: { username: 'elbek' },
    include: {
      investments: {
        select: {
          id: true,
          usdtAmount: true,
          status: true,
          totalMinedTAKARA: true,
          pendingTAKARA: true,
          vault: { select: { name: true } }
        }
      }
    }
  });
  
  if (user) {
    console.log('User elbek found:');
    console.log('  ID:', user.id);
    console.log('  Solana wallet:', user.walletAddress || 'Not connected');
    console.log('  TRON wallet:', user.tronAddress || 'Not connected');
    console.log('  Investments:', user.investments.length);
    
    let totalInvested = 0;
    let totalMined = 0;
    for (const inv of user.investments) {
      totalInvested += Number(inv.usdtAmount);
      totalMined += Number(inv.pendingTAKARA);
      console.log(`    - ${inv.vault.name}: $${inv.usdtAmount} (${inv.status}) - pending TAKARA: ${Number(inv.pendingTAKARA).toFixed(2)}`);
    }
    console.log('  Total invested:', '$' + totalInvested);
    console.log('  Total pending TAKARA:', totalMined.toFixed(2));
  } else {
    console.log('User elbek not found!');
  }
  
  await prisma.$disconnect();
})();
