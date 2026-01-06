/**
 * Solana Routes
 *
 * Public proxy endpoints for Solana RPC calls
 * This avoids CORS issues and rate limiting on frontend
 */

import { Router } from 'express';
import { getTokenBalance, getSolBalance, isValidSolanaAddress } from '../services/solana.service';
import { getCache, setCache } from '../services/redis.service';
import { getLogger } from '../config/logger';

const router = Router();
const logger = getLogger('solana-routes');

// Token mint addresses (Mainnet)
const TOKEN_MINTS = {
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  TAKARA: '6biyv9NcaHmf8rKfLFGmj6eTwR9LBQtmi8dGUp2vRsgA',
  LAIKA: '27yzfJSNvYLBjgSNbMyXMMUWzx6T9q4B9TP7KVBS5vPo',
};

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

/**
 * GET /api/solana/balance/:address
 * Get SOL balance for a wallet
 */
router.get('/balance/:address', async (req, res) => {
  const { address } = req.params;

  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Solana address',
    });
  }

  try {
    // Check cache first
    const cacheKey = `sol:balance:${address}`;
    const cached = await getCache(cacheKey);

    if (cached !== null) {
      return res.json({
        success: true,
        data: {
          address,
          balance: parseFloat(cached),
          token: 'SOL',
          cached: true,
        },
      });
    }

    // Fetch from RPC
    const balance = await getSolBalance(address);

    // Cache the result
    await setCache(cacheKey, balance.toString(), CACHE_TTL);

    return res.json({
      success: true,
      data: {
        address,
        balance,
        token: 'SOL',
        cached: false,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, address }, 'Failed to get SOL balance');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch balance',
    });
  }
});

/**
 * GET /api/solana/token/:address/:token
 * Get token balance for a wallet
 * token can be: USDT, TAKARA, LAIKA or a mint address
 */
router.get('/token/:address/:token', async (req, res) => {
  const { address, token } = req.params;

  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Solana address',
    });
  }

  // Resolve token to mint address
  const tokenUpper = token.toUpperCase();
  const mintAddress = TOKEN_MINTS[tokenUpper as keyof typeof TOKEN_MINTS] || token;

  if (!isValidSolanaAddress(mintAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid token or mint address',
    });
  }

  try {
    // Check cache first
    const cacheKey = `token:balance:${address}:${mintAddress}`;
    const cached = await getCache(cacheKey);

    if (cached !== null) {
      return res.json({
        success: true,
        data: {
          address,
          balance: parseFloat(cached),
          token: tokenUpper in TOKEN_MINTS ? tokenUpper : 'SPL',
          mintAddress,
          cached: true,
        },
      });
    }

    // Fetch from RPC
    const balance = await getTokenBalance(address, mintAddress);

    // Cache the result
    await setCache(cacheKey, balance.toString(), CACHE_TTL);

    return res.json({
      success: true,
      data: {
        address,
        balance,
        token: tokenUpper in TOKEN_MINTS ? tokenUpper : 'SPL',
        mintAddress,
        cached: false,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, address, token }, 'Failed to get token balance');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch token balance',
    });
  }
});

/**
 * GET /api/solana/balances/:address
 * Get all balances for a wallet (SOL + all known tokens)
 */
router.get('/balances/:address', async (req, res) => {
  const { address } = req.params;

  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Solana address',
    });
  }

  try {
    // Check cache first
    const cacheKey = `all:balances:${address}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    // Fetch all balances in parallel
    const [solBalance, usdtBalance, takaraBalance, laikaBalance] = await Promise.all([
      getSolBalance(address),
      getTokenBalance(address, TOKEN_MINTS.USDT),
      getTokenBalance(address, TOKEN_MINTS.TAKARA),
      getTokenBalance(address, TOKEN_MINTS.LAIKA),
    ]);

    const data = {
      address,
      balances: {
        SOL: solBalance,
        USDT: usdtBalance,
        TAKARA: takaraBalance,
        LAIKA: laikaBalance,
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    await setCache(cacheKey, JSON.stringify(data), CACHE_TTL);

    return res.json({
      success: true,
      data,
      cached: false,
    });
  } catch (error: any) {
    logger.error({ error: error.message, address }, 'Failed to get balances');
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch balances',
    });
  }
});

export default router;
