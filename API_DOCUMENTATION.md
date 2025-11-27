# 📡 Takara Gold API Documentation v2.1.1

Complete API reference for all endpoints.

**Base URL**: `http://localhost:3000/api`

---

## 📑 Table of Contents

1. [Authentication](#authentication)
2. [Vaults](#vaults)
3. [Investments](#investments)
4. [Marketplace](#marketplace)
5. [Admin](#admin)
6. [Response Formats](#response-formats)
7. [Error Codes](#error-codes)

---

## 🔐 Authentication

### Get Nonce
Generate a nonce for wallet signature verification.

```http
GET /api/auth/nonce?walletAddress={address}
```

**Query Parameters:**
- `walletAddress` (string, required) - Solana wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123...",
    "message": "Sign this message to authenticate...",
    "expiresAt": "2025-11-26T12:00:00Z"
  }
}
```

---

### Login with Wallet
Authenticate using Solana wallet signature.

```http
POST /api/auth/login
```

**Body:**
```json
{
  "walletAddress": "7rXW8Sjiz4u7dd1afhid1K7oQiSXghtEpop9zxLSjbha",
  "signature": "base58_encoded_signature"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "walletAddress": "7rXW...",
    "username": null,
    "email": null
  }
}
```

---

### Admin Login
Authenticate as admin using username/password.

```http
POST /api/auth/admin/login
```

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@takaragold.io",
    "role": "SUPER_ADMIN"
  }
}
```

---

### Get Current User
Get authenticated user information.

```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "walletAddress": "7rXW...",
    "username": null,
    "email": null,
    "role": "USER",
    "totalInvested": "10000.00",
    "totalEarnedUSDT": "450.50",
    "totalMinedTAKARA": "1250.00",
    "createdAt": "2025-11-01T10:00:00Z",
    "lastLoginAt": "2025-11-26T12:00:00Z"
  }
}
```

---

## 🏦 Vaults

### List All Vaults
Get all available vaults with optional filters.

```http
GET /api/vaults?tier={tier}&duration={months}&isActive={boolean}
```

**Query Parameters:**
- `tier` (optional) - STARTER, PRO, or ELITE
- `duration` (optional) - 12, 30, or 36
- `isActive` (optional) - true or false

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Elite Vault 36M",
      "tier": "ELITE",
      "duration": 36,
      "payoutSchedule": "END_OF_TERM",
      "minInvestment": 5000,
      "maxInvestment": 1000000,
      "baseAPY": 8.0,
      "maxAPY": 12.0,
      "miningPower": 350,
      "requireTAKARA": true,
      "takaraRatio": 50,
      "currentFilled": "150000.00",
      "totalCapacity": null,
      "activeInvestments": 15
    }
  ]
}
```

---

### Get Vault Details
Get detailed information about a specific vault.

```http
GET /api/vaults/{vaultId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "id": "uuid",
      "name": "Elite Vault 36M",
      "tier": "ELITE",
      "duration": 36,
      "payoutSchedule": "END_OF_TERM",
      "minInvestment": 5000,
      "maxInvestment": 1000000,
      "baseAPY": 8.0,
      "maxAPY": 12.0,
      "miningPower": 350,
      "requireTAKARA": true,
      "takaraRatio": 50,
      "currentFilled": "150000.00",
      "activeInvestments": 15
    },
    "stats": {
      "averageAPY": 11.2,
      "totalTakaraMined": 45000.50,
      "recentInvestments": [...]
    }
  }
}
```

---

### Calculate Investment
Calculate estimated returns for an investment.

```http
POST /api/vaults/{vaultId}/calculate
```

**Body:**
```json
{
  "usdtAmount": 10000,
  "laikaBoostUSD": 9000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "id": "uuid",
      "name": "Elite Vault 36M",
      "tier": "ELITE",
      "duration": 36
    },
    "investment": {
      "usdtAmount": 10000,
      "requiredTAKARA": 5000,
      "laikaBoostUSD": 9000
    },
    "earnings": {
      "baseAPY": 8.0,
      "laikaBoostAPY": 4.0,
      "finalAPY": 12.0,
      "totalUSDT": 3600.00,
      "monthlyUSDT": 100.00,
      "payoutSchedule": "END_OF_TERM",
      "numberOfPayouts": 1,
      "payoutAmount": 3600.00
    },
    "mining": {
      "miningPower": 350,
      "currentDifficulty": 1.05,
      "dailyTAKARA": 35.00,
      "monthlyTAKARA": 1050.00,
      "totalTAKARA": 37800.00
    },
    "summary": {
      "totalInvestment": 24000,
      "totalUSDTReturn": 13600.00,
      "totalTAKARAMined": 37800.00,
      "roi": "36.00%"
    }
  }
}
```

---

## 💰 Investments

### Create Investment
Create a new investment in a vault.

```http
POST /api/investments
Authorization: Bearer {token}
```

**Body:**
```json
{
  "vaultId": "uuid",
  "usdtAmount": 10000,
  "takaraAmount": 5000,
  "laikaBoost": {
    "laikaAmount": 9000,
    "laikaValueUSD": 9000
  },
  "txSignature": "solana_tx_signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Investment created successfully",
  "data": {
    "investment": {
      "id": "uuid",
      "vaultName": "Elite Vault 36M",
      "usdtAmount": 10000,
      "finalAPY": 12.0,
      "startDate": "2025-11-26T12:00:00Z",
      "endDate": "2028-11-26T12:00:00Z",
      "activationDate": "2025-11-29T12:00:00Z",
      "status": "PENDING",
      "laikaBoost": {
        "laikaAmount": 9000,
        "additionalAPY": 4.0
      }
    }
  }
}
```

---

### Get My Investments
Get all investments for authenticated user.

```http
GET /api/investments/my?status={status}
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (optional) - PENDING, ACTIVE, COMPLETED, etc.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vaultName": "Elite Vault 36M",
      "vaultTier": "ELITE",
      "usdtAmount": 10000,
      "takaraLocked": 5000,
      "finalAPY": 12.0,
      "startDate": "2025-11-26T12:00:00Z",
      "endDate": "2028-11-26T12:00:00Z",
      "status": "ACTIVE",
      "totalEarnedUSDT": 450.00,
      "totalMinedTAKARA": 1250.00,
      "pendingUSDT": 50.00,
      "pendingTAKARA": 35.00,
      "nftMintAddress": "nft_mint_address",
      "laikaBoost": {
        "laikaAmount": 9000,
        "additionalAPY": 4.0,
        "isReturned": false
      },
      "lastMiningDate": "2025-11-26T00:00:00Z"
    }
  ]
}
```

---

### Get Investment Details
Get detailed information about a specific investment.

```http
GET /api/investments/{investmentId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vault": {
      "id": "uuid",
      "name": "Elite Vault 36M",
      "tier": "ELITE",
      "duration": 36,
      "payoutSchedule": "END_OF_TERM"
    },
    "usdtAmount": 10000,
    "takaraLocked": 5000,
    "finalAPY": 12.0,
    "startDate": "2025-11-26T12:00:00Z",
    "endDate": "2028-11-26T12:00:00Z",
    "status": "ACTIVE",
    "earnings": {
      "totalUSDT": 450.00,
      "pendingUSDT": 50.00,
      "totalTAKARA": 1250.00,
      "pendingTAKARA": 35.00
    },
    "laikaBoost": {
      "laikaAmount": 9000,
      "laikaValueUSD": 9000,
      "additionalAPY": 4.0,
      "isReturned": false,
      "returnDate": null
    },
    "mining": {
      "history": [
        {
          "date": "2025-11-26T00:00:00Z",
          "amount": 35.00,
          "difficulty": 1.05
        }
      ]
    },
    "nft": {
      "mintAddress": "nft_mint_address",
      "metadataUri": "https://metadata.takaragold.io/...",
      "isListed": false
    }
  }
}
```

---

### Claim USDT Yield
Claim pending USDT earnings.

```http
POST /api/investments/{investmentId}/claim-yield
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Yield claimed successfully",
  "data": {
    "amountClaimed": 50.00,
    "totalEarned": 500.00
  }
}
```

---

### Claim TAKARA
Claim pending mined TAKARA tokens.

```http
POST /api/investments/{investmentId}/claim-takara
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "TAKARA claimed successfully",
  "data": {
    "amountClaimed": 35.00,
    "totalMined": 1285.00
  }
}
```

---

## 🎨 Marketplace

### Browse Marketplace
Get all active NFT listings.

```http
GET /api/marketplace?status={status}&sortBy={field}&sortOrder={asc|desc}&minPrice={number}&maxPrice={number}
```

**Query Parameters:**
- `status` (optional) - ACTIVE, SOLD, CANCELLED
- `sortBy` (optional) - createdAt, priceUSDT
- `sortOrder` (optional) - asc, desc
- `minPrice` (optional) - Minimum price filter
- `maxPrice` (optional) - Maximum price filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "investmentId": "uuid",
      "priceUSDT": 12000,
      "originalInvestment": 10000,
      "currentValue": 10450,
      "vault": {
        "id": "uuid",
        "name": "Elite Vault 36M",
        "tier": "ELITE",
        "duration": 36
      },
      "finalAPY": 12.0,
      "remainingMonths": 30,
      "totalEarnedUSDT": 450.00,
      "totalMinedTAKARA": 1250.00,
      "laikaBoost": {
        "laikaAmount": 9000,
        "additionalAPY": 4.0
      },
      "seller": {
        "walletAddress": "7rXW...",
        "username": null
      },
      "nftMintAddress": "nft_mint_address",
      "createdAt": "2025-11-26T12:00:00Z",
      "platformFee": 2.5
    }
  ]
}
```

