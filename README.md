# Takara Gold v2.2

**Premium DeFi Investment Platform with TAKARA Mining & NFT Marketplace**

> **Live:** https://takarafi.com (Password: `takara2026`)

## Overview

Takara Gold is a next-generation DeFi platform that combines:

- **USDT Staking** - Up to 20% APY across 16 vault configurations
- **TAKARA Mining** - Mine platform tokens daily (600M supply over 5 years)
- **LAIKA x100 Boost** - Special boost for Cosmodog community
- **NFT Marketplace** - Trade investment positions as WEXEL NFTs

## Key Features

### 16 Vaults (4 Tiers × 4 Durations)

| Duration | STARTER | BASIC | PRO | ELITE |
|----------|---------|-------|-----|-------|
| **18M** | 6.5-7.5% | 7-8% | 7.5-8.3% | 8-8.67% |
| **20M** | 8.5-9.5% | 9-10% | 9.5-10.4% | 10-10.8% |
| **30M** | 13-15% | 14-16% | 15-17% | 16-18% |
| **36M** | 14-16% | 15-17% | 17-19% | 18-20% |

- **STARTER 18M** - No TAKARA required (entry point for new users)
- **All other vaults** - Require TAKARA tokens (5-40 per $100 USDT)

### LAIKA x100 Boost (Cosmodog Community)

Special multiplier for LAIKA holders:

```
Market Value × 100 = Boost Value

Example: $300 USDT investment
- Max boost = $150 (50% of investment)
- LAIKA price = $0.0000007426
- Market value needed = $1.50 ($150 / 100)
- LAIKA needed = ~2,020,000 tokens for full boost
```

### TAKARA Dynamic Pricing

Price grows over 5 years based on:
- **Time Factor** (40%) - Days elapsed since launch
- **Supply Factor** (40%) - Circulating supply
- **Difficulty Factor** (20%) - Mining difficulty

```
Initial: $0.001 → Target: $0.10 (5 years)
Current: ~$0.001507
```

## Architecture

### 2-Step Payment Process

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: USDT Payment (Trust Wallet / MetaMask - EVM)       │
│  → Send USDT to platform wallet on BSC/Ethereum             │
│  → Investment created with status PENDING_TOKENS            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: TAKARA + LAIKA (Phantom - Solana)                  │
│  → Required TAKARA (if vault requires)                      │
│  → Optional LAIKA for APY boost                             │
│  → 72-hour activation delay                                 │
│  → WEXEL NFT minted                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Daily Mining + Scheduled Payouts                           │
│  → TAKARA mined daily based on vault TAKARA APY             │
│  → USDT payouts (monthly/end of term)                       │
│  → 5% tax on TAKARA claims                                  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- Node.js 20 + Express.js + TypeScript
- Prisma ORM + PostgreSQL
- Redis caching
- PM2 process management
- Pino logging

**Frontend:**
- React 18 + Vite + TypeScript
- TanStack Query + Zustand
- Tailwind CSS
- Solana Wallet Adapter
- ethers.js for EVM

**Blockchain:**
- Solana (TAKARA, LAIKA, NFTs)
- EVM (BSC/Ethereum for USDT)
- TRON support (optional)

## Project Structure

```
takara-gold/
├── backend/
│   ├── src/
│   │   ├── controllers/        # API endpoints
│   │   │   ├── investment-2step.controller.ts  # Main investment flow
│   │   │   ├── admin.controller.ts             # Admin operations
│   │   │   └── marketplace.controller.ts       # NFT marketplace
│   │   ├── services/
│   │   │   ├── price.service.ts                # Token prices (LAIKA x100)
│   │   │   ├── takara-pricing.service.ts       # Dynamic TAKARA price
│   │   │   └── solana.service.ts               # Blockchain operations
│   │   ├── jobs/
│   │   │   ├── dailyTakaraMining.ts            # Daily mining
│   │   │   ├── investmentActivation.ts         # 72h activation
│   │   │   └── laikaReturn.ts                  # Return tokens at end
│   │   └── utils/
│   │       ├── laika.calculator.ts             # LAIKA x100 math
│   │       ├── takara.calculator.ts            # TAKARA boost math
│   │       └── mining.calculator.ts            # Mining calculations
│   └── prisma/
│       └── schema.prisma                       # Database schema
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ComingSoonPage.tsx              # Landing (protected)
│   │   │   ├── VaultDetailPage.tsx             # Investment UI
│   │   │   └── admin/                          # Admin panel
│   │   ├── services/
│   │   │   ├── ethereum.service.ts             # EVM wallet
│   │   │   └── api.ts                          # API client
│   │   └── hooks/
│   │       └── useEVMWallet.ts                 # Wallet hook
│   └── .env.production                         # Production config
├── DEVELOPER_GUIDE.md                          # Developer documentation
├── BUSINESS_LOGIC.md                           # Business rules
└── report05.md                                 # Security audit
```

