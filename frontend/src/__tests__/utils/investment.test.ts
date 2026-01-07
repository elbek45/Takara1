import { describe, it, expect } from 'vitest'

describe('Investment APY Calculations', () => {
  it('should calculate total return correctly', () => {
    const calculateTotalReturn = (principal: number, apy: number, months: number): number => {
      const years = months / 12
      return principal * (apy / 100) * years
    }

    // $1000 at 12% APY for 12 months = $120
    expect(calculateTotalReturn(1000, 12, 12)).toBe(120)

    // $1000 at 18% APY for 20 months = $300
    expect(calculateTotalReturn(1000, 18, 20)).toBeCloseTo(300, 1)

    // $1000 at 20% APY for 36 months = $600
    expect(calculateTotalReturn(1000, 20, 36)).toBe(600)
  })

  it('should calculate monthly payout correctly', () => {
    const calculateMonthlyPayout = (principal: number, apy: number): number => {
      return (principal * (apy / 100)) / 12
    }

    // $1000 at 12% APY = $10/month
    expect(calculateMonthlyPayout(1000, 12)).toBe(10)

    // $10000 at 18% APY = $150/month
    expect(calculateMonthlyPayout(10000, 18)).toBe(150)
  })

  it('should calculate final amount at maturity', () => {
    const calculateFinalAmount = (principal: number, apy: number, months: number): number => {
      const years = months / 12
      const totalReturn = principal * (apy / 100) * years
      return principal + totalReturn
    }

    // $1000 at 12% for 12 months = $1120
    expect(calculateFinalAmount(1000, 12, 12)).toBe(1120)

    // $5000 at 20% for 36 months = $8000
    expect(calculateFinalAmount(5000, 20, 36)).toBe(8000)
  })
})

describe('Boost Calculations', () => {
  it('should calculate LAIKA boost with x2 multiplier', () => {
    const calculateLaikaBoostValue = (laikaAmount: number, laikaPrice: number): number => {
      const marketValue = laikaAmount * laikaPrice
      return marketValue * 2 // x2 multiplier for Cosmodog community
    }

    // 1M LAIKA at $0.0000007 = $0.70 market value = $1.40 boost value
    expect(calculateLaikaBoostValue(1000000, 0.0000007)).toBeCloseTo(1.4, 2)

    // 10M LAIKA at $0.0000007 = $7.00 market value = $14.00 boost value
    expect(calculateLaikaBoostValue(10000000, 0.0000007)).toBeCloseTo(14, 2)
  })

  it('should calculate TAKARA boost without multiplier', () => {
    const calculateTakaraBoostValue = (takaraAmount: number, takaraPrice: number): number => {
      return takaraAmount * takaraPrice // No multiplier
    }

    // 1000 TAKARA at $0.001506 = $1.506 boost value
    expect(calculateTakaraBoostValue(1000, 0.001506)).toBeCloseTo(1.506, 3)

    // 100000 TAKARA at $0.001506 = $150.6 boost value
    expect(calculateTakaraBoostValue(100000, 0.001506)).toBeCloseTo(150.6, 1)
  })

  it('should calculate max boost amount (50% of USDT)', () => {
    const calculateMaxBoost = (usdtAmount: number): number => {
      return usdtAmount * 0.5
    }

    expect(calculateMaxBoost(1000)).toBe(500)
    expect(calculateMaxBoost(10000)).toBe(5000)
    expect(calculateMaxBoost(500)).toBe(250)
  })

  it('should calculate required LAIKA for max boost', () => {
    const calculateRequiredLaika = (usdtAmount: number, laikaPrice: number): number => {
      const maxBoostUSD = usdtAmount * 0.5
      const requiredMarketValue = maxBoostUSD / 2 // x2 multiplier means divide by 2
      return requiredMarketValue / laikaPrice
    }

    // $1000 USDT, LAIKA at $0.0000007
    // Max boost = $500, required market value = $250
    // Required LAIKA = $250 / $0.0000007 ≈ 357,142,857
    expect(calculateRequiredLaika(1000, 0.0000007)).toBeCloseTo(357142857, 0)
  })

  it('should calculate required TAKARA for max boost', () => {
    const calculateRequiredTakara = (usdtAmount: number, takaraPrice: number): number => {
      const maxBoostUSD = usdtAmount * 0.5
      return maxBoostUSD / takaraPrice
    }

    // $1000 USDT, TAKARA at $0.001506
    // Max boost = $500
    // Required TAKARA = $500 / $0.001506 ≈ 332,005
    expect(calculateRequiredTakara(1000, 0.001506)).toBeCloseTo(332005, 0)
  })
})

