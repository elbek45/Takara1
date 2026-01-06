/**
 * Solana Service
 *
 * Handles all Solana blockchain interactions:
 * - Wallet signature verification
 * - Transaction validation
 * - Token transfers
 * - NFT minting
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getLogger } from '../config/logger';

const logger = getLogger('solana-service');

// Solana RPC URL priority:
// 1. HELIUS_RPC_URL (paid, high limits)
// 2. SOLANA_RPC_URL (custom)
// 3. Public mainnet RPC (rate limited)
const getRpcUrl = () => {
  if (process.env.HELIUS_RPC_URL) {
    logger.info('Using Helius RPC');
    return process.env.HELIUS_RPC_URL;
  }
  if (process.env.SOLANA_RPC_URL) {
    logger.info('Using custom Solana RPC');
    return process.env.SOLANA_RPC_URL;
  }
  logger.info('Using public Solana mainnet RPC');
  return 'https://api.mainnet-beta.solana.com';
};

// Solana connection
export const connection = new Connection(getRpcUrl(), 'confirmed');

// Platform wallet (loaded from env)
let platformWallet: Keypair | null = null;

/**
 * Initialize platform wallet from private key
 */
export function initializePlatformWallet(): void {
  const privateKeyString = process.env.PLATFORM_WALLET_PRIVATE_KEY;

  if (!privateKeyString) {
    logger.warn('PLATFORM_WALLET_PRIVATE_KEY not set in environment');
    return;
  }

  try {
    const privateKeyBytes = bs58.decode(privateKeyString);
    platformWallet = Keypair.fromSecretKey(privateKeyBytes);
    logger.info({
      publicKey: platformWallet.publicKey.toBase58()
    }, 'Platform wallet initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize platform wallet');
  }
}

/**
 * Verify Solana wallet signature
 *
 * @param publicKey - User's wallet public key (base58)
 * @param signature - Signature to verify (base58)
 * @param message - Message that was signed
 * @returns true if signature is valid
 */
export function verifyWalletSignature(
  publicKey: string,
  signature: string,
  message: string
): boolean {
  try {
    const publicKeyBytes = bs58.decode(publicKey);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    logger.debug({
      publicKey,
      message,
      isValid
    }, 'Signature verification result');

    return isValid;
  } catch (error) {
    logger.error({ error, publicKey }, 'Signature verification failed');
    return false;
  }
}

/**
 * Verify transaction exists and is confirmed
 *
 * @param signature - Transaction signature
 * @returns Transaction details or null if not found
 */
export async function verifyTransaction(signature: string): Promise<{
  confirmed: boolean;
  blockTime: number | null;
  slot: number;
} | null> {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return null;
    }

    return {
      confirmed: true,
      blockTime: tx.blockTime ?? null,
      slot: tx.slot
    };
  } catch (error) {
    logger.error({ error, signature }, 'Transaction verification failed');
    return null;
  }
}

/**
 * Verify transaction with full details validation
 *
 * @param signature - Transaction signature
 * @param expectedRecipient - Expected recipient address
 * @param expectedAmount - Expected transfer amount
 * @param expectedTokenMint - Expected token mint address (for SPL tokens)
 * @param maxAgeSeconds - Maximum transaction age in seconds (default 1 hour)
 * @returns Verification result with details
 */
