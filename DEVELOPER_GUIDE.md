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

*Last Updated: January 6, 2026*
*Version: 2.2*
