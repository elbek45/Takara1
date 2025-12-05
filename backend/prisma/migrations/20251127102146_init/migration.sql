-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "VaultTier" AS ENUM ('STARTER', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "PayoutSchedule" AS ENUM ('MONTHLY', 'QUARTERLY', 'END_OF_TERM');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'WITHDRAWN', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('USDT', 'TAKARA', 'LAIKA');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'LAIKA_DEPOSIT', 'LAIKA_RETURN', 'YIELD_CLAIM', 'TAKARA_CLAIM', 'WITHDRAWAL', 'NFT_SALE', 'NFT_TRANSFER');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalInvested" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalEarnedUSDT" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalMinedTAKARA" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaults" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "VaultTier" NOT NULL,
    "duration" INTEGER NOT NULL,
    "payoutSchedule" "PayoutSchedule" NOT NULL,
    "minInvestment" DECIMAL(20,2) NOT NULL,
    "maxInvestment" DECIMAL(20,2) NOT NULL,
    "requireTAKARA" BOOLEAN NOT NULL DEFAULT false,
    "takaraRatio" DECIMAL(10,2),
    "baseAPY" DECIMAL(5,2) NOT NULL,
    "maxAPY" DECIMAL(5,2) NOT NULL,
    "miningPower" DECIMAL(6,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalCapacity" DECIMAL(20,2),
    "currentFilled" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "usdtAmount" DECIMAL(20,6) NOT NULL,
    "takaraRequired" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "takaraLocked" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "finalAPY" DECIMAL(5,2) NOT NULL,
    "nftMintAddress" TEXT,
    "nftMetadataUri" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "lastClaimDate" TIMESTAMP(3),
    "nextPayoutDate" TIMESTAMP(3),
    "totalEarnedUSDT" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalMinedTAKARA" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "pendingUSDT" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "pendingTAKARA" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING',
    "isNFTMinted" BOOLEAN NOT NULL DEFAULT false,
    "depositTxSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laika_boosts" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "laikaAmount" DECIMAL(20,6) NOT NULL,
    "laikaValueUSD" DECIMAL(20,2) NOT NULL,
    "maxAllowedUSD" DECIMAL(20,2) NOT NULL,
    "boostPercentage" DECIMAL(5,2) NOT NULL,
    "additionalAPY" DECIMAL(5,2) NOT NULL,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "returnDate" TIMESTAMP(3),
    "returnTxSignature" TEXT,
    "depositTxSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laika_boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takara_mining" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "miningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "miningPower" DECIMAL(6,2) NOT NULL,
    "difficulty" DECIMAL(10,6) NOT NULL,
    "takaraMinedRaw" DECIMAL(20,6) NOT NULL,
    "takaraMinedFinal" DECIMAL(20,6) NOT NULL,
    "totalMinedSoFar" DECIMAL(20,6) NOT NULL,
    "activeMiners" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "takara_mining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mining_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMined" DECIMAL(20,6) NOT NULL,
    "activeMiners" INTEGER NOT NULL,
    "currentDifficulty" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mining_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "priceUSDT" DECIMAL(20,6) NOT NULL,
    "originalInvestment" DECIMAL(20,6) NOT NULL,
    "currentValue" DECIMAL(20,6) NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "buyerId" TEXT,
    "soldPrice" DECIMAL(20,6),
    "soldAt" TIMESTAMP(3),
    "saleTxSignature" TEXT,
    "platformFee" DECIMAL(5,2) NOT NULL DEFAULT 2.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "destinationWallet" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "txSignature" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "txSignature" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "totalEarned" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIP" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_walletAddress_idx" ON "users"("walletAddress");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vaults_name_key" ON "vaults"("name");

-- CreateIndex
CREATE INDEX "vaults_tier_idx" ON "vaults"("tier");

-- CreateIndex
CREATE INDEX "vaults_isActive_idx" ON "vaults"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "investments_nftMintAddress_key" ON "investments"("nftMintAddress");

-- CreateIndex
CREATE INDEX "investments_userId_status_idx" ON "investments"("userId", "status");

-- CreateIndex
CREATE INDEX "investments_vaultId_status_idx" ON "investments"("vaultId", "status");

-- CreateIndex
CREATE INDEX "investments_status_idx" ON "investments"("status");

-- CreateIndex
CREATE INDEX "investments_nftMintAddress_idx" ON "investments"("nftMintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "laika_boosts_investmentId_key" ON "laika_boosts"("investmentId");

-- CreateIndex
CREATE INDEX "laika_boosts_investmentId_idx" ON "laika_boosts"("investmentId");

-- CreateIndex
CREATE INDEX "takara_mining_investmentId_miningDate_idx" ON "takara_mining"("investmentId", "miningDate");

-- CreateIndex
CREATE INDEX "takara_mining_miningDate_idx" ON "takara_mining"("miningDate");

-- CreateIndex
CREATE UNIQUE INDEX "mining_stats_date_key" ON "mining_stats"("date");

-- CreateIndex
CREATE INDEX "mining_stats_date_idx" ON "mining_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_investmentId_key" ON "marketplace_listings"("investmentId");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_idx" ON "marketplace_listings"("status");

-- CreateIndex
CREATE INDEX "marketplace_listings_sellerId_idx" ON "marketplace_listings"("sellerId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_userId_status_idx" ON "withdrawal_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txSignature_key" ON "transactions"("txSignature");

-- CreateIndex
CREATE INDEX "transactions_txSignature_idx" ON "transactions"("txSignature");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredId_key" ON "referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laika_boosts" ADD CONSTRAINT "laika_boosts_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takara_mining" ADD CONSTRAINT "takara_mining_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
