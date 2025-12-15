# Vault Calculations - Revised Structure

## Current vs New Structure

### Changes Required:
1. ✅ Replace all 12M vaults with 18M vaults
2. ✅ Elite Vault 36M maxAPY must be 20% (currently 23%)
3. ✅ LAIKA boost limit: 50% of USDT amount (currently 90%)
4. ✅ Recalculate all APY values proportionally

---

## NEW VAULT STRUCTURE (v2.2 - Updated)

### TIER 1: STARTER

| Vault | Duration | Base APY | Max APY | Boost | Monthly (5000) | Yearly (5000) | Total (end) |
|-------|----------|----------|---------|-------|----------------|---------------|-------------|
| **Starter 18M** | 18 months | 7% | 9% | +2% | $29.17 (base) | $350 | $525 |
| **Starter 30M** | 30 months | 9% | 11% | +2% | $37.50 (base) | $450 | $1,125 |
| **Starter 36M** | 36 months | 10% | 12% | +2% | $41.67 (base) | $500 | $1,500 |

### TIER 2: PRO

| Vault | Duration | Base APY | Max APY | Boost | Monthly (5000) | Yearly (5000) | Total (end) |
|-------|----------|---------|---------|-------|----------------|---------------|-------------|
| **Pro 18M** | 18 months | 10% | 12.5% | +2.5% | $41.67 (base) | $500 | $750 |
| **Pro 30M** | 30 months | 14% | 17% | +3% | $58.33 (base) | $700 | $1,750 |
| **Pro 36M** | 36 months | 16% | 19% | +3% | $66.67 (base) | $800 | $2,400 |

### TIER 3: ELITE

| Vault | Duration | Base APY | Max APY | Boost | Monthly (5000) | Yearly (5000) | Total (end) |
|-------|----------|---------|---------|-------|----------------|---------------|-------------|
| **Elite 18M** | 18 months | 12% | 15% | +3% | $50.00 (base) | $600 | $900 |
| **Elite 30M** | 30 months | 15% | 18.5% | +3.5% | $62.50 (base) | $750 | $1,875 |
| **Elite 36M** | 36 months | 16% | 20% | +4% | $66.67 (base) | $800 | $2,400 |

---

## TAKARA Mining (Example for 5000 USDT)

| Vault | TAKARA APY | Daily TAKARA | Monthly TAKARA | Total TAKARA |
|-------|------------|--------------|----------------|--------------|
| **Starter 18M** | 75% | 10.27 | 308 | 5,548 |
| **Starter 30M** | 100% | 13.70 | 411 | 12,329 |
| **Starter 36M** | 150% | 20.55 | 616 | 22,192 |
| **Pro 18M** | 150% | 20.55 | 616 | 11,096 |
| **Pro 30M** | 250% | 34.25 | 1,027 | 30,822 |
| **Pro 36M** | 350% | 47.95 | 1,438 | 51,781 |
| **Elite 18M** | 200% | 27.40 | 822 | 14,795 |
| **Elite 30M** | 300% | 41.10 | 1,233 | 36,986 |
| **Elite 36M** | 450% | 61.64 | 1,849 | 66,575 |

---

## LAIKA Boost Calculation

**New Limit: 50% of USDT investment**

Example for 5000 USDT:
- Max LAIKA value: $2,500 (50% of 5000)
- If LAIKA price = $0.01: Max LAIKA tokens = 250,000

### Boost Requirements to reach Max APY:

| Tier | Max Boost | LAIKA Value Needed | LAIKA Tokens (at $0.01) |
|------|-----------|-------------------|-------------------------|
| STARTER | +2% | $2,500 | 250,000 |
| PRO | +2.5-3% | $2,500 | 250,000 |
| ELITE | +3-4% | $2,500 | 250,000 |

---

## Formulas

### USDT Earnings (Simple Interest)
```
totalEarnings = principal × (apy / 100) × (duration / 12)
monthlyEarnings = totalEarnings / durationMonths
```

### TAKARA Mining
```
dailyTAKARA = (principal × takaraAPY / 100) / 365 / difficulty
monthlyTAKARA = dailyTAKARA × 30
totalTAKARA = dailyTAKARA × durationDays
```

### LAIKA Boost (Linear)
```
maxBoostValue = principal × 0.50  // NEW: 50% limit
boostPercent = (laikaValue / maxBoostValue) × maxBoostAPY
finalAPY = baseAPY + boostPercent
```

---

## Required TAKARA Ratios (per 100 USDT)

| Vault | Requires TAKARA | Ratio |
|-------|-----------------|-------|
| Starter 18M | ❌ No | - |
| Starter 30M | ✅ Yes | 20 |
| Starter 36M | ✅ Yes | 35 |
| Pro 18M | ❌ No | - |
| Pro 30M | ✅ Yes | 30 |
| Pro 36M | ✅ Yes | 45 |
| Elite 18M | ✅ Yes | 25 |
| Elite 30M | ✅ Yes | 40 |
| Elite 36M | ✅ Yes | 50 |
