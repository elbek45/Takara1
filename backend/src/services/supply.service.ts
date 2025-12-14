/**
 * TAKARA Supply Calculation Service (v2.3)
 *
 * Tracks different types of TAKARA for proper circulating supply calculation:
 *
 * User's requirement:
 * - ENTRY_REQUIREMENT: Locked for vault entry → RETURNS to users → counts in difficulty
 * - APY_BOOST: Locked for boost → RETURNS to users → counts in difficulty
 * - MINED: Earned through mining → belongs to users → counts in difficulty
 * - CLAIM_TAX (5%): Tax on claims → does NOT return → stays in treasury → does NOT count
 *
 * Circulating Supply = totalMined + totalEntryLocked + totalBoostLocked
 * (All TAKARA that belongs to users, including what will be returned)
 */

import { prisma } from '../config/database';
import { getLogger } from '../config/logger';

const logger = getLogger('supply-service');

export interface TakaraSupplyBreakdown {
  // Individual components
  totalMined: number; // All TAKARA mined (belongs to users)
  totalEntryLocked: number; // Entry requirement TAKARA (will be returned)
  totalBoostLocked: number; // Boost TAKARA (will be returned)
  totalClaimTax: number; // 5% claim tax (stays in treasury)

  // Calculated supply
  circulatingSupply: number; // totalMined + totalEntryLocked + totalBoostLocked
  treasurySupply: number; // totalClaimTax (not circulating)
  totalSupply: number; // circulatingSupply + treasurySupply

  // Metadata
  activeInvestments: number;
  calculatedAt: Date;
}

/**
 * Calculate current TAKARA supply breakdown from database
 */
export async function calculateSupplyBreakdown(): Promise<TakaraSupplyBreakdown> {
  try {
    // 1. Total mined TAKARA (from all mining records)
    const miningTotal = await prisma.takaraMining.aggregate({
      _sum: {
        takaraMinedFinal: true
      }
    });
    const totalMined = Number(miningTotal._sum.takaraMinedFinal || 0);

    // 2. Total entry requirement TAKARA (from active investments)
    const entryTotal = await prisma.investment.aggregate({
      where: {
        status: {
          in: ['ACTIVE', 'PENDING', 'PENDING_TOKENS', 'PENDING_USDT']
        }
      },
      _sum: {
        takaraLocked: true
      }
    });
    const totalEntryLocked = Number(entryTotal._sum.takaraLocked || 0);

    // 3. Total boost TAKARA (from active boosts that haven't been returned)
    const boostTotal = await prisma.takaraBoost.aggregate({
      where: {
        isReturned: false
      },
      _sum: {
        takaraAmount: true
      }
    });
    const totalBoostLocked = Number(boostTotal._sum.takaraAmount || 0);

    // 4. Total claim tax (from tax records)
    const claimTaxTotal = await prisma.taxRecord.aggregate({
      where: {
        sourceType: 'TAKARA_CLAIM',
        tokenSymbol: 'TAKARA'
      },
      _sum: {
        taxAmount: true
      }
    });
    const totalClaimTax = Number(claimTaxTotal._sum.taxAmount || 0);

    // 5. Count active investments (miners)
    const activeInvestments = await prisma.investment.count({
      where: {
        status: 'ACTIVE'
      }
    });

    // Calculate circulating supply (all user-owned TAKARA)
    // This includes mined + entry (will be returned) + boost (will be returned)
    const circulatingSupply = totalMined + totalEntryLocked + totalBoostLocked;

    // Treasury supply (claim tax, not circulating)
    const treasurySupply = totalClaimTax;

    // Total supply
    const totalSupply = circulatingSupply + treasurySupply;

    const breakdown: TakaraSupplyBreakdown = {
      totalMined: Number(totalMined.toFixed(6)),
      totalEntryLocked: Number(totalEntryLocked.toFixed(6)),
      totalBoostLocked: Number(totalBoostLocked.toFixed(6)),
      totalClaimTax: Number(totalClaimTax.toFixed(6)),
      circulatingSupply: Number(circulatingSupply.toFixed(6)),
      treasurySupply: Number(treasurySupply.toFixed(6)),
      totalSupply: Number(totalSupply.toFixed(6)),
      activeInvestments,
      calculatedAt: new Date()
    };

    logger.info(breakdown, 'Calculated TAKARA supply breakdown');

    return breakdown;
  } catch (error) {
    logger.error({ error }, 'Failed to calculate supply breakdown');
    throw error;
  }
}

/**
 * Update MiningStats with current supply breakdown
 * Should be called daily or when significant changes occur
 */
