/**
 * Price Service (v2.3)
 *
 * Fetches real-time cryptocurrency prices from various sources:
 * - Jupiter API (Solana tokens) - Primary
 * - CoinGecko API (Fallback)
 * - Dynamic TAKARA pricing (time + supply based)
 *
 * Supports:
 * - LAIKA token price (Solana)
 * - TAKARA token price (dynamic calculation)
 * - Caching to reduce API calls
 */

import axios from 'axios';
import { getLogger } from '../config/logger';
import { getTakaraPrice as getDynamicTakaraPrice } from './takara-pricing.service';
import { TAKARA_CONFIG } from '../utils/mining.calculator';

const logger = getLogger('price-service');

// API endpoints
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens'; // Primary - free, no auth
const COINMARKETCAP_API = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2'; // Requires auth now
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// API Keys
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;

// Token identifiers
const LAIKA_CMC_SLUG = 'laika-the-soldog'; // CoinMarketCap slug
const LAIKA_MINT = process.env.LAIKA_TOKEN_MINT || 'Euoq6CyQFCjCVSLR9wFaUPDW19Y6ZHwEcJoZsEi643i1';
const TAKARA_MINT = process.env.TAKARA_TOKEN_MINT;

// Price cache
interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour (as requested)

/**
 * Get LAIKA token price in USDT
 *
 * Priority order:
 * 1. DexScreener (Primary - free, no auth, real-time DEX prices)
 * 2. CoinGecko (Fallback)
 * 3. CoinMarketCap (Last resort - requires API key)
 *
 * Cache duration: 1 hour
 */
export async function getLaikaPrice(): Promise<number> {
  const cacheKey = 'LAIKA_USDT';

  // Check cache (1 hour TTL)
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    logger.debug({
      price: cached.price,
      source: 'cache',
      ageMinutes: Math.floor((Date.now() - cached.timestamp) / 60000)
    }, 'Returning cached LAIKA price');
    return cached.price;
  }

  // Try DexScreener first (Primary source - free, no auth required)
  try {
    const dexScreenerPrice = await fetchLaikaPriceFromDexScreener();
    if (dexScreenerPrice > 0) {
      priceCache.set(cacheKey, { price: dexScreenerPrice, timestamp: Date.now() });
      logger.info({ price: dexScreenerPrice, source: 'dexscreener' }, 'Fetched LAIKA price from DexScreener');
      return dexScreenerPrice;
    }
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Failed to fetch LAIKA price from DexScreener, trying CoinGecko');
  }

  // Fallback to CoinGecko
  try {
    const coinGeckoPrice = await fetchLaikaPriceFromCoinGecko();
    if (coinGeckoPrice > 0) {
      priceCache.set(cacheKey, { price: coinGeckoPrice, timestamp: Date.now() });
      logger.info({ price: coinGeckoPrice, source: 'coingecko' }, 'Fetched LAIKA price from CoinGecko');
      return coinGeckoPrice;
    }
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Failed to fetch LAIKA price from CoinGecko, trying CoinMarketCap');
  }

  // Last resort: CoinMarketCap (requires API key)
  try {
    const cmcPrice = await fetchLaikaPriceFromCoinMarketCap();
    if (cmcPrice > 0) {
      priceCache.set(cacheKey, { price: cmcPrice, timestamp: Date.now() });
      logger.info({ price: cmcPrice, source: 'coinmarketcap' }, 'Fetched LAIKA price from CoinMarketCap');
      return cmcPrice;
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch LAIKA price from CoinMarketCap');
  }

  // If all sources fail, return cached price if available (even if expired)
  if (cached) {
    logger.warn({
      price: cached.price,
      ageHours: Math.floor((Date.now() - cached.timestamp) / 3600000)
    }, 'All price sources failed, using expired cached price');
    return cached.price;
  }

  // Last resort: return a default price
  const defaultPrice = 0.0000007; // Based on current LAIKA price
  logger.error({ defaultPrice }, 'All price sources failed, using default price');
  return defaultPrice;
}

/**
 * Fetch LAIKA price from DexScreener API (Primary)
 *
 * DexScreener aggregates prices from all DEXes (Raydium, Orca, etc.)
 * Free API, no authentication required
 * https://docs.dexscreener.com/api/reference
 */
