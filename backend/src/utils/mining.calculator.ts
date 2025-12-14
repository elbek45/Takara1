/**
 * TAKARA Mining Calculator
 *
 * Implements the dynamic mining difficulty system as per specification v2.1.1
 *
 * Key Concepts:
 * - Total Supply: 600,000,000 TAKARA
 * - Mining Period: 5 years (60 months)
 * - Distribution: Through investment Vaults
 * - Daily mining based on mining power
 * - Dynamic difficulty increases with total mined and active miners
 */

export const TAKARA_CONFIG = {
  TOTAL_SUPPLY: 21_000_000, // 21 million TAKARA
  MINING_PERIOD_MONTHS: 60, // 5 years
  BASE_DIFFICULTY: 1.0, // Base difficulty multiplier
  SUPPLY_FACTOR: 0.5, // How much total mined affects difficulty
  MINER_FACTOR: 0.000001 // How much active miners affect difficulty
} as const;

export interface MiningInput {
  takaraAPY: number; // From vault config (50, 100, 150, etc.)
  usdtInvested: number; // Investment amount
  currentDifficulty: number; // Current network difficulty
  durationMonths: number; // Vault duration
}

export interface MiningResult {
  dailyTakaraRaw: number; // Before difficulty
  dailyTakaraFinal: number; // After difficulty
  monthlyTakara: number; // ~30 days
  totalTakaraExpected: number; // Over full duration
  difficulty: number; // Difficulty applied
}

export interface DifficultyFactors {
  circulatingSupply: number; // Total user-owned TAKARA (mined + entry locked + boost locked)
  activeMiners: number; // Number of active mining investments
}

/**
 * Calculate dynamic difficulty (v2.3 - Updated to use circulating supply)
 *
 * Formula:
 * difficulty = base × (1 + circulating_supply/total_supply × supply_factor) × (1 + active_miners × miner_factor)
 *
 * Where circulating_supply = totalMined + totalEntryLocked + totalBoostLocked
 * (All TAKARA that belongs to users, including what will be returned)
 *
 * Example:
 * - 0% circulating, 100 miners: difficulty ≈ 1.0001
 * - 10% circulating, 1000 miners: difficulty ≈ 1.051
 * - 50% circulating, 5000 miners: difficulty ≈ 1.255
 */
export function calculateDifficulty(factors: DifficultyFactors): number {
  const { circulatingSupply, activeMiners } = factors;
  const { TOTAL_SUPPLY, BASE_DIFFICULTY, SUPPLY_FACTOR, MINER_FACTOR } = TAKARA_CONFIG;

  // Supply impact (circulating supply ratio)
  const supplyRatio = circulatingSupply / TOTAL_SUPPLY;
  const supplyMultiplier = 1 + (supplyRatio * SUPPLY_FACTOR);

  // Miner impact (network effect)
  const minerMultiplier = 1 + (activeMiners * MINER_FACTOR);

  // Combined difficulty
  const difficulty = BASE_DIFFICULTY * supplyMultiplier * minerMultiplier;

  return Number(difficulty.toFixed(6));
}

/**
 * Calculate base mining rate (before difficulty)
 *
 * Base formula:
 * daily_raw = (mining_power / 100) × (usdt_invested / 1000) × base_daily_rate
 *
 * Where base_daily_rate is calculated to distribute total supply over mining period
 */
export function calculateBaseMiningRate(
  takaraAPY: number,
  usdtInvested: number
): number {
  // Base daily rate per $1000 invested at 100% mining power
  // This ensures fair distribution over 5 years
  const BASE_DAILY_PER_1000 = 10.0; // Adjustable

  const powerMultiplier = takaraAPY / 100;
  const investmentMultiplier = usdtInvested / 1000;

  const dailyRaw = powerMultiplier * investmentMultiplier * BASE_DAILY_PER_1000;

  return Number(dailyRaw.toFixed(6));
}

/**
 * Calculate TAKARA mining rewards
 */
export function calculateMining(input: MiningInput): MiningResult {
  const { takaraAPY, usdtInvested, currentDifficulty, durationMonths } = input;

  // Calculate raw daily mining (before difficulty)
  const dailyTakaraRaw = calculateBaseMiningRate(takaraAPY, usdtInvested);

  // Apply difficulty
  const dailyTakaraFinal = dailyTakaraRaw / currentDifficulty;

  // Calculate monthly (30 days)
  const monthlyTakara = dailyTakaraFinal * 30;

  // Calculate total over vault duration
  const totalDays = durationMonths * 30;
  const totalTakaraExpected = dailyTakaraFinal * totalDays;

  return {
    dailyTakaraRaw: Number(dailyTakaraRaw.toFixed(6)),
    dailyTakaraFinal: Number(dailyTakaraFinal.toFixed(6)),
    monthlyTakara: Number(monthlyTakara.toFixed(2)),
    totalTakaraExpected: Number(totalTakaraExpected.toFixed(2)),
    difficulty: currentDifficulty
  };
}

/**
 * Compare mining across different vault options
 */
