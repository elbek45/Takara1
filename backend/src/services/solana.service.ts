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
import pino from 'pino';

const logger = pino({ name: 'solana-service' });

// Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

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
      blockTime: tx.blockTime,
      slot: tx.slot
    };
  } catch (error) {
    logger.error({ error, signature }, 'Transaction verification failed');
    return null;
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
  getTokenBalance,
  getSolBalance,
  transferTokens,
  transferFromPlatform,
  isValidSolanaAddress,
  generateSignatureMessage,
  getTransactionFee,
  hasEnoughBalance,
  connection
};
