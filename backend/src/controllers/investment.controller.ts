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

    // Verify payment transaction on TRON network
    if (!process.env.SKIP_TX_VERIFICATION) {
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

    // Calculate activation date (72 hours from now)
    const activationDate = new Date(startDate);
    activationDate.setHours(activationDate.getHours() + INVESTMENT_CONFIG.ACTIVATION_DELAY_HOURS);

    // Create investment
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
        status: 'PENDING', // Will be activated after 72h
        depositTxSignature: txSignature,
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

    // Update vault filled amount
    await prisma.vault.update({
      where: { id: vaultId },
      data: {
        currentFilled: {
          increment: usdtAmount
        }
      }
    });

    logger.info({
      investmentId: investment.id,
      userId,
      vaultId,
      amount: usdtAmount,
      hasLaikaBoost: !!laikaBoostData
    }, 'Investment created');

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.INVESTMENT_CREATED,
      data: {
        investment: {
          id: investment.id,
          vaultName: investment.vault.name,
          usdtAmount: Number(investment.usdtAmount),
          finalAPY: Number(investment.finalAPY),
          startDate: investment.startDate,
          endDate: investment.endDate,
          activationDate,
          status: investment.status,
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
      laikaBoost: inv.laikaBoost ? {
        laikaAmount: Number(inv.laikaBoost.laikaAmount),
        additionalAPY: Number(inv.laikaBoost.additionalAPY),
        isReturned: inv.laikaBoost.isReturned
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
      }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
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

    // Get user's Ethereum wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ethereumAddress: true }
    });

    if (!user?.ethereumAddress) {
      res.status(400).json({
        success: false,
        message: 'Please connect your MetaMask wallet first to claim rewards'
      });
      return;
    }

    // Transfer USDT to user's Ethereum wallet
    let txSignature: string;
    try {
      txSignature = await transferUSDTFromPlatform(user.ethereumAddress, pendingAmount);
    } catch (error: any) {
      logger.error({ error, userId, amount: pendingAmount }, 'Failed to transfer USDT');
      res.status(500).json({
        success: false,
        message: 'Failed to transfer USDT. Please try again later.'
      });
      return;
    }

    // Update investment
    await prisma.investment.update({
      where: { id },
      data: {
        totalEarnedUSDT: {
          increment: pendingAmount
        },
        pendingUSDT: 0,
        lastClaimDate: new Date()
      }
    });

    // Update user stats
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalEarnedUSDT: {
          increment: pendingAmount
        }
      }
    });

    logger.info({
      investmentId: id,
      userId,
      amount: pendingAmount,
      txSignature
    }, 'USDT yield claimed and transferred');

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.YIELD_CLAIMED,
      data: {
        amountClaimed: pendingAmount,
        totalEarned: Number(investment.totalEarnedUSDT) + pendingAmount,
        txSignature
      }
    });
  } catch (error) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to claim yield');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/investments/:id/claim-takara
 * Claim mined TAKARA tokens
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
      }
    });

    if (!investment) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.INVESTMENT_NOT_FOUND
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

    // Apply 5% tax on TAKARA claim
    const taxResult = await applyTakaraClaimTax({
      userId,
      transactionId: id,
      takaraAmount: pendingAmount
    });

    // Transfer TAKARA to user's Solana wallet (after tax deduction)
    let txSignature: string;
    try {
      txSignature = await transferTAKARAReward(user.walletAddress, taxResult.amountAfterTax);
    } catch (error: any) {
      logger.error({ error, userId, amount: taxResult.amountAfterTax }, 'Failed to transfer TAKARA');
      res.status(500).json({
        success: false,
        message: 'Failed to transfer TAKARA. Please try again later.'
      });
      return;
    }

    // Update investment
    await prisma.investment.update({
      where: { id },
      data: {
        totalMinedTAKARA: {
          increment: pendingAmount
        },
        pendingTAKARA: 0
      }
    });

    // Update user stats
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalMinedTAKARA: {
          increment: pendingAmount
        }
      }
    });

    logger.info({
      investmentId: id,
      userId,
      amountBeforeTax: pendingAmount,
      taxAmount: taxResult.taxAmount,
      amountAfterTax: taxResult.amountAfterTax,
      txSignature
    }, 'TAKARA claimed and transferred (with 5% tax)');

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.TAKARA_CLAIMED,
      data: {
        amountClaimed: taxResult.amountAfterTax,
        amountBeforeTax: pendingAmount,
        taxAmount: taxResult.taxAmount,
        totalMined: Number(investment.totalMinedTAKARA) + pendingAmount,
        txSignature
      }
    });
  } catch (error) {
    logger.error({ error, investmentId: req.params.id }, 'Failed to claim TAKARA');
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