export function compareMiningOptions(
  usdtInvested: number,
  currentDifficulty: number,
  vaultOptions: Array<{ name: string; takaraAPY: number; duration: number }>
): Array<{
  name: string;
  takaraAPY: number;
  duration: number;
  dailyTakara: number;
  totalTakara: number;
}> {
  return vaultOptions.map(option => {
    const result = calculateMining({
      takaraAPY: option.takaraAPY,
      usdtInvested,
      currentDifficulty,
      durationMonths: option.duration
    });

    return {
      name: option.name,
      takaraAPY: option.takaraAPY,
      duration: option.duration,
      dailyTakara: result.dailyTakaraFinal,
      totalTakara: result.totalTakaraExpected
    };
  });
}

/**
 * Project future difficulty
 *
 * Estimates difficulty at a future date based on current trajectory
 */
export function projectFutureDifficulty(
  currentFactors: DifficultyFactors,
  monthsAhead: number,
  averageMonthlySupplyGrowth: number, // Average circulating supply growth per month
  minerGrowthRate: number = 1.05 // 5% monthly growth in miners
): number {
  let circulatingSupply = currentFactors.circulatingSupply;
  let activeMiners = currentFactors.activeMiners;

  // Project forward month by month
  for (let i = 0; i < monthsAhead; i++) {
    circulatingSupply += averageMonthlySupplyGrowth;
    activeMiners *= minerGrowthRate;
  }

  return calculateDifficulty({ circulatingSupply, activeMiners: Math.floor(activeMiners) });
}

/**
 * Calculate mining efficiency score (TAKARA per USDT invested)
 */
export function calculateMiningEfficiency(
  takaraAPY: number,
  usdtInvested: number,
  currentDifficulty: number,
  durationMonths: number
): number {
  const result = calculateMining({
    takaraAPY,
    usdtInvested,
    currentDifficulty,
    durationMonths
  });

  // TAKARA earned per USDT invested
  const efficiency = result.totalTakaraExpected / usdtInvested;

  return Number(efficiency.toFixed(4));
}

/**
 * Get mining statistics for dashboard (v2.3 - Updated for circulating supply)
 */
export function getMiningStats(
  currentFactors: DifficultyFactors
): {
  circulatingSupply: number;
  totalSupply: number;
  percentCirculating: number;
  remaining: number;
  activeMiners: number;
  currentDifficulty: number;
  averageDifficultyIncrease: number;
} {
  const { circulatingSupply, activeMiners } = currentFactors;
  const { TOTAL_SUPPLY } = TAKARA_CONFIG;

  const percentCirculating = (circulatingSupply / TOTAL_SUPPLY) * 100;
  const remaining = TOTAL_SUPPLY - circulatingSupply;
  const currentDifficulty = calculateDifficulty(currentFactors);

  // Calculate average difficulty increase rate
  // Compare current vs if no supply had circulated
  const initialDifficulty = calculateDifficulty({ circulatingSupply: 0, activeMiners: 100 });
  const averageDifficultyIncrease = ((currentDifficulty / initialDifficulty) - 1) * 100;

  return {
    circulatingSupply: Number(circulatingSupply.toFixed(2)),
    totalSupply: TOTAL_SUPPLY,
    percentCirculating: Number(percentCirculating.toFixed(4)),
    remaining: Number(remaining.toFixed(2)),
    activeMiners,
    currentDifficulty: Number(currentDifficulty.toFixed(6)),
    averageDifficultyIncrease: Number(averageDifficultyIncrease.toFixed(2))
  };
}

/**
 * Validate mining input
 */
export function validateMiningInput(input: MiningInput): {
  valid: boolean;
  error?: string;
} {
  const { takaraAPY, usdtInvested, currentDifficulty, durationMonths } = input;

  if (takaraAPY <= 0) {
    return { valid: false, error: 'Mining power must be greater than 0' };
  }

  if (usdtInvested <= 0) {
    return { valid: false, error: 'Investment amount must be greater than 0' };
  }

  if (currentDifficulty <= 0) {
    return { valid: false, error: 'Difficulty must be greater than 0' };
  }

  if (durationMonths <= 0) {
    return { valid: false, error: 'Duration must be greater than 0' };
  }

  return { valid: true };
}

/**
 * Format mining result for display
 */
export function formatMiningResult(result: MiningResult): string {
  return [
    `📊 TAKARA Mining Estimate`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Daily: ${result.dailyTakaraFinal.toFixed(2)} TAKARA`,
    `Monthly: ${result.monthlyTakara.toFixed(2)} TAKARA`,
    `Total Expected: ${result.totalTakaraExpected.toFixed(2)} TAKARA`,
    `Current Difficulty: ${result.difficulty}x`,
    `Raw Rate: ${result.dailyTakaraRaw.toFixed(2)} TAKARA/day (before difficulty)`
  ].join('\n');
}

export default {
  calculateDifficulty,
  calculateBaseMiningRate,
  calculateMining,
  compareMiningOptions,
  projectFutureDifficulty,
  calculateMiningEfficiency,
  getMiningStats,
  validateMiningInput,
  formatMiningResult,
  TAKARA_CONFIG
};
