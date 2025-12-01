-- Migration: Add 2-Step Investment Process Support
-- Date: 2025-12-01
-- Description: Add fields to support MetaMask (USDT) → Phantom (LAIKA/TAKARA) 2-step flow

-- 1. Add new investment statuses
ALTER TYPE "InvestmentStatus" ADD VALUE IF NOT EXISTS 'PENDING_USDT';      -- Step 1: Waiting for USDT payment
ALTER TYPE "InvestmentStatus" ADD VALUE IF NOT EXISTS 'PENDING_TOKENS';    -- Step 2: USDT paid, waiting for LAIKA/TAKARA

-- 2. Add transaction hash fields for multi-chain tracking
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "usdtTxHash" TEXT;           -- Ethereum USDT transaction hash
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "laikaTxHash" TEXT;          -- Solana LAIKA transaction hash (optional)
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "takaraTxHash" TEXT;         -- Solana TAKARA transaction hash (if required)
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "step1CompletedAt" TIMESTAMP; -- When USDT payment confirmed
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "step2CompletedAt" TIMESTAMP; -- When tokens deposited

-- 3. Add blockchain info
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "paymentChain" TEXT;         -- 'ethereum' or 'tron'
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "tokenChain" TEXT DEFAULT 'solana'; -- Always 'solana' for now

-- 4. Create indexes for new fields
CREATE INDEX IF NOT EXISTS "idx_investments_usdtTxHash" ON "investments"("usdtTxHash");
CREATE INDEX IF NOT EXISTS "idx_investments_status_step1" ON "investments"("status") WHERE "status" IN ('PENDING_USDT', 'PENDING_TOKENS');

-- 5. Update existing PENDING investments to PENDING_USDT
UPDATE "investments" SET "status" = 'PENDING_USDT' WHERE "status" = 'PENDING';

COMMENT ON COLUMN "investments"."usdtTxHash" IS 'Ethereum/TRON transaction hash for USDT payment (Step 1)';
COMMENT ON COLUMN "investments"."laikaTxHash" IS 'Solana transaction hash for LAIKA deposit (Step 2, optional)';
COMMENT ON COLUMN "investments"."takaraTxHash" IS 'Solana transaction hash for TAKARA deposit (Step 2, if required)';
COMMENT ON COLUMN "investments"."step1CompletedAt" IS 'Timestamp when USDT payment was confirmed';
COMMENT ON COLUMN "investments"."step2CompletedAt" IS 'Timestamp when LAIKA/TAKARA tokens were deposited and NFT minted';
