# Takara Gold - Business Logic Documentation

## Platform Overview

Takara Gold is a DeFi investment platform on Solana that offers:
- **Principal-protected USDT vaults** with fixed APY returns
- **TAKARA token mining** - users earn TAKARA tokens while their funds are locked
- **LAIKA boost** - optional APY boost using LAIKA tokens (x100 boost for Cosmodog community)
- **Wexel NFTs** - tokenized investment positions tradeable on marketplace

---

## Page-by-Page Business Logic

### 1. Landing Page (`LandingPage.tsx`)

**Purpose:** Marketing/informational page to attract new users.

**Business Logic:**
- Displays platform value proposition: "Where DeFi Meets Real-World Assets"
- Shows aggregated stats from database:
  - Up to 20% USDT APY
  - Up to 60% Total USDT Returns
  - Up to 1000% TAKARA APY
  - Monthly payouts
- Dynamically fetches vault tiers from API to display tier comparison (STARTER, PRO, ELITE)
- User journey: Deposit USDT -> Receive Wexel NFT -> Mine TAKARA + Earn Yield -> Stake TAKARA for boost
- Tokenomics: 21M hard cap, 100% user-mined, no pre-mint

**Key Features:**
- Interactive expandable blocks explaining TAKARA utility
- Partners slider (PoweredBySlider)
- CTA buttons leading to `/vaults`

---

### 2. Vaults Page (`VaultsPage.tsx`)

**Purpose:** Browse and filter all available investment vaults.

**Business Logic:**
- Fetches active vaults from `GET /api/vaults`
- **Filters:**
  - Tier: ALL, STARTER, BASIC, PRO, ELITE
  - Duration: ALL, 18, 20, 30, 36 months
  - TAKARA requirement: ALL, WITH, WITHOUT

- **Vault Card displays:**
  - Tier badge with color coding
  - TAKARA ratio requirement (X per 100 USDT)
  - Base APY and Max APY
  - Total Return calculation: `APY * Duration / 12`
  - TAKARA mining APY range
  - Minimum investment amount
  - Payout schedule (Monthly/Quarterly/End of Term)
  - Mining status bar (% of threshold filled)

- **Mining Threshold Logic:**
  - Each vault has `miningThreshold` (e.g., $25,000)
  - When `currentFilled >= miningThreshold`, mining becomes active
  - Progress bar shows: `(currentFilled / miningThreshold) * 100%`

---

### 3. Vault Detail Page (`VaultDetailPage.tsx`)

**Purpose:** Investment calculator and checkout flow.

**Business Logic:**

**1. Calculation Engine:**
```javascript
// API: GET /api/vaults/:id/calculate
{
  usdtAmount: number,      // User's USDT investment
  laikaAmount?: number     // Optional LAIKA boost tokens
}
```

**2. LAIKA x100 Boost (Cosmodog Community):**
- LAIKA tokens get 100x price multiplier for boost calculation
- Max LAIKA boost = 50% of USDT value / 100
- Example: $1000 USDT -> max LAIKA market value $5 (50%/100)

**3. Response includes:**
- `investment`: usdtAmount, laikaPrice, laikaBoostValueUSD
- `earnings`: finalAPY, laikaBoostAPY, totalUSDT, payoutAmount, numberOfPayouts
- `mining`: dailyTAKARA, monthlyTAKARA, totalTAKARA
- `summary`: roi percentage

**4. Two-Step Payment Process:**
- Step 1: USDT via Phantom (Ethereum network)
- Step 2: TAKARA + LAIKA via Phantom (Solana network)

**5. Investment Modal Flow:**
1. User enters USDT amount
2. Optional: Adds LAIKA boost (slider up to 50% of USDT value)
3. Calculator shows final APY, earnings projection, TAKARA mining
4. User clicks "Invest Now" -> opens InvestmentModal
5. Wallet transactions executed in sequence

---

### 4. Dashboard Page (`DashboardPage.tsx`)

**Purpose:** User's investment overview and quick actions.

**Business Logic:**

