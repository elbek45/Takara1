#!/bin/bash

# =========================================
# Setup Test Database for Jest Tests
# =========================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setting up test database...${NC}"
echo -e "${GREEN}========================================${NC}"

# Database credentials (matches production)
DB_USER="takara"
DB_PASSWORD="takara_password"
DB_NAME="takara_test"
DB_HOST="localhost"

# Check if test database exists
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -d takara_gold -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}⚠  Database '$DB_NAME' already exists${NC}"
else
    echo -e "${GREEN}Creating database '$DB_NAME'...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -d takara_gold -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Run migrations
echo -e "${GREEN}Running Prisma migrations...${NC}"
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"
npx prisma migrate deploy

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Test database ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Run tests with: ${YELLOW}npm test${NC}"
