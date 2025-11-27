# 🏆 Takara Gold v2.1.1

**Premium Investment Platform & NFT Marketplace on Solana**

> **"TAKARA — это новая криптовалюта, которая скоро будет листиться на биржах. Успей намайнить её первым! А в качестве приятного бонуса — получай стабильный доход в USDT."**

## 📋 Overview

Takara Gold is a next-generation DeFi platform built on Solana that allows users to:

- 💰 **Invest USDT** in 9 different Vault types with 4-12% APY
- ⛏️ **Mine TAKARA tokens** daily (600M total supply over 5 years)
- 🚀 **Boost earnings** with LAIKA ($LKI) tokens up to 12% APY
- 🎨 **Trade positions** on integrated NFT marketplace
- 💎 **Own investment NFTs** representing your position

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
- **LAIKA Boost**: Increase APY by depositing $LKI tokens
- **Marketplace**: Sell your position before term ends
- **Dynamic Difficulty**: TAKARA mining difficulty adjusts with network

## 🏗️ Architecture

```
takara-gold/
├── backend/          # Node.js + Express + Prisma
├── frontend/         # React + Vite + TypeScript
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

### Blockchain
- **Network**: Solana Mainnet
- **Framework**: Anchor 0.29
- **RPC**: Helius
- **Wallets**: Phantom, MetaMask Snap

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
1. Deposit LAIKA tokens (max 90% of USDT value)
2. APY increases proportionally to LAIKA deposited
3. LAIKA returned to NFT owner at term end

### Example
```
Investment: $10,000 USDT in Elite Vault 36M
Base APY: 8%
LAIKA Deposited: $9,000 (100% boost)
Final APY: 12% (max for Elite tier)
```

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
- [ ] API implementation
- [ ] Frontend UI
- [ ] Solana integration

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

**Built with ❤️ using Claude Code**

Version: 2.1.1
Last Updated: November 2025
