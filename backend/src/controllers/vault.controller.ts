/**
 * Vault Controller
 *
 * Handles vault-related operations:
 * - List all vaults
 * - Get vault details
 * - Get vault statistics
 * - Calculate investment estimates
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { VaultWithStats } from '../types';
import { ERROR_MESSAGES } from '../config/constants';
import { calculateLaikaBoost } from '../utils/laika.calculator';
import { calculateMining } from '../utils/mining.calculator';
import { calculateEarnings } from '../utils/apy.calculator';
import { VaultTier } from '../config/vaults.config';
import { getLogger } from '../config/logger';
import { getLaikaPrice, calculateLaikaValueWithPremium } from '../services/price.service';

const logger = getLogger('vault-controller');

/**
 * GET /api/vaults
 * Get all vaults with statistics
 */
export async function getAllVaults(req: Request, res: Response): Promise<void> {
  try {
    const { tier, duration, isActive, isMining } = req.query;

    // Build filter - default to show active vaults AND mining vaults
    const where: any = {};

    // If specific filters provided, use them
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (isMining !== undefined) {
      where.isMining = isMining === 'true';
    }

    // Default behavior: show vaults that are either active OR mining (not completely inactive)
    if (isActive === undefined && isMining === undefined) {
      where.OR = [
        { isActive: true },
        { isMining: true }
      ];
    }

    if (tier) where.tier = tier as string;
    if (duration) where.duration = parseInt(duration as string);

    // Get vaults with investment counts
    const vaults = await prisma.vault.findMany({
      where,
      include: {
        _count: {
          select: {
            investments: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      },
      orderBy: [
        { tier: 'asc' },
        { duration: 'asc' }
      ]
    });

    // Transform to include stats
    const vaultsWithStats: VaultWithStats[] = vaults.map(vault => ({
      id: vault.id,
      name: vault.name,
      tier: vault.tier,
      duration: vault.duration,
      payoutSchedule: vault.payoutSchedule,
      minInvestment: Number(vault.minInvestment),
      maxInvestment: Number(vault.maxInvestment),
      baseAPY: Number(vault.baseAPY),
      maxAPY: Number(vault.maxAPY),
      baseTakaraAPY: Number(vault.baseTakaraAPY),
      maxTakaraAPY: Number(vault.maxTakaraAPY),
      requireTAKARA: vault.requireTAKARA,
      takaraRatio: vault.takaraRatio ? Number(vault.takaraRatio) : undefined,
      currentFilled: Number(vault.currentFilled),
      totalCapacity: vault.totalCapacity ? Number(vault.totalCapacity) : undefined,
      miningThreshold: Number(vault.miningThreshold),
      isActive: vault.isActive,
      isMining: vault.isMining,
      acceptedPayments: vault.acceptedPayments,
      activeInvestments: vault._count.investments
    }));

    res.json({
      success: true,
      data: vaultsWithStats
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get vaults');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/vaults/:id
 * Get vault details with statistics
 */
export async function getVaultById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid vault ID format'
      });
      return;
    }

    const vault = await prisma.vault.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            investments: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        },
        investments: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            usdtAmount: true,
            finalAPY: true,
            totalMinedTAKARA: true
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!vault) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.VAULT_NOT_FOUND
      });
      return;
    }

    // Calculate average APY from active investments
    const avgAPY = vault.investments.length > 0
      ? vault.investments.reduce((sum, inv) => sum + Number(inv.finalAPY), 0) / vault.investments.length
      : Number(vault.baseAPY);

    // Calculate total TAKARA mined in this vault
    const totalTakaraMined = vault.investments.reduce(
      (sum, inv) => sum + Number(inv.totalMinedTAKARA),
      0
    );

    const vaultData: VaultWithStats = {
      id: vault.id,
      name: vault.name,
      tier: vault.tier,
      duration: vault.duration,
      payoutSchedule: vault.payoutSchedule,
      minInvestment: Number(vault.minInvestment),
      maxInvestment: Number(vault.maxInvestment),
      baseAPY: Number(vault.baseAPY),
      maxAPY: Number(vault.maxAPY),
      baseTakaraAPY: Number(vault.baseTakaraAPY),
      maxTakaraAPY: Number(vault.maxTakaraAPY),
      requireTAKARA: vault.requireTAKARA,
      takaraRatio: vault.takaraRatio ? Number(vault.takaraRatio) : undefined,
      currentFilled: Number(vault.currentFilled),
      totalCapacity: vault.totalCapacity ? Number(vault.totalCapacity) : undefined,
      miningThreshold: Number(vault.miningThreshold),
      isActive: vault.isActive,
      isMining: vault.isMining,
      acceptedPayments: vault.acceptedPayments,
      activeInvestments: vault._count.investments
    };

    res.json({
      success: true,
      data: {
        vault: vaultData,
        stats: {
          averageAPY: Number(avgAPY.toFixed(2)),
          totalTakaraMined: Number(totalTakaraMined.toFixed(2)),
          recentInvestments: vault.investments.map(inv => ({
            amount: Number(inv.usdtAmount),
            apy: Number(inv.finalAPY),
            takaraMined: Number(inv.totalMinedTAKARA)
          }))
        }
      }
    });
  } catch (error) {
    logger.error({ error, vaultId: req.params.id }, 'Failed to get vault');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * POST /api/vaults/:id/calculate
 * Calculate investment estimates for a vault
 */
export async function calculateInvestment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { usdtAmount, laikaAmount } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid vault ID format'
      });
      return;
    }

    if (!usdtAmount || usdtAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid USDT amount is required'
      });
      return;
    }

    // Get vault
    const vault = await prisma.vault.findUnique({
      where: { id }
    });

    if (!vault || !vault.isActive) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.VAULT_NOT_FOUND
      });
      return;
    }

    // Validate investment amount
    if (usdtAmount < Number(vault.minInvestment)) {
      res.status(400).json({
        success: false,
        message: `Minimum investment is $${vault.minInvestment}`
      });
      return;
    }

    if (usdtAmount > Number(vault.maxInvestment)) {
      res.status(400).json({
        success: false,
        message: `Maximum investment is $${vault.maxInvestment}`
      });
      return;
    }

    // Calculate required TAKARA
    const requiredTAKARA = vault.requireTAKARA && vault.takaraRatio
      ? (usdtAmount / 100) * Number(vault.takaraRatio)
      : 0;

    // Get current LAIKA price from Jupiter API (v2.2 - real-time price)
    const laikaPrice = await getLaikaPrice();
    logger.info({ laikaPrice }, 'Fetched LAIKA price for calculation');

    // Convert LAIKA amount to USD market value
    const laikaAmountValue = laikaAmount || 0;
    const laikaMarketValueUSD = laikaAmountValue * laikaPrice;

    // Calculate LAIKA value (platform requires 50% MORE LAIKA than market rate)
    const laikaPremiumInfo = await calculateLaikaValueWithPremium(laikaAmountValue);

    // Calculate LAIKA boost (boost value = market value / 1.50)
    const boostResult = calculateLaikaBoost({
      baseAPY: Number(vault.baseAPY),
      maxAPY: Number(vault.maxAPY),
      tier: vault.tier as VaultTier,
      usdtInvested: usdtAmount,
      laikaMarketValueUSD: laikaMarketValueUSD
    });

    // Calculate USDT earnings
    const earningsResult = calculateEarnings({
      principal: usdtAmount,
      apy: boostResult.finalAPY,
      durationMonths: vault.duration,
      payoutSchedule: vault.payoutSchedule as any
    });

    // Get current mining difficulty
    const latestMiningStats = await prisma.miningStats.findFirst({
      orderBy: { date: 'desc' }
    });

    const currentDifficulty = latestMiningStats
      ? Number(latestMiningStats.currentDifficulty)
      : 1.0;

    // Calculate TAKARA mining (use maxTakaraAPY for estimation)
    const miningResult = calculateMining({
      takaraAPY: Number(vault.maxTakaraAPY),
      usdtInvested: usdtAmount,
      currentDifficulty,
      durationMonths: vault.duration
    });

    res.json({
      success: true,
      data: {
        vault: {
          id: vault.id,
          name: vault.name,
          tier: vault.tier,
          duration: vault.duration
        },
        investment: {
          usdtAmount,
          requiredTAKARA,
          laikaAmount: laikaAmountValue,
          laikaPrice: laikaPrice, // Real-time price from DexScreener
          laikaMarketValueUSD: laikaMarketValueUSD, // Market price
          laikaPremiumPercent: laikaPremiumInfo.premiumPercent, // 50% more LAIKA required
          laikaBoostValueUSD: laikaPremiumInfo.finalValue, // Boost value (market / 1.5)
          // For backward compatibility
          laikaValueUSD: laikaPremiumInfo.finalValue,
          laikaToUsdtRate: laikaPrice
        },
        laika: {
          // Detailed LAIKA info for UI
          ...boostResult,
          maxBoostValue: usdtAmount * 0.50, // Max LAIKA value allowed (50% of USDT)
          currentBoostPercent: boostResult.boostFillPercent
        },
        earnings: {
          baseAPY: Number(vault.baseAPY),
          laikaBoostAPY: boostResult.additionalAPY,
          finalAPY: boostResult.finalAPY,
          totalUSDT: earningsResult.totalEarnings,
          monthlyUSDT: earningsResult.monthlyEarnings,
          payoutSchedule: earningsResult.payoutSchedule,
          numberOfPayouts: earningsResult.numberOfPayouts,
          payoutAmount: earningsResult.payoutAmount
        },
        mining: {
          baseTakaraAPY: Number(vault.baseTakaraAPY),
          maxTakaraAPY: Number(vault.maxTakaraAPY),
          currentDifficulty,
          dailyTAKARA: miningResult.dailyTakaraFinal,
          monthlyTAKARA: miningResult.monthlyTakara,
          totalTAKARA: miningResult.totalTakaraExpected
        },
        summary: {
          totalInvestment: usdtAmount + (requiredTAKARA > 0 ? requiredTAKARA : 0) + laikaPremiumInfo.finalValue,
          totalUSDTReturn: usdtAmount + earningsResult.totalEarnings,
          totalTAKARAMined: miningResult.totalTakaraExpected,
          roi: ((earningsResult.totalEarnings / usdtAmount) * 100).toFixed(2) + '%'
        }
      }
    });
  } catch (error) {
    logger.error({ error, vaultId: req.params.id }, 'Failed to calculate investment');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getAllVaults,
  getVaultById,
  calculateInvestment
};