**Stats Display:**
- Total Invested (sum of all investment.usdtAmount)
- Total Earned USDT (sum of investment.totalEarnedUSDT)
- Total Mined TAKARA (sum of investment.totalMinedTAKARA)
- Active Investments count (status === 'ACTIVE')

**Pending Claims:**
- Aggregates `pendingUSDT` and `pendingTAKARA` across all investments
- "Claim All USDT" button -> batch claim
- "Claim All TAKARA" button -> batch claim with 5% treasury tax

**Claim Tax Logic:**
```javascript
// TAKARA claiming applies 5% treasury tax
const taxAmount = pendingTAKARA * 0.05
const userReceives = pendingTAKARA * 0.95
```

**Active Investments List:**
- Shows top 5 active investments
- Each displays: tier, vault name, USDT amount, APY, earned USDT, mined TAKARA
- LAIKA boost badge if active

---

### 5. Portfolio Page (`PortfolioPage.tsx`)

**Purpose:** Detailed management of all investments.

**Business Logic:**

**Investment Statuses:**
- `PENDING` - Initial state after payment
- `PENDING_USDT` - Awaiting USDT confirmation
- `PENDING_TOKENS` - Awaiting TAKARA/LAIKA tokens
- `ACTIVE` - Fully activated, earning rewards
- `COMPLETED` - Term ended, principal returned
- `WITHDRAWN` - User withdrew principal
- `SOLD` - Sold on marketplace
- `CANCELLED` - Investment cancelled

**Actions per Investment:**

1. **Claim USDT** - Available when `pendingUSDT > 0`
2. **Claim TAKARA** - With 5% tax preview modal
3. **List for Sale** - Creates marketplace listing
4. **Cancel Listing** - Removes from marketplace
5. **Toggle Instant Sale** - Enable/disable instant buyback

**Instant Sale Feature:**
- Platform offers 80% of investment value for instant liquidity
- User can toggle on/off per investment
- When enabled: `instantSalePrice = usdtAmount * 0.80`

**LAIKA/TAKARA Boost Display:**
- Shows boost amount, additional APY, return status
- LAIKA returned at term end

**Marketplace Listing Flow:**
1. User clicks "List for Sale"
2. Opens ListNFTModal
3. Sets price in USDT
4. Platform suggests price based on remaining term value
5. 3% platform fee on sale

---

### 6. Marketplace Page (`MarketplacePage.tsx`)

**Purpose:** Trade Wexel NFTs representing investment positions.

**Business Logic:**

**Listing Display:**
- Vault tier, name, duration
- Listing price vs original investment
- Current APY (including any boosts)
- Time remaining (months)
- Earned USDT and mined TAKARA to date
- LAIKA boost details if active

**Marketplace Stats:**
- Total listings count
- Total trading volume
- Floor price (lowest listing)
- Active listings count

**Filters:**
- Tier: ALL, STARTER, PRO, ELITE
- Sort by: Newest, Price, APY, Time Remaining
- Order: Ascending/Descending

**Purchase Flow:**
1. User browses listings
2. Clicks "Buy Now"
3. Opens BuyNFTModal
4. Confirms purchase via Phantom wallet
5. Wexel NFT transfers to buyer
6. All future earnings go to new owner
7. LAIKA boost (if any) transfers with position

**Platform Fee:**
- 3% fee deducted from sale price
- Paid by seller

---

### 7. Profile Page (`ProfilePage.tsx`)

**Purpose:** User account settings and preferences.

**Business Logic:**

**Wallet Display:**
- Shows connected Phantom wallet address
- Member since date
- Last login date

**Quick Stats:**
- Total invested
- Total earned USDT
- Total mined TAKARA

**Profile Settings:**
- Username (optional)
- Email (optional, for notifications)

**Notification Preferences:**
- Investment updates
- Claim reminders
- Marketplace activity
- Platform updates

---

### 8. FAQ Page (`FAQPage.tsx`)

**Purpose:** Help documentation for users.

