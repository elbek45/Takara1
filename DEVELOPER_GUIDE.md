# Takara Gold - Developer Guide

## Quick Reference: Function Map

---

## Backend Services (`/backend/src/services/`)

### Blockchain Services

#### `ethereum.service.ts` - EVM USDT Operations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getUSDTBalance(address)` | `address: string` | `Promise<string>` | Get USDT balance for wallet |
| `verifyUSDTTransaction(txHash, expectedAmount, recipientAddress)` | `txHash, amount, address` | `Promise<{verified, amount, from, to}>` | Verify USDT transfer on-chain |
| `transferUSDTFromPlatform(toAddress, amount)` | `address, amount` | `Promise<{txHash, amount}>` | Transfer USDT from platform wallet |
| `getPlatformUSDTBalance()` | - | `Promise<string>` | Get platform USDT balance |
| `getPlatformETHBalance()` | - | `Promise<string>` | Get platform ETH for gas |

#### `solana.service.ts` - Solana Token Operations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `verifyWalletSignature(message, signature, publicKey)` | `msg, sig, key` | `Promise<boolean>` | Verify wallet ownership |
| `verifyTransaction(signature)` | `signature: string` | `Promise<{confirmed, slot}>` | Verify TX confirmation |
| `verifyTransactionDetails(sig, tokenMint, recipient, amount)` | `sig, mint, addr, amt` | `Promise<{verified, details}>` | Full TX verification |
| `getTokenBalance(walletAddress, tokenMint)` | `address, mint` | `Promise<number>` | Get SPL token balance |
| `getSolBalance(walletAddress)` | `address: string` | `Promise<number>` | Get SOL balance |
| `transferTokens(to, mint, amount, decimals)` | `addr, mint, amt, dec` | `Promise<{signature}>` | Transfer SPL tokens |
| `transferFromPlatform(to, tokenMint, amount)` | `addr, mint, amt` | `Promise<{signature}>` | Transfer from platform |
| `transferUSDTReward(to, amount)` | `address, amount` | `Promise<{signature}>` | Send USDT reward |
| `transferTAKARAReward(to, amount)` | `address, amount` | `Promise<{signature}>` | Send TAKARA reward |
| `isValidSolanaAddress(address)` | `address: string` | `boolean` | Validate Solana address |
| `generateSignatureMessage(walletAddress, nonce)` | `addr, nonce` | `string` | Generate sign message |

#### `tron.service.ts` - TRON Network Operations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getUSDTBalanceTron(address)` | `address: string` | `Promise<string>` | Get TRC20 USDT balance |
| `getTRXBalance(address)` | `address: string` | `Promise<string>` | Get native TRX balance |
| `verifyUSDTTransactionTron(txHash, amount, recipient)` | `hash, amt, addr` | `Promise<{verified}>` | Verify TRC20 transfer |
| `verifyTRXTransaction(txHash, amount, recipient)` | `hash, amt, addr` | `Promise<{verified}>` | Verify TRX transfer |

---

### Investment Services

#### `takaraBoost.service.ts` - TAKARA Boost Management
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `applyTakaraBoost(investmentId, userId, takaraAmount, txSignature)` | `invId, userId, amt, sig` | `Promise<TakaraBoost>` | Apply boost to investment |
| `returnTakaraBoost(boostId)` | `boostId: string` | `Promise<{returned, signature}>` | Return TAKARA at term end |
| `getTakaraBoost(investmentId)` | `investmentId: string` | `Promise<TakaraBoost \| null>` | Get boost details |
| `hasTakaraBoost(investmentId)` | `investmentId: string` | `Promise<boolean>` | Check if boost exists |
| `getUserTakaraBoosts(userId)` | `userId: string` | `Promise<TakaraBoost[]>` | Get user's boosts |
| `getTakaraBoostStatistics()` | - | `Promise<{totalLocked, totalReturned}>` | Platform-wide stats |

