/**
 * TAKARA Dynamic Pricing Service (v2.3)
 *
 * Implements dynamic TAKARA price calculation based on:
 * 1. Time progression (5-year distribution period)
 * 2. Circulating supply (mined + entry locked + boost locked)
 * 3. Mining difficulty
 *
 * User requirement: All TAKARA that belongs to users (including what will be returned)
 * counts toward circulating supply and affects price growth.
 */

import { prisma } from '../config/database';
import { getLogger } from '../config/logger';
import { calculateSupplyBreakdown } from './supply.service';
import { TAKARA_CONFIG } from '../utils/mining.calculator';

const logger = getLogger('takara-pricing-service');

/**
 * TAKARA Pricing Configuration
 */
export const TAKARA_PRICING_CONFIG = {
  // Initial price at launch (USDT)
  INITIAL_PRICE: 0.001, // $0.001 per TAKARA

  // Target price after 5 years (USDT)
  TARGET_PRICE: 0.10, // $0.10 per TAKARA (100x growth)

  // Distribution period
  DISTRIBUTION_PERIOD_DAYS: 5 * 365, // 5 years in days

  // Price growth factors (weights)
  TIME_WEIGHT: 0.40, // 40% - Time-based growth
  SUPPLY_WEIGHT: 0.40, // 40% - Supply-based growth
  DIFFICULTY_WEIGHT: 0.20, // 20% - Difficulty-based growth

  // Launch date (set when first TAKARA is mined)
  LAUNCH_DATE: new Date('2025-12-14T00:00:00Z'), // Manually set launch date
} as const;

export interface TakaraPriceBreakdown {
  currentPrice: number; // Current TAKARA price in USDT

  // Growth factors
  timeFactor: number; // 0-1 based on time elapsed
  supplyFactor: number; // 0-1 based on circulating supply
  difficultyFactor: number; // 0-1 based on mining difficulty

  // Contributions to price
  timeContribution: number; // Price increase from time
  supplyContribution: number; // Price increase from supply
  difficultyContribution: number; // Price increase from difficulty

  // Stats
  daysElapsed: number;
  totalDays: number;
  percentComplete: number; // Progress through 5 years
  circulatingSupply: number;
  totalSupply: number;
  supplyPercent: number; // % of total supply circulating

  // Metadata
  calculatedAt: Date;
}

/**
 * Calculate time-based growth factor (0-1)
 * Linear growth over 5 years
 */
function calculateTimeFactor(launchDate: Date): number {
  const now = new Date();
  const msElapsed = now.getTime() - launchDate.getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);

  // Linear progression from 0 to 1 over 5 years
  const timeFactor = Math.min(daysElapsed / TAKARA_PRICING_CONFIG.DISTRIBUTION_PERIOD_DAYS, 1);

  return Number(timeFactor.toFixed(6));
}

/**
 * Calculate supply-based growth factor (0-1)
 * Based on circulating supply percentage
 */
function calculateSupplyFactor(circulatingSupply: number, totalSupply: number): number {
  const supplyRatio = circulatingSupply / totalSupply;

  // Apply logarithmic curve for smoother growth
  // Early supply has more impact, later supply has diminishing returns
  const supplyFactor = Math.min(Math.log10(1 + supplyRatio * 9) / 1, 1); // log10(1 to 10) normalized

  return Number(supplyFactor.toFixed(6));
}

/**
 * Calculate difficulty-based growth factor (0-1)
 * Higher difficulty = higher price
 */
function calculateDifficultyFactor(currentDifficulty: number): number {
  // Difficulty ranges from 1.0 (start) to ~2.0+ (high activity)
  // Normalize to 0-1 range, assuming max difficulty of 3.0
  const MAX_EXPECTED_DIFFICULTY = 3.0;
  const difficultyFactor = Math.min((currentDifficulty - 1.0) / (MAX_EXPECTED_DIFFICULTY - 1.0), 1);

  return Number(Math.max(difficultyFactor, 0).toFixed(6));
}

/**
 * Calculate current TAKARA price with breakdown
 */
