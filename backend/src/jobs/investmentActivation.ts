/**
 * Investment Activation Job
 *
 * Runs hourly to:
 * - Check for investments that passed the 72-hour activation delay
 * - Activate pending investments
 * - Mint NFTs for newly activated investments
 * - Update investment status
 */

import { prisma } from '../config/database';
import { INVESTMENT_CONFIG } from '../config/constants';
import { mintInvestmentNFT } from '../services/nft.service';
import { getLogger } from '../config/logger';

const logger = getLogger('activation-job');

/**
 * Process investment activation
 */
export async function processInvestmentActivation(): Promise<void> {
  try {
    logger.info('Starting investment activation process');

    // Calculate activation threshold (72 hours ago)
    const activationThreshold = new Date();
    activationThreshold.setHours(
      activationThreshold.getHours() - INVESTMENT_CONFIG.ACTIVATION_DELAY_HOURS
    );

    // Get pending investments that are ready for activation
    const pendingInvestments = await prisma.investment.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: activationThreshold
        }
      },
      include: {
        user: true,
        vault: true,
        laikaBoost: true
      }
    });

    logger.info({ count: pendingInvestments.length }, 'Pending investments found');

    if (pendingInvestments.length === 0) {
      logger.info('No investments ready for activation');
      return;
    }

    let activatedCount = 0;
    let failedCount = 0;

    // Process each investment
    for (const investment of pendingInvestments) {
      try {
        logger.info({
          investmentId: investment.id,
          userId: investment.userId
        }, 'Activating investment');

        // TODO: Mint NFT (currently using placeholder)
        // Uncomment when Metaplex is properly implemented
        /*
        const nftData = await mintInvestmentNFT(
          {
            investmentId: investment.id,
            vaultName: investment.vault.name,
            vaultTier: investment.vault.tier,
            usdtAmount: Number(investment.usdtAmount),
            finalAPY: Number(investment.finalAPY),
            duration: investment.vault.duration,
            miningPower: Number(investment.vault.miningPower),
            hasLaikaBoost: !!investment.laikaBoost,
            ownerWallet: investment.user.walletAddress
          },
          platformWallet // TODO: Pass actual platform wallet
        );
        */

        // Activate investment (with or without NFT)
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            status: 'ACTIVE',
            // nftMintAddress: nftData.mintAddress,
            // nftMetadataUri: nftData.metadataUri,
            // isNFTMinted: true
          }
        });

        // Update user stats
        await prisma.user.update({
          where: { id: investment.userId },
          data: {
            totalInvested: {
              increment: investment.usdtAmount
            }
          }
        });

        // Calculate next payout date
        const nextPayoutDate = new Date(investment.startDate);
        switch (investment.vault.payoutSchedule) {
          case 'MONTHLY':
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 3);
            break;
          case 'END_OF_TERM':
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + investment.vault.duration);
            break;
        }

        await prisma.investment.update({
          where: { id: investment.id },
          data: { nextPayoutDate }
        });

        activatedCount++;

        logger.info({
          investmentId: investment.id,
          // nftMintAddress: nftData.mintAddress
        }, 'Investment activated successfully');
      } catch (error) {
        failedCount++;
        logger.error({
          error,
          investmentId: investment.id
        }, 'Failed to activate investment');
      }
    }

    logger.info({
      total: pendingInvestments.length,
      activated: activatedCount,
      failed: failedCount
    }, 'Investment activation completed');
  } catch (error) {
    logger.error({ error }, 'Investment activation job failed');
    throw error;
  }
}

/**
 * Run the job (can be called manually or by scheduler)
 */
export async function runActivationJob(): Promise<void> {
  try {
    await processInvestmentActivation();
  } catch (error) {
    logger.error({ error }, 'Activation job execution failed');
  }
}

// If run directly
if (require.main === module) {
  runActivationJob()
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
  processInvestmentActivation,
  runActivationJob
};
