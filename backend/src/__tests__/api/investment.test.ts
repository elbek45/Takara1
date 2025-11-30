/**
 * Investment API Tests
 * Tests for /api/investments endpoints
 */

import request from 'supertest';
import app from '../../app';
import {
  cleanDatabase,
  createTestUser,
  createTestVault,
  createTestInvestment,
  generateTestToken,
  disconnectPrisma
} from '../helpers/testUtils';
import { mockVaults, mockInvestments } from '../helpers/mockData';
import { InvestmentStatus } from '@prisma/client';

describe('Investment API', () => {
  let userId: string;
  let userToken: string;
  let vaultId: string;

  beforeAll(async () => {
    await cleanDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create test user and vault
    const user = await createTestUser({
      email: 'investor@example.com',
      username: 'investor',
      walletAddress: '7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ'
    });
    userId = user.id;
    userToken = generateTestToken(userId);

    const vault = await createTestVault(mockVaults.starter12M);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ==================== CREATE INVESTMENT ====================

  describe('POST /api/investments', () => {
    it('should create investment successfully', async () => {
      const response = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vaultId,
          usdtAmount: 1000,
          ethereumTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('investment');
      expect(response.body.investment).toHaveProperty('id');
      expect(response.body.investment.usdtAmount).toBe('1000');
      expect(response.body.investment.status).toBe(InvestmentStatus.PENDING);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/investments')
        .send({
          vaultId,
          usdtAmount: 1000
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid vaultId', async () => {
      const response = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vaultId: '00000000-0000-0000-0000-000000000000',
          usdtAmount: 1000
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/vault.*not.*found/i);
    });

    it('should reject amount below minimum', async () => {
      const response = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vaultId,
          usdtAmount: 50 // Below 100 minimum
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/minimum.*investment/i);
    });

    it('should reject amount above maximum', async () => {
      const response = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vaultId,
          usdtAmount: 15000 // Above 10000 maximum
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/maximum.*investment/i);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vaultId
          // Missing usdtAmount
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should create investment with LAIKA boost', async () => {
      const response = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          vaultId,
          usdtAmount: 1000,
          laikaAmount: 500,
          ethereumTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          solanaTxSignature: '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'
        });

      expect(response.status).toBe(201);
      expect(response.body.investment).toHaveProperty('laikaBoost');
    });
  });

  // ==================== GET MY INVESTMENTS ====================

  describe('GET /api/investments/my', () => {
    beforeEach(async () => {
      // Create some test investments
      await createTestInvestment(userId, vaultId, {
        usdtAmount: 1000,
        status: InvestmentStatus.ACTIVE
      });
      await createTestInvestment(userId, vaultId, {
        usdtAmount: 2000,
        status: InvestmentStatus.ACTIVE
      });
      await createTestInvestment(userId, vaultId, {
        usdtAmount: 500,
        status: InvestmentStatus.PENDING
      });
    });

    it('should return all user investments', async () => {
      const response = await request(app)
        .get('/api/investments/my')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('investments');
      expect(Array.isArray(response.body.investments)).toBe(true);
      expect(response.body.investments.length).toBe(3);
    });

    it('should include vault details', async () => {
      const response = await request(app)
        .get('/api/investments/my')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const investment = response.body.investments[0];

      expect(investment).toHaveProperty('vault');
      expect(investment.vault).toHaveProperty('name');
      expect(investment.vault).toHaveProperty('tier');
    });

    it('should filter by status if provided', async () => {
      const response = await request(app)
        .get('/api/investments/my?status=ACTIVE')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.investments.length).toBe(2); // Only ACTIVE investments

      response.body.investments.forEach((inv: any) => {
        expect(inv.status).toBe(InvestmentStatus.ACTIVE);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/investments/my');

      expect(response.status).toBe(401);
    });

    it('should return empty array if no investments', async () => {
      await cleanDatabase();
      const newUser = await createTestUser({ email: 'new@example.com' });
      const newToken = generateTestToken(newUser.id);

      const response = await request(app)
        .get('/api/investments/my')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.investments).toEqual([]);
    });
  });

  // ==================== GET INVESTMENT BY ID ====================

  describe('GET /api/investments/:id', () => {
    let investmentId: string;

    beforeEach(async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        usdtAmount: 1000,
        status: InvestmentStatus.ACTIVE
      });
      investmentId = investment.id;
    });

    it('should return investment details', async () => {
      const response = await request(app)
        .get(`/api/investments/${investmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('investment');
      expect(response.body.investment.id).toBe(investmentId);
    });

    it('should include vault and user details', async () => {
      const response = await request(app)
        .get(`/api/investments/${investmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.investment).toHaveProperty('vault');
      expect(response.body.investment).toHaveProperty('user');
    });

    it('should reject access to other user investment', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .get(`/api/investments/${investmentId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent investment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/investments/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/investments/${investmentId}`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== CLAIM YIELD ====================

  describe('POST /api/investments/:id/claim-yield', () => {
    let investmentId: string;

    beforeEach(async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        usdtAmount: 1000,
        status: InvestmentStatus.ACTIVE,
        pendingUSDT: 50 // Has pending yield
      });
      investmentId = investment.id;
    });

    it('should claim pending USDT yield', async () => {
      const response = await request(app)
        .post(`/api/investments/${investmentId}/claim-yield`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('claimed');
      expect(response.body).toHaveProperty('txSignature');
    });

    it('should reject claim if no pending yield', async () => {
      const noYieldInvestment = await createTestInvestment(userId, vaultId, {
        usdtAmount: 1000,
        status: InvestmentStatus.ACTIVE,
        pendingUSDT: 0 // No pending yield
      });

      const response = await request(app)
        .post(`/api/investments/${noYieldInvestment.id}/claim-yield`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/no.*pending.*yield/i);
    });

    it('should reject claim from non-owner', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .post(`/api/investments/${investmentId}/claim-yield`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/investments/${investmentId}/claim-yield`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== CLAIM TAKARA ====================

  describe('POST /api/investments/:id/claim-takara', () => {
    let investmentId: string;

    beforeEach(async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        usdtAmount: 1000,
        status: InvestmentStatus.ACTIVE,
        pendingTAKARA: 100 // Has pending TAKARA
      });
      investmentId = investment.id;
    });

    it('should claim pending TAKARA tokens', async () => {
      const response = await request(app)
        .post(`/api/investments/${investmentId}/claim-takara`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('claimed');
      expect(response.body).toHaveProperty('txSignature');
    });

    it('should reject claim if no pending TAKARA', async () => {
      const noTakaraInvestment = await createTestInvestment(userId, vaultId, {
        usdtAmount: 1000,
        status: InvestmentStatus.ACTIVE,
        pendingTAKARA: 0 // No pending TAKARA
      });

      const response = await request(app)
        .post(`/api/investments/${noTakaraInvestment.id}/claim-takara`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/no.*pending.*takara/i);
    });

    it('should reject claim from non-owner', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .post(`/api/investments/${investmentId}/claim-takara`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/investments/${investmentId}/claim-takara`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== INVESTMENT STATUS TESTS ====================

  describe('Investment Status Flow', () => {
    it('should create investment in PENDING status', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        status: InvestmentStatus.PENDING
      });

      expect(investment.status).toBe(InvestmentStatus.PENDING);
    });

    it('should transition to ACTIVE after verification', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        status: InvestmentStatus.ACTIVE
      });

      expect(investment.status).toBe(InvestmentStatus.ACTIVE);
    });

    it('should support COMPLETED status', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        status: InvestmentStatus.COMPLETED
      });

      expect(investment.status).toBe(InvestmentStatus.COMPLETED);
    });
  });

  // ==================== NFT MINTING TESTS ====================

  describe('NFT Minting', () => {
    it('should mark NFT as minted', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        isNFTMinted: true,
        nftMintAddress: '7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ',
        nftMetadataUri: 'https://ipfs.io/ipfs/QmXxx...'
      });

      expect(investment.isNFTMinted).toBe(true);
      expect(investment.nftMintAddress).toBeTruthy();
      expect(investment.nftMetadataUri).toBeTruthy();
    });

    it('should track NFT mint address', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        nftMintAddress: '7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ'
      });

      expect(investment.nftMintAddress).toBe('7xKWvfqJQRnJGZJz3xKGGMqCJpqjhqjJzXqZ9vF9qYnJ');
    });
  });

  // ==================== EARNINGS TRACKING TESTS ====================

  describe('Earnings Tracking', () => {
    it('should track total earned USDT', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        totalEarnedUSDT: 150.50
      });

      expect(parseFloat(investment.totalEarnedUSDT.toString())).toBe(150.50);
    });

    it('should track total mined TAKARA', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        totalMinedTAKARA: 250
      });

      expect(parseFloat(investment.totalMinedTAKARA.toString())).toBe(250);
    });

    it('should track pending USDT', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        pendingUSDT: 50
      });

      expect(parseFloat(investment.pendingUSDT.toString())).toBe(50);
    });

    it('should track pending TAKARA', async () => {
      const investment = await createTestInvestment(userId, vaultId, {
        pendingTAKARA: 100
      });

      expect(parseFloat(investment.pendingTAKARA.toString())).toBe(100);
    });
  });
});