async function fetchLaikaPriceFromDexScreener(): Promise<number> {
  const response = await axios.get(`${DEXSCREENER_API}/${LAIKA_MINT}`, {
    timeout: 10000,
    headers: {
      'Accept': 'application/json'
    }
  });

  const data = response.data;

  // DexScreener returns pairs array, get the first pair with priceUsd
  if (data && data.pairs && data.pairs.length > 0) {
    // Find the pair with highest liquidity or just use first one
    const sortedPairs = data.pairs.sort((a: any, b: any) =>
      (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0)
    );

    const bestPair = sortedPairs[0];
    if (bestPair && bestPair.priceUsd) {
      const price = Number(bestPair.priceUsd);
      logger.debug({
        price,
        pair: bestPair.pairAddress,
        dexId: bestPair.dexId,
        liquidity: bestPair.liquidity?.usd
      }, 'DexScreener LAIKA price details');
      return price;
    }
  }

  throw new Error('No valid LAIKA pairs found on DexScreener');
}

/**
 * Fetch LAIKA price from CoinMarketCap API
 *
 * https://coinmarketcap.com/currencies/laika-the-soldog/
 */
async function fetchLaikaPriceFromCoinMarketCap(): Promise<number> {
  if (!CMC_API_KEY) {
    logger.warn('CoinMarketCap API key not configured, skipping');
    throw new Error('CoinMarketCap API key not configured');
  }

  const response = await axios.get(COINMARKETCAP_API, {
    params: {
      slug: LAIKA_CMC_SLUG,
      convert: 'USD'
    },
    headers: {
      'X-CMC_PRO_API_KEY': CMC_API_KEY,
      'Accept': 'application/json'
    },
    timeout: 5000
  });

  const data = response.data;

  // CoinMarketCap response structure:
  // { status: { ... }, data: { "12345": { quote: { USD: { price: 0.00123 } } } } }
  if (data && data.data) {
    const tokenData = Object.values(data.data)[0] as any;
    if (tokenData && tokenData.quote && tokenData.quote.USD) {
      const price = Number(tokenData.quote.USD.price);
      if (price > 0) {
        return price;
      }
    }
  }

  throw new Error('Invalid response from CoinMarketCap API');
}

/**
 * Fetch LAIKA price from Jupiter API
 */
async function fetchLaikaPriceFromJupiter(): Promise<number> {
  const response = await axios.get(`${JUPITER_PRICE_API}?ids=${LAIKA_MINT}`, {
    timeout: 5000,
    headers: {
      'Accept': 'application/json'
    }
  });

  const data = response.data;

  if (data && data.data && data.data[LAIKA_MINT]) {
    const priceData = data.data[LAIKA_MINT];
    return Number(priceData.price) || 0;
  }

  throw new Error('Invalid response from Jupiter API');
}

/**
 * Fetch LAIKA price from CoinGecko (fallback)
 *
 * Note: This requires LAIKA to be listed on CoinGecko
 * Trying both possible IDs: laika-the-soldog and laika-the-cosmodog
 */
async function fetchLaikaPriceFromCoinGecko(): Promise<number> {
  // Try laika-the-soldog first (matching CoinMarketCap)
  try {
    const response = await axios.get(COINGECKO_API, {
      params: {
        ids: 'laika-the-soldog',
        vs_currencies: 'usd',
        include_market_cap: false,
        include_24hr_vol: false,
        include_24hr_change: false
      },
      timeout: 5000
    });

    const data = response.data;

    if (data && data['laika-the-soldog'] && data['laika-the-soldog'].usd) {
      return Number(data['laika-the-soldog'].usd);
    }
  } catch (error: any) {
    logger.debug({ error: error.message }, 'laika-the-soldog not found on CoinGecko, trying alternative ID');
  }

  // Fallback to laika-the-cosmodog
  const response = await axios.get(COINGECKO_API, {
    params: {
      ids: 'laika-the-cosmodog',
      vs_currencies: 'usd',
      include_market_cap: false,
      include_24hr_vol: false,
      include_24hr_change: false
    },
    timeout: 5000
  });

  const data = response.data;

  if (data && data['laika-the-cosmodog'] && data['laika-the-cosmodog'].usd) {
    return Number(data['laika-the-cosmodog'].usd);
  }

  throw new Error('LAIKA not found on CoinGecko or invalid response');
}

/**
 * Get TAKARA token price in USDT
 *
 * Priority:
 * 1. Jupiter API (if listed)
 * 2. Calculated base price ($0.05 based on economics)
 * 3. Environment variable override
 */
