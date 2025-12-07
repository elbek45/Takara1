/**
 * Daily TAKARA Mining Job
 *
 * Runs daily to:
 * - Calculate mining rewards for all active investments
 * - Update mining difficulty
 * - Record mining stats
 * - Distribute TAKARA to pending balances
 */

import { prisma } from '../config/database';
import { calculateDifficulty, calculateMining, TAKARA_CONFIG } from '../utils/mining.calculator';
import { getLogger } from '../config/logger';

const logger = getLogger('daily-mining-job');

/**
 * Process daily mining for all active investments
 */
export async function processDailyMining(): Promise<void> {
  try {
    logger.info('Starting daily TAKARA mining process');

    // Get current mining stats
    const latestStats = await prisma.miningStats.findFirst({
      orderBy: { date: 'desc' }
    });

    const totalMinedSoFar = latestStats ? Number(latestStats.totalMined) : 0;

    // Get all active investments
    const activeInvestments = await prisma.investment.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        vault: true
      }
    });

    logger.info({ count: activeInvestments.length }, 'Active investments found');

    if (activeInvestments.length === 0) {
      logger.info('No active investments, skipping mining');
      return;
    }

    // Calculate current difficulty
    const currentDifficulty = calculateDifficulty({
      totalMined: totalMinedSoFar,
      activeMiners: activeInvestments.length
    });

    logger.info({ difficulty: currentDifficulty }, 'Current mining difficulty');

    let totalMinedToday = 0;
    const miningRecords = [];

    // Process each investment
    for (const investment of activeInvestments) {
      try {
        // Calculate mining for this investment
        const miningResult = calculateMining({
          takaraAPY: Number(investment.vault.takaraAPY),
          usdtInvested: Number(investment.usdtAmount),
          currentDifficulty,
          durationMonths: investment.vault.duration
        });

        const dailyTakara = miningResult.dailyTakaraFinal;
        totalMinedToday += dailyTakara;

        // Create mining record
        miningRecords.push({
          investmentId: investment.id,
          miningDate: new Date(),
          takaraAPY: investment.vault.takaraAPY,
          difficulty: currentDifficulty,
          takaraMinedRaw: miningResult.dailyTakaraRaw,
          takaraMinedFinal: dailyTakara,
          totalMinedSoFar: totalMinedSoFar + totalMinedToday,
          activeMiners: activeInvestments.length
        });

        // Update investment pending TAKARA
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            pendingTAKARA: {
              increment: dailyTakara
            }
          }
        });

        logger.debug({
          investmentId: investment.id,
          takaraMined: dailyTakara
        }, 'Mining processed for investment');
      } catch (error) {
        logger.error({
          error,
          investmentId: investment.id
        }, 'Failed to process mining for investment');
      }
    }

    // Bulk create mining records
    if (miningRecords.length > 0) {
      await prisma.takaraMining.createMany({
        data: miningRecords
      });
    }

    // Create today's mining stats
    await prisma.miningStats.create({
      data: {
        date: new Date(),
        totalMined: totalMinedSoFar + totalMinedToday,
        activeMiners: activeInvestments.length,
        currentDifficulty
      }
    });

    logger.info({
      totalMinedToday,
      totalMinedSoFar: totalMinedSoFar + totalMinedToday,
      difficulty: currentDifficulty,
      activeMiners: activeInvestments.length,
      percentComplete: ((totalMinedSoFar + totalMinedToday) / TAKARA_CONFIG.TOTAL_SUPPLY * 100).toFixed(4) + '%'
    }, 'Daily mining completed successfully');
  } catch (error) {
    logger.error({ error }, 'Daily mining job failed');
    throw error;
  }
}

/**
 * Run the job (can be called manually or by scheduler)
 */
export async function runDailyMiningJob(): Promise<void> {
  try {
    await processDailyMining();
  } catch (error) {
    logger.error({ error }, 'Daily mining job execution failed');
  }
}

// If run directly
if (require.main === module) {
  runDailyMiningJob()
    .then(() => {
      logger.info('Manual job execution completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Manual job execution failed');
      process.exit(1);
    });
}

export default {
  processDailyMining,
  runDailyMiningJob
};