export async function updateMiningStatsSupply(): Promise<void> {
  try {
    const breakdown = await calculateSupplyBreakdown();

    // Get current difficulty from latest mining stats
    const latestStats = await prisma.miningStats.findFirst({
      orderBy: { date: 'desc' }
    });

    const currentDifficulty = latestStats
      ? Number(latestStats.currentDifficulty)
      : 1.0;

    // Create or update today's mining stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.miningStats.upsert({
      where: {
        date: today
      },
      update: {
        totalMined: breakdown.totalMined,
        totalEntryLocked: breakdown.totalEntryLocked,
        totalBoostLocked: breakdown.totalBoostLocked,
        totalClaimTax: breakdown.totalClaimTax,
        circulatingSupply: breakdown.circulatingSupply,
        activeMiners: breakdown.activeInvestments,
        currentDifficulty
      },
      create: {
        date: today,
        totalMined: breakdown.totalMined,
        totalEntryLocked: breakdown.totalEntryLocked,
        totalBoostLocked: breakdown.totalBoostLocked,
        totalClaimTax: breakdown.totalClaimTax,
        circulatingSupply: breakdown.circulatingSupply,
        activeMiners: breakdown.activeInvestments,
        currentDifficulty
      }
    });

    logger.info('Updated MiningStats with supply breakdown');
  } catch (error) {
    logger.error({ error }, 'Failed to update MiningStats supply');
    throw error;
  }
}

/**
 * Get supply breakdown for a specific date (from MiningStats)
 */
export async function getSupplyBreakdownForDate(date: Date): Promise<TakaraSupplyBreakdown | null> {
  try {
    const stats = await prisma.miningStats.findUnique({
      where: { date }
    });

    if (!stats) {
      return null;
    }

    return {
      totalMined: Number(stats.totalMined),
      totalEntryLocked: Number(stats.totalEntryLocked),
      totalBoostLocked: Number(stats.totalBoostLocked),
      totalClaimTax: Number(stats.totalClaimTax),
      circulatingSupply: Number(stats.circulatingSupply),
      treasurySupply: Number(stats.totalClaimTax),
      totalSupply: Number(stats.circulatingSupply) + Number(stats.totalClaimTax),
      activeInvestments: stats.activeMiners,
      calculatedAt: stats.date
    };
  } catch (error) {
    logger.error({ error, date }, 'Failed to get supply breakdown for date');
    throw error;
  }
}

/**
 * Get supply history (last N days)
 */
export async function getSupplyHistory(days: number = 30): Promise<TakaraSupplyBreakdown[]> {
  try {
    const stats = await prisma.miningStats.findMany({
      orderBy: { date: 'desc' },
      take: days
    });

    return stats.map(s => ({
      totalMined: Number(s.totalMined),
      totalEntryLocked: Number(s.totalEntryLocked),
      totalBoostLocked: Number(s.totalBoostLocked),
      totalClaimTax: Number(s.totalClaimTax),
      circulatingSupply: Number(s.circulatingSupply),
      treasurySupply: Number(s.totalClaimTax),
      totalSupply: Number(s.circulatingSupply) + Number(s.totalClaimTax),
      activeInvestments: s.activeMiners,
      calculatedAt: s.date
    }));
  } catch (error) {
    logger.error({ error, days }, 'Failed to get supply history');
    throw error;
  }
}

/**
 * Calculate supply growth rate (per month)
 */
export async function calculateSupplyGrowthRate(): Promise<{
  monthlyGrowthRate: number; // Percentage
  dailyGrowthRate: number; // Percentage
}> {
  try {
    const history = await getSupplyHistory(30);

    if (history.length < 2) {
      return { monthlyGrowthRate: 0, dailyGrowthRate: 0 };
    }

    const latest = history[0];
    const oldest = history[history.length - 1];
    const daysDiff = history.length;

    const supplyGrowth = latest.circulatingSupply - oldest.circulatingSupply;
    const dailyGrowthRate = (supplyGrowth / oldest.circulatingSupply) / daysDiff * 100;
    const monthlyGrowthRate = dailyGrowthRate * 30;

    return {
      monthlyGrowthRate: Number(monthlyGrowthRate.toFixed(4)),
      dailyGrowthRate: Number(dailyGrowthRate.toFixed(4))
    };
  } catch (error) {
    logger.error({ error }, 'Failed to calculate supply growth rate');
    throw error;
  }
}

export default {
  calculateSupplyBreakdown,
  updateMiningStatsSupply,
  getSupplyBreakdownForDate,
  getSupplyHistory,
  calculateSupplyGrowthRate
};
