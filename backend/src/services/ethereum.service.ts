/**
 * Ethereum Service
 *
 * Handles USDT transfers on Ethereum network via Web3.js
 * Used for: deposits, withdrawals, and yield claims
 */

import Web3 from 'web3';
import { getLogger } from '../config/logger';

const logger = getLogger('ethereum-service');

// ERC-20 ABI for USDT token (minimal interface)
const USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
];

// Configuration
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // Mainnet USDT
const PLATFORM_ETHEREUM_PRIVATE_KEY = process.env.PLATFORM_ETHEREUM_PRIVATE_KEY;

// Initialize Web3
export const web3 = new Web3(ETHEREUM_RPC_URL);

// Initialize USDT contract
export const usdtContract = new web3.eth.Contract(
  USDT_ABI as any,
  USDT_CONTRACT_ADDRESS
);

// Platform wallet
let platformWallet: any = null;

if (PLATFORM_ETHEREUM_PRIVATE_KEY) {
  platformWallet = web3.eth.accounts.privateKeyToAccount(PLATFORM_ETHEREUM_PRIVATE_KEY);
  web3.eth.accounts.wallet.add(platformWallet);
  logger.info({ address: platformWallet.address }, 'Ethereum platform wallet initialized');
} else {
  logger.warn('PLATFORM_ETHEREUM_PRIVATE_KEY not set - Ethereum transfers will be disabled');
}

/**
 * Get USDT balance for an address
 */
export async function getUSDTBalance(address: string): Promise<number> {
  try {
    const balance = await usdtContract.methods.balanceOf(address).call();

    // USDT has 6 decimals
    const balanceInUSDT = Number(balance) / 1e6;

    logger.debug({ address, balance: balanceInUSDT }, 'USDT balance retrieved');

    return balanceInUSDT;
  } catch (error: any) {
    logger.error({ error, address }, 'Failed to get USDT balance');
    throw new Error(`Failed to get USDT balance: ${error.message}`);
  }
}

/**
 * Verify USDT transaction on Ethereum
 */
export async function verifyUSDTTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    logger.info({ txHash }, 'Verifying USDT transaction');

    // Get transaction receipt
    const receipt = await web3.eth.getTransactionReceipt(txHash);

    if (!receipt) {
      logger.warn({ txHash }, 'Transaction not found');
      return false;
    }

    if (!receipt.status) {
      logger.warn({ txHash }, 'Transaction failed');
      return false;
    }

    // Get transaction details
    const tx = await web3.eth.getTransaction(txHash);

    if (!tx) {
      logger.warn({ txHash }, 'Transaction details not found');
      return false;
    }

    // Verify it's a transaction to USDT contract
    if (tx.to?.toLowerCase() !== USDT_CONTRACT_ADDRESS.toLowerCase()) {
      logger.warn({ txHash, to: tx.to }, 'Transaction not to USDT contract');
      return false;
    }

    // Decode transfer event from logs
    const transferEvent = receipt.logs.find(log =>
      log.address?.toLowerCase() === USDT_CONTRACT_ADDRESS.toLowerCase() &&
      log.topics?.[0] === web3.utils.keccak256('Transfer(address,address,uint256)')
    );

    if (!transferEvent || !transferEvent.topics || transferEvent.topics.length < 3) {
      logger.warn({ txHash }, 'No Transfer event found');
      return false;
    }

    // Decode addresses and amount
    const from = '0x' + transferEvent.topics[1].slice(26);
    const to = '0x' + transferEvent.topics[2].slice(26);
    const amount = Number(transferEvent.data) / 1e6; // USDT has 6 decimals

    // Verify all parameters
    const isValid =
      from.toLowerCase() === expectedFrom.toLowerCase() &&
      to.toLowerCase() === expectedTo.toLowerCase() &&
      Math.abs(amount - expectedAmount) < 0.01; // Allow small rounding differences

    logger.info({
      txHash,
      from,
      to,
      amount,
      expectedFrom,
      expectedTo,
      expectedAmount,
      isValid
    }, 'USDT transaction verified');

    return isValid;
  } catch (error: any) {
    logger.error({ error, txHash }, 'Failed to verify USDT transaction');
    return false;
  }
}

/**
 * Transfer USDT from platform wallet to user
 * Used for withdrawals and yield claims
 */
export async function transferUSDTFromPlatform(
  toAddress: string,
  amount: number
): Promise<string> {
  try {
    if (!platformWallet) {
      throw new Error('Platform Ethereum wallet not configured');
    }

    logger.info({ toAddress, amount }, 'Transferring USDT from platform');

    // Check if real transfers are enabled
    if (process.env.ENABLE_REAL_ETH_TRANSFERS !== 'true') {
      logger.warn({ toAddress, amount }, 'Real Ethereum transfers disabled - returning mock signature');
      return 'mock_eth_tx_' + Date.now();
    }

    // Convert amount to USDT units (6 decimals)
    const amountInUnits = Math.floor(amount * 1e6).toString();

    // Estimate gas
    const gasEstimate = await usdtContract.methods
      .transfer(toAddress, amountInUnits)
      .estimateGas({ from: platformWallet.address });

    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();

    // Send transaction
    const tx = await usdtContract.methods
      .transfer(toAddress, amountInUnits)
      .send({
        from: platformWallet.address,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString()
      });

    logger.info({
      toAddress,
      amount,
      txHash: tx.transactionHash
    }, 'USDT transferred successfully');

    return tx.transactionHash;
  } catch (error: any) {
    logger.error({ error, toAddress, amount }, 'Failed to transfer USDT');
    throw new Error(`Failed to transfer USDT: ${error.message}`);
  }
}

/**
 * Get platform wallet USDT balance
 */
export async function getPlatformUSDTBalance(): Promise<number> {
  if (!platformWallet) {
    throw new Error('Platform Ethereum wallet not configured');
  }

  return getUSDTBalance(platformWallet.address);
}

/**
 * Get platform wallet ETH balance (for gas)
 */
export async function getPlatformETHBalance(): Promise<number> {
  try {
    if (!platformWallet) {
      throw new Error('Platform Ethereum wallet not configured');
    }

    const balance = await web3.eth.getBalance(platformWallet.address);
    const balanceInETH = Number(web3.utils.fromWei(balance, 'ether'));

    logger.debug({ balance: balanceInETH }, 'Platform ETH balance retrieved');

    return balanceInETH;
  } catch (error: any) {
    logger.error({ error }, 'Failed to get platform ETH balance');
    throw new Error(`Failed to get ETH balance: ${error.message}`);
  }
}

export default {
  web3,
  usdtContract,
  getUSDTBalance,
  verifyUSDTTransaction,
  transferUSDTFromPlatform,
  getPlatformUSDTBalance,
  getPlatformETHBalance
};
