/**
 * Investment Controller
 *
 * Handles:
 * - Create investment
 * - Get user investments
 * - Add LAIKA boost
 * - Claim USDT yield
 * - Claim TAKARA rewards
 * - Get investment details
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, CreateInvestmentInput } from '../types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, INVESTMENT_CONFIG } from '../config/constants';
import { calculateLaikaBoost } from '../utils/laika.calculator';
import { calculateEarnings, calculatePendingEarnings } from '../utils/apy.calculator';
import { VaultTier } from '../config/vaults.config';
import { verifyTransaction, transferTAKARAReward } from '../services/solana.service';
import { verifyUSDTTransaction, transferUSDTFromPlatform } from '../services/ethereum.service';
import { verifyUSDTTransactionTron, verifyTRXTransaction } from '../services/tron.service';
import { applyTakaraClaimTax } from '../services/tax.service';
import { getLogger } from '../config/logger';

const logger = getLogger('investment-controller');

// TEST_MODE: Instant activation with mock NFT (for testing on devnet)
const TEST_MODE = process.env.TEST_MODE === 'true';

/**
 * Generate mock NFT address for testing
 */
function generateMockNFTAddress(investmentId: string): string {
  return `MOCK_NFT_${Date.now()}_${investmentId.slice(0, 8)}`;
}

/**
 * POST /api/investments
 * Create new investment
 */
