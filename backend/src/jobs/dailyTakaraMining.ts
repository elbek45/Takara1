/**
 * Daily TAKARA Mining Job (v2.3 - Updated for circulating supply)
 *
 * Runs daily to:
 * - Calculate mining rewards for all active investments
 * - Update mining difficulty based on circulating supply
 * - Record mining stats with TAKARA type breakdown
 * - Distribute TAKARA to pending balances
 */

import { prisma } from '../config/database';
import { calculateDifficulty, calculateMining, TAKARA_CONFIG } from '../utils/mining.calculator';
import { calculateSupplyBreakdown } from '../services/supply.service';
import { getLogger } from '../config/logger';

const logger = getLogger('daily-mining-job');

/**
 * Process daily mining for all active investments
 */
export async function processDailyMining(): Promise<void> {
  try {
    logger.info('Starting daily TAKARA mining process');

    // Get current supply breakdown (v2.3 - includes all TAKARA types)
    const supplyBreakdown = await calculateSupplyBreakdown();

    logger.info({
      circulatingSupply: supplyBreakdown.circulatingSupply,
      totalMined: supplyBreakdown.totalMined,
      totalEntryLocked: supplyBreakdown.totalEntryLocked,
      totalBoostLocked: supplyBreakdown.totalBoostLocked,
      totalClaimTax: supplyBreakdown.totalClaimTax
    }, 'Current TAKARA supply breakdown');

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

    // Calculate current difficulty based on circulating supply (v2.3)
    const currentDifficulty = calculateDifficulty({
      circulatingSupply: supplyBreakdown.circulatingSupply,
      activeMiners: activeInvestments.length
    });

    logger.info({
      difficulty: currentDifficulty,
      circulatingSupply: supplyBreakdown.circulatingSupply
    }, 'Current mining difficulty');

    let totalMinedToday = 0;
    const miningRecords = [];

    // Process each investment
    for (const investment of activeInvestments) {
      try {
        // Calculate mining for this investment
        const miningResult = calculateMining({
          takaraAPY: Number(investment.vault.maxTakaraAPY),
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
          takaraAPY: investment.vault.maxTakaraAPY,
          difficulty: currentDifficulty,
          takaraMinedRaw: miningResult.dailyTakaraRaw,
          takaraMinedFinal: dailyTakara,
          totalMinedSoFar: supplyBreakdown.totalMined + totalMinedToday,
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

    // Recalculate supply breakdown after mining (v2.3)
    const updatedSupply = await calculateSupplyBreakdown();

    // Create today's mining stats with full supply breakdown
    await prisma.miningStats.create({
      data: {
        date: new Date(),
        totalMined: updatedSupply.totalMined,
        totalEntryLocked: updatedSupply.totalEntryLocked,
        totalBoostLocked: updatedSupply.totalBoostLocked,
        totalClaimTax: updatedSupply.totalClaimTax,
        circulatingSupply: updatedSupply.circulatingSupply,
        activeMiners: activeInvestments.length,
        currentDifficulty
      }
    });

    logger.info({
      totalMinedToday,
      totalMined: updatedSupply.totalMined,
      circulatingSupply: updatedSupply.circulatingSupply,
      difficulty: currentDifficulty,
      activeMiners: activeInvestments.length,
      percentCirculating: (updatedSupply.circulatingSupply / TAKARA_CONFIG.TOTAL_SUPPLY * 100).toFixed(4) + '%'
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
