# 🏆 Takara Gold v2.6

**Premium Dual-Blockchain Investment Platform & NFT Marketplace**

> **"TAKARA — это новая криптовалюта, которая скоро будет листиться на биржах. Успей намайнить её первым! А в качестве приятного бонуса — получай стабильный доход в USDT."**

## 📋 Overview

Takara Gold is a next-generation DeFi platform with **dual-blockchain architecture** that allows users to:

- 💰 **Invest USDT** via Ethereum (ERC-20) or TRON (TRC-20) in 9 different Vault types with 4-12% APY
- ⛏️ **Mine TAKARA tokens** daily on Solana (600M total supply over 5 years)
- 🚀 **Boost earnings** with LAIKA The Cosmodog tokens on Solana up to 12% APY
- 🎨 **Trade positions** on integrated NFT marketplace (Solana)
- 💎 **Own investment NFTs** representing your position (Solana)

## ✨ Key Features

### 🏦 9 Vault Types Across 3 Tiers

| Tier | Duration | Base APY | Max APY | Mining Power |
|------|----------|----------|---------|--------------|
| **Starter** | 12-36M | 4-6% | 8% | 50-150% |
| **Pro** | 12-36M | 4.5-7% | 10% | 120-200% |
| **Elite** | 12-36M | 5-8% | **12%** | 250-350% |

### 🔥 Unique Features

- **NFT-Backed Positions**: Each investment = unique Solana NFT
- **Dual Income**: Stable USDT APY + daily TAKARA mining
- **LAIKA Boost**: Increase APY by depositing LAIKA The Cosmodog tokens
- **Marketplace**: Sell your position before term ends
- **Dynamic Difficulty**: TAKARA mining difficulty adjusts with network

## 🏗️ Architecture

### Dual-Blockchain Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INVESTMENT PROCESS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: USDT Deposit (Ethereum or TRON)                   │
│  ┌──────────────────────────────────────────────┐           │
│  │  MetaMask (ETH)   OR   TronLink (TRC20)     │           │
│  │  └─> Platform Wallet                         │           │
│  └──────────────────────────────────────────────┘           │
│                       ↓                                      │
│  Step 2: TAKARA Requirement (Solana)                        │
│  ┌──────────────────────────────────────────────┐           │
│  │  Phantom Wallet                              │           │
│  │  └─> Transfer TAKARA (Tier 2/3 only)        │           │
│  └──────────────────────────────────────────────┘           │
│                       ↓                                      │
│  Step 3: LAIKA Boost (Optional, Solana)                     │
│  ┌──────────────────────────────────────────────┐           │
│  │  Phantom Wallet                              │           │
│  │  └─> Transfer LAIKA for APY boost           │           │
│  └──────────────────────────────────────────────┘           │
│                       ↓                                      │
│  Step 4: NFT Minting & Rewards (Solana)                     │
│  ┌──────────────────────────────────────────────┐           │
│  │  Investment NFT minted to Phantom           │           │
│  │  TAKARA mining rewards daily                 │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
takara-gold/
├── backend/          # Node.js + Express + Prisma
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── services/
│   │   │   ├── ethereum.service.ts    # MetaMask integration
│   │   │   └── solana.service.ts      # Phantom integration
│   │   ├── hooks/
│   │   │   ├── useMetaMask.ts         # Ethereum wallet hook
│   │   │   └── useTronLink.ts         # TronLink hook
│   │   └── types/
│   │       └── blockchain.ts          # Multi-chain types
├── contracts/        # Solana Smart Contracts (Anchor)
└── docs/            # Documentation
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Jobs**: BullMQ 5.x

### Frontend
- **Framework**: React 18
- **Build**: Vite 5
- **Language**: TypeScript 5
- **UI**: Shadcn/UI + Tailwind CSS 3
- **State**: Zustand + TanStack Query
- **Routing**: React Router 6

### Blockchain (Dual-Chain Architecture)

**Ethereum Chain (USDT Deposits)**
- **Network**: Ethereum Mainnet
- **Standard**: ERC-20
- **Library**: ethers.js 6.9
- **Wallet**: MetaMask
- **USDT Contract**: `0xdac17f958d2ee523a2206206994597c13d831ec7`

**Solana Chain (Tokens & NFTs)**
- **Network**: Solana Mainnet
- **Framework**: Anchor 0.29
- **RPC**: Helius
- **Wallet**: Phantom
- **Tokens**: TAKARA, LAIKA

## 🚀 Quick Start

### Prerequisites

```bash
# Required
node >= 20.0.0
npm >= 10.0.0
postgresql >= 15.0
redis >= 7.0

# For contracts
rust >= 1.70
solana-cli >= 1.16
anchor-cli >= 0.29
```

### Installation

```bash
# Clone repository
git clone <repo-url>
cd takara-gold

# Install backend
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run prisma:migrate
npm run prisma:seed

# Start backend
npm run dev  # http://localhost:3000

# Install frontend
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your configuration

# Start frontend
npm run dev  # http://localhost:5173
```

## 📊 Database Schema

### Core Models

- **User**: User accounts with Solana wallet
- **Vault**: 9 predefined vault configurations
- **Investment**: User investments with NFT tracking
- **LaikaBoost**: LAIKA boost data per investment
- **TakaraMining**: Daily mining records
- **MarketplaceListing**: NFT marketplace listings
- **WithdrawalRequest**: Token withdrawal requests

## 🔐 Security Features

- ✅ JWT authentication
- ✅ Solana wallet signature verification
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ CORS protection
- ✅ Input validation (Zod)
- ✅ SQL injection prevention (Prisma)