---

### Get Marketplace Stats
Get marketplace statistics.

```http
GET /api/marketplace/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeListings": 15,
    "totalSold": 45,
    "totalVolume": 550000.00,
    "avgSalePrice": 12222.22,
    "recentSales": [...]
  }
}
```

---

### List NFT for Sale
List your investment NFT on the marketplace.

```http
POST /api/marketplace/list
Authorization: Bearer {token}
```

**Body:**
```json
{
  "investmentId": "uuid",
  "priceUSDT": 12000
}
```

**Response:**
```json
{
  "success": true,
  "message": "NFT listed on marketplace",
  "data": {
    "listingId": "uuid",
    "investmentId": "uuid",
    "vaultName": "Elite Vault 36M",
    "priceUSDT": 12000,
    "platformFee": "2.5%",
    "sellerReceives": 11700
  }
}
```

---

### Purchase NFT
Buy an NFT from the marketplace.

```http
POST /api/marketplace/{listingId}/buy
Authorization: Bearer {token}
```

**Body:**
```json
{
  "txSignature": "solana_tx_signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "NFT purchased successfully",
  "data": {
    "investmentId": "uuid",
    "vaultName": "Elite Vault 36M",
    "pricePaid": 12000,
    "platformFee": 300,
    "sellerReceived": 11700,
    "nftMintAddress": "nft_mint_address",
    "laikaIncluded": true
  }
}
```