#### `instantSale.service.ts` - Instant Sale Feature
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateInstantSalePrice(investment)` | `investment: Investment` | `number` | Calc 80% sale price |
| `toggleInstantSale(investmentId, enabled)` | `invId, enabled` | `Promise<Investment>` | Enable/disable instant sale |
| `executeInstantSale(investmentId, buyerAddress)` | `invId, addr` | `Promise<{success, signature}>` | Execute instant sale |
| `getInstantSaleListings(filters)` | `filters?: object` | `Promise<Investment[]>` | Get enabled listings |
| `canEnableInstantSale(investmentId)` | `invId: string` | `Promise<boolean>` | Check eligibility |

#### `nft.service.ts` - Wexel NFT Operations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `generateNFTMetadata(investment, vault)` | `investment, vault` | `NFTMetadata` | Generate metadata JSON |
| `uploadMetadata(metadata)` | `metadata: object` | `Promise<string>` | Upload to IPFS |
| `mintInvestmentNFT(investment, metadataUri)` | `inv, uri` | `Promise<{mintAddress}>` | Mint Wexel NFT |
| `transferNFT(fromWallet, toWallet, mintAddress)` | `from, to, mint` | `Promise<{signature}>` | Transfer NFT ownership |
| `verifyNFTOwnership(walletAddress, mintAddress)` | `addr, mint` | `Promise<boolean>` | Verify owner |
| `getNFTMetadata(mintAddress)` | `mintAddress: string` | `Promise<NFTMetadata>` | Get on-chain metadata |

---

### Pricing Services

#### `price.service.ts` - Token Price Fetching
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getLaikaPrice()` | - | `Promise<number>` | Get LAIKA price (DexScreener) |
| `getTakaraPrice()` | - | `Promise<number>` | Get TAKARA price (dynamic) |
| `calculateLaikaValueWithPremium(laikaAmount, marketPrice)` | `amount, price` | `number` | Apply x100 premium |
| `calculateRequiredLaika(usdtAmount, percentage, laikaPrice)` | `usdt, %, price` | `number` | Calc required LAIKA |
| `getBatchPrices()` | - | `Promise<{laika, takara}>` | Get all prices |
| `clearPriceCache()` | - | `void` | Clear cache |
| `getCacheStats()` | - | `{hits, misses}` | Cache statistics |

#### `takara-pricing.service.ts` - Dynamic TAKARA Pricing
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateTakaraPrice()` | - | `Promise<{price, factors}>` | Calc with time/supply/difficulty |
| `getTakaraPrice()` | - | `Promise<number>` | Get current price |
| `projectTakaraPrice(months)` | `months: number` | `Promise<number>` | Project future price |
| `getTakaraPriceHistory(days)` | `days: number` | `Promise<{date, price}[]>` | Get price history |

#### `supply.service.ts` - TAKARA Supply Tracking
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateSupplyBreakdown()` | - | `Promise<{mined, locked, circulating}>` | Get supply breakdown |
| `updateMiningStatsSupply()` | - | `Promise<void>` | Update daily stats |
| `getSupplyHistory(days)` | `days: number` | `Promise<SupplyData[]>` | Get historical supply |
| `calculateSupplyGrowthRate()` | - | `Promise<{daily, monthly}>` | Calc growth rates |

---

### Tax & Financial Services

#### `tax.service.ts` - Treasury Tax Management
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateTax(amount, taxRate)` | `amount, rate` | `{tax, net}` | Calculate tax amount |
| `recordTax(amount, tokenType, source, userId)` | `amt, type, src, uid` | `Promise<TaxRecord>` | Record tax transaction |
| `applyTakaraClaimTax(claimAmount)` | `amount: number` | `{tax, userReceives}` | 5% TAKARA claim tax |
| `applyWexelSaleTax(salePrice)` | `price: number` | `{tax, sellerReceives}` | 5% NFT sale tax |
| `getTreasuryBalance(tokenType)` | `tokenType: string` | `Promise<number>` | Get treasury balance |
| `getAllTreasuryBalances()` | - | `Promise<{TAKARA, USDT}>` | All balances |
| `getUserTaxRecords(userId)` | `userId: string` | `Promise<TaxRecord[]>` | User's tax history |
| `getTaxStatistics()` | - | `Promise<TaxStats>` | Platform tax stats |

---

### Cache & Session Services

#### `redis.service.ts` - Redis Operations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getRedisClient()` | - | `Redis` | Get Redis client |
| `closeRedis()` | - | `Promise<void>` | Close connection |
| `isRedisConnected()` | - | `boolean` | Check connection |
| `setNonce(walletAddress, nonce)` | `addr, nonce` | `Promise<void>` | Store auth nonce (5min TTL) |
| `getNonce(walletAddress)` | `addr: string` | `Promise<string \| null>` | Get stored nonce |
| `deleteNonce(walletAddress)` | `addr: string` | `Promise<void>` | Delete used nonce |
| `setCache(key, value, ttl)` | `key, val, ttl` | `Promise<void>` | Set cache value |
| `getCache(key)` | `key: string` | `Promise<string \| null>` | Get cached value |
| `setCacheObject(key, obj, ttl)` | `key, obj, ttl` | `Promise<void>` | Cache JSON object |
| `getCacheObject(key)` | `key: string` | `Promise<T \| null>` | Get cached object |
| `incrementRateLimit(key)` | `key: string` | `Promise<number>` | Increment rate counter |

