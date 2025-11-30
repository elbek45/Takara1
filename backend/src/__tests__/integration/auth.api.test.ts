/**
 * Authentication API Integration Tests
 * Tests complete auth flow with database
 */

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/database';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

describe('Authentication API', () => {
  let testWallet: nacl.SignKeyPair;
  let testWalletAddress: string;

  beforeAll(async () => {
    // Generate test wallet
    testWallet = nacl.sign.keyPair();
    testWalletAddress = bs58.encode(testWallet.publicKey);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { walletAddress: testWalletAddress },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/auth/nonce', () => {
    it('should generate nonce for wallet address', async () => {
      const response = await request(app)
        .get('/api/auth/nonce')
        .query({ walletAddress: testWalletAddress });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nonce');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data.nonce).toHaveLength(64); // 32 bytes hex
    });

    it('should reject invalid wallet address', async () => {
      const response = await request(app)
        .get('/api/auth/nonce')
        .query({ walletAddress: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require wallet address', async () => {
      const response = await request(app).get('/api/auth/nonce');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid signature', async () => {
      // Step 1: Get nonce
      const nonceResponse = await request(app)
        .get('/api/auth/nonce')
        .query({ walletAddress: testWalletAddress });

      const { nonce, message } = nonceResponse.body.data;

      // Step 2: Sign message
      const messageBytes = Buffer.from(message, 'utf8');
      const signature = nacl.sign.detached(messageBytes, testWallet.secretKey);
      const signatureBase58 = bs58.encode(signature);

      // Step 3: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          walletAddress: testWalletAddress,
          signature: signatureBase58,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user).toHaveProperty('id');
      expect(loginResponse.body.user.walletAddress).toBe(testWalletAddress);
    });

    it('should create new user on first login', async () => {
      const usersBefore = await prisma.user.count({
        where: { walletAddress: testWalletAddress },
      });

      // Get nonce and sign
      const nonceResponse = await request(app)
        .get('/api/auth/nonce')
        .query({ walletAddress: testWalletAddress });

      const { message } = nonceResponse.body.data;
      const messageBytes = Buffer.from(message, 'utf8');
      const signature = nacl.sign.detached(messageBytes, testWallet.secretKey);
      const signatureBase58 = bs58.encode(signature);

      // Login
      await request(app)
        .post('/api/auth/login')
        .send({
          walletAddress: testWalletAddress,
          signature: signatureBase58,
        });

      const usersAfter = await prisma.user.count({
        where: { walletAddress: testWalletAddress },
      });

      expect(usersAfter).toBe(usersBefore + 1);
    });

    it('should reject without nonce', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          walletAddress: testWalletAddress,
          signature: 'fake-signature',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid signature', async () => {
      // Get nonce
      await request(app)
        .get('/api/auth/nonce')
        .query({ walletAddress: testWalletAddress });

      // Try login with invalid signature
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          walletAddress: testWalletAddress,
          signature: 'invalid-signature',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login to get token
      const nonceResponse = await request(app)
        .get('/api/auth/nonce')
        .query({ walletAddress: testWalletAddress });

      const { message } = nonceResponse.body.data;
      const messageBytes = Buffer.from(message, 'utf8');
      const signature = nacl.sign.detached(messageBytes, testWallet.secretKey);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          walletAddress: testWalletAddress,
          signature: bs58.encode(signature),
        });

      authToken = loginResponse.body.token;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('walletAddress');
      expect(response.body.data).toHaveProperty('totalInvested');
      expect(response.body.data).toHaveProperty('totalEarnedUSDT');
    });

    it('should reject without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
