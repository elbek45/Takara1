# Testing Guide - Takara Gold Backend

Comprehensive testing suite for the Takara Gold platform backend.

## Quick Start

```bash
# Setup test database (one-time)
./scripts/setup-test-db.sh

# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Test Structure

```
backend/src/__tests__/
├── api/
│   ├── auth.test.ts         # Authentication API tests (25 tests)
│   ├── vault.test.ts        # Vault API tests (30 tests)
│   └── investment.test.ts   # Investment API tests (35 tests)
├── helpers/
│   ├── testUtils.ts         # Test utilities and helpers
│   └── mockData.ts          # Mock data fixtures
└── setup.ts                 # Jest setup configuration
```

## Test Coverage

### Authentication API (`auth.test.ts`)

**25 test cases covering:**

- ✅ User registration (validation, duplicates, weak passwords)
- ✅ Login (email/username, password validation)
- ✅ JWT authentication (token validation, expiration)
- ✅ Wallet connections (Ethereum, Solana)
- ✅ Admin authentication
- ✅ Rate limiting

**Key scenarios:**
```typescript
// Registration
POST /api/auth/register
  ✓ Should register new user
  ✓ Should reject duplicate email
  ✓ Should reject weak password

// Login
POST /api/auth/login-password
  ✓ Should login with correct credentials
  ✓ Should reject wrong password

// JWT
GET /api/auth/me
  ✓ Should return user with valid token
  ✓ Should reject expired token
```

### Vault API (`vault.test.ts`)

**30 test cases covering:**

- ✅ GET all vaults (filtering, sorting)
- ✅ GET vault by ID (404 handling)
- ✅ Investment calculation (TAKARA requirements, LAIKA boost)
- ✅ Vault tier configurations (Starter, Pro, Elite)
- ✅ Payout schedules (Monthly, Quarterly, End of Term)
- ✅ Capacity tracking

**Key scenarios:**
```typescript
// Get vaults
GET /api/vaults
  ✓ Should return all active vaults
  ✓ Should sort by tier
  ✓ Should work without authentication

// Calculate investment
POST /api/vaults/:id/calculate
  ✓ Should calculate TAKARA requirement
  ✓ Should calculate with LAIKA boost
  ✓ Should reject amount below minimum
```

### Investment API (`investment.test.ts`)

**35 test cases covering:**

- ✅ Create investment (with/without LAIKA boost)
- ✅ Get my investments (filtering, pagination)
- ✅ Get investment by ID (authorization)
- ✅ Claim yield (USDT)
- ✅ Claim TAKARA tokens
- ✅ Investment status flow
- ✅ NFT minting tracking
- ✅ Earnings tracking

**Key scenarios:**
```typescript
// Create investment
POST /api/investments
  ✓ Should create investment successfully
  ✓ Should reject amount below minimum
  ✓ Should create with LAIKA boost

// Get investments
GET /api/investments/my
  ✓ Should return all user investments
  ✓ Should filter by status
  ✓ Should require authentication

// Claim rewards
POST /api/investments/:id/claim-yield
  ✓ Should claim pending USDT
  ✓ Should reject if no pending yield
```

## Test Utilities

### Helper Functions (`testUtils.ts`)

```typescript
// Database
await cleanDatabase()           // Clean all tables
await disconnectPrisma()        // Disconnect after tests

// Users
const user = await createTestUser({ email, password })
const adminUser = await createTestAdminUser()

// Tokens
const token = generateTestToken(userId)
const expiredToken = generateExpiredToken(userId)

// Vaults & Investments
const vault = await createTestVault(vaultData)
const investment = await createTestInvestment(userId, vaultId)
```

### Mock Data (`mockData.ts`)

```typescript
// Users
mockUsers.validUser
mockUsers.adminUser
mockUsers.weakPassword

// Vaults
mockVaults.starter12M
mockVaults.pro30M
mockVaults.elite36M

