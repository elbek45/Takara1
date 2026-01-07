import { describe, it, expect } from 'vitest'
import {
  safeParseFloat,
  calculateLaikaBoostValues,
  calculateTakaraBoostValues,
  calculateBoostValueUSD,
  validateInvestmentAmount,
  formatCurrency,
  formatTokenPrice,
} from '../../utils/calculator'

describe('safeParseFloat', () => {
  it('should parse valid numbers correctly', () => {
    expect(safeParseFloat('1000')).toBe(1000)
    expect(safeParseFloat('1000.50')).toBe(1000.5)
    expect(safeParseFloat('0.001')).toBe(0.001)
  })

  it('should return 0 for empty string', () => {
    expect(safeParseFloat('')).toBe(0)
  })

  it('should return 0 for invalid strings', () => {
    expect(safeParseFloat('abc')).toBe(0)
    expect(safeParseFloat('NaN')).toBe(0)
    expect(safeParseFloat('undefined')).toBe(0)
  })

  it('should handle negative numbers', () => {
    expect(safeParseFloat('-100')).toBe(-100)
  })

  it('should handle numbers with leading/trailing spaces', () => {
    expect(safeParseFloat(' 1000 ')).toBe(1000)
  })
})

describe('calculateLaikaBoostValues', () => {
  const defaultLaikaPrice = 0.0000007

  it('should calculate correct values for $1000 USDT', () => {
    const result = calculateLaikaBoostValues({
      calculationLaikaPrice: defaultLaikaPrice,
      usdtAmount: '1000',
    })

    expect(result.laikaToUsdtRate).toBe(defaultLaikaPrice)
    expect(result.maxLaikaBoostUSD).toBe(500) // 50% of 1000
    expect(result.maxLaikaMarketValueUSD).toBe(250) // 500 / 2 (x2 multiplier)
    // maxLaikaBoost = 250 / 0.0000007 ≈ 357,142,857 LAIKA tokens
    expect(result.maxLaikaBoost).toBeCloseTo(357142857.14, 0)
  })

  it('should calculate correct values for $10000 USDT', () => {
    const result = calculateLaikaBoostValues({
      calculationLaikaPrice: defaultLaikaPrice,
      usdtAmount: '10000',
    })

    expect(result.maxLaikaBoostUSD).toBe(5000) // 50% of 10000
    expect(result.maxLaikaMarketValueUSD).toBe(2500) // 5000 / 2 (x2 multiplier)
  })

  it('should return 0 for empty USDT amount', () => {
    const result = calculateLaikaBoostValues({
      calculationLaikaPrice: defaultLaikaPrice,
      usdtAmount: '',
    })

    expect(result.maxLaikaBoostUSD).toBe(0)
    expect(result.maxLaikaMarketValueUSD).toBe(0)
    expect(result.maxLaikaBoost).toBe(0)
  })

  it('should use fallback rate when no price provided', () => {
    const result = calculateLaikaBoostValues({
      usdtAmount: '1000',
    })

    expect(result.laikaToUsdtRate).toBe(0.0000007) // Default fallback
  })

  it('should prefer calculation price over API price', () => {
    const result = calculateLaikaBoostValues({
      calculationLaikaPrice: 0.000001,
      laikaPriceFromApi: 0.000002,
      usdtAmount: '1000',
    })

    expect(result.laikaToUsdtRate).toBe(0.000001)
  })

  it('should handle zero price rate (falls back to default)', () => {
    const result = calculateLaikaBoostValues({
      calculationLaikaPrice: 0, // 0 is falsy, so falls back to default
      usdtAmount: '1000',
    })

    // When calculationLaikaPrice is 0 (falsy), it uses fallback rate
    expect(result.laikaToUsdtRate).toBe(0.0000007)
    expect(result.maxLaikaBoost).toBeGreaterThan(0) // Should not be 0 because of fallback
  })
})

describe('calculateTakaraBoostValues', () => {
  const defaultTakaraPrice = 0.001506

  it('should calculate correct values for $1000 USDT', () => {
    const result = calculateTakaraBoostValues({
      takaraPrice: defaultTakaraPrice,
      usdtAmount: '1000',
    })

    expect(result.takaraPrice).toBe(defaultTakaraPrice)
    expect(result.maxTakaraBoostUSD).toBe(500) // 50% of 1000
    // maxTakaraTokens = 500 / 0.001506 ≈ 332,005 TAKARA tokens
    expect(result.maxTakaraTokens).toBeCloseTo(332005, 0)
  })

  it('should return 0 for empty USDT amount', () => {
    const result = calculateTakaraBoostValues({
      takaraPrice: defaultTakaraPrice,
      usdtAmount: '',
    })

    expect(result.maxTakaraBoostUSD).toBe(0)
    expect(result.maxTakaraTokens).toBe(0)
  })

  it('should handle zero price', () => {
    const result = calculateTakaraBoostValues({
      takaraPrice: 0,
      usdtAmount: '1000',
    })

    expect(result.maxTakaraTokens).toBe(0) // Should not be Infinity
  })
})

