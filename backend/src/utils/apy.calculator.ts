/**
 * APY Calculator
 *
 * Calculates yield for investments based on:
 * - Vault base APY
 * - LAIKA boost
 * - Payout schedule
 * - Investment duration
 */

import { PayoutSchedule } from '../config/vaults.config';

export interface APYCalculationInput {
  principal: number; // USDT invested
  apy: number; // Annual percentage yield
  durationMonths: number; // Investment duration
  payoutSchedule: PayoutSchedule; // When payouts occur
  compounding?: boolean; // Whether earnings compound (default: false for USDT)
}

export interface APYCalculationResult {
  principal: number;
  apy: number;
  durationYears: number;
  totalEarnings: number;
  totalValue: number; // Principal + earnings
  monthlyEarnings: number; // Average per month
  payoutSchedule: PayoutSchedule;
  numberOfPayouts: number;
  payoutAmount: number; // Amount per payout
  nextPayoutDate: Date | null;
}

/**
 * Calculate total earnings from APY
 *
 * For non-compounding (USDT payouts):
 * earnings = principal × (apy / 100) × (duration / 12)
 *
 * For compounding (if enabled):
 * final_value = principal × (1 + apy/100)^(duration/12)
 * earnings = final_value - principal
 */
export function calculateEarnings(input: APYCalculationInput): APYCalculationResult {
  const {
    principal,
    apy,
    durationMonths,
    payoutSchedule,
    compounding = false
  } = input;

  const durationYears = durationMonths / 12;

  let totalEarnings: number;
  let totalValue: number;

  if (compounding) {
    // Compound interest formula with monthly compounding
    // A = P(1 + r/n)^(nt) where n = 12 (monthly)
    const monthlyRate = (apy / 100) / 12;
    totalValue = principal * Math.pow(1 + monthlyRate, durationMonths);
    totalEarnings = totalValue - principal;
  } else {
    // Simple interest (standard for USDT payouts)
    totalEarnings = principal * (apy / 100) * durationYears;
    totalValue = principal + totalEarnings;
  }

  // Calculate payouts
  const numberOfPayouts = calculateNumberOfPayouts(durationMonths, payoutSchedule);
  const payoutAmount = numberOfPayouts > 0 ? totalEarnings / numberOfPayouts : totalEarnings;

  // Calculate average monthly earnings
  const monthlyEarnings = totalEarnings / durationMonths;

  return {
    principal: Number(principal.toFixed(2)),
    apy: Number(apy.toFixed(2)),
    durationYears: Number(durationYears.toFixed(2)),
    totalEarnings: Number(totalEarnings.toFixed(2)),
    totalValue: Number(totalValue.toFixed(2)),
    monthlyEarnings: Number(monthlyEarnings.toFixed(2)),
    payoutSchedule,
    numberOfPayouts,
    payoutAmount: Number(payoutAmount.toFixed(2)),
    nextPayoutDate: null // Will be calculated based on investment start date
  };
}

/**
 * Calculate number of payouts based on schedule
 */
/**
 * Calculate number of payouts based on schedule
 */
export function calculateNumberOfPayouts(
  durationMonths: number,
  schedule: PayoutSchedule
): number {
  switch (schedule) {
    case PayoutSchedule.DAILY:
      return durationMonths * 30; // Daily payouts
    case PayoutSchedule.MONTHLY:
      return durationMonths;
    case PayoutSchedule.QUARTERLY:
      return Math.floor(durationMonths / 3);
    case PayoutSchedule.END_OF_TERM:
      return 1;
    default:
      return 0;
  }
}

/**
 * Calculate next payout date
 */
export function calculateNextPayoutDate(
  startDate: Date,
  schedule: PayoutSchedule,
  lastClaimDate?: Date
): Date {
  const baseDate = lastClaimDate || startDate;
  const nextDate = new Date(baseDate);

  switch (schedule) {
    case PayoutSchedule.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
      
    case PayoutSchedule.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case PayoutSchedule.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case PayoutSchedule.END_OF_TERM:
      // Return end date (calculated separately)
      return nextDate;
  }

  return nextDate;
}

/**
 * Calculate all payout dates for investment
 */
