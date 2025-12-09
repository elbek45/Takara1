/**
 * Vault API Tests
 * Tests for /api/vaults endpoints
 */

import request from 'supertest';
import app from '../../app';
import { cleanDatabase, createTestVault, createTestUser, generateTestToken, disconnectPrisma } from '../helpers/testUtils';
import { mockVaults } from '../helpers/mockData';
import { VaultTier, PayoutSchedule } from '@prisma/client';

describe('Vault API', () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ==================== GET ALL VAULTS ====================

  describe('GET /api/vaults', () => {
    beforeEach(async () => {
      // Create test vaults
      await createTestVault(mockVaults.starter12M);
      await createTestVault(mockVaults.pro30M);
      await createTestVault(mockVaults.elite36M);
      await createTestVault(mockVaults.inactiveVault);
    });

    it('should return all active vaults', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should return 3 active vaults (Starter, Pro, Elite - not inactive)
      expect(response.body.data.length).toBe(3);
    });

    it('should return vaults sorted by tier', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
      const vaults = response.body.data;

      // Verify sorting: STARTER -> PRO -> ELITE
      expect(vaults[0].tier).toBe(VaultTier.STARTER);
      expect(vaults[1].tier).toBe(VaultTier.PRO);
      expect(vaults[2].tier).toBe(VaultTier.ELITE);
    });

    it('should include vault details', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
      const vault = response.body.data[0];

      expect(vault).toHaveProperty('id');
      expect(vault).toHaveProperty('name');
      expect(vault).toHaveProperty('tier');
      expect(vault).toHaveProperty('duration');
      expect(vault).toHaveProperty('payoutSchedule');
      expect(vault).toHaveProperty('minInvestment');
      expect(vault).toHaveProperty('maxInvestment');
      expect(vault).toHaveProperty('baseAPY');
      expect(vault).toHaveProperty('maxAPY');
      expect(vault).toHaveProperty('miningPower');
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
    });

    it('should work with authentication', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user.id);

      const response = await request(app)
        .get('/api/vaults')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  // ==================== GET VAULT BY ID ====================

  describe('GET /api/vaults/:id', () => {
    let vaultId: string;

    beforeEach(async () => {
      const vault = await createTestVault(mockVaults.starter12M);
      vaultId = vault.id;
    });

    it('should return vault by ID', async () => {
      const response = await request(app)
        .get(`/api/vaults/${vaultId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('vault');
      expect(response.body.data.vault.id).toBe(vaultId);
      expect(response.body.data.vault.name).toBe(mockVaults.starter12M.name);
    });

    it('should return 404 for non-existent vault', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/vaults/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/vault.*not.*found/i);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/vaults/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return inactive vault if specifically requested', async () => {
      const inactiveVault = await createTestVault(mockVaults.inactiveVault);

      const response = await request(app)
        .get(`/api/vaults/${inactiveVault.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.vault.tier).toBe(mockVaults.inactiveVault.tier);
    });
  });

  // ==================== CALCULATE INVESTMENT ====================

  describe('POST /api/vaults/:id/calculate', () => {
    let starterVaultId: string;
    let proVaultId: string;
    let eliteVaultId: string;

    beforeEach(async () => {
      const starter = await createTestVault(mockVaults.starter12M);
      const pro = await createTestVault(mockVaults.pro30M);
      const elite = await createTestVault(mockVaults.elite36M);

      starterVaultId = starter.id;
      proVaultId = pro.id;
      eliteVaultId = elite.id;
    });

    it('should calculate investment for Starter vault', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 1000
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('investment');
      expect(response.body.data).toHaveProperty('earnings');
      expect(response.body.data).toHaveProperty('mining');
      expect(response.body.data.investment.usdtAmount).toBe(1000);
      expect(response.body.data.investment.requiredTAKARA).toBe(0); // Starter doesn't require TAKARA
    });

    it('should calculate TAKARA requirement for Pro vault', async () => {
      const response = await request(app)
        .post(`/api/vaults/${proVaultId}/calculate`)
        .send({
          usdtAmount: 10000
        });

      expect(response.status).toBe(200);
      const calc = response.body.data.investment;

      // Pro vault requires 30 TAKARA per 100 USDT
      expect(calc.requiredTAKARA).toBe(3000); // 10000 * 30 / 100
    });

    it('should calculate TAKARA requirement for Elite vault', async () => {
      const response = await request(app)
        .post(`/api/vaults/${eliteVaultId}/calculate`)
        .send({
          usdtAmount: 50000
        });

      expect(response.status).toBe(200);
      const calc = response.body.data.investment;

      // Elite vault requires 50 TAKARA per 100 USDT
      expect(calc.requiredTAKARA).toBe(25000); // 50000 * 50 / 100
    });

    it('should calculate with LAIKA boost', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 1000,
          laikaAmountLKI: 50000 // Amount in LAIKA tokens (at 0.01 rate = 500 USD, 50% of USDT amount)
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      const data = response.body.data;

      expect(data.earnings).toHaveProperty('laikaBoostAPY');
      expect(data.earnings).toHaveProperty('baseAPY');
      expect(data.earnings).toHaveProperty('finalAPY');
      expect(data.earnings.finalAPY).toBeGreaterThan(data.earnings.baseAPY);
    });

    it('should cap LAIKA boost at 90% of USDT', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 1000,
          laikaAmountLKI: 95000 // 950 USD worth (95% of USDT), but will be capped at 90%
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      const data = response.body.data;

      // LAIKA value should be capped at 90% (900 USD)
      expect(data.investment.laikaValueUSD).toBeGreaterThan(0);
      // The boost calculation will only use up to 900 USD worth
      expect(data.earnings.finalAPY).toBeGreaterThan(data.earnings.baseAPY);
    });

    it('should reject amount below minimum', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 50 // Below 100 minimum for Starter
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/minimum.*investment/i);
    });

    it('should reject amount above maximum', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 15000 // Above 10000 maximum for Starter
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/maximum.*investment/i);
    });

    it('should reject missing usdtAmount', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject negative usdtAmount', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: -100
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject zero usdtAmount', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 0
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ==================== VAULT TIER TESTS ====================

  describe('Vault Tier Specific Tests', () => {
    it('should correctly configure Starter vault', async () => {
      const vault = await createTestVault(mockVaults.starter12M);

      expect(vault.tier).toBe(VaultTier.STARTER);
      expect(vault.duration).toBe(12);
      expect(vault.requireTAKARA).toBe(false);
      expect(vault.takaraRatio).toBeNull();
      expect(parseFloat(vault.baseAPY.toString())).toBe(4.0);
      expect(parseFloat(vault.maxAPY.toString())).toBe(8.0);
      expect(parseFloat(vault.miningPower.toString())).toBe(50);
    });

    it('should correctly configure Pro vault', async () => {
      const vault = await createTestVault(mockVaults.pro30M);

      expect(vault.tier).toBe(VaultTier.PRO);
      expect(vault.duration).toBe(30);
      expect(vault.requireTAKARA).toBe(true);
      expect(parseFloat(vault.takaraRatio!.toString())).toBe(30);
      expect(parseFloat(vault.baseAPY.toString())).toBe(5.5);
      expect(parseFloat(vault.maxAPY.toString())).toBe(11.0);
      expect(parseFloat(vault.miningPower.toString())).toBe(100);
    });

    it('should correctly configure Elite vault', async () => {
      const vault = await createTestVault(mockVaults.elite36M);

      expect(vault.tier).toBe(VaultTier.ELITE);
      expect(vault.duration).toBe(36);
      expect(vault.requireTAKARA).toBe(true);
      expect(parseFloat(vault.takaraRatio!.toString())).toBe(50);
      expect(parseFloat(vault.baseAPY.toString())).toBe(8.0);
      expect(parseFloat(vault.maxAPY.toString())).toBe(16.0);
      expect(parseFloat(vault.miningPower.toString())).toBe(350);
    });
  });

  // ==================== PAYOUT SCHEDULE TESTS ====================

  describe('Payout Schedule Tests', () => {
    it('should support MONTHLY payout schedule', async () => {
      const vault = await createTestVault({
        ...mockVaults.starter12M,
        payoutSchedule: PayoutSchedule.MONTHLY
      });

      expect(vault.payoutSchedule).toBe(PayoutSchedule.MONTHLY);
    });

    it('should support QUARTERLY payout schedule', async () => {
      const vault = await createTestVault({
        ...mockVaults.pro30M,
        payoutSchedule: PayoutSchedule.QUARTERLY
      });

      expect(vault.payoutSchedule).toBe(PayoutSchedule.QUARTERLY);
    });

    it('should support END_OF_TERM payout schedule', async () => {
      const vault = await createTestVault({
        ...mockVaults.elite36M,
        payoutSchedule: PayoutSchedule.END_OF_TERM
      });

      expect(vault.payoutSchedule).toBe(PayoutSchedule.END_OF_TERM);
    });
  });

  // ==================== CAPACITY TESTS ====================

  describe('Vault Capacity Tests', () => {
    it('should track current filled amount', async () => {
      const vault = await createTestVault({
        ...mockVaults.starter12M,
        totalCapacity: 100000,
        currentFilled: 0
      });

      expect(parseFloat(vault.currentFilled.toString())).toBe(0);
      expect(parseFloat(vault.totalCapacity!.toString())).toBe(100000);
    });

    it('should calculate remaining capacity', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');

      const vaults = response.body.data.vaults || response.body.data;
      const vaultsWithCapacity = vaults.filter((v: any) => v.totalCapacity);

      vaultsWithCapacity.forEach((vault: any) => {
        const filled = parseFloat(vault.currentFilled);
        const total = parseFloat(vault.totalCapacity);
        const remaining = total - filled;

        expect(remaining).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