export async function getTakaraPrice(): Promise<number> {
  const cacheKey = 'TAKARA_USDT';

  // Check cache
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    logger.debug({
      price: cached.price,
      source: 'cache',
      ageMinutes: Math.floor((Date.now() - cached.timestamp) / 60000)
    }, 'Returning cached TAKARA price');
    return cached.price;
  }

  // Try environment variable override first (for manual price setting)
  const envPrice = process.env.TAKARA_PRICE_OVERRIDE;
  if (envPrice && !isNaN(parseFloat(envPrice))) {
    const price = parseFloat(envPrice);
    priceCache.set(cacheKey, { price, timestamp: Date.now() });
    logger.info({ price, source: 'env-override' }, 'Using TAKARA price from environment');
    return price;
  }

  // Try Jupiter API if token is deployed
  if (TAKARA_MINT && TAKARA_MINT !== 'TO_BE_DEPLOYED') {
    try {
      const response = await axios.get(`${JUPITER_PRICE_API}?ids=${TAKARA_MINT}`, {
        timeout: 5000
      });

      const data = response.data;

      if (data && data.data && data.data[TAKARA_MINT]) {
        const price = Number(data.data[TAKARA_MINT].price) || 0;
        if (price > 0) {
          priceCache.set(cacheKey, { price, timestamp: Date.now() });
          logger.info({ price, source: 'jupiter' }, 'Fetched TAKARA price from Jupiter');
          return price;
        }
      }
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Failed to fetch TAKARA price from Jupiter, using calculated price');
    }
  }

  // Use calculated base price (based on economic analysis)
  const calculatedPrice = await calculateTakaraBasePrice();
  priceCache.set(cacheKey, { price: calculatedPrice, timestamp: Date.now() });
  logger.info({ price: calculatedPrice, source: 'calculated' }, 'Using calculated TAKARA price');

  return calculatedPrice;
}

/**
 * Calculate TAKARA base price based on platform economics (v2.3)
 *
 * Now uses dynamic pricing model that considers:
 * - Time progression (5-year distribution period)
 * - Circulating supply (mined + entry + boost TAKARA)
 * - Mining difficulty
 *
 * Falls back to static price if dynamic calculation fails
 */
async function calculateTakaraBasePrice(): Promise<number> {
  try {
    // Use dynamic pricing service (v2.3)
    const dynamicPrice = await getDynamicTakaraPrice();
    logger.info({ price: dynamicPrice }, 'Calculated dynamic TAKARA price');
    return dynamicPrice;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to calculate dynamic TAKARA price, using fallback');
    // Fallback to minimum initial price if dynamic calculation fails
    const BASE_PRICE = 0.001; // $0.001 USD (initial price)
    logger.warn({ price: BASE_PRICE }, 'Using fallback TAKARA price');
    return BASE_PRICE;
  }
}

/**
 * Calculate LAIKA value in USDT with platform PREMIUM for boost
 *
 * Platform values LAIKA 50% HIGHER than market for boost calculations
 * This is a BONUS for users - they need LESS LAIKA!
 * Formula: boostValueUSD = laikaAmount × laikaPrice × 1.50
 *
 * Example: $100 worth of LAIKA at market = $150 boost value
 * Or: to get $100 boost, you only need $66.67 worth of LAIKA at market price
 */
export async function calculateLaikaValueWithPremium(laikaAmount: number): Promise<{
  laikaAmount: number;
  laikaPrice: number;
  marketValue: number; // Market price in USD
  premiumPercent: number; // Platform premium (50% bonus!)
  premiumAmount: number; // Bonus amount
  finalValue: number; // Boost value (market * 1.5)
}> {
  const laikaPrice = await getLaikaPrice();
  const marketValue = laikaAmount * laikaPrice;
  const premiumPercent = 50; // 50% bonus on LAIKA value!
  const premiumAmount = marketValue * 0.50; // Bonus
  const finalValue = marketValue * 1.50; // Boost value = market value * 1.5

  return {
    laikaAmount,
    laikaPrice,
    marketValue: Number(marketValue.toFixed(6)),
    premiumPercent,
    premiumAmount: Number(premiumAmount.toFixed(6)),
    finalValue: Number(finalValue.toFixed(6))
  };
}

/**
 * Backward compatible alias for calculateLaikaValueWithPremium
 * @deprecated Use calculateLaikaValueWithPremium instead
 */
