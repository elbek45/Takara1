/**
 * Price Service
 *
 * Fetches real-time cryptocurrency prices from various sources:
 * - Jupiter API (Solana tokens) - Primary
 * - CoinGecko API (Fallback)
 *
 * Supports:
 * - LAIKA token price (Solana)
 * - TAKARA token price (when deployed)
 * - Caching to reduce API calls
 */

import axios from 'axios';
import { getLogger } from '../config/logger';

const logger = getLogger('price-service');

// API endpoints
const COINMARKETCAP_API = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
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
 * 1. CoinMarketCap (Primary - most reliable)
 * 2. Jupiter API (Fallback - Solana DEX aggregator)
 * 3. CoinGecko (Last resort)
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

  // Try CoinMarketCap first (Primary source)
  try {
    const cmcPrice = await fetchLaikaPriceFromCoinMarketCap();
    if (cmcPrice > 0) {
      priceCache.set(cacheKey, { price: cmcPrice, timestamp: Date.now() });
      logger.info({ price: cmcPrice, source: 'coinmarketcap' }, 'Fetched LAIKA price from CoinMarketCap');
      return cmcPrice;
    }
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Failed to fetch LAIKA price from CoinMarketCap, trying Jupiter');
  }

  // Fallback to Jupiter API
  try {
    const jupiterPrice = await fetchLaikaPriceFromJupiter();
    if (jupiterPrice > 0) {
      priceCache.set(cacheKey, { price: jupiterPrice, timestamp: Date.now() });
      logger.info({ price: jupiterPrice, source: 'jupiter' }, 'Fetched LAIKA price from Jupiter');
      return jupiterPrice;
    }
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Failed to fetch LAIKA price from Jupiter, trying CoinGecko');
  }

  // Last resort: CoinGecko
  try {
    const coinGeckoPrice = await fetchLaikaPriceFromCoinGecko();
    if (coinGeckoPrice > 0) {
      priceCache.set(cacheKey, { price: coinGeckoPrice, timestamp: Date.now() });
      logger.info({ price: coinGeckoPrice, source: 'coingecko' }, 'Fetched LAIKA price from CoinGecko');
      return coinGeckoPrice;
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch LAIKA price from CoinGecko');
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
  const defaultPrice = 0.0001; // Adjust based on typical LAIKA price
  logger.error({ defaultPrice }, 'All price sources failed, using default price');
  return defaultPrice;
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
 * Calculate TAKARA base price based on platform economics
 *
 * Factors considered:
 * - Mining difficulty (current network state)
 * - Supply/demand ratio
 * - Utility value (entry requirements)
 * - Base price recommendation: $0.05
 */
async function calculateTakaraBasePrice(): Promise<number> {
  const BASE_PRICE = 0.05; // $0.05 USD (recommended launch price)

  // Get current mining difficulty to adjust price
  const { prisma } = await import('../config/database');

  try {
    const latestMiningStats = await prisma.miningStats.findFirst({
      orderBy: { date: 'desc' }
    });

    const currentDifficulty = latestMiningStats
      ? Number(latestMiningStats.currentDifficulty)
      : 1.0;

    // Price adjustment based on difficulty
    // As difficulty increases, mining becomes harder, so price should increase
    // Difficulty range: 1.0 - 10.0
    // Price range: $0.05 - $0.10
    const difficultyMultiplier = 1 + ((currentDifficulty - 1.0) / 9.0) * 1.0;
    const adjustedPrice = BASE_PRICE * difficultyMultiplier;

    logger.debug({
      basePrice: BASE_PRICE,
      currentDifficulty,
      difficultyMultiplier,
      adjustedPrice
    }, 'Calculated TAKARA price');

    return Number(adjustedPrice.toFixed(6));
  } catch (error) {
    logger.warn({ error }, 'Failed to calculate dynamic TAKARA price, using base price');
    return BASE_PRICE;
  }
}

/**
 * Calculate LAIKA value in USDT with 10% platform discount
 *
 * Formula:
 * laikaValueUSD = laikaAmount × laikaPrice × 0.90
 *
 * This applies a 10% discount to the LAIKA value
 */
export async function calculateLaikaValueWithDiscount(laikaAmount: number): Promise<{
  laikaAmount: number;
  laikaPrice: number;
  marketValue: number; // Without discount
  discountPercent: number;
  discountAmount: number;
  finalValue: number; // With 10% discount
}> {
  const laikaPrice = await getLaikaPrice();
  const marketValue = laikaAmount * laikaPrice;
  const discountPercent = 10;
  const discountAmount = marketValue * (discountPercent / 100);
  const finalValue = marketValue - discountAmount;

  return {
    laikaAmount,
    laikaPrice,
    marketValue: Number(marketValue.toFixed(6)),
    discountPercent,
    discountAmount: Number(discountAmount.toFixed(6)),
    finalValue: Number(finalValue.toFixed(6))
  };
}

/**
 * Calculate required LAIKA amount for desired USD value
 *
 * Takes into account the 10% discount
 */
export async function calculateRequiredLaika(desiredUSDValue: number): Promise<{
  desiredUSDValue: number;
  laikaPrice: number;
  requiredLaikaAmount: number;
  marketValue: number;
  discountAmount: number;
}> {
  const laikaPrice = await getLaikaPrice();

  // Since finalValue = laikaAmount × laikaPrice × 0.90
  // laikaAmount = desiredUSDValue / (laikaPrice × 0.90)
  const requiredLaikaAmount = desiredUSDValue / (laikaPrice * 0.90);
  const marketValue = requiredLaikaAmount * laikaPrice;
  const discountAmount = marketValue * 0.10;

  return {
    desiredUSDValue,
    laikaPrice,
    requiredLaikaAmount: Number(requiredLaikaAmount.toFixed(2)),
    marketValue: Number(marketValue.toFixed(6)),
    discountAmount: Number(discountAmount.toFixed(6))
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

  const TOTAL_SUPPLY = 600_000_000;
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