---

## Backend Utilities (`/backend/src/utils/`)

### `mining.calculator.ts` - TAKARA Mining Calculations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateDifficulty(totalMiners, circulatingSupply)` | `miners, supply` | `number` | Dynamic difficulty |
| `calculateBaseMiningRate(usdtAmount, miningPower)` | `usdt, power` | `number` | Base daily rate |
| `calculateMining(params)` | `{usdt, apy, difficulty, days}` | `MiningResult` | Full mining calculation |
| `compareMiningOptions(options[])` | `options: VaultOption[]` | `ComparisonResult` | Compare vaults |
| `projectFutureDifficulty(months)` | `months: number` | `number` | Project difficulty |
| `calculateMiningEfficiency(result)` | `result: MiningResult` | `number` | TAKARA per USDT |

### `apy.calculator.ts` - APY & Earnings Calculations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateEarnings(principal, apy, months)` | `amt, apy, mo` | `EarningsResult` | Calc total earnings |
| `calculateNumberOfPayouts(duration, schedule)` | `dur, sched` | `number` | Payout count |
| `calculateNextPayoutDate(startDate, schedule)` | `start, sched` | `Date` | Next payout date |
| `calculateAllPayoutDates(start, end, schedule)` | `dates, sched` | `Date[]` | All payout dates |
| `calculatePendingEarnings(investment)` | `investment` | `{usdt, takara}` | Pending amounts |
| `calculateROI(earned, invested)` | `earned, invested` | `number` | ROI percentage |
| `calculateEffectiveAPY(returns, principal, months)` | `ret, prin, mo` | `number` | Effective APY |

### `laika.calculator.ts` - LAIKA Boost Calculations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateLaikaBoost(params)` | `{baseAPY, maxAPY, usdt, laikaValue}` | `BoostResult` | Calc boost APY |
| `calculateRequiredLaikaForAPY(base, max, usdt, desired)` | `base, max, usdt, apy` | `number` | Required LAIKA |
| `validateLaikaBoost(params)` | `BoostInput` | `{valid, error?}` | Validate boost |
| `getBoostRecommendation(base, max, usdt)` | `base, max, usdt` | `Recommendations` | Boost suggestions |

### `takara.calculator.ts` - TAKARA Boost Calculations
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `calculateTakaraBoost(params)` | `TakaraBoostInput` | `TakaraBoostResult` | Calc boost APY |
| `calculateRequiredTakaraForAPY(base, max, usdt, desired)` | `base, max, usdt, apy` | `number` | Required TAKARA |
| `validateTakaraBoost(params)` | `TakaraBoostInput` | `{valid, error?}` | Validate boost |
| `getBoostRecommendation(base, max, usdt)` | `base, max, usdt` | `Recommendations` | Boost suggestions |
| `calculateCombinedBoost(params)` | `{laika, takara, apy}` | `CombinedResult` | Both boosts |

---

## Backend Controllers (`/backend/src/controllers/`)

