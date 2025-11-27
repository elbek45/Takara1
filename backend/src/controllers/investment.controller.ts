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
import { verifyTransaction } from '../services/solana.service';
import pino from 'pino';

const logger = pino({ name: 'investment-controller' });

/**
 * POST /api/investments
 * Create new investment
 */
export async function createInvestment(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const input: CreateInvestmentInput = req.body;

    const { vaultId, usdtAmount, takaraAmount, laikaBoost, txSignature } = input;

    // Validate input
    if (!vaultId || !usdtAmount || !txSignature) {
      res.status(400).json({
        success: false,
        message: 'Vault ID, USDT amount, and transaction signature are required'
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

    // Verify transaction (in production)
    if (process.env.NODE_ENV === 'production') {
      const txVerified = await verifyTransaction(txSignature);
      if (!txVerified) {
        res.status(400).json({
          success: false,
          message: 'Transaction not found or not confirmed'
        });
        return;
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
        laikaValueUSD: laikaBoost.laikaValueUSD
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

    // TODO: Transfer USDT to user wallet via Solana

    logger.info({
      investmentId: id,
      userId,
      amount: pendingAmount
    }, 'USDT yield claimed');

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.YIELD_CLAIMED,
      data: {
        amountClaimed: pendingAmount,
        totalEarned: Number(investment.totalEarnedUSDT) + pendingAmount
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

    // TODO: Transfer TAKARA to user wallet via Solana

    logger.info({
      investmentId: id,
      userId,
      amount: pendingAmount
    }, 'TAKARA claimed');

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.TAKARA_CLAIMED,
      data: {
        amountClaimed: pendingAmount,
        totalMined: Number(investment.totalMinedTAKARA) + pendingAmount
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

export default {
  createInvestment,
  getMyInvestments,
  getInvestmentById,
  claimYield,
  claimTakara
};