describe('Investment Validation', () => {
  it('should validate minimum investment', () => {
    const validateMinInvestment = (amount: number, minRequired: number): boolean => {
      return amount >= minRequired
    }

    expect(validateMinInvestment(1000, 500)).toBe(true)
    expect(validateMinInvestment(500, 500)).toBe(true)
    expect(validateMinInvestment(499, 500)).toBe(false)
    expect(validateMinInvestment(0, 500)).toBe(false)
  })

  it('should validate maximum investment', () => {
    const validateMaxInvestment = (amount: number, maxAllowed: number | null): boolean => {
      if (maxAllowed === null) return true
      return amount <= maxAllowed
    }

    expect(validateMaxInvestment(10000, 50000)).toBe(true)
    expect(validateMaxInvestment(50000, 50000)).toBe(true)
    expect(validateMaxInvestment(50001, 50000)).toBe(false)
    expect(validateMaxInvestment(100000, null)).toBe(true) // No max
  })

  it('should validate TAKARA requirement', () => {
    const validateTakaraRequirement = (
      usdtAmount: number,
      takaraAmount: number,
      takaraRatioPer100: number
    ): boolean => {
      const requiredTakara = (usdtAmount / 100) * takaraRatioPer100
      return takaraAmount >= requiredTakara
    }

    // $1000 USDT, 10 TAKARA per $100 = 100 TAKARA required
    expect(validateTakaraRequirement(1000, 100, 10)).toBe(true)
    expect(validateTakaraRequirement(1000, 99, 10)).toBe(false)

    // $5000 USDT, 30 TAKARA per $100 = 1500 TAKARA required
    expect(validateTakaraRequirement(5000, 1500, 30)).toBe(true)
    expect(validateTakaraRequirement(5000, 1499, 30)).toBe(false)
  })
})

describe('Vault Tier Structure', () => {
  const VAULT_TIERS = ['STARTER', 'BASIC', 'PRO', 'ELITE'] as const
  const VAULT_DURATIONS = [18, 20, 30, 36] as const

  it('should have 4 tiers', () => {
    expect(VAULT_TIERS).toHaveLength(4)
  })

  it('should have 4 durations', () => {
    expect(VAULT_DURATIONS).toHaveLength(4)
  })

  it('should calculate total vaults (4 tiers × 4 durations = 16)', () => {
    const totalVaults = VAULT_TIERS.length * VAULT_DURATIONS.length
    expect(totalVaults).toBe(16)
  })

  it('should generate correct vault names', () => {
    const generateVaultName = (duration: number, tier: string): string => {
      return `${duration}M ${tier.charAt(0) + tier.slice(1).toLowerCase()} Vault`
    }

    expect(generateVaultName(18, 'STARTER')).toBe('18M Starter Vault')
    expect(generateVaultName(36, 'ELITE')).toBe('36M Elite Vault')
    expect(generateVaultName(20, 'BASIC')).toBe('20M Basic Vault')
  })
})

describe('Mining Threshold', () => {
  it('should check if vault meets mining threshold', () => {
    const meetsMiningThreshold = (currentFilled: number, threshold: number): boolean => {
      return currentFilled >= threshold
    }

    expect(meetsMiningThreshold(25000, 25000)).toBe(true)
    expect(meetsMiningThreshold(30000, 25000)).toBe(true)
    expect(meetsMiningThreshold(24999, 25000)).toBe(false)
    expect(meetsMiningThreshold(0, 25000)).toBe(false)
  })

  it('should calculate fill percentage', () => {
    const calculateFillPercentage = (currentFilled: number, totalCapacity: number): number => {
      if (totalCapacity === 0) return 0
      return (currentFilled / totalCapacity) * 100
    }

    expect(calculateFillPercentage(50000, 100000)).toBe(50)
    expect(calculateFillPercentage(100000, 100000)).toBe(100)
    expect(calculateFillPercentage(0, 100000)).toBe(0)
    expect(calculateFillPercentage(25000, 100000)).toBe(25)
  })
})
