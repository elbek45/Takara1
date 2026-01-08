/**
 * Test Utilities
 * Helper functions for testing
 */

import { PrismaClient, User, Vault, Investment, UserRole, VaultTier, PayoutSchedule, Prisma } from '@prisma/client';
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
    prisma.claimRequest.deleteMany(), // Must be deleted before investments
    prisma.investment.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.taxRecord.deleteMany(),
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
  const defaultUser: any = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    password: await bcrypt.hash('TestPassword123!', 10),
    walletAddress: null,
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
export async function createTestVault(overrides?: any): Promise<Vault> {
  const defaultVault: any = {
    name: `Test Vault ${Date.now()}`,
    tier: VaultTier.STARTER,
    duration: 12,
    payoutSchedule: PayoutSchedule.MONTHLY,
    minInvestment: new Prisma.Decimal(100),
    maxInvestment: new Prisma.Decimal(10000),
    requireTAKARA: false,
    baseAPY: 4.0,
    maxAPY: 8.0,
    baseTakaraAPY: new Prisma.Decimal(50),
    maxTakaraAPY: new Prisma.Decimal(100),
    isActive: true,
    currentFilled: new Prisma.Decimal(0),
    ...overrides,
  };

  // Convert number overrides to Decimal
  if (overrides?.minInvestment !== undefined && typeof overrides.minInvestment === 'number') {
    defaultVault.minInvestment = new Prisma.Decimal(overrides.minInvestment);
  }
  if (overrides?.maxInvestment !== undefined && typeof overrides.maxInvestment === 'number') {
    defaultVault.maxInvestment = new Prisma.Decimal(overrides.maxInvestment);
  }
  if (overrides?.currentFilled !== undefined && typeof overrides.currentFilled === 'number') {
    defaultVault.currentFilled = new Prisma.Decimal(overrides.currentFilled);
  }
  if (overrides?.totalCapacity !== undefined && typeof (overrides as any).totalCapacity === 'number') {
    defaultVault.totalCapacity = new Prisma.Decimal((overrides as any).totalCapacity);
  }

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
  overrides?: any
): Promise<Investment> {
  const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
  if (!vault) throw new Error('Vault not found');

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + vault.duration);

  const defaultInvestment: any = {
    userId,
    vaultId,
    usdtAmount: new Prisma.Decimal(1000),
    takaraRequired: new Prisma.Decimal(0),
    takaraLocked: new Prisma.Decimal(0),
    finalAPY: vault.baseAPY,
    startDate: new Date(),
    endDate,
    status: 'ACTIVE' as any,
    isNFTMinted: false,
    ...overrides,
  };

  // Convert number overrides to Decimal
  if (overrides?.usdtAmount !== undefined && typeof overrides.usdtAmount === 'number') {
    defaultInvestment.usdtAmount = new Prisma.Decimal(overrides.usdtAmount);
  }
  if (overrides?.takaraRequired !== undefined && typeof overrides.takaraRequired === 'number') {
    defaultInvestment.takaraRequired = new Prisma.Decimal(overrides.takaraRequired);
  }
  if (overrides?.takaraLocked !== undefined && typeof overrides.takaraLocked === 'number') {
    defaultInvestment.takaraLocked = new Prisma.Decimal(overrides.takaraLocked);
  }
  if ((overrides as any)?.pendingUSDT !== undefined && typeof (overrides as any).pendingUSDT === 'number') {
    defaultInvestment.pendingUSDT = new Prisma.Decimal((overrides as any).pendingUSDT);
  }
  if ((overrides as any)?.pendingTAKARA !== undefined && typeof (overrides as any).pendingTAKARA === 'number') {
    defaultInvestment.pendingTAKARA = new Prisma.Decimal((overrides as any).pendingTAKARA);
  }
  if ((overrides as any)?.totalEarnedUSDT !== undefined && typeof (overrides as any).totalEarnedUSDT === 'number') {
    defaultInvestment.totalEarnedUSDT = new Prisma.Decimal((overrides as any).totalEarnedUSDT);
  }
  if ((overrides as any)?.totalMinedTAKARA !== undefined && typeof (overrides as any).totalMinedTAKARA === 'number') {
    defaultInvestment.totalMinedTAKARA = new Prisma.Decimal((overrides as any).totalMinedTAKARA);
  }

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
