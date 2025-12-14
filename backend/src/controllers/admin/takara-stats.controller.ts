/**
 * Admin TAKARA Statistics Controller
 *
 * Provides detailed TAKARA supply breakdown for admin panel:
 * - Total mined TAKARA
 * - TAKARA locked for entry requirements (will be returned)
 * - TAKARA locked for boost (will be returned)
 * - TAKARA collected as claim tax (stays in treasury)
 * - Circulating supply calculation
 * - Price information
 */

import { Request, Response } from 'express';
import { getLogger } from '../../config/logger';
import { calculateSupplyBreakdown, getSupplyHistory } from '../../services/supply.service';
import { calculateTakaraPrice, getTakaraPriceHistory, projectTakaraPrice } from '../../services/takara-pricing.service';
import { prisma } from '../../config/database';
import { ERROR_MESSAGES } from '../../config/constants';

const logger = getLogger('admin-takara-stats-controller');

/**
 * GET /api/admin/takara/stats
 * Get comprehensive TAKARA statistics
 */
export async function getTakaraStats(req: Request, res: Response): Promise<void> {
  try {
    // Get current supply breakdown
    const supply = await calculateSupplyBreakdown();

    // Get current price breakdown
    const priceInfo = await calculateTakaraPrice();

    // Get 30-day price projection
    const priceProjection = await projectTakaraPrice(30);

    // Get treasury balance for TAKARA
    const treasuryBalance = await prisma.treasuryBalance.findUnique({
      where: { tokenSymbol: 'TAKARA' }
    });

    // Get total number of investments with TAKARA locked
    const investmentsWithTakara = await prisma.investment.count({
      where: {
        takaraLocked: {
          gt: 0
        },
        status: {
          in: ['ACTIVE', 'PENDING', 'PENDING_TOKENS', 'PENDING_USDT']
        }
      }
    });

    // Get total number of TAKARA boosts
    const takaraBoosts = await prisma.takaraBoost.count({
      where: {
        isReturned: false
      }
    });

    // Get recent tax records
    const recentTaxRecords = await prisma.taxRecord.findMany({
      where: {
        sourceType: 'TAKARA_CLAIM',
        tokenSymbol: 'TAKARA'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        userId: true,
        amountBeforeTax: true,
        taxAmount: true,
        amountAfterTax: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: {
        supply: {
          totalMined: supply.totalMined,
          totalEntryLocked: supply.totalEntryLocked,
          totalBoostLocked: supply.totalBoostLocked,
          totalClaimTax: supply.totalClaimTax,
          circulatingSupply: supply.circulatingSupply,
          treasurySupply: supply.treasurySupply,
          totalSupply: supply.totalSupply,
          activeInvestments: supply.activeInvestments,
          calculatedAt: supply.calculatedAt
        },
        price: {
          currentPrice: priceInfo.currentPrice,
          initialPrice: 0.001,
          targetPrice: 0.10,
          timeFactor: priceInfo.timeFactor,
          supplyFactor: priceInfo.supplyFactor,
          difficultyFactor: priceInfo.difficultyFactor,
          daysElapsed: priceInfo.daysElapsed,
          totalDays: priceInfo.totalDays,
          percentComplete: priceInfo.percentComplete,
          projectedPrice30Days: priceProjection.projectedPrice,
          projectedIncrease30Days: priceProjection.percentIncrease
        },
        treasury: {
          balance: treasuryBalance ? Number(treasuryBalance.balance) : 0,
          totalCollected: treasuryBalance ? Number(treasuryBalance.totalCollected) : 0,
          totalWithdrawn: treasuryBalance ? Number(treasuryBalance.totalWithdrawn) : 0
        },
        stats: {
          investmentsWithTakara,
          activeBoosts: takaraBoosts,
          averageEntryLocked: investmentsWithTakara > 0
            ? supply.totalEntryLocked / investmentsWithTakara
            : 0,
          averageBoostLocked: takaraBoosts > 0
            ? supply.totalBoostLocked / takaraBoosts
            : 0
        },
        recentTaxRecords: recentTaxRecords.map(record => ({
          id: record.id,
          userId: record.userId,
          amountBeforeTax: Number(record.amountBeforeTax),
          taxAmount: Number(record.taxAmount),
          amountAfterTax: Number(record.amountAfterTax),
          createdAt: record.createdAt
        }))
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get TAKARA stats');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/takara/history
 * Get TAKARA supply and price history
 */
export async function getTakaraHistory(req: Request, res: Response): Promise<void> {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      res.status(400).json({
        success: false,
        message: 'Invalid days parameter (1-365)'
      });
      return;
    }

    // Get supply history
    const supplyHistory = await getSupplyHistory(daysNum);

    // Get price history
    const priceHistory = await getTakaraPriceHistory(daysNum);

    // Combine histories
    const combinedHistory = supplyHistory.map((supply, index) => {
      const price = priceHistory[index];
      return {
        date: supply.calculatedAt,
        supply: {
          totalMined: supply.totalMined,
          totalEntryLocked: supply.totalEntryLocked,
          totalBoostLocked: supply.totalBoostLocked,
          totalClaimTax: supply.totalClaimTax,
          circulatingSupply: supply.circulatingSupply
        },
        price: price ? price.price : 0,
        activeInvestments: supply.activeInvestments
      };
    });

    res.json({
      success: true,
      data: {
        history: combinedHistory,
        days: daysNum
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get TAKARA history');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

/**
 * GET /api/admin/takara/breakdown
 * Get detailed breakdown of TAKARA by type
 */
export async function getTakaraBreakdown(req: Request, res: Response): Promise<void> {
  try {
    // Get all investments with TAKARA
    const investmentsWithEntry = await prisma.investment.findMany({
      where: {
        takaraLocked: {
          gt: 0
        },
        status: {
          in: ['ACTIVE', 'PENDING', 'PENDING_TOKENS', 'PENDING_USDT']
        }
      },
      select: {
        id: true,
        userId: true,
        takaraLocked: true,
        status: true,
        startDate: true,
        endDate: true
      },
      take: 100
    });

    // Get all active boosts
    const activeBoosts = await prisma.takaraBoost.findMany({
      where: {
        isReturned: false
      },
      select: {
        id: true,
        investmentId: true,
        takaraAmount: true,
        takaraValueUSD: true,
        createdAt: true,
        investment: {
          select: {
            userId: true,
            endDate: true
          }
        }
      },
      take: 100
    });

    // Get recent mining records
    const recentMining = await prisma.takaraMining.findMany({
      orderBy: {
        miningDate: 'desc'
      },
      take: 100,
      select: {
        id: true,
        investmentId: true,
        miningDate: true,
        takaraMinedFinal: true,
        difficulty: true,
        investment: {
          select: {
            userId: true
          }
        }
      }
    });

    // Get tax breakdown by user
    const taxByUser = await prisma.taxRecord.groupBy({
      by: ['userId'],
      where: {
        sourceType: 'TAKARA_CLAIM',
        tokenSymbol: 'TAKARA'
      },
      _sum: {
        taxAmount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          taxAmount: 'desc'
        }
      },
      take: 20
    });

    res.json({
      success: true,
      data: {
        entryLocked: {
          total: investmentsWithEntry.reduce((sum, inv) => sum + Number(inv.takaraLocked), 0),
          count: investmentsWithEntry.length,
          investments: investmentsWithEntry.map(inv => ({
            id: inv.id,
            userId: inv.userId,
            takaraLocked: Number(inv.takaraLocked),
            status: inv.status,
            startDate: inv.startDate,
            endDate: inv.endDate
          }))
        },
        boostLocked: {
          total: activeBoosts.reduce((sum, boost) => sum + Number(boost.takaraAmount), 0),
          count: activeBoosts.length,
          boosts: activeBoosts.map(boost => ({
            id: boost.id,
            investmentId: boost.investmentId,
            userId: boost.investment.userId,
            takaraAmount: Number(boost.takaraAmount),
            takaraValueUSD: Number(boost.takaraValueUSD),
            createdAt: boost.createdAt,
            returnDate: boost.investment.endDate
          }))
        },
        mined: {
          recent: recentMining.map(mining => ({
            id: mining.id,
            investmentId: mining.investmentId,
            userId: mining.investment.userId,
            miningDate: mining.miningDate,
            takaraMinedFinal: Number(mining.takaraMinedFinal),
            difficulty: Number(mining.difficulty)
          }))
        },
        tax: {
          byUser: taxByUser.map(user => ({
            userId: user.userId,
            totalTax: Number(user._sum.taxAmount || 0),
            claimCount: user._count.id
          }))
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get TAKARA breakdown');
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}

export default {
  getTakaraStats,
  getTakaraHistory,
  getTakaraBreakdown
};