---

### Cancel Listing
Cancel your marketplace listing.

```http
DELETE /api/marketplace/{listingId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Listing cancelled successfully"
}
```

---

### Get My Listings
Get all your marketplace listings.

```http
GET /api/marketplace/my-listings
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "investmentId": "uuid",
      "vaultName": "Elite Vault 36M",
      "priceUSDT": 12000,
      "originalInvestment": 10000,
      "status": "ACTIVE",
      "createdAt": "2025-11-26T12:00:00Z",
      "soldAt": null,
      "soldPrice": null
    }
  ]
}
```

---

## 👨‍💼 Admin

**Note:** All admin endpoints require admin authentication token.

### Get Dashboard Stats
Get admin dashboard statistics.

```http
GET /api/admin/dashboard
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 150,
      "totalInvestments": 245,
      "totalValueLocked": 2450000.00,
      "totalUSDTPaid": 125000.00,
      "totalTAKARAMined": 875000.00,
      "activeInvestments": 200,
      "pendingWithdrawals": 5,
      "marketplaceListings": 15
    },
    "recentUsers": [...],
    "recentInvestments": [...]
  }
}
```

---

### Get All Users
Get all users with pagination and filters.

```http
GET /api/admin/users?page={page}&limit={limit}&search={query}&isActive={boolean}
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page
- `search` (optional) - Search by wallet/username/email
- `isActive` (optional) - Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### Get All Investments
Get all investments with filters.

```http
GET /api/admin/investments?page={page}&limit={limit}&status={status}&vaultId={id}
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

---

### Get Withdrawal Requests
Get all withdrawal requests.

```http
GET /api/admin/withdrawals?page={page}&limit={limit}&status={status}
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": "username",
      "userWallet": "7rXW...",
      "amount": 1000,
      "tokenType": "USDT",
      "destinationWallet": "destination_address",
      "status": "PENDING",
      "createdAt": "2025-11-26T12:00:00Z",
      "processedAt": null,
      "processedBy": null,
      "txSignature": null,
      "rejectionReason": null
    }
  ],
  "pagination": {...}
}
```

---

### Process Withdrawal
Approve or reject a withdrawal request.

```http
PUT /api/admin/withdrawals/{withdrawalId}/process
Authorization: Bearer {admin_token}
```

**Body (Approve):**
```json
{
  "action": "approve",
  "txSignature": "solana_tx_signature"
}
```

**Body (Reject):**
```json
{
  "action": "reject",
  "rejectionReason": "Insufficient funds"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal approved and processed",
  "data": {
    "withdrawalId": "uuid",
    "txSignature": "solana_tx_signature",
    "amount": 1000,
    "tokenType": "USDT"
  }
}
```

---

### Toggle Vault Status
Activate or deactivate a vault (Super Admin only).

```http
PUT /api/admin/vaults/{vaultId}/toggle
Authorization: Bearer {admin_token}
```

**Body:**
```json
{
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vault deactivated",
  "data": {
    "vaultId": "uuid",
    "name": "Elite Vault 36M",
    "isActive": false
  }
}
```

---

### Get Mining Statistics
Get TAKARA mining statistics.

```http
GET /api/admin/stats/mining
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "totalMined": 125000.50,
      "totalSupply": 600000000,
      "percentMined": 0.0208,
      "remaining": 599875000,
      "currentDifficulty": 1.052,
      "activeMiners": 200
    },
    "history": [...],
    "topMiners": [...]
  }
}
```

---

## 📋 Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Optional message",
  "data": {...}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev mode only)"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## ⚠️ Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 🔑 Authentication Headers

For protected endpoints, include JWT token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Total Endpoints: 28

- **Authentication**: 4 endpoints
- **Vaults**: 3 endpoints
- **Investments**: 5 endpoints
- **Marketplace**: 6 endpoints
- **Admin**: 10 endpoints

---

**API Version**: 2.1.1
**Last Updated**: November 2025
**Base URL**: `http://localhost:3000/api`