### `auth.controller.ts`
| Endpoint | Method | Auth | Handler | Description |
|----------|--------|------|---------|-------------|
| `/api/auth/nonce` | GET | No | `getNonce` | Generate wallet nonce |
| `/api/auth/login` | POST | No | `walletLogin` | Solana wallet login |
| `/api/auth/admin/login` | POST | No | `adminLogin` | Admin password login |
| `/api/auth/register` | POST | No | `register` | Create account |
| `/api/auth/me` | GET | Yes | `getCurrentUser` | Get user info |
| `/api/auth/connect-solana` | POST | Yes | `connectSolana` | Link Solana wallet |
| `/api/auth/connect-tron` | POST | Yes | `connectTron` | Link TRON wallet |

### `investment.controller.ts`
| Endpoint | Method | Auth | Handler | Description |
|----------|--------|------|---------|-------------|
| `/api/investments` | POST | Yes | `createInvestment` | New investment |
| `/api/investments/my` | GET | Yes | `getMyInvestments` | User's investments |
| `/api/investments/:id` | GET | Yes | `getInvestmentById` | Investment details |
| `/api/investments/:id/claim-yield` | POST | Yes | `claimYield` | Claim USDT |
| `/api/investments/:id/claim-takara` | POST | Yes | `claimTakara` | Claim TAKARA (5% tax) |
| `/api/investments/:id/boost/takara` | POST | Yes | `applyTakaraBoost` | Add TAKARA boost |
| `/api/investments/:id/instant-sale` | PUT | Yes | `toggleInstantSale` | Toggle instant sale |
| `/api/investments/:id/instant-sale/execute` | POST | Yes | `executeInstantSale` | Sell instantly |

### `vault.controller.ts`
| Endpoint | Method | Auth | Handler | Description |
|----------|--------|------|---------|-------------|
| `/api/vaults` | GET | No | `getVaults` | List all vaults |
| `/api/vaults/:id` | GET | No | `getVaultById` | Vault details |
| `/api/vaults/:id/calculate` | POST | No | `calculateInvestment` | Calc estimates |

### `marketplace.controller.ts`
| Endpoint | Method | Auth | Handler | Description |
|----------|--------|------|---------|-------------|
| `/api/marketplace` | GET | No | `getListings` | Browse listings |
| `/api/marketplace/list` | POST | Yes | `createListing` | List NFT for sale |
| `/api/marketplace/:id/buy` | POST | Yes | `purchaseNFT` | Buy NFT |
| `/api/marketplace/:id` | DELETE | Yes | `cancelListing` | Cancel listing |
| `/api/marketplace/stats` | GET | No | `getStats` | Market statistics |
| `/api/marketplace/my-listings` | GET | Yes | `getMyListings` | User's listings |

### `admin.controller.ts`
| Endpoint | Method | Auth | Handler | Description |
|----------|--------|------|---------|-------------|
| `/api/admin/dashboard` | GET | Admin | `getDashboard` | Dashboard stats |
| `/api/admin/users` | GET | Admin | `getUsers` | List users |
| `/api/admin/investments` | GET | Admin | `getInvestments` | All investments |
| `/api/admin/withdrawals` | GET | Admin | `getWithdrawals` | Withdrawal requests |
| `/api/admin/withdrawals/:id/process` | PUT | Admin | `processWithdrawal` | Approve/reject |
| `/api/admin/vaults/:id/activate` | PUT | Admin | `toggleVault` | Activate/deactivate |
| `/api/admin/stats/mining` | GET | Admin | `getMiningStats` | Mining statistics |
| `/api/admin/instant-sales` | GET | Admin | `getInstantSales` | Instant sale listings |
| `/api/admin/instant-sales/:id/purchase` | POST | Admin | `purchaseInstantSale` | Admin purchase |

---

## Background Jobs (`/backend/src/jobs/`)

| Job | Schedule | Handler | Description |
|-----|----------|---------|-------------|
| Daily TAKARA Mining | 00:05 UTC | `dailyTakaraMining.ts` | Calculate daily mining rewards |
| Investment Activation | Every 1h | `investmentActivation.ts` | Activate pending investments |
| Payout Distribution | 00:10 UTC | `payoutDistribution.ts` | Process scheduled payouts |
| LAIKA Return | 00:15 UTC | `laikaReturn.ts` | Return locked LAIKA tokens |
| Price Update | Every 30m | `priceUpdater.ts` | Refresh token prices |

---

## Frontend Hooks (`/frontend/src/hooks/`)