## Quick Start

### Prerequisites

```bash
node >= 20.0.0
npm >= 10.0.0
postgresql >= 15.0
redis >= 7.0
```

### Development Setup

```bash
# Clone
git clone https://github.com/elbek45/Takara1.git
cd takara-gold

# Backend
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Production Deployment

```bash
# Backend
cd backend
npm run build
pm2 start ecosystem.config.js

# Frontend
cd frontend
npm run build
# Deploy dist/ to web server
```

## API Endpoints

### Public
- `GET /api/vaults` - List all vaults
- `GET /api/vaults/:id` - Vault details
- `GET /api/prices` - LAIKA & TAKARA prices
- `GET /api/prices/laika` - LAIKA price
- `GET /api/prices/takara` - TAKARA dynamic price

### Authentication
- `POST /api/auth/nonce` - Get signature nonce
- `POST /api/auth/connect-solana` - Connect Solana wallet

### Investments (Protected)
- `POST /api/investments/2step/init` - Initialize investment
- `POST /api/investments/2step/complete` - Complete with tokens
- `GET /api/investments/my` - User's investments
- `POST /api/investments/:id/claim-takara` - Claim mined TAKARA

### Marketplace
- `GET /api/marketplace` - Browse listings
- `POST /api/marketplace/list` - List NFT
- `POST /api/marketplace/:id/buy` - Buy NFT

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/takara/stats` - TAKARA statistics

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/takara

# Auth
JWT_SECRET=your-secret-key

# Blockchain
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_WALLET_PRIVATE_KEY=...

# Feature Flags
TEST_MODE=false
ENABLE_REAL_NFT_MINTING=true
ENABLE_CRON_JOBS=true
```

### Frontend (.env)

```env
VITE_API_URL=https://takarafi.com/api
VITE_SOLANA_NETWORK=mainnet-beta
VITE_PLATFORM_WALLET_SOL=39YVQH3mg5ZpXKYiszHpxLkept8wsNmYHM3fLi6f7cVy
```

## Security

- JWT authentication with wallet signatures
- Rate limiting on all endpoints
- CORS protection (production domain only)
- Input validation (Zod schemas)
- SQL injection prevention (Prisma)
- 5% tax on TAKARA claims (treasury)

## Testing

```bash
cd backend
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm test -- --coverage      # Coverage report
```

## Documentation

- **DEVELOPER_GUIDE.md** - Complete function reference + TODOs
- **BUSINESS_LOGIC.md** - Business rules and formulas
- **report05.md** - Security audit findings

## URLs

- **Production:** https://takarafi.com
- **Admin Panel:** https://takarafi.com/admin
- **API:** https://takarafi.com/api
- **GitHub:** https://github.com/elbek45/Takara1

## Changelog

### v2.2.1 (January 2026)
- Fixed LAIKA x100 boost calculation
- Added TAKARA dynamic price display
- Fixed text inconsistencies (Trust Wallet)
- Added legacy route redirects
- Updated DEVELOPER_GUIDE with TODOs

### v2.2 (December 2025)
- 16 vault structure (4 tiers × 4 durations)
- LAIKA x100 boost for Cosmodog community
- Coming Soon landing page
- 2-step payment process
- Dynamic TAKARA pricing

### v2.1 (November 2025)
- Initial release
- 9 vault types
- Basic LAIKA boost (1.5x)
- NFT marketplace

---

**Version:** 2.2.1
**Last Updated:** January 6, 2026
**License:** MIT
