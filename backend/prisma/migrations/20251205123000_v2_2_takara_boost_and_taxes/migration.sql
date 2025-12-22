-- v2.2 TAKARA Boost & Taxes Migration
-- This migration adds TAKARA boost support, tax system, treasury, and instant sale

-- Step 1: Rename miningPower to takaraAPY in vaults table
ALTER TABLE "vaults" RENAME COLUMN "miningPower" TO "takaraAPY";

-- Step 2: Add new fields to investments table
ALTER TABLE "investments" ADD COLUMN "instantSalePrice" DECIMAL(20,6);
ALTER TABLE "investments" ADD COLUMN "isInstantSaleEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Rename miningPower to takaraAPY in takara_mining table
ALTER TABLE "takara_mining" RENAME COLUMN "miningPower" TO "takaraAPY";

-- Step 4: Create TaxSourceType enum
CREATE TYPE "TaxSourceType" AS ENUM ('TAKARA_CLAIM', 'WEXEL_SALE');

-- Step 5: Create takara_boosts table
CREATE TABLE "takara_boosts" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "takaraAmount" DECIMAL(20,6) NOT NULL,
    "takaraValueUSD" DECIMAL(20,2) NOT NULL,
    "maxAllowedUSD" DECIMAL(20,2) NOT NULL,
    "boostPercentage" DECIMAL(5,2) NOT NULL,
    "additionalAPY" DECIMAL(5,2) NOT NULL,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "returnDate" TIMESTAMP(3),
    "returnTxSignature" TEXT,
    "depositTxSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takara_boosts_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create boost_token_config table
CREATE TABLE "boost_token_config" (
    "id" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenName" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxBoostPercent" DECIMAL(5,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boost_token_config_pkey" PRIMARY KEY ("id")
);

-- Step 7: Create tax_records table
CREATE TABLE "tax_records" (
    "id" TEXT NOT NULL,
    "sourceType" "TaxSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "amountBeforeTax" DECIMAL(20,6) NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL,
    "taxAmount" DECIMAL(20,6) NOT NULL,
    "amountAfterTax" DECIMAL(20,6) NOT NULL,
    "txSignature" TEXT,
    "treasuryWallet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_records_pkey" PRIMARY KEY ("id")
);

-- Step 8: Create treasury_balance table
CREATE TABLE "treasury_balance" (
    "id" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "balance" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalCollected" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_balance_pkey" PRIMARY KEY ("id")
);

-- Step 9: Create unique indexes
CREATE UNIQUE INDEX "takara_boosts_investmentId_key" ON "takara_boosts"("investmentId");
CREATE UNIQUE INDEX "boost_token_config_tokenSymbol_key" ON "boost_token_config"("tokenSymbol");
CREATE UNIQUE INDEX "treasury_balance_tokenSymbol_key" ON "treasury_balance"("tokenSymbol");

-- Step 10: Create regular indexes
CREATE INDEX "takara_boosts_investmentId_idx" ON "takara_boosts"("investmentId");
CREATE INDEX "boost_token_config_isEnabled_idx" ON "boost_token_config"("isEnabled");
CREATE INDEX "tax_records_userId_idx" ON "tax_records"("userId");
CREATE INDEX "tax_records_sourceType_idx" ON "tax_records"("sourceType");
CREATE INDEX "tax_records_createdAt_idx" ON "tax_records"("createdAt");

-- Step 11: Add foreign key constraints
ALTER TABLE "takara_boosts" ADD CONSTRAINT "takara_boosts_investmentId_fkey"
    FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tax_records" ADD CONSTRAINT "tax_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 12: Insert default boost token configurations
INSERT INTO "boost_token_config" ("id", "tokenSymbol", "tokenName", "tokenMint", "isEnabled", "maxBoostPercent", "displayOrder", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'LAIKA', 'LAIKA The Cosmodog', 'YOUR_LAIKA_MINT_ADDRESS', true, 100.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'TAKARA', 'Takara Gold', 'TO_BE_DEPLOYED', true, 100.00, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 13: Initialize treasury balances
INSERT INTO "treasury_balance" ("id", "tokenSymbol", "balance", "totalCollected", "totalWithdrawn", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'TAKARA', 0, 0, 0, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'USDT', 0, 0, 0, CURRENT_TIMESTAMP);

-- Step 14: Add comments for documentation
COMMENT ON COLUMN "vaults"."takaraAPY" IS 'Takara APY (formerly miningPower) - v2.2';
COMMENT ON TABLE "takara_boosts" IS 'TAKARA boost records - v2.2';
COMMENT ON TABLE "tax_records" IS '5% tax records for TAKARA claims and WEXEL sales - v2.2';
COMMENT ON TABLE "treasury_balance" IS 'Treasury balance tracking - v2.2';
