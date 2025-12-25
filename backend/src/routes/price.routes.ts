/**
 * Price Routes
 *
 * Public endpoints for token prices
 */

import { Router } from 'express';
import { getLaikaPrice, getTakaraPrice } from '../services/price.service';
import { getLogger } from '../config/logger';

const router = Router();
const logger = getLogger('price-routes');

/**
 * GET /api/prices/laika
 * Get current LAIKA price in USDT
 */
router.get('/laika', async (req, res) => {
  try {
    const price = await getLaikaPrice();
    res.json({
      success: true,
      data: {
        token: 'LAIKA',
        price,
        currency: 'USDT',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get LAIKA price');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LAIKA price'
    });
  }
});

/**
 * GET /api/prices/takara
 * Get current TAKARA price in USDT
 */
router.get('/takara', async (req, res) => {
  try {
    const price = await getTakaraPrice();
    res.json({
      success: true,
      data: {
        token: 'TAKARA',
        price,
        currency: 'USDT',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get TAKARA price');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch TAKARA price'
    });
  }
});

/**
 * GET /api/prices
 * Get all token prices
 */
router.get('/', async (req, res) => {
  try {
    const [laikaPrice, takaraPrice] = await Promise.all([
      getLaikaPrice(),
      getTakaraPrice()
    ]);

    res.json({
      success: true,
      data: {
        laika: {
          token: 'LAIKA',
          price: laikaPrice,
          currency: 'USDT'
        },
        takara: {
          token: 'TAKARA',
          price: takaraPrice,
          currency: 'USDT'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get token prices');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch token prices'
    });
  }
});

export default router;