## 📈 Investment Tiers

### Tier 1: Starter (Entry Level)
- **Requirement**: USDT only
- **Min**: $100
- **Max APY**: 8%
- **Best for**: Beginners

### Tier 2: Pro (Intermediate)
- **Requirement**: USDT + 30 TAKARA per 100 USDT
- **Min**: $1,000
- **Max APY**: 10%
- **Best for**: Active investors

### Tier 3: Elite (Premium)
- **Requirement**: USDT + 50 TAKARA per 100 USDT
- **Min**: $5,000
- **Max APY**: **12%** 🔥
- **Mining Power**: Up to **350%** ⚡
- **Best for**: Serious investors

## ⛏️ TAKARA Mining

### Tokenomics
- **Total Supply**: 600,000,000 TAKARA
- **Mining Period**: 5 years (60 months)
- **Distribution**: Daily to active investors
- **Difficulty**: Dynamic (increases with network growth)

### Mining Formula
```typescript
daily_takara = (mining_power / 100) × (usdt_invested / 1000) × base_rate / difficulty
```

## 💜 LAIKA Boost System

### How It Works
1. **Real-time pricing** from DexScreener API (Solana DEX aggregator)
2. **Platform rate**: 50% more LAIKA required than market rate
   - Market: 0.5 LAIKA = 1 USDT
   - Platform: 0.75 LAIKA = 1 USDT (for boost calculation)
3. **Max boost**: 50% of USDT investment value
4. APY increases proportionally to effective LAIKA boost value
5. LAIKA returned to NFT owner at term end

### Boost Formula
```typescript
boost_value = laika_market_value / 1.50  // Platform requires 50% more LAIKA
max_boost = usdt_invested * 0.50         // Max 50% of investment
effective_boost = min(boost_value, max_boost)
```

### Example
```
Investment: $10,000 USDT in Elite Vault 36M
Base APY: 8%
Max APY: 12%
Max Boost Value: $5,000 (50% of $10,000)

To achieve full boost:
- Need $7,500 worth of LAIKA at market price
- Boost value: $7,500 / 1.5 = $5,000 (100% fill)
- Final APY: 12% (max for Elite tier)
```

### LAIKA Token
- **Mint**: `Euoq6CyQFCjCVSLR9wFaUPDW19Y6ZHwEcJoZsEi643i1`
- **Chain**: Solana
- **Price Source**: DexScreener (primary), CoinGecko (fallback)
- **Cache**: 1 hour TTL

## 🎨 NFT Marketplace

- List your investment NFT for sale
- Set your own price
- 2.5% platform fee
- Buyer gets all future yields + LAIKA
- On-chain ownership transfer

## 📝 API Endpoints

### Authentication
- `POST /api/auth/nonce` - Get signature nonce
- `POST /api/auth/login` - Login with wallet signature

### Vaults
- `GET /api/vaults` - List all 9 vaults
- `GET /api/vaults/:id` - Get vault details

### Investments
- `POST /api/investments` - Create investment
- `GET /api/investments/my` - My investments
- `POST /api/investments/:id/claim-yield` - Claim USDT yield
- `POST /api/investments/:id/claim-takara` - Claim mined TAKARA

### LAIKA Boost
- `POST /api/investments/:id/laika-boost` - Add LAIKA boost
- `GET /api/laika/calculator` - Calculate boost APY

### Marketplace
- `GET /api/marketplace` - Browse listings
- `POST /api/marketplace/list` - List NFT for sale
- `POST /api/marketplace/:id/buy` - Purchase NFT

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:watch

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Backend (Node.js)
```bash
npm run build
npm start
```

### Frontend (Static)
```bash
npm run build
# Deploy dist/ to Vercel/Netlify/Cloudflare
```

### Database
- Use managed PostgreSQL (Supabase/AWS RDS)
- Enable automated backups
- Set up connection pooling

## 🔮 Roadmap

### Phase 1: MVP (Current)
- [x] 9 Vault types
- [x] LAIKA boost system
- [x] TAKARA mining calculator
- [x] Database schema
- [x] API implementation
- [x] Frontend UI
- [x] Dual-blockchain integration (Ethereum + Solana)
- [x] MetaMask integration for USDT (ERC-20)
- [x] Phantom wallet integration for TAKARA/LAIKA
- [x] TronLink integration for USDT (TRC-20)

### Phase 2: Launch
- [ ] Smart contract deployment
- [ ] NFT minting
- [ ] Marketplace
- [ ] Admin panel
- [ ] Production deployment

### Phase 3: Growth
- [ ] Mobile app
- [ ] Referral system
- [ ] Staking mechanism
- [ ] DAO governance
- [ ] TAKARA exchange listing

## 📄 License

MIT License

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📞 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@takaragold.io

---

## Changelog

### v2.6 (December 2025)
- **LAIKA Boost v2.6**: Platform requires 50% more LAIKA than market rate
- **DexScreener Integration**: Real-time LAIKA pricing from Solana DEXes
- **Price Sources Priority**: DexScreener -> CoinGecko -> CoinMarketCap
- **Boost Formula**: `boost_value = market_value / 1.50`

### v2.5 (December 2025)
- LAIKA boost system improvements
- Price caching (1 hour TTL)

### v2.2 (December 2025)
- Dual-blockchain architecture (Ethereum + Solana)
- MetaMask and Phantom wallet integration
- TronLink support for TRC-20 USDT

---

Version: 2.6
Last Updated: December 2025