// Investments
mockInvestments.validInvestment
mockInvestments.proInvestmentWithTAKARA
mockInvestments.eliteInvestmentWithBoost
```

## Test Database

**Database:** `takara_test`
**User:** `takara`
**Password:** `takara_password`

The test database is automatically created and migrated by `setup-test-db.sh`.

### Manual Database Commands

```bash
# Create database
PGPASSWORD='takara_password' psql -U takara -h localhost -d takara_gold -c "CREATE DATABASE takara_test;"

# Run migrations
export DATABASE_URL="postgresql://takara:takara_password@localhost:5432/takara_test"
npx prisma migrate deploy

# Drop database (for cleanup)
PGPASSWORD='takara_password' psql -U takara -h localhost -d takara_gold -c "DROP DATABASE takara_test;"
```

## Running Tests

### Run All Tests

```bash
npm test
```

Expected output:
```
PASS  src/__tests__/api/auth.test.ts
PASS  src/__tests__/api/vault.test.ts
PASS  src/__tests__/api/investment.test.ts

Test Suites: 3 passed, 3 total
Tests:       90 passed, 90 total
```

### Run Specific Suite

```bash
# Authentication tests only
npm test -- auth.test.ts

# Vault tests only
npm test -- vault.test.ts

# Investment tests only
npm test -- investment.test.ts
```

### Run with Coverage

```bash
npm run test:coverage
```

Coverage report generated in `/coverage` directory.

### Watch Mode

```bash
npm run test:watch
```

Tests re-run automatically on file changes.

## Testing Best Practices

### 1. Database Cleanup

Always clean database in `beforeAll` and `afterEach`:

```typescript
beforeAll(async () => {
  await cleanDatabase();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectPrisma();
});
```

### 2. Isolated Tests

Each test should be independent and not rely on other tests:

```typescript
beforeEach(async () => {
  // Create fresh data for each test
  user = await createTestUser();
  vault = await createTestVault();
});
```

### 3. Clear Assertions

Use descriptive expectations:

```typescript
// ✅ Good
expect(response.status).toBe(201);
expect(response.body).toHaveProperty('token');
expect(response.body.user.email).toBe('test@example.com');

// ❌ Avoid
expect(response).toBeTruthy();
```

### 4. Test Names

Use clear, descriptive test names:

```typescript
// ✅ Good
it('should reject registration with duplicate email', ...)

// ❌ Avoid
it('test registration', ...)
```

## Troubleshooting

### Database Connection Errors

```
Error: Authentication failed against database server
```

**Solution:** Ensure PostgreSQL is running and credentials are correct:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection
PGPASSWORD='takara_password' psql -U takara -h localhost -d takara_gold -c "SELECT 1"
```

### Test Database Not Found

```
Error: database "takara_test" does not exist
```

**Solution:** Run setup script:
```bash
cd backend
./scripts/setup-test-db.sh
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Tests use the same app instance, no need to start separate server.

### Jest Hanging

```
Jest did not exit one second after the test run has completed
```

**Solution:** Ensure `disconnectPrisma()` is called in `afterAll`:
```typescript
afterAll(async () => {
  await disconnectPrisma();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: takara
          POSTGRES_PASSWORD: takara_password
          POSTGRES_DB: takara_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm test
```

## Future Tests

**Pending implementation:**

- ⏳ Blockchain service tests (Ethereum, Solana, NFT minting)
- ⏳ Marketplace tests (listings, purchases)
- ⏳ Withdrawal tests (requests, approvals)
- ⏳ Admin tests (user management, system config)

## Contributing

When adding new tests:

1. Follow existing test structure
2. Add mock data to `mockData.ts` if needed
3. Use helper functions from `testUtils.ts`
4. Ensure all tests pass: `npm test`
5. Update this documentation

---

**Current Coverage:** 90+ tests across 3 API endpoints
**Last Updated:** 2025-11-30