**Categories:**
1. Getting Started - What is Takara, wallet requirements
2. Stacking Process - How to invest, 2-step payment
3. Vault Tiers - STARTER/PRO/ELITE differences
4. LAIKA Boost - How it works, return timeline
5. TAKARA Mining - Mining power, difficulty
6. Vault Activation - Threshold, countdown, activation
7. Earnings & Withdrawals - Payout schedules
8. Wexel & Marketplace - NFT trading
9. Security & Safety - Blockchain security

---

### 9. Coming Soon Page (`ComingSoonPage.tsx`)

**Purpose:** Placeholder for future features with team access bypass.

**Business Logic:**
- Displays countdown/coming soon message
- Team members can access hidden features via `/coming-soon?access=team2024`

---

## Admin Pages

### 10. Admin Login (`AdminLoginPage.tsx`)

**Purpose:** Secure admin panel access.

**Authentication:**
- Username/password authentication
- JWT token stored in localStorage
- Redirects to `/admin/dashboard` on success

---

### 11. Admin Dashboard (`AdminDashboardPage.tsx`)

**Purpose:** Platform overview for administrators.

**Stats Displayed:**
- Total users
- Total investments (with active count)
- Total Value Locked (TVL)
- Total TAKARA mined
- Pending withdrawals
- Marketplace listings
- Total USDT paid out

**Recent Activity:**
- Last 5 investments (user, vault, amount, status)
- Recent new users

---

### 12. Admin Vaults (`AdminVaultsPage.tsx`)

**Purpose:** Vault CRUD operations.

**Operations:**
- Create new vault with all parameters
- Edit existing vault (APY, limits, status)
- Delete/deactivate vault
- View vault statistics (investments count, total deposited)

**Vault Parameters:**
- name, tier, duration, payoutSchedule
- minInvestment, maxInvestment
- baseAPY, maxAPY
- baseTakaraAPY, maxTakaraAPY
- requireTAKARA, takaraRatio
- totalCapacity, miningThreshold
- acceptedPayments, isActive

---

## Core Business Rules

### Investment Flow
1. User selects vault
2. Enters USDT amount (>= minInvestment)
3. Optionally adds LAIKA boost
4. If vault requires TAKARA: calculates required amount
5. Two-step payment: USDT (ETH) + Tokens (SOL)
6. Investment created with status PENDING
7. After confirmations: status -> ACTIVE
8. Wexel NFT minted to user's wallet

### Earnings Accrual
- USDT yield calculated: `usdtAmount * finalAPY / 365` per day
- TAKARA mining: `usdtAmount * takaraAPY / 365` per day
- Payouts scheduled based on vault schedule (monthly/quarterly/term-end)
- Earnings accumulate in `pendingUSDT` and `pendingTAKARA`

### Claiming
- USDT: No tax, direct transfer
- TAKARA: 5% treasury tax applied
- While listed on marketplace: claiming disabled

### Marketplace
- Only ACTIVE investments can be listed
- Listing pauses earning accrual for seller
- Buyer takes over all future earnings
- Platform takes 3% fee from sale price

---

## Token Economics

### TAKARA Token
- Hard cap: 21,000,000 TKR
- 100% mined by users (no pre-mint)
- Utility: Required for higher tier vaults, APY boost
- Mining rate decreases as supply increases

### LAIKA Token
- x100 boost multiplier for Cosmodog community
- Used for optional APY boost
- Returned to user at term end
- Max boost: 50% of USDT investment value

---

## Fee Structure

| Fee Type | Amount | Recipient |
|----------|--------|-----------|
| TAKARA Claim Tax | 5% | Treasury |
| Marketplace Sale | 3% | Platform |
| Instant Sale Discount | 20% | Platform |
| Early Exit | Varies | Treasury |

---

## Security Considerations

1. **JWT Authentication** - Wallet signature verification
2. **Rate Limiting** - 100 requests per 15 minutes
3. **Input Validation** - Server-side validation on all inputs
4. **Transaction Verification** - On-chain confirmation required
5. **Non-custodial** - Users control their wallets

---

*Document generated: January 5, 2026*
*Version: 2.2*