export async function calculateLaikaValueWithDiscount(laikaAmount: number): Promise<{
  laikaAmount: number;
  laikaPrice: number;
  marketValue: number;
  discountPercent: number;
  discountAmount: number;
  finalValue: number;
}> {
  const result = await calculateLaikaValueWithPremium(laikaAmount);
  return {
    laikaAmount: result.laikaAmount,
    laikaPrice: result.laikaPrice,
    marketValue: result.marketValue,
    discountPercent: result.premiumPercent,
    discountAmount: result.premiumAmount,
    finalValue: result.finalValue
  };
}

/**
 * Calculate required LAIKA amount (at market value) for desired boost USD value
 *
 * Platform values LAIKA 50% HIGHER than market for boost
 * If you need $100 boost value, you only need $66.67 worth of LAIKA at market
 * Users need 50% LESS LAIKA!
 */
export async function calculateRequiredLaika(desiredUSDValue: number): Promise<{
  desiredUSDValue: number;
  laikaPrice: number;
  requiredLaikaAmount: number;
  marketValue: number;
  savings: number;
}> {
  const laikaPrice = await getLaikaPrice();

  // Since boostValue = marketValue × 1.50
  // marketValue = desiredUSDValue / 1.50 (need LESS!)
  // laikaAmount = marketValue / laikaPrice
  const marketValue = desiredUSDValue / 1.50;
  const requiredLaikaAmount = marketValue / laikaPrice;
  const savings = desiredUSDValue - marketValue; // 33% savings!

  return {
    desiredUSDValue,
    laikaPrice,
    requiredLaikaAmount: Number(requiredLaikaAmount.toFixed(2)),
    marketValue: Number(marketValue.toFixed(6)),
    savings: Number(savings.toFixed(6))
  };
}

/**
 * Get multiple token prices in batch
 */
