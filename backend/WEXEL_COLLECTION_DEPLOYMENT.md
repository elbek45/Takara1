# WEXEL NFT Collection Deployment Guide

This guide explains how to deploy the WEXEL NFT Collection on Solana Mainnet using the admin panel.

## What is WEXEL Collection?

**WEXEL** (Symbol: WXL) is a Metaplex NFT Collection that groups all Takara Gold investment NFTs together. Each NFT represents ownership of an investment in a vault and contains metadata about:

- Vault name and tier (STARTER, PRO, ELITE)
- Investment amount (USDT)
- APY percentage
- Duration (months)
- Mining power (%)
- LAIKA Boost status

### Benefits of Using a Collection

1. **Unified Display**: All WEXEL NFTs appear together on marketplaces (Magic Eden, Solscan)
2. **Collection Royalties**: 2.5% royalty on all secondary sales
3. **Brand Identity**: Creates a recognizable collection for Takara Gold investments
4. **Marketplace Features**: Enables collection-level statistics and filtering

---

## Prerequisites

Before deploying the WEXEL Collection, ensure:

### 1. Wallet Setup
- Platform wallet must be generated and funded
- Check status in Admin Panel → Token Deployment
- Minimum balance: **0.05 SOL** (~$10)

### 2. Environment Configuration
- `.env.mainnet` file exists in backend directory
- `PLATFORM_WALLET_PRIVATE_KEY` is set
- `SOLANA_RPC_URL` is configured (mainnet)

### 3. Dependencies Installed
```bash
cd backend
npm install
```

Required packages:
- `@solana/web3.js`
- `@metaplex-foundation/js`
- `bs58`

---

## Deployment Methods

### Method 1: Admin Panel (Recommended)

#### Step 1: Access Admin Panel
1. Navigate to `https://sitpool.org/admin/deployment`
2. Login with super admin credentials
3. Check deployment status

#### Step 2: Verify Prerequisites
Check the status cards at the top:
- ✅ **Wallets**: Must be "Generated"
- ⚠️ **WEXEL Collection**: Should show "Not Created"

#### Step 3: Create Collection
1. Scroll to **"Create WEXEL NFT Collection"** section
2. Review collection details:
   - Name: WEXEL Investment NFTs
   - Symbol: WXL
   - Royalty: 2.5%
   - Cost: ~0.01-0.02 SOL (~$2-4)
3. Click **"Create WEXEL Collection"** button
4. Confirm the action

#### Step 4: Monitor Progress
The deployment section will show:
- Progress percentage
- Current step
- Real-time logs from the script

Typical steps:
1. Initializing Metaplex (10%)
2. Creating collection NFT (50%)
3. Saving collection info (80%)
4. Finalizing (100%)

Duration: **30-60 seconds**

#### Step 5: Verify Success
After completion:
1. Status card will show ✅ **"WEXEL Collection: Created"**
2. Solscan link will appear - click to view on blockchain
3. Collection address will be displayed
4. File `wexel-collection-mainnet.json` created in backend directory

#### Step 6: Update Environment
**IMPORTANT**: The collection address is automatically saved but you need to restart the backend:

```bash
pm2 restart takara-backend
```

Or if using development mode:
```bash
npm run dev
```

---

### Method 2: Command Line (Alternative)

If you prefer running the script directly:

#### Step 1: Navigate to Backend
```bash
cd /home/elbek/TakaraClaude/takara-gold/backend
```

#### Step 2: Run Deployment Script
```bash
node scripts/create-wexel-collection.js
```

#### Step 3: Monitor Output
The script will display:
- Platform wallet address
- Wallet balance check
- Collection specifications
- Creation progress
- Final collection address
- Cost summary

#### Step 4: Update Environment
Copy the collection address from the output and add to `.env.mainnet`:

```bash
WEXEL_COLLECTION_ADDRESS=<paste_collection_address_here>
```

Then restart the backend:
```bash
pm2 restart takara-backend
```

---

## Post-Deployment Verification

### 1. Check Blockchain
Visit Solscan to verify the collection:
```
https://solscan.io/token/<COLLECTION_ADDRESS>
```

