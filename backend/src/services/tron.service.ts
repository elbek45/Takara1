/**
 * TRON Service
 *
 * Handles USDT (TRC20) verification on TRON network
 * Configured for Shasta testnet
 */

import { getLogger } from '../config/logger';

const logger = getLogger('tron-service');

// Configuration
const TRON_FULL_HOST = process.env.TRON_FULL_HOST || 'https://api.shasta.trongrid.io';
const USDT_CONTRACT_TRON = process.env.USDT_CONTRACT_TRON || 'TWkXs3GmUt9FKs2ELztpULrGnAXGcT1YtK';
const PLATFORM_WALLET_TRON = process.env.PLATFORM_WALLET_TRON || 'TPs3TqoQq24X46Zmw3JA5hZ7kyx2F1tKg2';

/**
 * Convert TRON base58 address to hex format
 */
function base58ToHex(base58Address: string): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt(0);
  for (const char of base58Address) {
    num = num * BigInt(58) + BigInt(ALPHABET.indexOf(char));
  }
  let hex = num.toString(16);
  while (hex.length < 50) {
    hex = '0' + hex;
  }
  return hex.slice(0, 42);
}

/**
 * Get USDT balance for a TRON address
 */
export async function getUSDTBalanceTron(address: string): Promise<number> {
  try {
    const contractHex = base58ToHex(USDT_CONTRACT_TRON);
    const ownerHex = base58ToHex(address);

    const response = await fetch(`${TRON_FULL_HOST}/wallet/triggerconstantcontract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_address: ownerHex,
        contract_address: contractHex,
        function_selector: 'balanceOf(address)',
        parameter: ownerHex.slice(2).padStart(64, '0'),
      })
    });

    const data: any = await response.json();
    if (data?.constant_result && data.constant_result[0]) {
      const balance = parseInt(data.constant_result[0], 16);
      return balance / 1e6; // USDT has 6 decimals
    }
    return 0;
  } catch (error: any) {
    logger.error({ error, address }, 'Failed to get TRON USDT balance');
    return 0;
  }
}

/**
 * Get TRX balance for a TRON address
 */
export async function getTRXBalance(address: string): Promise<number> {
  try {
    const response = await fetch(`${TRON_FULL_HOST}/v1/accounts/${address}`);
    const data: any = await response.json();
    if (data?.data && data.data[0]) {
      const balance = data.data[0].balance || 0;
      return balance / 1e6; // Convert from sun to TRX
    }
    return 0;
  } catch (error: any) {
    logger.error({ error, address }, 'Failed to get TRX balance');
    return 0;
  }
}

/**
 * Verify USDT (TRC20) transaction on TRON
 */
export async function verifyUSDTTransactionTron(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    logger.info({ txHash }, 'Verifying TRON USDT transaction');

    // Get transaction info
    const response = await fetch(`${TRON_FULL_HOST}/wallet/gettransactioninfobyid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: txHash })
    });

    const txInfo: any = await response.json();

    if (!txInfo || !txInfo.id) {
      logger.warn({ txHash }, 'TRON transaction not found');
      return false;
    }

    // Check if transaction was successful
    if (txInfo.receipt?.result !== 'SUCCESS') {
      logger.warn({ txHash, result: txInfo.receipt?.result }, 'TRON transaction failed');
      return false;
    }

    // Get transaction details
    const txResponse = await fetch(`${TRON_FULL_HOST}/wallet/gettransactionbyid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: txHash })
    });

    const tx: any = await txResponse.json();

    if (!tx || !tx.raw_data) {
      logger.warn({ txHash }, 'TRON transaction details not found');
      return false;
    }

    // Parse TRC20 transfer from logs
    if (txInfo.log && txInfo.log.length > 0) {
      for (const log of txInfo.log) {
        // Check if this is a Transfer event from USDT contract
        const contractAddress = '41' + log.address;
        const expectedContractHex = base58ToHex(USDT_CONTRACT_TRON);

        if (contractAddress.toLowerCase() === expectedContractHex.toLowerCase()) {
          // Decode Transfer event: Transfer(address,address,uint256)
          // topics[0] = event signature (Transfer)
          // topics[1] = from address
          // topics[2] = to address
          // data = amount

          if (log.topics && log.topics.length >= 3) {
            const fromHex = '41' + log.topics[1].slice(24);
            const toHex = '41' + log.topics[2].slice(24);
            const amount = parseInt(log.data, 16) / 1e6;

            const expectedFromHex = base58ToHex(expectedFrom);
            const expectedToHex = base58ToHex(expectedTo);

            const isValid =
              fromHex.toLowerCase() === expectedFromHex.toLowerCase() &&
              toHex.toLowerCase() === expectedToHex.toLowerCase() &&
              Math.abs(amount - expectedAmount) < 0.01;

            logger.info({
              txHash,
              fromHex,
              toHex,
              amount,
              expectedFromHex,
              expectedToHex,
              expectedAmount,
              isValid
            }, 'TRON USDT transaction verified');

            return isValid;
          }
        }
      }
    }

    logger.warn({ txHash }, 'No TRC20 Transfer event found');
    return false;
  } catch (error: any) {
    logger.error({ error, txHash }, 'Failed to verify TRON USDT transaction');
    return false;
  }
}

/**
 * Get platform wallet USDT balance on TRON
 */
export async function getPlatformUSDTBalanceTron(): Promise<number> {
  return getUSDTBalanceTron(PLATFORM_WALLET_TRON);
}

/**
 * Get platform wallet TRX balance
 */
export async function getPlatformTRXBalance(): Promise<number> {
  return getTRXBalance(PLATFORM_WALLET_TRON);
}

export default {
  getUSDTBalanceTron,
  getTRXBalance,
  verifyUSDTTransactionTron,
  getPlatformUSDTBalanceTron,
  getPlatformTRXBalance
};
