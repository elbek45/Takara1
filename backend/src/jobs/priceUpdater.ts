/**
 * Price Updater Job
 *
 * Автоматически обновляет цены токенов
 * Запускается каждые 30 минут
 */

import { getLogger } from '../config/logger';
import { getLaikaPrice, getTakaraPricingCalculations } from '../services/price.service';

const logger = getLogger('price-updater-job');

/**
 * Run price update job
 */
export async function runPriceUpdateJob(): Promise<void> {
  logger.info('Starting price update job');

  try {
    // Update LAIKA price
    const laikaPrice = await getLaikaPrice();
    logger.info({ laikaPrice }, 'LAIKA price updated');

    // Update TAKARA pricing calculations
    const takaraCalc = await getTakaraPricingCalculations();
    logger.info({
      currentPrice: takaraCalc.currentPrice.price
    }, 'TAKARA pricing updated');

    logger.info('✅ Price update job completed successfully');

  } catch (error) {
    logger.error({ error }, '❌ Price update job failed');
    throw error;
  }
}

export default {
  runPriceUpdateJob
};