export function calculateAllPayoutDates(
  startDate: Date,
  durationMonths: number,
  schedule: PayoutSchedule
): Date[] {
  const payoutDates: Date[] = [];
  const numberOfPayouts = calculateNumberOfPayouts(durationMonths, schedule);

  if (schedule === PayoutSchedule.END_OF_TERM) {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    payoutDates.push(endDate);
    return payoutDates;
  }

  const monthsPerPayout = schedule === PayoutSchedule.MONTHLY ? 1 : 3;

  for (let i = 1; i <= numberOfPayouts; i++) {
    const payoutDate = new Date(startDate);
    payoutDate.setMonth(payoutDate.getMonth() + (i * monthsPerPayout));
    payoutDates.push(payoutDate);
  }

  return payoutDates;
}

/**
 * Calculate pending earnings up to current date
 */
export function calculatePendingEarnings(
  principal: number,
  apy: number,
  startDate: Date,
  currentDate: Date,
  lastClaimDate?: Date
): number {
  const earningSinceDate = lastClaimDate || startDate;
  const daysSinceLastClaim = Math.floor(
    (currentDate.getTime() - earningSinceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Daily earnings = (principal × apy) / 365
  const dailyEarnings = (principal * (apy / 100)) / 365;
  const pending = dailyEarnings * daysSinceLastClaim;

  return Number(pending.toFixed(6));
}

/**
 * Calculate ROI (Return on Investment) percentage
 */
export function calculateROI(
  principal: number,
  totalEarnings: number
): number {
  if (principal === 0) return 0;
  const roi = (totalEarnings / principal) * 100;
  return Number(roi.toFixed(2));
}

/**
 * Compare different investment scenarios
 */
export interface InvestmentScenario {
  name: string;
  principal: number;
  apy: number;
  durationMonths: number;
}

export function compareScenarios(
  scenarios: InvestmentScenario[]
): Array<{
  name: string;
  principal: number;
  apy: number;
  duration: number;
  earnings: number;
  roi: number;
  monthlyAverage: number;
}> {
  return scenarios.map(scenario => {
    const result = calculateEarnings({
      principal: scenario.principal,
      apy: scenario.apy,
      durationMonths: scenario.durationMonths,
      payoutSchedule: PayoutSchedule.MONTHLY
    });

    const roi = calculateROI(scenario.principal, result.totalEarnings);

    return {
      name: scenario.name,
      principal: scenario.principal,
      apy: scenario.apy,
      duration: scenario.durationMonths,
      earnings: result.totalEarnings,
      roi,
      monthlyAverage: result.monthlyEarnings
    };
  });
}

/**
 * Calculate effective APY with compounding
 */
export function calculateEffectiveAPY(
  nominalAPY: number,
  compoundingPeriodsPerYear: number
): number {
  // Effective APY = (1 + r/n)^n - 1
  // where r = nominal rate, n = compounding periods per year
  const effectiveAPY = Math.pow(
    1 + (nominalAPY / 100) / compoundingPeriodsPerYear,
    compoundingPeriodsPerYear
  ) - 1;

  return Number((effectiveAPY * 100).toFixed(2));
}

/**
 * Calculate break-even time for investment
 */
export function calculateBreakEvenMonths(
  principal: number,
  apy: number,
  fees: number = 0
): number {
  if (apy <= 0) return Infinity;

  const monthlyReturn = principal * (apy / 100) / 12;
  const monthsToBreakEven = fees / monthlyReturn;

  return Number(monthsToBreakEven.toFixed(1));
}

/**
 * Format APY calculation result for display
 */
export function formatAPYResult(result: APYCalculationResult): string {
  return [
    `💰 Investment Summary`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Principal: $${result.principal.toLocaleString()}`,
    `APY: ${result.apy}%`,
    `Duration: ${result.durationYears} years (${result.durationYears * 12} months)`,
    ``,
    `📈 Earnings`,
    `Total Earnings: $${result.totalEarnings.toLocaleString()}`,
    `Final Value: $${result.totalValue.toLocaleString()}`,
    `Monthly Average: $${result.monthlyEarnings.toLocaleString()}`,
    ``,
    `📅 Payouts`,
    `Schedule: ${result.payoutSchedule}`,
    `Number of Payouts: ${result.numberOfPayouts}`,
    `Amount per Payout: $${result.payoutAmount.toLocaleString()}`
  ].join('\n');
}

export default {
  calculateEarnings,
  calculateNumberOfPayouts,
  calculateNextPayoutDate,
  calculateAllPayoutDates,
  calculatePendingEarnings,
  calculateROI,
  compareScenarios,
  calculateEffectiveAPY,
  calculateBreakEvenMonths,
  formatAPYResult
};
