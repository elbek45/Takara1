/**
 * Job Scheduler
 *
 * Coordinates all background jobs using cron schedule
 */

import { runDailyMiningJob } from './dailyTakaraMining';
import { runActivationJob } from './investmentActivation';
import { runPayoutJob } from './payoutDistribution';
import { runLaikaReturnJob } from './laikaReturn';
import { CRON_SCHEDULES } from '../config/constants';
import pino from 'pino';

const logger = pino({ name: 'job-scheduler' });

// Simple in-memory scheduler (use BullMQ or node-cron in production)
const jobIntervals: NodeJS.Timeout[] = [];

/**
 * Parse cron schedule to milliseconds (simplified)
 * Format: "minute hour day month dayOfWeek"
 */
function cronToInterval(cronSchedule: string): number {
  // Simplified parsing - for production use a proper cron library
  const parts = cronSchedule.split(' ');

  // Examples:
  // "0 0 * * *" = daily at midnight = 24 hours
  // "0 */6 * * *" = every 6 hours
  // "0 */1 * * *" = every hour

  if (cronSchedule === '0 0 * * *') {
    return 24 * 60 * 60 * 1000; // Daily
  }

  if (cronSchedule === '0 */6 * * *') {
    return 6 * 60 * 60 * 1000; // Every 6 hours
  }

  if (cronSchedule === '0 */1 * * *' || cronSchedule === '0 1 * * *') {
    return 60 * 60 * 1000; // Hourly
  }

  // Default: hourly
  return 60 * 60 * 1000;
}

/**
 * Schedule a job to run at intervals
 */
function scheduleJob(name: string, job: () => Promise<void>, cronSchedule: string): void {
  const intervalMs = cronToInterval(cronSchedule);

  logger.info({
    job: name,
    schedule: cronSchedule,
    intervalMs
  }, 'Scheduling job');

  // Run immediately on startup
  job().catch(error => {
    logger.error({ error, job: name }, 'Initial job execution failed');
  });

  // Schedule recurring execution
  const interval = setInterval(() => {
    logger.info({ job: name }, 'Running scheduled job');
    job().catch(error => {
      logger.error({ error, job: name }, 'Scheduled job execution failed');
    });
  }, intervalMs);

  jobIntervals.push(interval);
}

/**
 * Start all background jobs
 */
export function startJobScheduler(): void {
  if (!process.env.ENABLE_CRON_JOBS || process.env.ENABLE_CRON_JOBS !== 'true') {
    logger.info('Background jobs are disabled (ENABLE_CRON_JOBS=false)');
    return;
  }

  logger.info('🚀 Starting job scheduler');

  try {
    // Schedule all jobs
    scheduleJob('Daily TAKARA Mining', runDailyMiningJob, CRON_SCHEDULES.DAILY_MINING);
    scheduleJob('Investment Activation', runActivationJob, CRON_SCHEDULES.VAULT_ACTIVATION);
    scheduleJob('Payout Distribution', runPayoutJob, CRON_SCHEDULES.PAYOUT_CHECK);
    scheduleJob('LAIKA Return', runLaikaReturnJob, CRON_SCHEDULES.LAIKA_RETURN);

    logger.info('✅ All background jobs scheduled');
  } catch (error) {
    logger.error({ error }, 'Failed to start job scheduler');
  }
}

/**
 * Stop all background jobs
 */
export function stopJobScheduler(): void {
  logger.info('Stopping job scheduler');

  jobIntervals.forEach(interval => {
    clearInterval(interval);
  });

  jobIntervals.length = 0;

  logger.info('Job scheduler stopped');
}

/**
 * Get job status
 */
export function getJobStatus(): {
  enabled: boolean;
  activeJobs: number;
  jobs: string[];
} {
  return {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
    activeJobs: jobIntervals.length,
    jobs: [
      'Daily TAKARA Mining',
      'Investment Activation',
      'Payout Distribution',
      'LAIKA Return'
    ]
  };
}

/**
 * Manual job execution (for testing/admin)
 */
export async function runJobManually(jobName: string): Promise<void> {
  logger.info({ jobName }, 'Running job manually');

  switch (jobName) {
    case 'mining':
      await runDailyMiningJob();
      break;
    case 'activation':
      await runActivationJob();
      break;
    case 'payout':
      await runPayoutJob();
      break;
    case 'laika':
      await runLaikaReturnJob();
      break;
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }

  logger.info({ jobName }, 'Manual job execution completed');
}

export default {
  startJobScheduler,
  stopJobScheduler,
  getJobStatus,
  runJobManually
};
