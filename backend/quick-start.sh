#!/bin/bash

# Takara Gold - Quick Start Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🏆 Takara Gold v2.1.1 - Quick Start"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20 LTS from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}⚠️  Node.js version is $NODE_VERSION, but 20+ is recommended${NC}"
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL 15+ from https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL detected"

# Step 1: Install dependencies
echo ""
echo -e "${BLUE}[1/5]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 2: Setup environment
echo ""
echo -e "${BLUE}[2/5]${NC} Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env

    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Update .env with generated secret
    sed -i "s/your-super-secret-jwt-key-minimum-32-characters-long-random-string/$JWT_SECRET/" .env

    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}⚠️  Please update .env with your database credentials${NC}"
    echo ""
    echo "Database URL format:"
    echo "  DATABASE_URL=\"postgresql://username:password@localhost:5432/takara_gold\""
    echo ""
    read -p "Press Enter when you've updated .env..."
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Step 3: Generate Prisma Client
echo ""
echo -e "${BLUE}[3/5]${NC} Generating Prisma Client..."
npm run prisma:generate
echo -e "${GREEN}✓${NC} Prisma Client generated"

# Step 4: Run migrations
echo ""
echo -e "${BLUE}[4/5]${NC} Running database migrations..."
echo -e "${YELLOW}Make sure your PostgreSQL database 'takara_gold' exists${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run prisma:migrate
    echo -e "${GREEN}✓${NC} Migrations completed"
else
    echo -e "${RED}Setup cancelled${NC}"
    exit 1
fi

# Step 5: Seed database
echo ""
echo -e "${BLUE}[5/5]${NC} Seeding database with 9 vaults..."
npm run prisma:seed
echo -e "${GREEN}✓${NC} Database seeded successfully"

# Done
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "✅ All 9 Vaults created"
echo "✅ Admin user created (username: admin, password: admin123)"
echo "✅ Mining stats initialized"
echo ""
echo "🚀 Quick Start:"
echo "  npm run dev              # Start development server"
echo "  npm run prisma:studio    # Open database GUI"
echo ""
echo "🌐 Once running:"
echo "  Health:     http://localhost:3000/health"
echo "  API Info:   http://localhost:3000/api"
echo "  Vaults:     http://localhost:3000/api/vaults"
echo "  DB Studio:  http://localhost:5555"
echo ""
echo "📖 Documentation:"
echo "  README.md         - Project overview"
echo "  SETUP_GUIDE.md    - Detailed setup guide"
echo "  SESSION_SUMMARY.md - Implementation summary"
echo ""
echo "Ready to start development? Run: npm run dev"
echo ""