export async function calculateTakaraPrice(): Promise<TakaraPriceBreakdown> {
  try {
    // Get current supply breakdown
    const supply = await calculateSupplyBreakdown();

    // Get current difficulty from latest mining stats
    const latestStats = await prisma.miningStats.findFirst({
      orderBy: { date: 'desc' }
    });

    const currentDifficulty = latestStats
      ? Number(latestStats.currentDifficulty)
      : 1.0;

    // Calculate growth factors
    const timeFactor = calculateTimeFactor(TAKARA_PRICING_CONFIG.LAUNCH_DATE);
    const supplyFactor = calculateSupplyFactor(
      supply.circulatingSupply,
      TAKARA_CONFIG.TOTAL_SUPPLY
    );
    const difficultyFactor = calculateDifficultyFactor(currentDifficulty);

    // Calculate price range (from initial to target)
    const priceRange = TAKARA_PRICING_CONFIG.TARGET_PRICE - TAKARA_PRICING_CONFIG.INITIAL_PRICE;

    // Calculate weighted contributions
    const timeContribution = priceRange * timeFactor * TAKARA_PRICING_CONFIG.TIME_WEIGHT;
    const supplyContribution = priceRange * supplyFactor * TAKARA_PRICING_CONFIG.SUPPLY_WEIGHT;
    const difficultyContribution = priceRange * difficultyFactor * TAKARA_PRICING_CONFIG.DIFFICULTY_WEIGHT;

    // Final price = initial + all contributions
    const currentPrice = TAKARA_PRICING_CONFIG.INITIAL_PRICE
      + timeContribution
      + supplyContribution
      + difficultyContribution;

    // Calculate time stats
    const now = new Date();
    const msElapsed = now.getTime() - TAKARA_PRICING_CONFIG.LAUNCH_DATE.getTime();
    const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
    const percentComplete = (daysElapsed / TAKARA_PRICING_CONFIG.DISTRIBUTION_PERIOD_DAYS) * 100;

    const breakdown: TakaraPriceBreakdown = {
      currentPrice: Number(currentPrice.toFixed(6)),
      timeFactor: Number(timeFactor.toFixed(6)),
      supplyFactor: Number(supplyFactor.toFixed(6)),
      difficultyFactor: Number(difficultyFactor.toFixed(6)),
      timeContribution: Number(timeContribution.toFixed(6)),
      supplyContribution: Number(supplyContribution.toFixed(6)),
      difficultyContribution: Number(difficultyContribution.toFixed(6)),
      daysElapsed: Number(daysElapsed.toFixed(2)),
      totalDays: TAKARA_PRICING_CONFIG.DISTRIBUTION_PERIOD_DAYS,
      percentComplete: Number(Math.min(percentComplete, 100).toFixed(4)),
      circulatingSupply: supply.circulatingSupply,
      totalSupply: TAKARA_CONFIG.TOTAL_SUPPLY,
      supplyPercent: Number((supply.circulatingSupply / TAKARA_CONFIG.TOTAL_SUPPLY * 100).toFixed(4)),
      calculatedAt: new Date()
    };

    logger.info({
      price: breakdown.currentPrice,
      timeFactor: breakdown.timeFactor,
      supplyFactor: breakdown.supplyFactor,
      difficultyFactor: breakdown.difficultyFactor
    }, 'Calculated TAKARA price');

    return breakdown;
  } catch (error) {
    logger.error({ error }, 'Failed to calculate TAKARA price');
    throw error;
  }
}

/**
 * Get simple TAKARA price (without breakdown)
 */
export async function getTakaraPrice(): Promise<number> {
  const breakdown = await calculateTakaraPrice();
  return breakdown.currentPrice;
}

/**
 * Project future TAKARA price
 */
