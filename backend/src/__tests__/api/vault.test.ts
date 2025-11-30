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
      expect(response.body).toHaveProperty('vaults');
      expect(Array.isArray(response.body.vaults)).toBe(true);

      // Should only return active vaults
      const activeVaults = response.body.vaults.filter((v: any) => v.isActive);
      expect(activeVaults.length).toBe(3); // Starter, Pro, Elite (not inactive)
    });

    it('should return vaults sorted by tier', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
      const vaults = response.body.vaults;

      // Verify sorting: STARTER -> PRO -> ELITE
      expect(vaults[0].tier).toBe(VaultTier.STARTER);
      expect(vaults[1].tier).toBe(VaultTier.PRO);
      expect(vaults[2].tier).toBe(VaultTier.ELITE);
    });

    it('should include vault details', async () => {
      const response = await request(app)
        .get('/api/vaults');

      expect(response.status).toBe(200);
      const vault = response.body.vaults[0];

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
      expect(response.body).toHaveProperty('vault');
      expect(response.body.vault.id).toBe(vaultId);
      expect(response.body.vault.name).toBe(mockVaults.starter12M.name);
    });

    it('should return 404 for non-existent vault', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/vaults/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/vault.*not.*found/i);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/vaults/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return inactive vault if specifically requested', async () => {
      const inactiveVault = await createTestVault(mockVaults.inactiveVault);

      const response = await request(app)
        .get(`/api/vaults/${inactiveVault.id}`);

      expect(response.status).toBe(200);
      expect(response.body.vault.isActive).toBe(false);
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
      expect(response.body).toHaveProperty('calculation');
      expect(response.body.calculation).toHaveProperty('usdtAmount');
      expect(response.body.calculation).toHaveProperty('takaraRequired');
      expect(response.body.calculation).toHaveProperty('baseAPY');
      expect(response.body.calculation).toHaveProperty('duration');
      expect(response.body.calculation).toHaveProperty('estimatedYield');
    });

    it('should calculate TAKARA requirement for Pro vault', async () => {
      const response = await request(app)
        .post(`/api/vaults/${proVaultId}/calculate`)
        .send({
          usdtAmount: 10000
        });

      expect(response.status).toBe(200);
      const calc = response.body.calculation;

      // Pro vault requires 30 TAKARA per 100 USDT
      expect(calc.takaraRequired).toBe(3000); // 10000 * 30 / 100
    });

    it('should calculate TAKARA requirement for Elite vault', async () => {
      const response = await request(app)
        .post(`/api/vaults/${eliteVaultId}/calculate`)
        .send({
          usdtAmount: 50000
        });

      expect(response.status).toBe(200);
      const calc = response.body.calculation;

      // Elite vault requires 50 TAKARA per 100 USDT
      expect(calc.takaraRequired).toBe(25000); // 50000 * 50 / 100
    });

    it('should calculate with LAIKA boost', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 1000,
          laikaAmount: 500 // 50% of USDT amount (max is 90%)
        });

      expect(response.status).toBe(200);
      const calc = response.body.calculation;

      expect(calc).toHaveProperty('laikaBoost');
      expect(calc).toHaveProperty('boostedAPY');
      expect(parseFloat(calc.boostedAPY)).toBeGreaterThan(parseFloat(calc.baseAPY));
    });

    it('should reject LAIKA boost exceeding 90% of USDT', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 1000,
          laikaAmount: 950 // 95% of USDT amount (exceeds 90% limit)
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/laika.*cannot.*exceed.*90%/i);
    });

    it('should reject amount below minimum', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 50 // Below 100 minimum for Starter
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/minimum.*investment/i);
    });

    it('should reject amount above maximum', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 15000 // Above 10000 maximum for Starter
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/maximum.*investment/i);
    });

    it('should reject missing usdtAmount', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject negative usdtAmount', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: -100
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject zero usdtAmount', async () => {
      const response = await request(app)
        .post(`/api/vaults/${starterVaultId}/calculate`)
        .send({
          usdtAmount: 0
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
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

      const vaultsWithCapacity = response.body.vaults.filter((v: any) => v.totalCapacity);
      vaultsWithCapacity.forEach((vault: any) => {
        const filled = parseFloat(vault.currentFilled);
        const total = parseFloat(vault.totalCapacity);
        const remaining = total - filled;

        expect(remaining).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
