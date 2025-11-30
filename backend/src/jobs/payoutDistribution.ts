/**
 * Payout Distribution Job
 *
 * Runs every 6 hours to:
 * - Check for investments with pending payouts
 * - Calculate USDT yield based on APY
 * - Add to pending balance
 * - Update next payout date
 */

import { prisma } from '../config/database';
import { calculatePendingEarnings } from '../utils/apy.calculator';
import { getLogger } from '../config/logger';

const logger = getLogger('payout-job');

/**
 * Process payout distribution
 */
export async function processPayoutDistribution(): Promise<void> {
  try {
    logger.info('Starting payout distribution process');

    const now = new Date();

    // Get active investments that are due for payout
    const dueInvestments = await prisma.investment.findMany({
      where: {
        status: 'ACTIVE',
        nextPayoutDate: {
          lte: now
        }
      },
      include: {
        vault: true
      }
    });

    logger.info({ count: dueInvestments.length }, 'Investments due for payout');

    if (dueInvestments.length === 0) {
      logger.info('No payouts due');
      return;
    }

    let processedCount = 0;
    let totalDistributed = 0;

    // Process each investment
    for (const investment of dueInvestments) {
      try {
        // Calculate pending earnings since last claim
        const pendingEarnings = calculatePendingEarnings(
          Number(investment.usdtAmount),
          Number(investment.finalAPY),
          investment.startDate,
          now,
          investment.lastClaimDate || undefined
        );

        if (pendingEarnings <= 0) {
          logger.debug({
            investmentId: investment.id
          }, 'No pending earnings, skipping');
          continue;
        }

        // Calculate next payout date
        let nextPayoutDate = new Date(investment.nextPayoutDate!);

        switch (investment.vault.payoutSchedule) {
          case 'MONTHLY':
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 3);
            break;
          case 'END_OF_TERM':
            // End of term already happened, no next payout
            nextPayoutDate = investment.endDate;
            break;
        }

        // Update investment with pending earnings
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            pendingUSDT: {
              increment: pendingEarnings
            },
            nextPayoutDate: nextPayoutDate <= investment.endDate ? nextPayoutDate : null
          }
        });

        processedCount++;
        totalDistributed += pendingEarnings;

        logger.info({
          investmentId: investment.id,
          amount: pendingEarnings,
          nextPayoutDate
        }, 'Payout distributed');
      } catch (error) {
        logger.error({
          error,
          investmentId: investment.id
        }, 'Failed to process payout');
      }
    }

    logger.info({
      total: dueInvestments.length,
      processed: processedCount,
      totalDistributed: Number(totalDistributed.toFixed(2))
    }, 'Payout distribution completed');
  } catch (error) {
    logger.error({ error }, 'Payout distribution job failed');
    throw error;
  }
}

/**
 * Process investment completion
 * Check for investments that reached end date and mark as completed
 */
export async function processInvestmentCompletion(): Promise<void> {
  try {
    logger.info('Checking for completed investments');

    const now = new Date();

    // Find active investments that passed end date
    const completedInvestments = await prisma.investment.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: now
        }
      }
    });

    logger.info({ count: completedInvestments.length }, 'Completed investments found');

    if (completedInvestments.length === 0) {
      return;
    }

    // Update all to completed status
    const result = await prisma.investment.updateMany({
      where: {
        id: {
          in: completedInvestments.map(inv => inv.id)
        }
      },
      data: {
        status: 'COMPLETED'
      }
    });

    logger.info({ count: result.count }, 'Investments marked as completed');
  } catch (error) {
    logger.error({ error }, 'Failed to process investment completion');
  }
}

/**
 * Run the job (can be called manually or by scheduler)
 */
export async function runPayoutJob(): Promise<void> {
  try {
    await processPayoutDistribution();
    await processInvestmentCompletion();
  } catch (error) {
    logger.error({ error }, 'Payout job execution failed');
  }
}

// If run directly
if (require.main === module) {
  runPayoutJob()
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
  processPayoutDistribution,
  processInvestmentCompletion,
  runPayoutJob
};