| Hook | Returns | Description |
|------|---------|-------------|
| `useAuth()` | `{user, isAuthenticated, login, logout}` | Authentication state |
| `useClaimUSDT()` | `{mutate, isPending}` | Claim USDT mutation |
| `useClaimTAKARA()` | `{mutate, isPending}` | Claim TAKARA mutation |
| `useClaimAll()` | `{claimAllUSDT, claimAllTAKARA}` | Batch claim |
| `useListNFT()` | `{mutate, isPending}` | List on marketplace |
| `useBuyNFT()` | `{mutate, isPending}` | Purchase NFT |
| `useCancelListing()` | `{mutate, isPending}` | Cancel listing |
| `useEVMWallet()` | `{connect, address, isConnected}` | EVM wallet state |

---

## Key Business Rules

### Tax Structure
| Action | Tax Rate | Recipient |
|--------|----------|-----------|
| TAKARA Claim | 5% | Treasury |
| Wexel NFT Sale | 5% | Treasury |
| Marketplace Fee | 2.5% | Platform |
| Instant Sale Discount | 20% | Platform |

### Boost Mechanics
| Boost Type | Multiplier | Max Value | Returns |
|------------|------------|-----------|---------|
| LAIKA | x100 (premium) | 50% of USDT | At term end |
| TAKARA | x1 (market value) | 50% of USDT | At term end |

### Investment Flow
1. User selects vault → 2. Enters amount → 3. Optional LAIKA/TAKARA boost
4. 2-step payment (USDT + Tokens) → 5. NFT minted → 6. 72h activation delay
7. Daily mining starts → 8. Scheduled payouts → 9. Claims (5% tax)
10. Term end: principal + boosts returned

