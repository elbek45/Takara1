/**
 * Live Blockchain Transaction Tests
 * Tests REAL transactions on Solana Testnet
 *
 * ⚠️ WARNING: These tests create REAL transactions and cost testnet SOL
 *
 * Prerequisites:
 * 1. Run: npm run testnet:setup
 * 2. Get testnet SOL from https://faucet.solana.com (min 2 SOL)
 * 3. Set PLATFORM_WALLET_PRIVATE_KEY in .env.testnet
 *
 * Run with:
 * TEST_BLOCKCHAIN_LIVE=true npm test -- --testPathPattern=blockchain-live
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import bs58 from 'bs58';
import { verifyTransaction, verifyTransactionDetails } from '../../services/solana.service';

const TESTNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com';
const connection = new Connection(TESTNET_RPC, 'confirmed');

// Only run these tests if explicitly enabled
const describeBlockchainLive = process.env.TEST_BLOCKCHAIN_LIVE === 'true' ? describe : describe.skip;

describeBlockchainLive('Live Blockchain Transaction Tests', () => {
  let platformWallet: Keypair;
  let testRecipient: Keypair;
  const TRANSFER_AMOUNT = 0.01; // 0.01 SOL for testing

  beforeAll(async () => {
    // Load platform wallet
    const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PLATFORM_WALLET_PRIVATE_KEY not set. Run: npm run testnet:setup');
    }

    try {
      const decoded = Buffer.from(privateKey, 'base64');
      platformWallet = Keypair.fromSecretKey(decoded);
      console.log('Platform wallet loaded:', platformWallet.publicKey.toBase58());
    } catch (error) {
      throw new Error('Failed to load platform wallet: ' + (error as Error).message);
    }

    // Generate recipient wallet for testing
    testRecipient = Keypair.generate();
    console.log('Test recipient generated:', testRecipient.publicKey.toBase58());

    // Check platform wallet balance
    const balance = await connection.getBalance(platformWallet.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    console.log('Platform wallet balance:', balanceSOL.toFixed(4), 'SOL');

    if (balanceSOL < 0.1) {
      throw new Error('Insufficient balance: ' + balanceSOL + ' SOL. Need at least 0.1 SOL for tests.');
    }
  });

  describe('SOL Transfers', () => {
    let transferSignature: string;

    it('should send SOL from platform wallet to recipient', async () => {
      const lamportsToSend = TRANSFER_AMOUNT * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformWallet.publicKey,
          toPubkey: testRecipient.publicKey,
          lamports: lamportsToSend
        })
      );

      console.log('Sending', TRANSFER_AMOUNT, 'SOL to', testRecipient.publicKey.toBase58());

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [platformWallet],
        {
          commitment: 'confirmed'
        }
      );

      transferSignature = signature;
      console.log('Transaction confirmed:', signature);

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout

    it('should verify the transfer transaction', async () => {
      if (!transferSignature) {
        throw new Error('No transfer signature from previous test');
      }

      // Wait for transaction to be indexed (testnet can be slow)
      console.log('Waiting for transaction to be indexed on testnet...');
      await new Promise(resolve => setTimeout(resolve, 7000));

      // Retry mechanism for testnet indexing delays
      let result = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!result && attempts < maxAttempts) {
        attempts++;
        console.log('Verification attempt', attempts, 'of', maxAttempts);
        result = await verifyTransaction(transferSignature);

        if (!result && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      expect(result).not.toBeNull();
      expect(result?.confirmed).toBe(true);
      expect(result?.blockTime).toBeTruthy();

      console.log('Transaction verified on-chain');
      console.log('Block time:', new Date((result!.blockTime || 0) * 1000).toISOString());
      console.log('Slot:', result!.slot);
    }, 60000); // Increase timeout to 60 seconds

    it('should verify transfer with detailed validation', async () => {
      if (!transferSignature) {
        throw new Error('No transfer signature from previous test');
      }

      // Wait a bit (we just verified in previous test)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await verifyTransactionDetails({
        signature: transferSignature,
        expectedRecipient: testRecipient.publicKey.toBase58(),
        expectedAmount: TRANSFER_AMOUNT,
        maxAgeSeconds: 600 // 10 minutes
      });

      if (!result.success) {
        console.log('Detailed verification failed:', result.message);
      }

      expect(result.success).toBe(true);
      expect(result.details?.confirmed).toBe(true);
      expect(result.details?.recipient).toBe(testRecipient.publicKey.toBase58());
      expect(result.details?.amount).toBeCloseTo(TRANSFER_AMOUNT, 3);

      console.log('Detailed verification passed');
      console.log('Recipient:', result.details?.recipient);
      console.log('Amount:', result.details?.amount, 'SOL');
      console.log('Age:', result.details?.age, 'seconds');
    }, 30000);

    it('should check recipient balance after transfer', async () => {
      const balance = await connection.getBalance(testRecipient.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      expect(balanceSOL).toBeGreaterThan(0);
      expect(balanceSOL).toBeCloseTo(TRANSFER_AMOUNT, 3);

      console.log('Recipient balance:', balanceSOL.toFixed(4), 'SOL');
    });
  });

  describe('Transaction Error Handling', () => {
    it('should reject transaction verification with wrong recipient', async () => {
      // Create a test transaction first
      const lamportsToSend = 0.001 * LAMPORTS_PER_SOL;
      const wrongRecipient = Keypair.generate();

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformWallet.publicKey,
          toPubkey: testRecipient.publicKey,
          lamports: lamportsToSend
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [platformWallet],
        { commitment: 'confirmed' }
      );

      // Wait for transaction to be indexed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to verify with wrong recipient
      const result = await verifyTransactionDetails({
        signature,
        expectedRecipient: wrongRecipient.publicKey.toBase58(), // Wrong!
        expectedAmount: 0.001
      });

      expect(result.success).toBe(false);
      // Transaction found but recipient doesn't match
      expect(result.message).toMatch(/Recipient not found|not found/i);

      console.log('Correctly rejected wrong recipient');
      console.log('Error message:', result.message);
    }, 40000);

    it('should reject transaction verification with wrong amount', async () => {
      // Create a test transaction
      const actualAmount = 0.002;
      const lamportsToSend = actualAmount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformWallet.publicKey,
          toPubkey: testRecipient.publicKey,
          lamports: lamportsToSend
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [platformWallet],
        { commitment: 'confirmed' }
      );

      // Wait for transaction to be indexed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to verify with wrong amount
      const result = await verifyTransactionDetails({
        signature,
        expectedRecipient: testRecipient.publicKey.toBase58(),
        expectedAmount: 1.0 // Wrong amount!
      });

      expect(result.success).toBe(false);
      // Transaction found but amount doesn't match
      expect(result.message).toMatch(/Amount mismatch|mismatch/i);

      console.log('Correctly rejected wrong amount');
      console.log('Error message:', result.message);
    }, 40000);
  });

  describe('Account State', () => {
    it('should retrieve account info for funded account', async () => {
      const accountInfo = await connection.getAccountInfo(testRecipient.publicKey);

      expect(accountInfo).not.toBeNull();
      expect(accountInfo?.lamports).toBeGreaterThan(0);
      expect(accountInfo?.owner.toBase58()).toBe('11111111111111111111111111111111'); // System program

      console.log('Account info retrieved');
      console.log('Lamports:', accountInfo?.lamports);
      console.log('Owner:', accountInfo?.owner.toBase58());
    });

    it('should get recent blockhash for new transactions', async () => {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      expect(blockhash).toBeTruthy();
      expect(typeof blockhash).toBe('string');
      expect(lastValidBlockHeight).toBeGreaterThan(0);

      console.log('Latest blockhash:', blockhash.substring(0, 20) + '...');
      console.log('Last valid block height:', lastValidBlockHeight);
    });
  });

  afterAll(async () => {
    // Return leftover funds to platform wallet
    if (testRecipient) {
      try {
        const balance = await connection.getBalance(testRecipient.publicKey);
        if (balance > 5000) { // Keep some for rent
          const returnAmount = balance - 5000;

          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: testRecipient.publicKey,
              toPubkey: platformWallet.publicKey,
              lamports: returnAmount
            })
          );

          await sendAndConfirmTransaction(
            connection,
            transaction,
            [testRecipient],
            { commitment: 'confirmed' }
          );

          console.log('Returned', returnAmount / LAMPORTS_PER_SOL, 'SOL to platform wallet');
        }
      } catch (error) {
        console.log('Could not return funds:', (error as Error).message);
      }
    }

    // Final balance check
    const finalBalance = await connection.getBalance(platformWallet.publicKey);
    console.log('Final platform wallet balance:', (finalBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  });
});