You should see:
- Token Type: NFT Collection
- Symbol: WXL
- Update Authority: Your platform wallet
- Royalty: 2.5%

### 2. Check Backend Logs
```bash
pm2 logs takara-backend | grep -i wexel
```

You should see logs confirming:
- Collection address loaded
- NFT minting will use collection

### 3. Test NFT Minting
Create a test investment to verify NFTs are minted with the collection:

1. Create investment through the platform
2. Wait 72 hours for activation (or adjust for testing)
3. Check investment record - should have `nftMintAddress`
4. View NFT on Solscan - should show collection membership

---

## Collection Files

### Generated Files

#### `wexel-collection-mainnet.json`
Located in: `backend/wexel-collection-mainnet.json`

Contains:
```json
{
  "deployedAt": "2025-12-05T...",
  "network": "mainnet-beta",
  "collection": {
    "name": "WEXEL Investment NFTs",
    "symbol": "WXL",
    "description": "...",
    "address": "...",
    "updateAuthority": "...",
    "sellerFeeBasisPoints": 250
  },
  "costInSol": 0.015,
  "solscanUrl": "https://solscan.io/token/...",
  "magicEdenUrl": "https://magiceden.io/marketplace/...",
  "usage": {
    "purpose": "NFT Collection for Takara Gold Investment NFTs",
    "features": [...]
  }
}
```

**IMPORTANT**: Backup this file! It contains crucial deployment information.

---

## Environment Variables

After deployment, ensure these variables are set in `.env.mainnet`:

```bash
# Solana Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Platform Wallet
PLATFORM_WALLET_PRIVATE_KEY=<your_private_key_base58>
PLATFORM_WALLET_ADDRESS=<your_wallet_address>

# WEXEL Collection
WEXEL_COLLECTION_ADDRESS=<collection_mint_address>

# NFT Settings
ENABLE_REAL_NFT_MINTING=true
```

---

## NFT Minting Flow

Once the collection is deployed, the automated NFT minting process works as follows:

### 1. Investment Creation
User creates investment in a vault:
- Frontend sends investment request
- Backend creates investment record with status `PENDING`
- 72-hour activation delay begins

### 2. Investment Activation (Automated)
After 72 hours, the `investmentActivation.ts` job runs:
- Finds all pending investments ready for activation
- Loads platform wallet
- Calls `mintInvestmentNFT()` function
- NFT is minted with WEXEL collection reference
- Investment status changes to `ACTIVE`
- NFT data saved to investment record

### 3. NFT Metadata
Each minted NFT contains:
- **Name**: `WEXEL <TIER> #<ID>`
- **Symbol**: WXL
- **Collection**: WEXEL Collection address
- **Attributes**: Vault, Tier, Amount, APY, Duration, Mining Power, LAIKA Boost
- **Image**: Placeholder (can be updated later)
- **Royalty**: 2.5%

### 4. User Receives NFT
- NFT is automatically transferred to user's wallet
- User can view it on Solscan, Phantom, Magic Eden
- User can trade it on the marketplace
- Ownership represents the investment

---

## Updating Collection Metadata

### Upload Collection Image

1. **Create Collection Image**
   - Design a branded image for the collection
   - Recommended: 1000x1000 pixels, PNG format
   - Should represent Takara Gold brand

2. **Upload to IPFS/Arweave**
   ```bash
   # Using NFT.Storage
   curl -X POST https://api.nft.storage/upload \
     -H "Authorization: Bearer <YOUR_API_KEY>" \
     -F file=@wexel-collection.png
   ```

3. **Update Collection Metadata**
   Use Metaplex CLI or write a script to update the collection's metadata URI with the new image.

### Update Collection Authority

If you need to change the update authority:

```bash
# Using Metaplex CLI
metaplex update-collection \
  --collection <COLLECTION_ADDRESS> \
  --new-authority <NEW_AUTHORITY_ADDRESS>
```

---

## Troubleshooting

### Issue: "Insufficient balance" Error

**Cause**: Platform wallet doesn't have enough SOL

**Solution**:
```bash
# Check balance
solana balance <PLATFORM_WALLET_ADDRESS>

# Fund wallet (need at least 0.05 SOL)
solana transfer <PLATFORM_WALLET_ADDRESS> 0.1 --url mainnet-beta
```