export async function verifyTransactionDetails(params: {
  signature: string;
  expectedRecipient: string;
  expectedAmount: number;
  expectedTokenMint?: string;
  maxAgeSeconds?: number;
}): Promise<{
  success: boolean;
  message: string;
  details?: {
    confirmed: boolean;
    recipient: string;
    amount: number;
    tokenMint?: string;
    blockTime: number | null;
    age: number;
  };
}> {
  const { signature, expectedRecipient, expectedAmount, expectedTokenMint, maxAgeSeconds = 3600 } = params;

  try {
    // 1. Fetch transaction
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return {
        success: false,
        message: 'Transaction not found'
      };
    }

    // 2. Check confirmation
    if (!tx.meta || tx.meta.err) {
      return {
        success: false,
        message: 'Transaction failed or not confirmed'
      };
    }

    // 3. Check transaction age (replay prevention)
    const now = Math.floor(Date.now() / 1000);
    const blockTime = tx.blockTime || 0;
    const age = now - blockTime;

    if (age > maxAgeSeconds) {
      return {
        success: false,
        message: `Transaction too old: ${age} seconds (max ${maxAgeSeconds})`,
        details: {
          confirmed: true,
          recipient: '',
          amount: 0,
          blockTime: tx.blockTime ?? null,
          age
        }
      };
    }

    // If this is a SOL transfer (no token mint specified)
    if (!expectedTokenMint) {
      // Check SOL transfers in postBalances
      const accountKeys = tx.transaction.message.accountKeys;
      const recipientIndex = accountKeys.findIndex(
        key => key.pubkey.toBase58() === expectedRecipient
      );

      if (recipientIndex === -1) {
        return {
          success: false,
          message: 'Recipient not found in transaction'
        };
      }

      const preBalance = tx.meta.preBalances[recipientIndex] || 0;
      const postBalance = tx.meta.postBalances[recipientIndex] || 0;
      const actualAmount = (postBalance - preBalance) / LAMPORTS_PER_SOL;

      // Allow 0.001 SOL tolerance for fees
      if (Math.abs(actualAmount - expectedAmount) > 0.001) {
        return {
          success: false,
          message: `Amount mismatch: expected ${expectedAmount} SOL, got ${actualAmount} SOL`,
          details: {
            confirmed: true,
            recipient: expectedRecipient,
            amount: actualAmount,
            blockTime: tx.blockTime ?? null,
            age
          }
        };
      }

      return {
        success: true,
        message: 'Transaction verified successfully',
        details: {
          confirmed: true,
          recipient: expectedRecipient,
          amount: actualAmount,
          blockTime: tx.blockTime ?? null,
          age
        }
      };
    }

    // SPL Token transfer verification
    const instructions = tx.transaction.message.instructions;

    // Find token transfer instruction
    let transferFound = false;
    let actualAmount = 0;
    let actualRecipient = '';
    let actualTokenMint = '';

    for (const ix of instructions) {
      if ('parsed' in ix && ix.program === 'spl-token' && ix.parsed.type === 'transfer') {
        const info = ix.parsed.info;
        actualAmount = Number(info.amount) || 0;
        actualRecipient = info.destination || '';

        // Get token mint from account info
        const destinationAccountInfo = await connection.getParsedAccountInfo(
          new PublicKey(actualRecipient)
        );

        if (destinationAccountInfo.value?.data && 'parsed' in destinationAccountInfo.value.data) {
          actualTokenMint = destinationAccountInfo.value.data.parsed.info.mint;
        }

        transferFound = true;
        break;
      }
    }

    if (!transferFound) {
      return {
        success: false,
        message: 'No token transfer instruction found in transaction'
      };
    }

    // 4. Verify token mint
    if (actualTokenMint !== expectedTokenMint) {
      return {
        success: false,
        message: `Token mint mismatch: expected ${expectedTokenMint}, got ${actualTokenMint}`,
        details: {
          confirmed: true,
          recipient: actualRecipient,
          amount: actualAmount,
          tokenMint: actualTokenMint,
          blockTime: tx.blockTime ?? null,
          age
        }
      };
    }

    // 5. Verify recipient (get associated token account owner)
    const recipientAccountInfo = await connection.getParsedAccountInfo(
      new PublicKey(actualRecipient)
    );

    let recipientOwner = '';
    if (recipientAccountInfo.value?.data && 'parsed' in recipientAccountInfo.value.data) {
      recipientOwner = recipientAccountInfo.value.data.parsed.info.owner;
    }

    if (recipientOwner !== expectedRecipient && actualRecipient !== expectedRecipient) {
      return {
        success: false,
        message: `Recipient mismatch: expected ${expectedRecipient}, got ${recipientOwner}`,
        details: {
          confirmed: true,
          recipient: recipientOwner,
          amount: actualAmount,
          tokenMint: actualTokenMint,
          blockTime: tx.blockTime ?? null,
          age
        }
      };
    }

    // 6. Get token decimals and verify amount
    const mintInfo = await connection.getParsedAccountInfo(new PublicKey(expectedTokenMint));
    const decimals = mintInfo.value?.data && 'parsed' in mintInfo.value.data
      ? mintInfo.value.data.parsed.info.decimals
      : 6;

    const actualAmountDecimal = actualAmount / Math.pow(10, decimals);
    const tolerance = 0.01; // 1% tolerance

    if (Math.abs(actualAmountDecimal - expectedAmount) > expectedAmount * tolerance) {
      return {
        success: false,
        message: `Amount mismatch: expected ${expectedAmount}, got ${actualAmountDecimal}`,
        details: {
          confirmed: true,
          recipient: recipientOwner || actualRecipient,
          amount: actualAmountDecimal,
          tokenMint: actualTokenMint,
          blockTime: tx.blockTime ?? null,
          age
        }
      };
    }

    // All checks passed
    return {
      success: true,
      message: 'Transaction verified successfully',
      details: {
        confirmed: true,
        recipient: recipientOwner || actualRecipient,
        amount: actualAmountDecimal,
        tokenMint: actualTokenMint,
        blockTime: tx.blockTime ?? null,
        age
      }
    };

  } catch (error) {
    logger.error({ error, signature }, 'Detailed transaction verification failed');
    return {
      success: false,
      message: `Verification error: ${(error as Error).message}`
    };
  }
}