---

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=redis://...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_WALLET_PRIVATE_KEY=...
```

### Optional Feature Flags
```env
TEST_MODE=false                    # Enable test mode
SKIP_TX_VERIFICATION=false         # Skip blockchain verification
ENABLE_REAL_ETH_TRANSFERS=true     # Enable ETH transfers
ENABLE_REAL_NFT_MINTING=true       # Enable NFT minting
ENABLE_CRON_JOBS=true              # Enable background jobs
```

---

## ⚠️ CRITICAL: Incomplete Features (TODOs)

### 🔴 HIGH PRIORITY - Must Fix Before Production

#### 1. Transaction Verification Bypassed
**Files:** `backend/src/controllers/investment-2step.controller.ts` (lines 88, 248, 282)
```typescript
// CURRENT: txVerified = true (Simplified for initial deployment)
// NEEDED: Implement full on-chain verification using solana.service.ts
```
**Risk:** Users can submit fake transaction hashes
**Solution:** Implement `verifyTransactionDetails()` from solana.service.ts

#### 2. LAIKA Token Return Not Implemented
**File:** `backend/src/jobs/laikaReturn.ts` (lines 73, 197)
```typescript
// TODO: Transfer LAIKA tokens back to owner
// Currently: Using placeholder signature
```
**Risk:** Users won't receive their LAIKA tokens back at term end
**Solution:** Use `solana.service.transferFromPlatform()` with LAIKA mint address

#### 3. NFT Minting Disabled
**File:** `backend/src/controllers/investment-2step.controller.ts` (lines 320-327)
```typescript
// NFT minting disabled for initial deployment
// TODO: Re-enable once platform wallet is configured
```
**Risk:** Users won't receive WEXEL NFTs
**Solution:** Set `ENABLE_REAL_NFT_MINTING=true` in env and configure IPFS

#### 4. Instant Sale Incomplete
**File:** `backend/src/services/instantSale.service.ts` (lines 263-269)
```typescript
// TODO: Return LAIKA boost if exists
// TODO: Transfer NFT ownership
// TODO: Transfer USDT to seller
```
**Risk:** Instant sale button exists but doesn't actually transfer funds
**Solution:** Implement actual token transfers using blockchain services

#### 5. Admin Treasury Withdrawal - No Auth Check
**File:** `backend/src/controllers/admin-treasury.controller.ts` (lines 352-356)
```typescript
// TODO: Verify admin is super admin
// TODO: Perform actual token transfer
```
**Risk:** Any admin can withdraw; transfers are mocked
**Solution:** Add role check + implement real transfers

---

### 🟡 MEDIUM PRIORITY - Should Fix

#### 6. NFT Image URLs are Placeholders
**File:** `backend/src/services/nft.service.ts` (line 82)
```typescript
image: `https://placeholder.takaragold.io/nft/${tier}.png`
// TODO: Replace with actual IPFS image URL
```
**Solution:** Upload tier images to IPFS and update URLs

#### 7. Real Ethereum Transfers Disabled
**File:** `backend/src/services/ethereum.service.ts` (line 181)
```typescript
// Real Ethereum transfers disabled - returning mock signature
return { txHash: 'mock_eth_tx_' + Date.now() }
```
**Solution:** Set `ENABLE_REAL_ETH_TRANSFERS=true` and add private key

#### 8. Mining Power Calculation Missing
**File:** `backend/src/controllers/admin-advanced.controller.ts` (line 57)
```typescript
const totalMiningPower = 0; // TODO: Calculate from active investments
```
**Solution:** Sum TAKARA APY * USDT invested for all active investments

#### 9. Logger File Rotation Disabled
**File:** `backend/src/config/logger.ts` (line 78)
```typescript
// TODO: Re-enable file rotation once pino-roll compatibility is fixed
```
**Risk:** Log files will grow indefinitely
**Solution:** Configure pino-roll or use external log rotation

---

## 🔧 Architecture Overview for Programmer

### Investment Flow (2-Step Payment)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INITIATES INVESTMENT                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: USDT Payment (EVM Network - Trust Wallet/MetaMask)     │
│  ─────────────────────────────────────────────────────────────  │
│  1. Frontend: useEVMWallet.ts → ethereum.service.ts             │
│  2. User sends USDT to platform EVM wallet                       │
│  3. Backend: Creates investment with status=PENDING_TOKENS       │
│  4. Stores txHash in database                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: TAKARA + LAIKA (Solana - Phantom Wallet)               │
│  ─────────────────────────────────────────────────────────────  │
│  1. Frontend: useWallet (Solana adapter)                         │
│  2. Required TAKARA = vault.takaraRatio × (USDT/100)            │
│  3. Optional LAIKA boost (x100 premium for Cosmodog)             │
│  4. Backend: investment-2step.controller.ts                      │
│  5. Verifies Solana transactions (⚠️ TODO: Currently bypassed)  │
│  6. Creates LaikaBoost record if LAIKA deposited                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  ACTIVATION (72-hour delay)                                      │
│  ─────────────────────────────────────────────────────────────  │
│  Job: investmentActivation.ts (runs every hour)                  │
│  1. Finds investments where createdAt + 72h < now                │
│  2. Mints WEXEL NFT (⚠️ TODO: Currently disabled)               │
│  3. Sets status=ACTIVE, startDate=now                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  DAILY MINING                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Job: dailyTakaraMining.ts (runs daily at 00:00 UTC)             │
│  1. Base TAKARA = (USDT × takaraAPY) / 365                       │
│  2. Boost multiplier from LAIKA (x100 value)                     │
│  3. Mining difficulty adjustment (starts at 1.0)                 │
│  4. Creates TakaraMining record                                  │
│  5. User can claim with 5% tax                                   │
└─────────────────────────────────────────────────────────────────┘

```

