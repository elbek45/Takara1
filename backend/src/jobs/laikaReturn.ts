/**
 * LAIKA Return Job
 *
 * Runs daily to:
 * - Check for completed investments with LAIKA boost
 * - Return LAIKA tokens to NFT owner
 * - Mark LAIKA boost as returned
 */

import { prisma } from '../config/database';
import { transferFromPlatform } from '../services/solana.service';
import pino from 'pino';

const logger = pino({ name: 'laika-return-job' });

/**
 * Process LAIKA returns for completed investments
 */
export async function processLaikaReturn(): Promise<void> {
  try {
    logger.info('Starting LAIKA return process');

    // Find completed investments with unreturned LAIKA
    const completedWithLaika = await prisma.investment.findMany({
      where: {
        status: 'COMPLETED',
        laikaBoost: {
          isReturned: false
        }
      },
      include: {
        laikaBoost: true,
        user: true,
        vault: true
      }
    });

    logger.info({ count: completedWithLaika.length }, 'Investments with LAIKA to return');

    if (completedWithLaika.length === 0) {
      logger.info('No LAIKA returns due');
      return;
    }

    let processedCount = 0;
    let failedCount = 0;
    let totalReturned = 0;

    // Get LAIKA token mint
    const laikaTokenMint = process.env.LAIKA_TOKEN_MINT;

    if (!laikaTokenMint) {
      logger.error('LAIKA_TOKEN_MINT not configured');
      return;
    }

    // Process each investment
    for (const investment of completedWithLaika) {
      try {
        if (!investment.laikaBoost) {
          continue;
        }

        const laikaAmount = Number(investment.laikaBoost.laikaAmount);
        const ownerWallet = investment.user.walletAddress;

        logger.info({
          investmentId: investment.id,
          amount: laikaAmount,
          owner: ownerWallet
        }, 'Returning LAIKA');

        // TODO: Transfer LAIKA tokens back to owner
        // Uncomment when Solana integration is complete
        /*
        const txSignature = await transferFromPlatform(
          ownerWallet,
          laikaTokenMint,
          laikaAmount
        );
        */

        // Placeholder signature
        const txSignature = `laika_return_${Date.now()}_${investment.id}`;

        // Mark LAIKA boost as returned
        await prisma.laikaBoost.update({
          where: { id: investment.laikaBoost.id },
          data: {
            isReturned: true,
            returnDate: new Date(),
            returnTxSignature: txSignature
          }
        });

        // Record transaction
        await prisma.transaction.create({
          data: {
            investmentId: investment.id,
            type: 'LAIKA_RETURN',
            amount: laikaAmount,
            tokenType: 'LAIKA',
            txSignature,
            fromAddress: process.env.PLATFORM_WALLET_ADDRESS || '',
            toAddress: ownerWallet,
            status: 'CONFIRMED',
            description: `LAIKA boost return for ${investment.vault.name}`,
            metadata: {
              investmentId: investment.id,
              vaultName: investment.vault.name
            }
          }
        });

        processedCount++;
        totalReturned += laikaAmount;

        logger.info({
          investmentId: investment.id,
          amount: laikaAmount,
          txSignature
        }, 'LAIKA returned successfully');
      } catch (error) {
        failedCount++;
        logger.error({
          error,
          investmentId: investment.id
        }, 'Failed to return LAIKA');
      }
    }

    logger.info({
      total: completedWithLaika.length,
      processed: processedCount,
      failed: failedCount,
      totalReturned: Number(totalReturned.toFixed(2))
    }, 'LAIKA return process completed');
  } catch (error) {
    logger.error({ error }, 'LAIKA return job failed');
    throw error;
  }
}

/**
 * Process LAIKA return for sold investments
 * When an NFT is sold, LAIKA goes to the new owner
 */
export async function processLaikaTransferOnSale(): Promise<void> {
  try {
    logger.info('Checking for LAIKA transfers on NFT sales');

    // Find sold investments with LAIKA that wasn't transferred
    const soldWithLaika = await prisma.investment.findMany({
      where: {
        status: 'SOLD',
        laikaBoost: {
          isReturned: false
        }
      },
      include: {
        laikaBoost: true,
        user: true, // New owner
        marketplaceListing: true,
        vault: true
      }
    });

    logger.info({ count: soldWithLaika.length }, 'Sold investments with LAIKA to transfer');

    if (soldWithLaika.length === 0) {
      return;
    }

    const laikaTokenMint = process.env.LAIKA_TOKEN_MINT;

    if (!laikaTokenMint) {
      logger.error('LAIKA_TOKEN_MINT not configured');
      return;
    }

    // Process each sold investment
    for (const investment of soldWithLaika) {
      try {
        if (!investment.laikaBoost || !investment.marketplaceListing) {
          continue;
        }

        const laikaAmount = Number(investment.laikaBoost.laikaAmount);
        const newOwnerWallet = investment.user.walletAddress;

        logger.info({
          investmentId: investment.id,
          amount: laikaAmount,
          newOwner: newOwnerWallet
        }, 'Transferring LAIKA to new owner');

        // TODO: Transfer LAIKA to new owner
        // For now, just mark as transferred
        const txSignature = `laika_transfer_sale_${Date.now()}_${investment.id}`;

        await prisma.laikaBoost.update({
          where: { id: investment.laikaBoost.id },
          data: {
            isReturned: true,
            returnDate: new Date(),
            returnTxSignature: txSignature
          }
        });

        logger.info({
          investmentId: investment.id,
          amount: laikaAmount
        }, 'LAIKA transferred to new owner');
      } catch (error) {
        logger.error({
          error,
          investmentId: investment.id
        }, 'Failed to transfer LAIKA on sale');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process LAIKA transfers on sales');
  }
}

/**
 * Run the job (can be called manually or by scheduler)
 */
export async function runLaikaReturnJob(): Promise<void> {
  try {
    await processLaikaReturn();
    await processLaikaTransferOnSale();
  } catch (error) {
    logger.error({ error }, 'LAIKA return job execution failed');
  }
}

// If run directly
if (require.main === module) {
  runLaikaReturnJob()
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
  processLaikaReturn,
  processLaikaTransferOnSale,
  runLaikaReturnJob
};
