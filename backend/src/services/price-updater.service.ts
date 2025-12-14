/**
 * Price Updater Service
 *
 * Автоматически обновляет цены токенов каждые 30 минут
 * Использует встроенный механизм кеширования price.service
 */

import { getLogger } from '../config/logger';
import { getLaikaPrice, getTakaraPricingCalculations } from './price.service';

const logger = getLogger('price-updater');

const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 минут в миллисекундах

let updateTimer: NodeJS.Timeout | null = null;

/**
 * Обновить все цены
 */
async function updatePrices() {
  try {
    logger.info('Starting scheduled price update');

    // Обновить цену LAIKA
    const laikaPrice = await getLaikaPrice();
    logger.info({ laikaPrice }, 'LAIKA price updated successfully');

    // Обновить расчеты цен TAKARA
    const takaraCalculations = await getTakaraPricingCalculations();
    logger.info({
      currentPrice: takaraCalculations.current.currentPrice
    }, 'TAKARA pricing updated successfully');

    logger.info('All prices updated successfully');

  } catch (error) {
    logger.error({ error }, 'Failed to update prices');
  }
}

/**
 * Запустить автоматическое обновление цен
 */
export function startPriceUpdater() {
  if (updateTimer) {
    logger.warn('Price updater is already running');
    return;
  }

  logger.info({
    intervalMinutes: 30,
    intervalMs: UPDATE_INTERVAL
  }, 'Starting price updater service');

  // Сразу обновить цены при запуске
  updatePrices().catch(error => {
    logger.error({ error }, 'Initial price update failed');
  });

  // Запустить периодическое обновление
  updateTimer = setInterval(() => {
    updatePrices().catch(error => {
      logger.error({ error }, 'Scheduled price update failed');
    });
  }, UPDATE_INTERVAL);

  logger.info('Price updater started successfully');
}

/**
 * Остановить автоматическое обновление цен
 */
export function stopPriceUpdater() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
    logger.info('Price updater stopped');
  }
}

/**
 * Получить статус сервиса обновления цен
 */
export function getPriceUpdaterStatus(): {
  running: boolean;
  intervalMinutes: number;
  nextUpdateIn?: number;
} {
  return {
    running: updateTimer !== null,
    intervalMinutes: 30,
    nextUpdateIn: updateTimer ? UPDATE_INTERVAL : undefined
  };
}