### Boost Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  LAIKA BOOST (x100 Premium for Cosmodog Community)              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  File: utils/laika.calculator.ts                                 │
│  File: services/price.service.ts → calculateLaikaValueWithPremium│
│                                                                  │
│  Formula:                                                        │
│  ─────────                                                       │
│  laikaMarketValueUSD = laikaAmount × laikaPrice                 │
│  laikaBoostValueUSD = laikaMarketValueUSD × 100  ← x100!        │
│  maxBoostValueUSD = usdtInvested × 0.50 (50% cap)               │
│  effectiveBoost = min(laikaBoostValueUSD, maxBoostValueUSD)     │
│                                                                  │
│  Example: $300 USDT investment                                   │
│  ─────────────────────────────                                  │
│  Max boost = $150 (50% of $300)                                  │
│  LAIKA price = $0.0000007426                                     │
│  Need $150/$100 = $1.50 market value for full boost              │
│  LAIKA needed = $1.50 / $0.0000007426 = ~2,020,000 LAIKA        │
│                                                                  │
│  APY boost = (effectiveBoost / maxBoost) × (maxAPY - baseAPY)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  TAKARA BOOST (Market Value - No Premium)                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  File: utils/takara.calculator.ts                                │
│                                                                  │
│  Formula:                                                        │
│  takaraBoostValue = takaraMarketValueUSD × 1.0 (no multiplier)  │
│  maxBoostValueUSD = usdtInvested × 0.50                          │
│                                                                  │
│  TAKARA uses full market value (no premium like LAIKA)           │
└─────────────────────────────────────────────────────────────────┘
```

### TAKARA Dynamic Pricing Model

```
┌─────────────────────────────────────────────────────────────────┐
│  File: services/takara-pricing.service.ts                        │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Initial Price: $0.001                                           │
│  Target Price: $0.10 (over 5 years = 1825 days)                 │
│                                                                  │
│  Price = InitialPrice + (TargetPrice - InitialPrice) × Factor   │
│                                                                  │
│  Factor = 0.40 × timeFactor                                      │
│         + 0.40 × supplyFactor                                    │
│         + 0.20 × difficultyFactor                                │
│                                                                  │
│  timeFactor = daysElapsed / totalDays                            │
│  supplyFactor = circulatingSupply / maxSupply                    │
│  difficultyFactor = currentDifficulty - 1                        │
│                                                                  │
│  Current Price (Day 23): ~$0.001506                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Production Readiness Checklist

### Environment Setup
- [ ] Set `NODE_ENV=production`
- [ ] Set `TEST_MODE=false`
- [ ] Set `SKIP_TX_VERIFICATION=false`
- [ ] Set `ENABLE_REAL_NFT_MINTING=true`
- [ ] Set `ENABLE_REAL_ETH_TRANSFERS=true`
- [ ] Set `ENABLE_CRON_JOBS=true`

### Blockchain Configuration
- [ ] Configure Solana RPC (mainnet-beta)
- [ ] Add platform wallet private keys (Solana, EVM)
- [ ] Set USDT contract addresses (TRON, Ethereum/BSC)
- [ ] Configure IPFS for NFT metadata

### Security
- [ ] Change JWT_SECRET from default
- [ ] Change admin password from default
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain only
- [ ] Remove exposed credentials from deploy.sh

### Monitoring
- [ ] Set up Sentry DSN
- [ ] Configure log rotation
- [ ] Set up uptime monitoring
- [ ] Configure alerts for failed jobs

---

## 📁 Key File Locations

```
backend/
├── src/
│   ├── controllers/
│   │   ├── investment-2step.controller.ts  ← Main investment flow
│   │   ├── admin.controller.ts             ← Admin operations
│   │   └── marketplace.controller.ts       ← NFT marketplace
│   ├── services/
│   │   ├── price.service.ts                ← Token prices (LAIKA x100 here!)
│   │   ├── takara-pricing.service.ts       ← Dynamic TAKARA price
│   │   ├── solana.service.ts               ← Solana blockchain ops
│   │   └── instantSale.service.ts          ← Instant sale feature
│   ├── jobs/
│   │   ├── dailyTakaraMining.ts            ← Daily mining calculation
│   │   ├── investmentActivation.ts         ← 72h activation
│   │   └── laikaReturn.ts                  ← Return tokens at term end
│   └── utils/
│       ├── laika.calculator.ts             ← LAIKA boost math
│       ├── takara.calculator.ts            ← TAKARA boost math
│       └── mining.calculator.ts            ← Mining APY calculations

frontend/
├── src/
│   ├── pages/
│   │   ├── VaultDetailPage.tsx             ← Investment UI
│   │   ├── ComingSoonPage.tsx              ← Landing (password: takara2026)
│   │   └── admin/                          ← Admin panel
│   ├── services/
│   │   ├── ethereum.service.ts             ← EVM wallet integration
│   │   └── evm.service.ts                  ← BSC-specific operations
│   └── hooks/
│       └── useEVMWallet.ts                 ← EVM wallet hook
```

---

*Last Updated: January 6, 2026*
*Version: 2.2.1*