describe('calculateBoostValueUSD', () => {
  const laikaPrice = 0.0000007
  const takaraPrice = 0.001506

  it('should calculate LAIKA boost with x2 multiplier', () => {
    const result = calculateBoostValueUSD({
      boostToken: 'LAIKA',
      tokenAmount: 1000000, // 1M LAIKA
      laikaPrice,
      takaraPrice,
    })

    // Market value = 1000000 * 0.0000007 = 0.7 USD
    // Boost value = 0.7 * 2 = 1.4 USD (x2 multiplier for Cosmodog community)
    expect(result).toBeCloseTo(1.4, 2)
  })

  it('should calculate TAKARA boost without multiplier', () => {
    const result = calculateBoostValueUSD({
      boostToken: 'TAKARA',
      tokenAmount: 1000, // 1000 TAKARA
      laikaPrice,
      takaraPrice,
    })

    // Boost value = 1000 * 0.001506 = 1.506 USD
    expect(result).toBeCloseTo(1.506, 3)
  })

  it('should return 0 for zero token amount', () => {
    expect(
      calculateBoostValueUSD({
        boostToken: 'LAIKA',
        tokenAmount: 0,
        laikaPrice,
        takaraPrice,
      })
    ).toBe(0)

    expect(
      calculateBoostValueUSD({
        boostToken: 'TAKARA',
        tokenAmount: 0,
        laikaPrice,
        takaraPrice,
      })
    ).toBe(0)
  })

  it('should return 0 for negative token amount', () => {
    expect(
      calculateBoostValueUSD({
        boostToken: 'LAIKA',
        tokenAmount: -1000,
        laikaPrice,
        takaraPrice,
      })
    ).toBe(0)
  })
})

describe('validateInvestmentAmount', () => {
  it('should validate valid amount', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '1000',
      minInvestment: 500,
    })

    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject amount below minimum', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '100',
      minInvestment: 500,
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Minimum investment')
  })

  it('should reject amount above maximum', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '20000',
      minInvestment: 500,
      maxInvestment: 10000,
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Maximum investment')
  })

  it('should reject empty amount', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '',
      minInvestment: 500,
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('valid amount')
  })

  it('should reject zero amount', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '0',
      minInvestment: 500,
    })

    expect(result.isValid).toBe(false)
  })

  it('should accept exact minimum', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '500',
      minInvestment: 500,
    })

    expect(result.isValid).toBe(true)
  })

  it('should accept exact maximum', () => {
    const result = validateInvestmentAmount({
      usdtAmount: '10000',
      minInvestment: 500,
      maxInvestment: 10000,
    })

    expect(result.isValid).toBe(true)
  })
})

describe('formatCurrency', () => {
  it('should format with 2 decimal places by default', () => {
    expect(formatCurrency(1000)).toBe('1,000.00')
    expect(formatCurrency(1234.567)).toBe('1,234.57')
  })

  it('should format with custom decimal places', () => {
    expect(formatCurrency(1000, 0)).toBe('1,000')
    expect(formatCurrency(1234.5678, 4)).toBe('1,234.5678')
  })

  it('should handle small numbers', () => {
    expect(formatCurrency(0.01)).toBe('0.01')
    expect(formatCurrency(0.001, 3)).toBe('0.001')
  })

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('1,000,000.00')
  })
})

describe('formatTokenPrice', () => {
  it('should format prices >= 0.01 with 4 decimals', () => {
    expect(formatTokenPrice(0.05)).toBe('0.0500')
    expect(formatTokenPrice(1.5)).toBe('1.5000')
  })

  it('should format prices >= 0.000001 with 6 decimals', () => {
    expect(formatTokenPrice(0.001506)).toBe('0.001506')
    expect(formatTokenPrice(0.005)).toBe('0.005000')
  })

  it('should format very small prices with 8 decimals', () => {
    expect(formatTokenPrice(0.0000007)).toBe('0.00000070')
    expect(formatTokenPrice(0.00000001)).toBe('0.00000001')
  })
})
