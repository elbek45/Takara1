/**
 * Test Utilities
 * Helper functions for testing
 */

import { PrismaClient, User, Vault, Investment, UserRole, VaultTier, PayoutSchedule } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Clean up database before/after tests
 */
export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.takaraMining.deleteMany(),
    prisma.laikaBoost.deleteMany(),
    prisma.marketplaceListing.deleteMany(),
    prisma.investment.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.vault.deleteMany(),
    prisma.user.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.miningStats.deleteMany(),
    prisma.systemConfig.deleteMany(),
  ]);
}

/**
 * Create test user
 */
export async function createTestUser(overrides?: Partial<User>): Promise<User> {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    password: await bcrypt.hash('TestPassword123!', 10),
    walletAddress: null,
    ethereumAddress: null,
    role: UserRole.USER,
    isActive: true,
    ...overrides,
  };

  return await prisma.user.create({
    data: defaultUser,
  });
}

/**
 * Create test admin user
 */
export async function createTestAdminUser(email?: string, role: UserRole = UserRole.ADMIN): Promise<User> {
  return await createTestUser({
    email: email || `admin-${Date.now()}@example.com`,
    username: `admin-${Date.now()}`,
    role,
  });
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(userId: string, role: UserRole = UserRole.USER): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '24h' }
  );
}

/**
 * Generate expired JWT token
 */
export function generateExpiredToken(userId: string): string {
  return jwt.sign(
    { userId, role: UserRole.USER },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '-1h' } // Already expired
  );
}

/**
 * Create test vault
 */
export async function createTestVault(overrides?: Partial<Vault>): Promise<Vault> {
  const defaultVault = {
    name: `Test Vault ${Date.now()}`,
    tier: VaultTier.STARTER,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: 100,
    maxInvestment: 10000,
    requireTAKARA: false,
    baseAPY: 4.0,
    maxAPY: 8.0,
    miningPower: 50,
    isActive: true,
    currentFilled: 0,
    ...overrides,
  };

  return await prisma.vault.create({
    data: defaultVault,
  });
}

/**
 * Create test investment
 */
export async function createTestInvestment(
  userId: string,
  vaultId: string,
  overrides?: Partial<Investment>
): Promise<Investment> {
  const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
  if (!vault) throw new Error('Vault not found');

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + vault.duration);

  const defaultInvestment = {
    userId,
    vaultId,
    usdtAmount: 1000,
    takaraRequired: 0,
    takaraLocked: 0,
    finalAPY: vault.baseAPY,
    startDate: new Date(),
    endDate,
    status: 'ACTIVE' as any,
    isNFTMinted: false,
    ...overrides,
  };

  return await prisma.investment.create({
    data: defaultInvestment,
  });
}

/**
 * Get Prisma client for direct database access in tests
 */
export function getPrismaClient() {
  return prisma;
}

/**
 * Disconnect Prisma (call in afterAll)
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