export async function createInvestment(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const input: CreateInvestmentInput = req.body;

    const { vaultId, usdtAmount, takaraAmount, laikaBoost, txSignature, paymentMethod = 'USDT', trxAmount } = input;

    // Validate input
    if (!vaultId || !usdtAmount || !txSignature) {
      res.status(400).json({
        success: false,
        message: 'Vault ID, USDT amount, and transaction signature are required'
      });
      return;
    }

    // Validate TRX amount if paying with TRX
    if (paymentMethod === 'TRX' && (!trxAmount || trxAmount <= 0)) {
      res.status(400).json({
        success: false,
        message: 'TRX amount is required when paying with TRX'
      });
      return;
    }

    // Log payment method for debugging
    logger.info({ paymentMethod, txSignature, usdtAmount }, 'Processing investment with payment method');

    // Get vault
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault || !vault.isActive) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.VAULT_NOT_FOUND
      });
      return;
    }

    // Validate investment amount
    if (usdtAmount < Number(vault.minInvestment) || usdtAmount > Number(vault.maxInvestment)) {
      res.status(400).json({
        success: false,
        message: `Investment must be between $${vault.minInvestment} and $${vault.maxInvestment}`
      });
      return;
    }

    // Check TAKARA requirement
    const requiredTAKARA = vault.requireTAKARA && vault.takaraRatio
      ? (usdtAmount / 100) * Number(vault.takaraRatio)
      : 0;

    if (requiredTAKARA > 0 && (!takaraAmount || takaraAmount < requiredTAKARA)) {
      res.status(400).json({
        success: false,
        message: `This vault requires ${requiredTAKARA} TAKARA tokens`
      });
      return;
    }

    // Verify payment transaction
    // Skip verification if:
    // 1. SKIP_TX_VERIFICATION env is set (testing mode)
    // 2. Payment method is TAKARA (Solana - we trust the frontend signature)
    const skipVerification = process.env.SKIP_TX_VERIFICATION === 'true' || paymentMethod === 'TAKARA';

    if (!skipVerification) {
      // Get user's TRON address
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tronAddress: true }
      });

      if (!user?.tronAddress) {
        res.status(400).json({
          success: false,
          message: 'Please connect your Trust Wallet/TronLink first'
        });
        return;
      }

      // Get platform TRON wallet address
      const platformTronAddress = process.env.PLATFORM_WALLET_TRON;
      if (!platformTronAddress) {
        logger.error('PLATFORM_WALLET_TRON not configured');
        res.status(500).json({
          success: false,
          message: 'Platform wallet not configured'
        });
        return;
      }

      let txVerified = false;

      if (paymentMethod === 'TRX') {
        // Verify TRX transaction
        txVerified = await verifyTRXTransaction(
          txSignature,
          user.tronAddress,
          platformTronAddress,
          trxAmount!
        );

        if (!txVerified) {
          res.status(400).json({
            success: false,
            message: 'TRX transaction verification failed. Please ensure the transaction is confirmed on TRON network.'
          });
          return;
        }

        logger.info({
          userId,
          txSignature,
          paymentMethod: 'TRX',
          from: user.tronAddress,
          to: platformTronAddress,
          trxAmount
        }, 'TRX transaction verified on TRON');
      } else {
        // Verify USDT (TRC20) transaction
        txVerified = await verifyUSDTTransactionTron(
          txSignature,
          user.tronAddress,
          platformTronAddress,
          usdtAmount
        );

        if (!txVerified) {
          res.status(400).json({
            success: false,
            message: 'USDT transaction verification failed. Please ensure the transaction is confirmed on TRON network.'
          });
          return;
        }

        logger.info({
          userId,
          txSignature,
          paymentMethod: 'USDT',
          from: user.tronAddress,
          to: platformTronAddress,
          amount: usdtAmount
        }, 'USDT transaction verified on TRON');
      }
    } else {
      // Log that we're skipping verification
      logger.info({
        userId,
        txSignature,
        paymentMethod,
        skipReason: process.env.SKIP_TX_VERIFICATION === 'true' ? 'SKIP_TX_VERIFICATION=true' : 'TAKARA payment (Solana)'
      }, 'Skipping transaction verification');
    }

    // Calculate final APY (with LAIKA boost if provided)
    let finalAPY = Number(vault.baseAPY);
    let laikaBoostData = null;

    if (laikaBoost && laikaBoost.laikaValueUSD > 0) {
      const boostResult = calculateLaikaBoost({
        baseAPY: Number(vault.baseAPY),
        tier: vault.tier as VaultTier,
        usdtInvested: usdtAmount,
        laikaMarketValueUSD: laikaBoost.laikaValueUSD
      });

      finalAPY = boostResult.finalAPY;
      laikaBoostData = {
        laikaAmount: laikaBoost.laikaAmount,
        laikaValueUSD: laikaBoost.laikaValueUSD,
        maxAllowedUSD: boostResult.maxLaikaValueUSD,
        boostPercentage: boostResult.boostFillPercent,
        additionalAPY: boostResult.additionalAPY
      };
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + vault.duration);

    // Calculate activation date (72 hours from now, or now if TEST_MODE)
    const activationDate = new Date(startDate);
    if (!TEST_MODE) {
      activationDate.setHours(activationDate.getHours() + INVESTMENT_CONFIG.ACTIVATION_DELAY_HOURS);
    }

    // TEST_MODE: Calculate immediate next payout date for testing
    let nextPayoutDate: Date | null = null;
    if (TEST_MODE) {
      nextPayoutDate = new Date(startDate);
      // Set next payout to 1 minute from now for immediate testing
      nextPayoutDate.setMinutes(nextPayoutDate.getMinutes() + 1);
    }

    // Create investment
    // TEST_MODE: Activate immediately with mock NFT
    const investmentStatus = TEST_MODE ? 'ACTIVE' : 'PENDING';
    const investment = await prisma.investment.create({
      data: {
        userId,
        vaultId,
        usdtAmount,
        takaraRequired: requiredTAKARA,
        takaraLocked: takaraAmount || 0,
        finalAPY,
        startDate,
        endDate,
        status: investmentStatus,
        depositTxSignature: txSignature,
        nextPayoutDate,
        ...(laikaBoostData && {
          laikaBoost: {
            create: {
              laikaAmount: laikaBoostData.laikaAmount,
              laikaValueUSD: laikaBoostData.laikaValueUSD,
              maxAllowedUSD: laikaBoostData.maxAllowedUSD,
              boostPercentage: laikaBoostData.boostPercentage,
              additionalAPY: laikaBoostData.additionalAPY,
              depositTxSignature: txSignature
            }
          }
        })
      },
      include: {
        vault: true,
        laikaBoost: true
      }
    });

    // TEST_MODE: Generate mock NFT and update investment
    let mockNftAddress: string | null = null;
    if (TEST_MODE) {
      mockNftAddress = generateMockNFTAddress(investment.id);
      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          nftMintAddress: mockNftAddress,
          nftMetadataUri: `https://mock-metadata.takara.gold/${mockNftAddress}`,
          isNFTMinted: true
        }
      });

      // Update user stats immediately in TEST_MODE
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalInvested: {
            increment: usdtAmount
          }
        }
      });

      logger.info({
        investmentId: investment.id,
        mockNftAddress,
        testMode: true
      }, 'TEST_MODE: Investment activated immediately with mock NFT');
    }

    // Update vault filled amount
    const updatedVault = await prisma.vault.update({
      where: { id: vaultId },
      data: {
        currentFilled: {
          increment: usdtAmount
        }
      }
    });

    // Check if vault is now full or reached threshold - deactivate and create new vault
    const totalCapacity = updatedVault.totalCapacity ? Number(updatedVault.totalCapacity) : Number(updatedVault.miningThreshold);
    const currentFilled = Number(updatedVault.currentFilled);

    if (currentFilled >= totalCapacity && updatedVault.isActive) {
      // Deactivate current vault and start mining TAKARA
      await prisma.vault.update({
        where: { id: vaultId },
        data: {
          isActive: false,
          isMining: true
        }
      });

      logger.info({
        vaultId,
        vaultName: vault.name,
        currentFilled,
        totalCapacity
      }, 'Vault reached capacity and has been deactivated - starting mining');

      // Create a new vault with the same parameters (mining pool pattern)
      // Keep the same display name but use different ID for uniqueness
      const newVault = await prisma.vault.create({
        data: {
          name: updatedVault.name.replace(/_\d+$/, ''), // Use original name without timestamp
          tier: updatedVault.tier,
          duration: updatedVault.duration,
          baseAPY: updatedVault.baseAPY,
          maxAPY: updatedVault.maxAPY,
          baseTakaraAPY: updatedVault.baseTakaraAPY,
          maxTakaraAPY: updatedVault.maxTakaraAPY,
          minInvestment: updatedVault.minInvestment,
          maxInvestment: updatedVault.maxInvestment,
          totalCapacity: updatedVault.totalCapacity,
          miningThreshold: updatedVault.miningThreshold,
          payoutSchedule: updatedVault.payoutSchedule,
          requireTAKARA: updatedVault.requireTAKARA,
          takaraRatio: updatedVault.takaraRatio,
          acceptedPayments: updatedVault.acceptedPayments,
          isActive: true,
          currentFilled: 0,
          isMining: false
        }
      });

      logger.info({
        oldVaultId: vaultId,
        newVaultId: newVault.id,
        vaultName: newVault.name
      }, 'New vault created to replace filled vault (mining pool pattern)');
    }

    logger.info({
      investmentId: investment.id,
      userId,
      vaultId,
      amount: usdtAmount,
      hasLaikaBoost: !!laikaBoostData
    }, 'Investment created');

    res.status(201).json({
      success: true,
      message: TEST_MODE
        ? 'Investment created and activated immediately (TEST_MODE)'
        : SUCCESS_MESSAGES.INVESTMENT_CREATED,
      data: {
        investment: {
          id: investment.id,
          vaultName: investment.vault.name,
          usdtAmount: Number(investment.usdtAmount),
          finalAPY: Number(investment.finalAPY),
          startDate: investment.startDate,
          endDate: investment.endDate,
          activationDate,
          status: TEST_MODE ? 'ACTIVE' : investment.status,
          nftMintAddress: mockNftAddress,
          nextPayoutDate: nextPayoutDate,
          testMode: TEST_MODE,
          laikaBoost: laikaBoostData ? {
            laikaAmount: laikaBoostData.laikaAmount,
            additionalAPY: laikaBoostData.additionalAPY
          } : null
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create investment');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/investments/my
 * Get current user's investments
 */
export async function getMyInvestments(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const { status } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const investments = await prisma.investment.findMany({
      where,
      include: {
        vault: true,
        laikaBoost: true,
        takaraBoost: true,
        takaraMining: {
          orderBy: { miningDate: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const investmentsWithDetails = investments.map(inv => ({
      id: inv.id,
      vaultName: inv.vault.name,
      vaultTier: inv.vault.tier,
      usdtAmount: Number(inv.usdtAmount),
      takaraLocked: Number(inv.takaraLocked),
      finalAPY: Number(inv.finalAPY),
      startDate: inv.startDate,
      endDate: inv.endDate,
      status: inv.status,
      totalEarnedUSDT: Number(inv.totalEarnedUSDT),
      totalMinedTAKARA: Number(inv.totalMinedTAKARA),
      pendingUSDT: Number(inv.pendingUSDT),
      pendingTAKARA: Number(inv.pendingTAKARA),
      nftMintAddress: inv.nftMintAddress,
      instantSalePrice: inv.instantSalePrice ? Number(inv.instantSalePrice) : null,
      isInstantSaleEnabled: inv.isInstantSaleEnabled,
      laikaBoost: inv.laikaBoost ? {
        laikaAmount: Number(inv.laikaBoost.laikaAmount),
        additionalAPY: Number(inv.laikaBoost.additionalAPY),
        isReturned: inv.laikaBoost.isReturned
      } : null,
      takaraBoost: inv.takaraBoost ? {
        takaraAmount: Number(inv.takaraBoost.takaraAmount),
        takaraValueUSD: Number(inv.takaraBoost.takaraValueUSD),
        maxAllowedUSD: Number(inv.takaraBoost.maxAllowedUSD),
        boostPercentage: Number(inv.takaraBoost.boostPercentage),
        additionalAPY: Number(inv.takaraBoost.additionalAPY),
        isReturned: inv.takaraBoost.isReturned
      } : null,
      lastMiningDate: inv.takaraMining[0]?.miningDate || null
    }));

    res.json({
      success: true,
      data: investmentsWithDetails
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get investments');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/investments/:id
 * Get investment details
 */
export async function getInvestmentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId // Ensure user owns this investment
      },
      include: {
        vault: true,
        laikaBoost: true,
        takaraBoost: true,
        takaraMining: {
          orderBy: { miningDate: 'desc' },
          take: 30 // Last 30 days
        },
        marketplaceListing: true
      }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    // Calculate pending earnings
    const pendingUSDT = calculatePendingEarnings(
      Number(investment.usdtAmount),
      Number(investment.finalAPY),
      investment.startDate,
      new Date(),
      investment.lastClaimDate || undefined
    );

    res.json({
      success: true,
      data: {
        id: investment.id,
        vault: {
          id: investment.vault.id,
          name: investment.vault.name,
          tier: investment.vault.tier,
          duration: investment.vault.duration,
          payoutSchedule: investment.vault.payoutSchedule
        },
        usdtAmount: Number(investment.usdtAmount),
        takaraLocked: Number(investment.takaraLocked),
        finalAPY: Number(investment.finalAPY),
        startDate: investment.startDate,
        endDate: investment.endDate,
        status: investment.status,
        earnings: {
          totalUSDT: Number(investment.totalEarnedUSDT),
          pendingUSDT,
          totalTAKARA: Number(investment.totalMinedTAKARA),
          pendingTAKARA: Number(investment.pendingTAKARA)
        },
        laikaBoost: investment.laikaBoost ? {
          laikaAmount: Number(investment.laikaBoost.laikaAmount),
          laikaValueUSD: Number(investment.laikaBoost.laikaValueUSD),
          additionalAPY: Number(investment.laikaBoost.additionalAPY),
          isReturned: investment.laikaBoost.isReturned,
          returnDate: investment.laikaBoost.returnDate
        } : null,
        takaraBoost: investment.takaraBoost ? {
          takaraAmount: Number(investment.takaraBoost.takaraAmount),
          takaraValueUSD: Number(investment.takaraBoost.takaraValueUSD),
          maxAllowedUSD: Number(investment.takaraBoost.maxAllowedUSD),
          boostPercentage: Number(investment.takaraBoost.boostPercentage),
          additionalAPY: Number(investment.takaraBoost.additionalAPY),
          isReturned: investment.takaraBoost.isReturned
        } : null,
        instantSalePrice: investment.instantSalePrice ? Number(investment.instantSalePrice) : null,
        isInstantSaleEnabled: investment.isInstantSaleEnabled,
        mining: {
          history: investment.takaraMining.map(m => ({
            date: m.miningDate,
            amount: Number(m.takaraMinedFinal),
            difficulty: Number(m.difficulty)
          }))
        },
        nft: {
          mintAddress: investment.nftMintAddress,
          metadataUri: investment.nftMetadataUri,
          isListed: !!investment.marketplaceListing
        }
      }
    });
  } catch (error) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to get investment');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/investments/:id/claim-yield
 * Claim pending USDT yield
 */
export async function claimYield(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId,
        status: 'ACTIVE'
      },
      include: {
        marketplaceListing: true
      }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    // Check if investment is listed on marketplace
    if (investment.marketplaceListing && investment.marketplaceListing.status === 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'Cannot claim while investment is listed on marketplace. Cancel listing first.'
      });
      return;
    }

    const pendingAmount = Number(investment.pendingUSDT);

    if (pendingAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'No pending USDT to claim'
      });
      return;
    }

    // Get user's wallet address (TRON preferred for USDT)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tronAddress: true, ethereumAddress: true, walletAddress: true }
    });

    // Determine destination wallet (prefer TRON for USDT)
    const destinationWallet = user?.tronAddress || user?.ethereumAddress || user?.walletAddress;

    if (!destinationWallet) {
      res.status(400).json({
        success: false,
        message: 'Please connect a wallet first to claim rewards'
      });
      return;
    }

    // Check for existing pending claim request
    const existingRequest = await prisma.claimRequest.findFirst({
      where: {
        investmentId: id,
        claimType: 'USDT',
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      res.status(400).json({
        success: false,
        message: 'You already have a pending USDT claim request for this investment'
      });
      return;
    }

    // Create claim request (pending admin approval)
    const claimRequest = await prisma.claimRequest.create({
      data: {
        userId,
        investmentId: id,
        claimType: 'USDT',
        amount: pendingAmount,
        taxAmount: 0, // No tax on USDT claims
        amountAfterTax: pendingAmount,
        destinationWallet,
        status: 'PENDING'
      }
    });

    // Mark pending amount as claimed (so user can't double-claim)
    await prisma.investment.update({
      where: { id },
      data: {
        pendingUSDT: 0,
        lastClaimDate: new Date()
      }
    });

    logger.info({
      claimRequestId: claimRequest.id,
      investmentId: id,
      userId,
      amount: pendingAmount
    }, 'USDT claim request created - awaiting admin approval');

    res.json({
      success: true,
      message: 'Claim request submitted. Awaiting admin approval.',
      data: {
        claimRequestId: claimRequest.id,
        amountRequested: pendingAmount,
        destinationWallet,
        status: 'PENDING'
      }
    });
  } catch (error) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to create claim request');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/investments/:id/claim-takara
 * Claim mined TAKARA tokens - creates a claim request for admin approval
 */
export async function claimTakara(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId,
        status: 'ACTIVE'
      },
      include: {
        marketplaceListing: true
      }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    // Check if investment is listed on marketplace
    if (investment.marketplaceListing && investment.marketplaceListing.status === 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'Cannot claim while investment is listed on marketplace. Cancel listing first.'
      });
      return;
    }

    const pendingAmount = Number(investment.pendingTAKARA);

    if (pendingAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'No pending TAKARA to claim'
      });
      return;
    }

    // Get user's Solana wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    });

    if (!user?.walletAddress) {
      res.status(400).json({
        success: false,
        message: 'Please connect your Phantom wallet first to claim rewards'
      });
      return;
    }

    // Check for existing pending claim request
    const existingRequest = await prisma.claimRequest.findFirst({
      where: {
        investmentId: id,
        claimType: 'TAKARA',
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      res.status(400).json({
        success: false,
        message: 'You already have a pending TAKARA claim request for this investment'
      });
      return;
    }

    // Calculate 5% tax
    const taxPercent = 5;
    const taxAmount = pendingAmount * (taxPercent / 100);
    const amountAfterTax = pendingAmount - taxAmount;

    // Create claim request (pending admin approval)
    const claimRequest = await prisma.claimRequest.create({
      data: {
        userId,
        investmentId: id,
        claimType: 'TAKARA',
        amount: pendingAmount,
        taxAmount,
        amountAfterTax,
        destinationWallet: user.walletAddress,
        status: 'PENDING'
      }
    });

    // Mark pending amount as claimed (so user can't double-claim)
    await prisma.investment.update({
      where: { id },
      data: {
        pendingTAKARA: 0
      }
    });

    logger.info({
      claimRequestId: claimRequest.id,
      investmentId: id,
      userId,
      amountBeforeTax: pendingAmount,
      taxAmount,
      amountAfterTax
    }, 'TAKARA claim request created - awaiting admin approval');

    res.json({
      success: true,
      message: 'Claim request submitted. Awaiting admin approval.',
      data: {
        claimRequestId: claimRequest.id,
        amountRequested: pendingAmount,
        taxAmount,
        amountAfterTax,
        destinationWallet: user.walletAddress,
        status: 'PENDING'
      }
    });
  } catch (error) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to create TAKARA claim request');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/investments/:id/boost/takara
 * Apply TAKARA boost to an active investment
 */
export async function applyTakaraBoost(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;
    const { takaraAmount, takaraPrice } = req.body;

    if (!takaraAmount || !takaraPrice) {
      res.status(400).json({
        success: false,
        message: 'TAKARA amount and price are required'
      });
      return;
    }

    // Get user's wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    });

    if (!user?.walletAddress) {
      res.status(400).json({
        success: false,
        message: 'Please connect your Solana wallet first'
      });
      return;
    }

    // Import service
    const { applyTakaraBoost: applyBoostService } = await import('../services/takaraBoost.service');

    const result = await applyBoostService({
      investmentId: id,
      userId,
      takaraAmount: Number(takaraAmount),
      takaraPrice: Number(takaraPrice),
      userWallet: user.walletAddress
    });

    logger.info({
      investmentId: id,
      userId,
      boostId: result.boostId
    }, 'TAKARA boost applied successfully');

    res.json({
      success: true,
      message: 'TAKARA boost applied successfully',
      data: result
    });
  } catch (error: any) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to apply TAKARA boost');
    res.status(500).json({
      success: false,
      message: error.message || ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/investments/:id/boost/takara
 * Get TAKARA boost details for an investment
 */
export async function getTakaraBoost(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    const investment = await prisma.investment.findFirst({
      where: { id, userId },
      include: { takaraBoost: true }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    res.json({
      success: true,
      data: investment.takaraBoost
    });
  } catch (error) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to get TAKARA boost');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * PUT /api/investments/:id/instant-sale
 * Toggle instant sale for an investment
 */
export async function toggleInstantSale(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Enabled field is required and must be a boolean'
      });
      return;
    }

    const investment = await prisma.investment.findFirst({
      where: { id, userId, status: 'ACTIVE' }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    // Import service
    const { calculateInstantSalePrice } = await import('../services/instantSale.service');

    // Calculate instant sale price if enabling
    let instantSalePrice = null;
    if (enabled) {
      const priceResult = await calculateInstantSalePrice({ investmentId: id });
      instantSalePrice = priceResult.instantSalePrice;
    }

    // Update investment
    const updated = await prisma.investment.update({
      where: { id },
      data: {
        isInstantSaleEnabled: enabled,
        instantSalePrice: instantSalePrice ? instantSalePrice : null
      }
    });

    logger.info({
      investmentId: id,
      userId,
      enabled,
      instantSalePrice
    }, 'Instant sale toggled');

    res.json({
      success: true,
      message: `Instant sale ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        isInstantSaleEnabled: updated.isInstantSaleEnabled,
        instantSalePrice: updated.instantSalePrice ? Number(updated.instantSalePrice) : null
      }
    });
  } catch (error: any) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to toggle instant sale');
    res.status(500).json({
      success: false,
      message: error.message || ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/investments/:id/instant-sale/execute
 * Execute instant sale of an investment
 */
export async function executeInstantSale(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    const investment = await prisma.investment.findFirst({
      where: { id, userId, status: 'ACTIVE', isInstantSaleEnabled: true }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: 'Investment not found or instant sale not enabled'
      });
      return;
    }

    // Import service
    const { executeInstantSale: executeService } = await import('../services/instantSale.service');

    const result = await executeService({
      investmentId: id,
      userId
    });

    logger.info({
      investmentId: id,
      userId,
      salePrice: result.salePrice
    }, 'Instant sale executed');

    res.json({
      success: true,
      message: 'Instant sale executed successfully',
      data: result
    });
  } catch (error: any) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to execute instant sale');
    res.status(500).json({
      success: false,
      message: error.message || ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/investments/:id/instant-sale/price
 * Get instant sale price calculation
 */
export async function getInstantSalePrice(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).userId!;

    const investment = await prisma.investment.findFirst({
      where: { id, userId, status: 'ACTIVE' }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
      });
      return;
    }

    // Import service
    const { calculateInstantSalePrice } = await import('../services/instantSale.service');

    const priceResult = await calculateInstantSalePrice({ investmentId: id });

    res.json({
      success: true,
      data: priceResult
    });
  } catch (error: any) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to get instant sale price');
    res.status(500).json({
      success: false,
      message: error.message || ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  createInvestment,
  getMyInvestments,
  getInvestmentById,
  claimYield,
  claimTakara,
  applyTakaraBoost,
  getTakaraBoost,
  toggleInstantSale,
  executeInstantSale,
  getInstantSalePrice
};
