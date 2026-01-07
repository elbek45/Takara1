/**
 * Calculator utility functions for investment calculations
 *
 * These functions are used in VaultDetailPage for calculating
 * boost values and investment estimates.
 */

/**
 * Safely parse a string to float, returning 0 for invalid values
 */
export function safeParseFloat(value: string): number {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Calculate maximum LAIKA boost values
 *
 * LAIKA has x2 boost multiplier for Cosmodog community
 * This means users need 2x LESS LAIKA to achieve full boost
 */
export interface LaikaBoostCalculation {
  laikaToUsdtRate: number
  maxLaikaBoostUSD: number
  maxLaikaMarketValueUSD: number
  maxLaikaBoost: number
}

export function calculateLaikaBoostValues(params: {
  calculationLaikaPrice?: number
  laikaPriceFromApi?: number
  usdtAmount: string
}): LaikaBoostCalculation {
  const { calculationLaikaPrice, laikaPriceFromApi, usdtAmount } = params

  // Get LAIKA rate from calculation or API, fallback to default
  const rate = calculationLaikaPrice || laikaPriceFromApi || 0.0000007

  // Parse USDT amount safely
  const currentUsdtAmount = safeParseFloat(usdtAmount)

  // Max boost USD = 50% of USDT investment
  const boostUSD = currentUsdtAmount > 0 ? currentUsdtAmount * 0.5 : 0

  // x2 boost means divide by 2 to get required market value
  const marketValueUSD = boostUSD / 2

  // Calculate max LAIKA tokens needed
  const maxBoost = rate > 0 ? marketValueUSD / rate : 0

  return {
    laikaToUsdtRate: rate,
    maxLaikaBoostUSD: boostUSD,
    maxLaikaMarketValueUSD: marketValueUSD,
    maxLaikaBoost: isFinite(maxBoost) ? maxBoost : 0,
  }
}

/**
 * Calculate TAKARA boost values
 *
 * TAKARA uses full market value (no multiplier)
 */
export interface TakaraBoostCalculation {
  takaraPrice: number
  maxTakaraBoostUSD: number
  maxTakaraTokens: number
}

export function calculateTakaraBoostValues(params: {
  takaraPrice: number
  usdtAmount: string
}): TakaraBoostCalculation {
  const { takaraPrice, usdtAmount } = params

  // Parse USDT amount safely
  const currentUsdtAmount = safeParseFloat(usdtAmount)

  // Max boost USD = 50% of USDT investment
  const maxBoostUSD = currentUsdtAmount > 0 ? currentUsdtAmount * 0.5 : 0

  // Calculate max TAKARA tokens needed (full market value)
  const maxTokens = takaraPrice > 0 ? maxBoostUSD / takaraPrice : 0

  return {
    takaraPrice,
    maxTakaraBoostUSD: maxBoostUSD,
    maxTakaraTokens: isFinite(maxTokens) ? maxTokens : 0,
  }
}

/**
 * Calculate boost value in USD
 */
export function calculateBoostValueUSD(params: {
  boostToken: 'LAIKA' | 'TAKARA'
  tokenAmount: number
  laikaPrice: number
  takaraPrice: number
}): number {
  const { boostToken, tokenAmount, laikaPrice, takaraPrice } = params

  if (tokenAmount <= 0) return 0

  if (boostToken === 'LAIKA') {
    // LAIKA has x2 multiplier
    const marketValue = tokenAmount * laikaPrice
    return marketValue * 2
  } else {
    // TAKARA uses full market value
    return tokenAmount * takaraPrice
  }
}

/**
 * Validate investment amount against vault requirements
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
  warning?: string
}

export function validateInvestmentAmount(params: {
  usdtAmount: string
  minInvestment: number
  maxInvestment?: number
}): ValidationResult {
  const { usdtAmount, minInvestment, maxInvestment } = params

  const amount = safeParseFloat(usdtAmount)

  if (amount <= 0) {
    return { isValid: false, error: 'Please enter a valid amount' }
  }

  if (amount < minInvestment) {
    return {
      isValid: false,
      error: `Minimum investment is $${minInvestment.toLocaleString()} USDT`,
    }
  }

  if (maxInvestment && amount > maxInvestment) {
    return {
      isValid: false,
      error: `Maximum investment is $${maxInvestment.toLocaleString()} USDT`,
    }
  }

  return { isValid: true }
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format token price for display
 */
export function formatTokenPrice(price: number): string {
  if (price >= 0.01) {
    return price.toFixed(4)
  } else if (price >= 0.000001) {
    return price.toFixed(6)
  } else {
    return price.toFixed(8)
  }
}
