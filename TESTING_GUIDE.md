# 🧪 Testing Guide - Takara Gold v2.1.1

**Date**: November 27, 2025
**Environment**: Devnet
**Status**: ✅ Ready for Testing

---

## 🎉 What's Ready

✅ **Backend**: Running on http://localhost:3000
✅ **Frontend**: Running on http://localhost:5173
✅ **Database**: PostgreSQL with 9 vaults seeded
✅ **Tokens Created**:
- TAKARA: `8i5QWiMc8SQL6uNp3qiARM58dt2pXRVLRzP8PmAmjts2`
- LAIKA: `Fv4cN5kDN8R4AHgCAzj1AuVFC1hsxxGyjuGGaj2YUF8f`
- USDT (Devnet): `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

✅ **Platform Wallet**: `543g91E4ytvkEfg3JFxBb6aU7NbrokHan3GxYCrXB2kM`
✅ **Your Wallet**: `EoBE6FzLhTr9qi2e74Ex4k4ucWf7r5eEHwZzrUmGMQ3p`
✅ **Token Balances**:
- 1,000,000 TAKARA
- 1,000,000 LAIKA
- 0.98 SOL

---

## 📋 Step-by-Step Testing Instructions

### 1. Install Phantom Wallet

1. Go to https://phantom.app/
2. Install browser extension (Chrome/Firefox/Brave)
3. Create new wallet OR import existing
4. **IMPORTANT**: Switch to Devnet
   - Click Settings (⚙️)
   - Developer Settings
   - Change Network → **Devnet**

---

### 2. Import Your Wallet to Phantom

You have two options:

#### Option A: Import via Private Key
```bash
# Get your private key (from takara-mint-authority.json)
cat ~/.config/solana/takara-mint-authority.json
```
Copy the array and use a tool to convert to base58, then import in Phantom.

#### Option B: Create New Wallet in Phantom
1. Create new wallet in Phantom
2. Copy the new wallet address
3. Transfer tokens from your current wallet:
```bash
# Get Phantom wallet address (shown in Phantom)
PHANTOM_WALLET=<your_phantom_address>

# Send TAKARA tokens
spl-token transfer 8i5QWiMc8SQL6uNp3qiARM58dt2pXRVLRzP8PmAmjts2 10000 $PHANTOM_WALLET

# Send LAIKA tokens
spl-token transfer Fv4cN5kDN8R4AHgCAzj1AuVFC1hsxxGyjuGGaj2YUF8f 10000 $PHANTOM_WALLET

# Send SOL
solana transfer $PHANTOM_WALLET 0.5
```

---

### 3. Get Devnet USDT

Devnet USDT address: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

**Option 1**: Use a devnet faucet
- https://spl-token-faucet.com/ (if available)

**Option 2**: Mint your own (requires setting up USDT mint authority)

**Option 3**: For testing, we can modify the code to use SOL instead temporarily

---

### 4. Open Application & Connect Wallet

1. Open browser: http://localhost:5173
2. Click "Connect Wallet" button (top right)
3. Select "Phantom"
4. Approve connection
5. Sign message for authentication

**Expected Result**:
- ✅ Wallet connected
- ✅ Profile icon appears in header
- ✅ You're logged in

---

### 5. Test Basic Navigation

#### Landing Page (/)
- ✅ Hero section displays
- ✅ Features section shows
- ✅ Vault tiers display (Starter/Pro/Elite)

#### Vaults Page (/vaults)
- ✅ 9 vaults display
- ✅ Filter by tier works
- ✅ Filter by duration works
- ✅ Click vault to view details

#### Vault Detail Page (/vaults/:id)
- ✅ Vault info displays
- ✅ Calculator works
- ✅ Enter USDT amount
- ✅ Slide LAIKA boost slider
- ✅ See calculated APY and mining power
- ✅ "Invest Now" button appears

---

### 6. Test Investment Flow (REQUIRES USDT)

1. Go to Vaults page
2. Select "Starter Vault 12M"
3. Enter amount: `100` USDT
4. Adjust LAIKA boost (optional)
5. Click "Invest Now"

**Investment Modal Flow**:

**Step 1: Review**
- ✅ See investment summary
- ✅ See required tokens (USDT, TAKARA, LAIKA)
- ✅ Click "Proceed"

**Step 2: Transfer Tokens**
- ✅ Phantom opens for USDT transfer
- ✅ Approve transaction
- ✅ If TAKARA required, approve TAKARA transfer
- ✅ If LAIKA boost, approve LAIKA transfer
- ✅ Wait for confirmations

**Step 3: Success**
- ✅ See success message
- ✅ See transaction link (Solscan)
- ✅ Click "View Dashboard"

---

### 7. Test Dashboard (/dashboard)

After creating investment:
- ✅ See total invested
- ✅ See active investments
- ✅ See pending USDT claims (after payout)
- ✅ See pending TAKARA claims (daily mining)
- ✅ Click "Claim All USDT"
- ✅ Click "Claim All TAKARA"

---

### 8. Test Portfolio (/portfolio)

- ✅ See all your investments
- ✅ Filter by status (PENDING, ACTIVE, COMPLETED)
- ✅ See investment details
- ✅ See NFT link (Solscan)
- ✅ Click "List for Sale" (if ACTIVE)
- ✅ Click "Claim USDT" (if pending)
- ✅ Click "Claim TAKARA" (if pending)

---

### 9. Test Marketplace (/marketplace)

- ✅ See all listed NFTs
- ✅ See marketplace stats
- ✅ Filter listings
- ✅ Click "Buy NFT"
  - ✅ See price breakdown
  - ✅ Approve USDT transfer
  - ✅ NFT transferred to you

---

### 10. Test Listing NFT

1. Go to Portfolio
2. Find ACTIVE investment
3. Click "List for Sale"

**List NFT Modal**:
- ✅ See suggested price
- ✅ Enter your price
- ✅ See platform fee (3%)
- ✅ See what you'll receive
- ✅ Click "List NFT"
- ✅ Confirm transaction
- ✅ Success message

**After listing**:
- ✅ NFT appears in Marketplace
- ✅ "List for Sale" button changes to "Cancel Listing"

---

### 11. Test Cancel Listing

1. Go to Portfolio
2. Find listed investment
3. Click "Cancel Listing"
- ✅ Listing removed from marketplace
- ✅ Button changes back to "List for Sale"

---

### 12. Test Profile (/profile)

- ✅ See wallet address
- ✅ Click copy button
- ✅ See member since date
- ✅ See last login
- ✅ See total stats
- ✅ Update username
- ✅ Update email
- ✅ Click "Save Changes"
- ✅ Toggle notification preferences

---

## 🐛 Known Limitations (Testing Phase)

1. **USDT Tokens**
   - Need devnet USDT to test investment flow
   - Can't test without USDT tokens

2. **Background Jobs**
   - Mining runs daily at 00:00
   - Payouts run every 6 hours
   - May need to wait or manually trigger in database

3. **Investment Activation**
   - 72-hour delay before investment activates
   - Can manually activate in database for testing

4. **NFT Images**
   - No custom images yet (using placeholder)
   - Metadata is generic

---

## ⚡ Quick Commands for Testing

### Check Token Balances
```bash
spl-token balance 8i5QWiMc8SQL6uNp3qiARM58dt2pXRVLRzP8PmAmjts2  # TAKARA
spl-token balance Fv4cN5kDN8R4AHgCAzj1AuVFC1hsxxGyjuGGaj2YUF8f  # LAIKA
solana balance  # SOL
```

### Transfer Tokens to Another Wallet
```bash
# TAKARA
spl-token transfer 8i5QWiMc8SQL6uNp3qiARM58dt2pXRVLRzP8PmAmjts2 1000 <ADDRESS>