### Issue: "WEXEL_COLLECTION_ADDRESS not configured"

**Cause**: Environment variable not set or backend not restarted

**Solution**:
1. Check `.env.mainnet` has `WEXEL_COLLECTION_ADDRESS=...`
2. Restart backend: `pm2 restart takara-backend`
3. Check logs: `pm2 logs takara-backend`

### Issue: Collection Creation Hangs

**Cause**: RPC node is slow or unresponsive

**Solution**:
1. Try a different RPC endpoint (Helius, QuickNode, Alchemy)
2. Update `SOLANA_RPC_URL` in `.env.mainnet`
3. Restart and retry

### Issue: NFTs Not Appearing in Collection

**Cause**: Collection not properly verified or NFTs minted before collection existed

**Solution**:
1. Verify collection exists on Solscan
2. Check NFT metadata includes collection field
3. For old NFTs: Use Metaplex to verify/update collection membership

---

## Cost Summary

| Action | Cost | Network |
|--------|------|---------|
| Create Collection | ~0.01-0.02 SOL | Mainnet |
| Mint NFT (per investment) | ~0.01 SOL | Mainnet |
| Transfer NFT | ~0.000005 SOL | Mainnet |

**Note**: Costs vary based on network congestion and Solana rent calculations.

---

## Security Considerations

### Private Key Management
- **NEVER** commit `.env.mainnet` to git
- Store private keys securely (use secrets manager in production)
- Regularly rotate credentials if compromised

### Update Authority
- Platform wallet has update authority over collection
- Can update metadata, verify NFTs in collection
- Cannot change immutable fields (supply, symbol after creation)

### Royalty Enforcement
- 2.5% royalty set on collection level
- Enforced by marketplaces that respect Metaplex standards
- Not enforced by direct wallet-to-wallet transfers

---

## Next Steps

After successfully deploying the WEXEL Collection:

1. ✅ **Test NFT Minting**: Create a test investment and verify NFT minting works
2. 📸 **Upload Collection Image**: Replace placeholder with branded image
3. 🎨 **Design NFT Images**: Create tier-specific images (STARTER, PRO, ELITE)
4. 🏪 **List on Marketplaces**: Submit collection to Magic Eden, Tensor, etc.
5. 📊 **Monitor Analytics**: Track collection stats on Solscan
6. 🔄 **Update Metadata**: Enhance NFT metadata with more attributes if needed

---

## Support & Resources

### Documentation
- [Metaplex Docs](https://docs.metaplex.com/)
- [Solana NFT Guide](https://docs.solana.com/developing/nfts)
- [NFT.Storage API](https://nft.storage/docs/)

### Tools
- [Solscan](https://solscan.io) - Blockchain explorer
- [Magic Eden](https://magiceden.io) - NFT marketplace
- [Metaplex CLI](https://docs.metaplex.com/tools/cli) - Collection management

### Monitoring
```bash
# Backend logs
pm2 logs takara-backend

# Collection info
cat backend/wexel-collection-mainnet.json

# Check collection on chain
solana account <COLLECTION_ADDRESS> --url mainnet-beta
```

---

## Deployment Checklist

Use this checklist to ensure proper deployment:

- [ ] Platform wallet generated and funded (≥0.05 SOL)
- [ ] `.env.mainnet` configured with all required variables
- [ ] Dependencies installed (`npm install`)
- [ ] Backend running and accessible
- [ ] Admin access to deployment page
- [ ] Clicked "Create WEXEL Collection" and confirmed
- [ ] Deployment completed successfully (100%)
- [ ] Collection address visible in admin panel
- [ ] `wexel-collection-mainnet.json` file created
- [ ] Backend restarted (`pm2 restart takara-backend`)
- [ ] Collection verified on Solscan
- [ ] Test NFT minting works with collection
- [ ] Backed up collection info file

---

## Conclusion

The WEXEL NFT Collection is now deployed and ready to use! All new investment NFTs will automatically be minted as part of this collection, creating a unified and recognizable brand for Takara Gold investment NFTs on Solana.

For questions or issues, refer to the troubleshooting section or check the backend logs for detailed error messages.

**Happy minting! 🎉**
