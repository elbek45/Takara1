# 🚀 Takara Gold v2.1.1 - Setup Guide

Complete step-by-step guide to get Takara Gold running locally.

---

## 📋 Prerequisites

### Required Software

```bash
# Node.js 20 LTS or higher
node --version  # Should be >= 20.0.0

# npm (comes with Node.js)
npm --version   # Should be >= 10.0.0

# PostgreSQL 15 or higher
psql --version  # Should be >= 15.0

# Optional: Redis (for caching and queues)
redis-cli --version
```

### Installation Links

- **Node.js**: https://nodejs.org/ (Download LTS version)
- **PostgreSQL**: https://www.postgresql.org/download/
- **Redis**: https://redis.io/download (Optional but recommended)

---

## 🔧 Backend Setup

### Step 1: Install Dependencies

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend
npm install
```

This will install:
- Express.js (web framework)
- Prisma (database ORM)
- Solana libraries
- TypeScript
- And all other dependencies

### Step 2: Setup PostgreSQL Database

```bash
# Login to PostgreSQL as superuser
sudo -u postgres psql

# Create database
CREATE DATABASE takara_gold;

# Create user
CREATE USER takara WITH PASSWORD 'takara_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE takara_gold TO takara;

# Exit
\q
```

### Step 3: Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Required configuration in `.env`:**

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://takara:takara_password@localhost:5432/takara_gold"

# JWT (generate a secure secret)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-random-string
JWT_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
PLATFORM_WALLET_PRIVATE_KEY=your-base58-encoded-private-key

# Tokens (will be created during deployment)
USDT_TOKEN_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
TAKARA_TOKEN_MINT=
LAIKA_TOKEN_MINT=

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Background Jobs
ENABLE_CRON_JOBS=true

# Logging
LOG_LEVEL=info
```

**Generate secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (create tables)
npm run prisma:migrate

# Seed database with 9 vaults
npm run prisma:seed
```

**Expected output:**
```
🌱 Starting database seed...
🧹 Cleaning existing data...
✅ Existing data cleaned
📦 Seeding 9 Vaults...
  ✓ Created: Starter Vault 12M
  ✓ Created: Starter Vault 30M
  ✓ Created: Starter Vault 36M
  ✓ Created: Pro Vault 12M
  ✓ Created: Pro Vault 30M
  ✓ Created: Pro Vault 36M
  ✓ Created: Elite Vault 12M
  ✓ Created: Elite Vault 30M
  ✓ Created: Elite Vault 36M
✅ All 9 Vaults seeded
📊 Initializing mining stats...
✅ Mining stats initialized
⚙️ Seeding system configuration...
✅ System configuration seeded
👤 Creating admin user...
✅ Admin user created (username: admin, password: admin123)

📋 Seed Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Vaults: 9
  System Configs: 6
  Admin Users: 1

🎉 Database seed completed successfully!
```

### Step 5: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
✅ Database connected
🚀 Takara Gold v2.1.1 running on port 3000
📝 Environment: development
🌐 CORS origins: http://localhost:5173, http://localhost:5174
```

### Step 6: Verify Installation

Open another terminal and test the API:

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-26T...",
  "version": "2.1.1",
  "database": "connected"
}

# API info
curl http://localhost:3000/api

# List all vaults
curl http://localhost:3000/api/vaults
```

---

## 🗄️ Database Management

### Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

Opens at: http://localhost:5555

Browse and edit:
- Users
- Vaults
- Investments
- Mining records
- And more...

### Common Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Re-seed database
npm run prisma:seed

# Check database status
npx prisma migrate status
```

---

## 🧪 Testing the API

### 1. Get Nonce for Wallet Signature

```bash
curl "http://localhost:3000/api/auth/nonce?walletAddress=YOUR_WALLET_ADDRESS"
```

### 2. Get All Vaults

```bash
curl http://localhost:3000/api/vaults | jq
```

### 3. Get Specific Vault

```bash
curl http://localhost:3000/api/vaults/VAULT_ID | jq
```

### 4. Calculate Investment

```bash
curl -X POST http://localhost:3000/api/vaults/VAULT_ID/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "usdtAmount": 10000,
    "laikaBoostUSD": 9000
  }' | jq
```

### 5. Admin Login

```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' | jq
```

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Verify connection
psql -U takara -d takara_gold -h localhost
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 PID

# Or change PORT in .env
PORT=3001
```

### Prisma Generate Fails

**Error:** `Cannot find module '.prisma/client'`

**Solution:**
```bash
# Regenerate Prisma Client
npm run prisma:generate

# If still failing, delete and regenerate
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Migration Issues

**Error:** `Migration failed`

**Solution:**
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or manually fix
psql -U takara -d takara_gold
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Then re-run migrations
npm run prisma:migrate
npm run prisma:seed
```

---

## 📊 Available Scripts

```bash
# Development
npm run dev              # Start with hot reload (tsx watch)
npm run build            # Compile TypeScript to JavaScript
npm start                # Run compiled JavaScript

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database

# Testing
npm test                 # Run tests (when implemented)
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

---

## 🔐 Security Notes

### For Development

✅ **OK for development:**
- Using `admin` / `admin123` credentials
- `SOLANA_NETWORK=devnet`
- Simple JWT_SECRET
- CORS open to localhost

### For Production

⚠️ **MUST CHANGE:**
- [ ] Generate secure admin password hash with bcrypt
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Set `SOLANA_NETWORK=mainnet-beta`
- [ ] Use mainnet RPC (Helius/QuickNode)
- [ ] Restrict CORS to production domains
- [ ] Enable HTTPS/SSL
- [ ] Use environment secrets manager (AWS Secrets Manager, etc.)
- [ ] Set `NODE_ENV=production`
- [ ] Enable rate limiting
- [ ] Add monitoring (Sentry, DataDog)

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── constants.ts      # App constants
│   │   ├── database.ts       # Prisma client
│   │   └── vaults.config.ts  # 9 Vault configurations
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── vault.controller.ts
│   │   └── investment.controller.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   ├── services/
│   │   └── solana.service.ts
│   ├── utils/
│   │   ├── laika.calculator.ts
│   │   ├── mining.calculator.ts
│   │   └── apy.calculator.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── vault.routes.ts
│   │   ├── investment.routes.ts
│   │   └── index.ts
│   ├── jobs/
│   │   └── dailyTakaraMining.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts                # Main application
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed script
├── package.json
├── tsconfig.json
└── .env
```

---

## 🎯 Next Steps

After backend is running:

1. **Test all endpoints** with Postman or curl
2. **Set up frontend** (React + Vite)
3. **Deploy Solana contracts** (Anchor)
4. **Create NFT assets** and upload to IPFS
5. **Set up production database** (AWS RDS/Supabase)
6. **Configure CI/CD** (GitHub Actions)
7. **Deploy to production** (VPS/Vercel/Railway)

---

## 📞 Support

**Documentation:**
- README.md - Overview
- SETUP_GUIDE.md - This file
- IMPLEMENTATION_STATUS.md - Progress tracking

**Logs:**
- Backend logs: `stdout` (visible in terminal)
- Database logs: Prisma logs in console

**Database GUI:**
- Prisma Studio: http://localhost:5555

---

**Setup Complete! 🎉**

Your Takara Gold backend is now running and ready to accept requests!