# LAIKA
spl-token transfer Fv4cN5kDN8R4AHgCAzj1AuVFC1hsxxGyjuGGaj2YUF8f 1000 <ADDRESS>

# SOL
solana transfer <ADDRESS> 0.1
```

### Check Investment Status (Database)
```bash
cd backend
npx prisma studio
# Open http://localhost:5555
# View Investment table
```

### Manually Activate Investment (Database)
```sql
UPDATE "Investment" SET status = 'ACTIVE', activatedAt = NOW() WHERE id = '<investment_id>';
```

### Manually Add Pending Claims (Testing)
```sql
UPDATE "Investment" SET pendingUSDT = 10.50, pendingTAKARA = 150 WHERE id = '<investment_id>';
```

---

## 🔧 Troubleshooting

### Wallet Won't Connect
- Make sure Phantom is on **Devnet**
- Refresh page
- Try disconnect/reconnect

### "Insufficient Balance" Error
- Check you have enough tokens
- Check you have SOL for gas fees
- Verify token accounts exist

### Transaction Failed
- Check Solana devnet status
- Increase slippage tolerance
- Try again (devnet can be slow)

### Can't See Tokens in Phantom
- Add token manually:
  - Click "+" in Phantom
  - Enter token mint address
  - Token should appear

### Backend Error
- Check backend logs: `cd backend && npm run dev`
- Check database connection
- Verify platform wallet is configured

---

## 📊 Testing Checklist

### Phase 1: Basic UI ✅
- [ ] Landing page loads
- [ ] All 7 pages accessible
- [ ] Wallet connects
- [ ] Navigation works
- [ ] Responsive on mobile

### Phase 2: Read Operations ✅
- [ ] Vaults display
- [ ] Calculator works
- [ ] Marketplace shows listings
- [ ] Dashboard shows stats
- [ ] Portfolio shows investments

### Phase 3: Write Operations (Requires USDT)
- [ ] Create investment
- [ ] Claim USDT rewards
- [ ] Claim TAKARA rewards
- [ ] List NFT for sale
- [ ] Cancel NFT listing
- [ ] Buy NFT from marketplace
- [ ] Update profile

### Phase 4: Edge Cases
- [ ] Try investing without enough USDT
- [ ] Try investing without enough TAKARA
- [ ] Try claiming when nothing pending
- [ ] Try buying your own NFT
- [ ] Try listing already listed investment

---

## 🎯 Next Steps After Testing

1. **Get Devnet USDT**
   - Find faucet or create USDT token
   - Test full investment flow

2. **Test Complete Flow**
   - Create investment
   - Wait for activation (or manual activate)
   - Claim rewards
   - List NFT
   - Buy NFT

3. **Performance Testing**
   - Multiple concurrent users
   - Large number of investments
   - Stress test API

4. **Security Audit**
   - Test authentication bypass
   - Test SQL injection
   - Test XSS vulnerabilities
   - Test transaction replay

5. **Prepare for Mainnet**
   - Create real tokens
   - Setup production VPS
   - Configure SSL
   - Setup monitoring
   - Deploy

---

## 📞 Support

If you encounter issues:
1. Check backend logs
2. Check frontend console (F12)
3. Check Solana devnet status
4. Review AUDIT_REPORT.md
5. Check .solana-keys/ADDRESSES.md for all addresses

---

**Happy Testing!** 🚀

**Remember**: This is DEVNET. All tokens are test tokens with no real value. Feel free to experiment!
