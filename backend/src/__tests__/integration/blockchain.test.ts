/**
 * Blockchain Integration Tests
 * Tests real Solana blockchain interactions on testnet
 * 
 * Setup required:
 * 1. Run: npm run testnet:setup
 * 2. Request testnet SOL from https://faucet.solana.com
 * 3. Set PLATFORM_WALLET_PRIVATE_KEY in .env.testnet
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  verifyWalletSignature,
  generateSignatureMessage,
  isValidSolanaAddress,
  verifyTransaction,
  verifyTransactionDetails
} from '../../services/solana.service';

const TESTNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com';
const connection = new Connection(TESTNET_RPC, 'confirmed');

// Skip these tests if not in blockchain testing mode
const describeBlockchain = process.env.TEST_BLOCKCHAIN === 'true' ? describe : describe.skip;

describeBlockchain('Blockchain Integration Tests', () => {
  let testWallet: Keypair;
  let platformWallet: Keypair;

  beforeAll(async () => {
    // Generate test wallet
    testWallet = Keypair.generate();
    
    // Load platform wallet from env (if available)
    const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
    if (privateKey) {
      try {
        const decoded = Buffer.from(privateKey, 'base64');
        platformWallet = Keypair.fromSecretKey(decoded);
        console.log('Platform wallet loaded:', platformWallet.publicKey.toBase58());
      } catch (error) {
        console.warn('Could not load platform wallet, some tests will be skipped');
      }
    }
  });

  describe('Solana Connection', () => {
    it('should connect to Solana testnet', async () => {
      const version = await connection.getVersion();
      expect(version).toBeDefined();
      expect(version['solana-core']).toBeTruthy();
    });

    it('should get current slot', async () => {
      const slot = await connection.getSlot();
      expect(slot).toBeGreaterThan(0);
    });

    it('should get recent blockhash', async () => {
      const { blockhash } = await connection.getLatestBlockhash();
      expect(blockhash).toBeTruthy();
      expect(typeof blockhash).toBe('string');
    });
  });

  describe('Wallet Address Validation', () => {
    it('should validate correct Solana address', () => {
      const validAddress = testWallet.publicKey.toBase58();
      expect(isValidSolanaAddress(validAddress)).toBe(true);
    });

    it('should reject invalid Solana address', () => {
      expect(isValidSolanaAddress('invalid-address')).toBe(false);
      expect(isValidSolanaAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1')).toBe(false);
      expect(isValidSolanaAddress('')).toBe(false);
    });

    it('should reject too short address', () => {
      expect(isValidSolanaAddress('ABC123')).toBe(false);
    });
  });

  describe('Wallet Signature Verification', () => {
    it('should verify valid wallet signature', () => {
      const message = generateSignatureMessage('test-nonce-123');
      const messageBytes = new TextEncoder().encode(message);
      const signature = nacl.sign.detached(messageBytes, testWallet.secretKey);
      const signatureBase58 = bs58.encode(signature);

      const isValid = verifyWalletSignature(
        testWallet.publicKey.toBase58(),
        signatureBase58,
        message
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const message = generateSignatureMessage('test-nonce-456');
      const wrongSignature = 'invalid-signature-base58';
      
      const isValid = verifyWalletSignature(
        testWallet.publicKey.toBase58(),
        wrongSignature,
        message
      );
      
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong message', () => {
      const message1 = generateSignatureMessage('nonce-1');
      const message2 = generateSignatureMessage('nonce-2');

      const messageBytes = new TextEncoder().encode(message1);
      const signature = nacl.sign.detached(messageBytes, testWallet.secretKey);
      const signatureBase58 = bs58.encode(signature);

      const isValid = verifyWalletSignature(
        testWallet.publicKey.toBase58(),
        signatureBase58,
        message2  // Different message
      );

      expect(isValid).toBe(false);
    });

    it('should generate consistent signature messages', () => {
      const nonce = 'test-nonce-789';
      const message1 = generateSignatureMessage(nonce);
      const message2 = generateSignatureMessage(nonce);
      
      expect(message1).toBe(message2);
      expect(message1).toContain(nonce);
      expect(message1).toContain('Takara Gold');
    });
  });

  describe('Account Balance Checks', () => {
    it('should check wallet balance', async () => {
      const balance = await connection.getBalance(testWallet.publicKey);
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    it('should get account info for existing account', async () => {
      if (!platformWallet) {
        console.log('Skipping: Platform wallet not configured');
        return;
      }

      const accountInfo = await connection.getAccountInfo(platformWallet.publicKey);
      // Account might not exist if no SOL has been sent to it
      expect(accountInfo === null || accountInfo.lamports >= 0).toBe(true);
    });
  });

  describe('Transaction Verification (Read-only)', () => {
    it('should verify non-existent transaction returns null', async () => {
      const fakeSignature = 'invalid-signature-that-does-not-exist-on-chain';
      const result = await verifyTransaction(fakeSignature);

      expect(result).toBeNull();
    });

    it('should handle malformed transaction signature', async () => {
      const malformedSig = '123';
      const result = await verifyTransaction(malformedSig);

      expect(result).toBeNull();
    });
  });

  describe('Signature Message Format', () => {
    it('should include nonce in message', () => {
      const nonce = 'abc123xyz';
      const message = generateSignatureMessage(nonce);
      
      expect(message).toContain(nonce);
    });

    it('should include platform name', () => {
      const message = generateSignatureMessage('test');
      
      expect(message.toLowerCase()).toContain('takara');
    });

    it('should be deterministic', () => {
      const nonce = 'same-nonce';
      const msg1 = generateSignatureMessage(nonce);
      const msg2 = generateSignatureMessage(nonce);
      
      expect(msg1).toEqual(msg2);
    });
  });
});