/**
 * Get token balance for a wallet
 *
 * @param walletAddress - Wallet public key
 * @param tokenMint - Token mint address
 * @returns Token balance
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<number> {
  try {
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(tokenMint);

    const tokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey
    );

    const balance = await connection.getTokenAccountBalance(tokenAccount);

    return Number(balance.value.amount) / Math.pow(10, balance.value.decimals);
  } catch (error) {
    logger.error({ error, walletAddress, tokenMint }, 'Failed to get token balance');
    return 0;
  }
}

/**
 * Get SOL balance for a wallet
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const pubkey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    logger.error({ error, walletAddress }, 'Failed to get SOL balance');
    return 0;
  }
}

/**
 * Transfer SPL tokens
 *
 * @param fromWallet - Sender wallet (Keypair)
 * @param toAddress - Recipient address
 * @param tokenMint - Token mint address
 * @param amount - Amount to transfer
 * @returns Transaction signature
 */
export async function transferTokens(
  fromWallet: Keypair,
  toAddress: string,
  tokenMint: string,
  amount: number
): Promise<string> {
  try {
    const toPubkey = new PublicKey(toAddress);
    const mintPubkey = new PublicKey(tokenMint);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      fromWallet.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      toPubkey
    );

    // Get token decimals
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 6;

    // Create transfer instruction
    const transferAmount = amount * Math.pow(10, decimals);
    const transferInstruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromWallet.publicKey,
      transferAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet]
    );

    logger.info({
      from: fromWallet.publicKey.toBase58(),
      to: toAddress,
      amount,
      tokenMint,
      signature
    }, 'Token transfer successful');

    return signature;
  } catch (error) {
    logger.error({ error, toAddress, tokenMint, amount }, 'Token transfer failed');
    throw new Error('Token transfer failed');
  }
}

/**
 * Transfer tokens from platform wallet
 */
export async function transferFromPlatform(
  toAddress: string,
  tokenMint: string,
  amount: number
): Promise<string> {
  if (!platformWallet) {
    throw new Error('Platform wallet not initialized');
  }

  return transferTokens(platformWallet, toAddress, tokenMint, amount);
}

/**
 * Transfer USDT from platform wallet to user
 */
export async function transferUSDTReward(
  toAddress: string,
  amount: number
): Promise<string> {
  const usdtMint = process.env.USDT_TOKEN_MINT;

  if (!usdtMint) {
    throw new Error('USDT token mint address not configured');
  }

  logger.info({ toAddress, amount }, 'Transferring USDT reward');
  return transferFromPlatform(toAddress, usdtMint, amount);
}

/**
 * Transfer TAKARA from platform wallet to user
 */
export async function transferTAKARAReward(
  toAddress: string,
  amount: number
): Promise<string> {
  const takaraMint = process.env.TAKARA_TOKEN_MINT;

  if (!takaraMint) {
    throw new Error('TAKARA token mint address not configured');
  }

  logger.info({ toAddress, amount }, 'Transferring TAKARA reward');
  return transferFromPlatform(toAddress, takaraMint, amount);
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate message for wallet signature
 *
 * @param nonce - Random nonce
 * @returns Message to sign
 */
export function generateSignatureMessage(nonce: string): string {
  return `Sign this message to authenticate with Takara Gold.\n\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
}

/**
 * Get transaction fee estimate
 */
export async function getTransactionFee(): Promise<number> {
  try {
    const { feeCalculator } = await connection.getRecentBlockhash();
    return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
  } catch (error) {
    logger.error({ error }, 'Failed to get transaction fee');
    return 0.000005; // Default estimate
  }
}

/**
 * Check if wallet has enough balance for transaction
 */
export async function hasEnoughBalance(
  walletAddress: string,
  tokenMint: string,
  requiredAmount: number
): Promise<boolean> {
  const balance = await getTokenBalance(walletAddress, tokenMint);
  return balance >= requiredAmount;
}

// Initialize platform wallet on module load
initializePlatformWallet();

export default {
  verifyWalletSignature,
  verifyTransaction,
  verifyTransactionDetails,
  getTokenBalance,
  getSolBalance,
  transferTokens,
  transferFromPlatform,
  transferUSDTReward,
  transferTAKARAReward,
  isValidSolanaAddress,
  generateSignatureMessage,
  getTransactionFee,
  hasEnoughBalance,
  connection
};