export async function getBatchPrices(mintAddresses: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  try {
    const ids = mintAddresses.join(',');
    const response = await axios.get(`${JUPITER_PRICE_API}?ids=${ids}`, {
      timeout: 5000
    });

    const data = response.data;

    if (data && data.data) {
      for (const [mint, priceData] of Object.entries(data.data)) {
        prices.set(mint, Number((priceData as any).price) || 0);
      }
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch batch prices');
  }

  return prices;
}

/**
 * Clear price cache (for testing or manual refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
  logger.info('Price cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  keys: string[];
  ages: Record<string, number>;
} {
  const stats = {
    entries: priceCache.size,
    keys: Array.from(priceCache.keys()),
    ages: {} as Record<string, number>
  };

  for (const [key, value] of priceCache.entries()) {
    stats.ages[key] = Date.now() - value.timestamp;
  }

  return stats;
}

/**
 * Get comprehensive TAKARA pricing calculations for admin panel
 *
 * Returns detailed breakdown of:
 * - Current price and factors
 * - Mining economics at different investment levels
 * - ROI calculations
 * - Price recommendations
 */
export async function getTakaraPricingCalculations(): Promise<{
  currentPrice: {
    price: number;
    source: string;
    basePrice: number;
    difficulty: number;
    difficultyMultiplier: number;
  };
  economics: {
    totalSupply: number;
    miningPeriodMonths: number;
    currentDifficulty: number;
    totalMined: number;
    percentMined: number;
  };
  exampleCalculations: Array<{
    vaultName: string;
    tier: string;
    duration: number;
    investment: number;
    takaraRequired: number;
    takaraRequiredCost: number;
    takaraAPY: number;
    dailyMining: number;
    monthlyMining: number;
    totalMined: number;
    totalMiningValue: number;
    netProfit: number;
    roi: number;
    annualizedROI: number;
  }>;
  priceScenarios: Array<{
    price: number;
    marketCap: number;
    laikaMultiplier: number;
    description: string;
  }>;
  recommendations: {
    launchPrice: number;
    targetPriceRange: { min: number; max: number };
    reasoning: string[];
  };
}> {
  const { prisma } = await import('../config/database');
  const { VAULTS } = await import('../config/vaults.config');
  const { calculateMining } = await import('../utils/mining.calculator');

  // Get current price and factors
  const currentPrice = await getTakaraPrice();
  const laikaPrice = await getLaikaPrice();

  // Get mining stats
  const latestMiningStats = await prisma.miningStats.findFirst({
    orderBy: { date: 'desc' }
  });

  const currentDifficulty = latestMiningStats
    ? Number(latestMiningStats.currentDifficulty)
    : 1.0;

  const totalMined = latestMiningStats
    ? Number(latestMiningStats.totalMined)
    : 0;

  const TOTAL_SUPPLY = TAKARA_CONFIG.TOTAL_SUPPLY;
  const percentMined = (totalMined / TOTAL_SUPPLY) * 100;

  // Example calculations for different vaults
  const exampleInvestment = 10000; // $10,000 USDT
  const exampleVaults = [
    VAULTS.find(v => v.tier === 'STARTER' && v.duration === 12),
    VAULTS.find(v => v.tier === 'PRO' && v.duration === 30),
    VAULTS.find(v => v.tier === 'ELITE' && v.duration === 36)
  ].filter(Boolean);

  const exampleCalculations = exampleVaults.map(vault => {
    if (!vault) return null;

    const takaraRequired = vault.requireTAKARA && vault.takaraRatio
      ? (exampleInvestment / 100) * vault.takaraRatio
      : 0;

    const takaraRequiredCost = takaraRequired * currentPrice;

    // Calculate mining
    const miningResult = calculateMining({
      takaraAPY: vault.takaraAPY,
      usdtInvested: exampleInvestment,
      currentDifficulty,
      durationMonths: vault.duration
    });

    const totalMiningValue = miningResult.totalTakaraExpected * currentPrice;
    const netProfit = totalMiningValue - takaraRequiredCost;
    const roi = takaraRequired > 0 ? (netProfit / takaraRequiredCost) * 100 : 0;
    const annualizedROI = takaraRequired > 0 ? (roi / vault.duration) * 12 : 0;

    return {
      vaultName: vault.name,
      tier: vault.tier,
      duration: vault.duration,
      investment: exampleInvestment,
      takaraRequired,
      takaraRequiredCost: Number(takaraRequiredCost.toFixed(2)),
      takaraAPY: vault.takaraAPY,
      dailyMining: miningResult.dailyTakaraFinal,
      monthlyMining: miningResult.monthlyTakara,
      totalMined: miningResult.totalTakaraExpected,
      totalMiningValue: Number(totalMiningValue.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      annualizedROI: Number(annualizedROI.toFixed(2))
    };
  }).filter(Boolean);

  // Price scenarios
  const priceScenarios = [
    {
      price: 0.01,
      marketCap: TOTAL_SUPPLY * 0.01,
      laikaMultiplier: laikaPrice > 0 ? 0.01 / laikaPrice : 100,
      description: 'Conservative launch - high mining returns, low barrier to entry'
    },
    {
      price: 0.05,
      marketCap: TOTAL_SUPPLY * 0.05,
      laikaMultiplier: laikaPrice > 0 ? 0.05 / laikaPrice : 500,
      description: 'Recommended launch - balanced economics, sustainable growth'
    },
    {
      price: 0.10,
      marketCap: TOTAL_SUPPLY * 0.10,
      laikaMultiplier: laikaPrice > 0 ? 0.10 / laikaPrice : 1000,
      description: 'Premium launch - strong value perception, higher barriers'
    }
  ];

  // Calculate difficulty multiplier
  const BASE_PRICE = 0.05;
  const difficultyMultiplier = 1 + ((currentDifficulty - 1.0) / 9.0) * 1.0;

  return {
    currentPrice: {
      price: currentPrice,
      source: currentPrice === BASE_PRICE ? 'calculated' : 'market',
      basePrice: BASE_PRICE,
      difficulty: currentDifficulty,
      difficultyMultiplier: Number(difficultyMultiplier.toFixed(4))
    },
    economics: {
      totalSupply: TOTAL_SUPPLY,
      miningPeriodMonths: 60,
      currentDifficulty,
      totalMined,
      percentMined: Number(percentMined.toFixed(4))
    },
    exampleCalculations: exampleCalculations as any,
    priceScenarios,
    recommendations: {
      launchPrice: 0.05,
      targetPriceRange: { min: 0.05, max: 0.10 },
      reasoning: [
        '500x LAIKA multiplier justified by required entry vs optional boost',
        '1,000%+ ROI for early adopters maintains strong incentive',
        '$30M market cap reasonable for DeFi platform token',
        'Dynamic pricing adjusts with difficulty (1.0x to 2.0x over 5 years)',
        'Sustainable mining economics at all price points'
      ]
    }
  };
}

export default {
  getLaikaPrice,
  getTakaraPrice,
  calculateLaikaValueWithDiscount,
  calculateRequiredLaika,
  getBatchPrices,
  clearPriceCache,
  getCacheStats,
  getTakaraPricingCalculations
};
