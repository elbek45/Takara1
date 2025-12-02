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
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Token mint addresses
const LAIKA_MINT = process.env.LAIKA_TOKEN_MINT || 'Euoq6CyQFCjCVSLR9wFaUPDW19Y6ZHwEcJoZsEi643i1';
const TAKARA_MINT = process.env.TAKARA_TOKEN_MINT;

// Price cache
interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_DURATION_MS = 60 * 1000; // 1 minute

/**
 * Get LAIKA token price in USDT
 *
 * Uses Jupiter API as primary source
 * Falls back to CoinGecko if Jupiter fails
 */
export async function getLaikaPrice(): Promise<number> {
  const cacheKey = 'LAIKA_USDT';

  // Check cache
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    logger.debug({ price: cached.price, source: 'cache' }, 'Returning cached LAIKA price');
    return cached.price;
  }

  try {
    // Try Jupiter API first (best for Solana tokens)
    const jupiterPrice = await fetchLaikaPriceFromJupiter();
    if (jupiterPrice > 0) {
      priceCache.set(cacheKey, { price: jupiterPrice, timestamp: Date.now() });
      logger.info({ price: jupiterPrice, source: 'jupiter' }, 'Fetched LAIKA price from Jupiter');
      return jupiterPrice;
    }
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Failed to fetch LAIKA price from Jupiter, trying fallback');
  }

  try {
    // Fallback to CoinGecko
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
    logger.warn({ price: cached.price, age: Date.now() - cached.timestamp }, 'Using expired cached price');
    return cached.price;
  }

  // Last resort: return a default price
  const defaultPrice = 0.0001; // Adjust based on typical LAIKA price
  logger.error({ defaultPrice }, 'All price sources failed, using default price');
  return defaultPrice;
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
 * If not listed, this will fail and we'll use Jupiter only
 */
async function fetchLaikaPriceFromCoinGecko(): Promise<number> {
  // Try to find LAIKA by contract address
  const response = await axios.get(COINGECKO_API, {
    params: {
      ids: 'laika-the-cosmodog', // CoinGecko ID (if listed)
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
 * Get TAKARA token price in USDT (when deployed)
 */
export async function getTakaraPrice(): Promise<number> {
  if (!TAKARA_MINT || TAKARA_MINT === 'TO_BE_DEPLOYED') {
    logger.warn('TAKARA token not yet deployed');
    return 0;
  }

  const cacheKey = 'TAKARA_USDT';

  // Check cache
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.price;
  }

  try {
    const response = await axios.get(`${JUPITER_PRICE_API}?ids=${TAKARA_MINT}`, {
      timeout: 5000
    });

    const data = response.data;

    if (data && data.data && data.data[TAKARA_MINT]) {
      const price = Number(data.data[TAKARA_MINT].price) || 0;
      priceCache.set(cacheKey, { price, timestamp: Date.now() });
      logger.info({ price, source: 'jupiter' }, 'Fetched TAKARA price');
      return price;
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch TAKARA price');
  }

  return 0;
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

export default {
  getLaikaPrice,
  getTakaraPrice,
  calculateLaikaValueWithDiscount,
  calculateRequiredLaika,
  getBatchPrices,
  clearPriceCache,
  getCacheStats
};