export async function projectTakaraPrice(daysAhead: number): Promise<{
  projectedPrice: number;
  projectedDate: Date;
  currentPrice: number;
  priceIncrease: number;
  percentIncrease: number;
}> {
  try {
    const current = await calculateTakaraPrice();

    // Project future time factor
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDaysElapsed = current.daysElapsed + daysAhead;
    const futureTimeFactor = Math.min(
      futureDaysElapsed / TAKARA_PRICING_CONFIG.DISTRIBUTION_PERIOD_DAYS,
      1
    );

    // Assume supply and difficulty grow linearly (conservative estimate)
    const growthRate = daysAhead / current.daysElapsed;
    const futureSupplyFactor = Math.min(current.supplyFactor * (1 + growthRate * 0.1), 1);
    const futureDifficultyFactor = Math.min(current.difficultyFactor * (1 + growthRate * 0.05), 1);

    // Calculate projected price
    const priceRange = TAKARA_PRICING_CONFIG.TARGET_PRICE - TAKARA_PRICING_CONFIG.INITIAL_PRICE;
    const projectedPrice = TAKARA_PRICING_CONFIG.INITIAL_PRICE
      + (priceRange * futureTimeFactor * TAKARA_PRICING_CONFIG.TIME_WEIGHT)
      + (priceRange * futureSupplyFactor * TAKARA_PRICING_CONFIG.SUPPLY_WEIGHT)
      + (priceRange * futureDifficultyFactor * TAKARA_PRICING_CONFIG.DIFFICULTY_WEIGHT);

    const priceIncrease = projectedPrice - current.currentPrice;
    const percentIncrease = (priceIncrease / current.currentPrice) * 100;

    return {
      projectedPrice: Number(projectedPrice.toFixed(6)),
      projectedDate: futureDate,
      currentPrice: current.currentPrice,
      priceIncrease: Number(priceIncrease.toFixed(6)),
      percentIncrease: Number(percentIncrease.toFixed(2))
    };
  } catch (error) {
    logger.error({ error, daysAhead }, 'Failed to project TAKARA price');
    throw error;
  }
}

/**
 * Get price history (if we start tracking it)
 */
export async function getTakaraPriceHistory(days: number = 30): Promise<Array<{
  date: Date;
  price: number;
  circulatingSupply: number;
  difficulty: number;
}>> {
  try {
    // Get mining stats history
    const stats = await prisma.miningStats.findMany({
      orderBy: { date: 'desc' },
      take: days
    });

    // Calculate historical prices
    const history = stats.map(stat => {
      const daysElapsed = (stat.date.getTime() - TAKARA_PRICING_CONFIG.LAUNCH_DATE.getTime())
        / (1000 * 60 * 60 * 24);

      const timeFactor = Math.min(
        daysElapsed / TAKARA_PRICING_CONFIG.DISTRIBUTION_PERIOD_DAYS,
        1
      );
      const supplyFactor = calculateSupplyFactor(
        Number(stat.circulatingSupply),
        TAKARA_CONFIG.TOTAL_SUPPLY
      );
      const difficultyFactor = calculateDifficultyFactor(Number(stat.currentDifficulty));

      const priceRange = TAKARA_PRICING_CONFIG.TARGET_PRICE - TAKARA_PRICING_CONFIG.INITIAL_PRICE;
      const price = TAKARA_PRICING_CONFIG.INITIAL_PRICE
        + (priceRange * timeFactor * TAKARA_PRICING_CONFIG.TIME_WEIGHT)
        + (priceRange * supplyFactor * TAKARA_PRICING_CONFIG.SUPPLY_WEIGHT)
        + (priceRange * difficultyFactor * TAKARA_PRICING_CONFIG.DIFFICULTY_WEIGHT);

      return {
        date: stat.date,
        price: Number(price.toFixed(6)),
        circulatingSupply: Number(stat.circulatingSupply),
        difficulty: Number(stat.currentDifficulty)
      };
    });

    return history;
  } catch (error) {
    logger.error({ error, days }, 'Failed to get TAKARA price history');
    throw error;
  }
}

export default {
  calculateTakaraPrice,
  getTakaraPrice,
  projectTakaraPrice,
  getTakaraPriceHistory,
  TAKARA_PRICING_CONFIG
};
