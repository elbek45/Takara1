# 🦊 MetaMask Setup Guide for Takara Gold

## Overview

Takara Gold now supports **dual wallet integration**:
- **MetaMask**: For USDT payments on BSC Testnet (Binance Smart Chain)
- **Phantom**: For TAKARA and LAIKA tokens on Solana

---

## 📦 Why Two Wallets?

- **USDT**: Available on multiple chains. Using BSC Testnet for low gas fees
- **TAKARA & LAIKA**: Custom tokens on Solana blockchain
- **Best of both worlds**: Cheap USDT transactions + Solana's fast token transfers

---

## 🚀 Step 1: Install MetaMask

1. Go to [https://metamask.io/download/](https://metamask.io/download/)
2. Install browser extension (Chrome/Firefox/Brave)
3. Create new wallet or import existing
4. **Save your seed phrase securely!**

---

## ⚙️ Step 2: Add BSC Testnet

MetaMask doesn't include BSC Testnet by default. Add it manually:

### Option A: Automatic (Recommended)
1. Click "Connect MetaMask" in Takara Gold app
2. App will automatically add BSC Testnet network
3. Approve the network addition in MetaMask

### Option B: Manual Setup

1. Open MetaMask
2. Click network dropdown (top center)
3. Click "Add Network"
4. Enter the following details:

```
Network Name: BSC Testnet
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
Chain ID: 97
Currency Symbol: tBNB
Block Explorer: https://testnet.bscscan.com
```

5. Click "Save"

---

## 💰 Step 3: Get Test BNB (for gas fees)

You need BNB to pay for transaction gas fees on BSC.

### BSC Testnet Faucet:
1. Go to [https://testnet.bnbchain.org/faucet-smart](https://testnet.bnbchain.org/faucet-smart)
2. Copy your MetaMask wallet address
3. Paste it and request 0.1 tBNB
4. Wait ~1 minute for confirmation

**Alternative faucets:**
- https://testnet.binance.org/faucet-smart
- https://www.bnbchain.org/en/testnet-faucet

---

## 💵 Step 4: Get Test USDT

### Option 1: BSC Testnet USDT Faucet

**USDT Contract on BSC Testnet:**
```
0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
```

1. Go to BSCScan Testnet: [https://testnet.bscscan.com/address/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd#writeContract](https://testnet.bscscan.com/address/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd#writeContract)
2. Click "Connect to Web3" (Connect MetaMask)
3. Find `mint` function (or similar)
4. Mint test USDT to your address

### Option 2: Pancakeswap Testnet
1. Go to https://testnet.pancakeswap.finance/swap
2. Connect MetaMask
3. Swap some tBNB for USDT

### Option 3: Add Custom Token

If you already have test USDT, add it to MetaMask:

1. Open MetaMask
2. Click "Import tokens"
3. Enter USDT contract address:
   ```
   0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
   ```
4. Symbol: `USDT`
5. Decimals: `18`
6. Click "Add Custom Token"

---

## 🔗 Step 5: Connect Both Wallets to Takara Gold

### In Takara Gold App:

1. **Connect MetaMask:**
   - Click "MetaMask" button in header
   - Approve connection
   - Approve BSC Testnet switch (if prompted)
   - ✅ You're connected!

2. **Connect Phantom:**
   - Click "Select Wallet" button
   - Choose "Phantom"
   - Approve connection
   - ✅ You're connected!

**Both wallets must be connected to invest!**

---

## 📝 How Investment Works

### Step 1: Review Investment
- Enter USDT amount (via MetaMask/BSC)
- Select LAIKA boost (optional, via Phantom/Solana)
- Review calculations

### Step 2: Token Transfers
1. **USDT transfer** via MetaMask (BSC Testnet)
   - Opens MetaMask popup
   - Confirm transaction
   - Wait for confirmation (~3-5 seconds)

2. **TAKARA transfer** (if required) via Phantom (Solana)
   - Opens Phantom popup
   - Confirm transaction
   - Wait for confirmation (~1 second)

3. **LAIKA transfer** (if boosting) via Phantom (Solana)
   - Opens Phantom popup
   - Confirm transaction
   - Wait for confirmation (~1 second)

### Step 3: Investment Created
- NFT minted on Solana
- Investment activates in 72 hours
- Start earning rewards!

---

## 💡 Checking Your Balances

### MetaMask (BSC Testnet):
- Open MetaMask
- Switch to BSC Testnet
- View BNB and USDT balances

### Phantom (Solana Devnet):
- Open Phantom
- Switch to Devnet (Settings → Developer → Network → Devnet)
- View SOL, TAKARA, and LAIKA balances

---

## ❓ Troubleshooting

### "MetaMask not installed"
- Install MetaMask extension from https://metamask.io/download/

### "Wrong network"
- MetaMask: Switch to BSC Testnet (Chain ID 97)
- Phantom: Switch to Solana Devnet

### "Insufficient funds for gas"
- MetaMask: Need BNB for gas fees → Get from faucet
- Phantom: Need SOL for gas fees → Use `solana airdrop`

### "USDT balance is 0"
- Add USDT token to MetaMask using contract address
- Get test USDT from faucet or Pancakeswap

### "Transaction failed"
- Check you have enough BNB for gas (MetaMask)
- Check you have enough SOL for gas (Phantom)
- Try again with higher gas price

### "Can't see USDT in MetaMask"
1. Open MetaMask
2. Scroll down and click "Import tokens"
3. Paste USDT contract: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
4. Click "Add Custom Token"

---

## 🔐 Security Tips

1. **Never share your seed phrase!**
2. **Verify contract addresses** before interacting
3. **Use test wallets** for devnet/testnet
4. **Don't send real funds** to test wallets
5. **Double-check network** before transactions

---

## 📊 Contract Addresses

### BSC Testnet:
- **USDT**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- **Platform Wallet**: `[UPDATE AFTER DEPLOYMENT]`

### Solana Devnet:
- **TAKARA**: `8i5QWiMc8SQL6uNp3qiARM58dt2pXRVLRzP8PmAmjts2`
- **LAIKA**: `Fv4cN5kDN8R4AHgCAzj1AuVFC1hsxxGyjuGGaj2YUF8f`
- **USDT (Solana Devnet)**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **Platform Wallet**: `543g91E4ytvkEfg3JFxBb6aU7NbrokHan3GxYCrXB2kM`

---

## 🌐 Useful Links

- **BSC Testnet Faucet**: https://testnet.bnbchain.org/faucet-smart
- **BSCScan Testnet**: https://testnet.bscscan.com
- **Pancakeswap Testnet**: https://testnet.pancakeswap.finance
- **MetaMask**: https://metamask.io
- **Phantom**: https://phantom.app

---

## 🎯 Quick Start Checklist

- [ ] Install MetaMask extension
- [ ] Create/import wallet
- [ ] Add BSC Testnet network
- [ ] Get test BNB from faucet
- [ ] Get test USDT
- [ ] Add USDT token to MetaMask
- [ ] Install Phantom wallet
- [ ] Switch Phantom to Devnet
- [ ] Connect both wallets to Takara Gold
- [ ] Start investing!

---

**Happy Investing!** 🚀

**Remember**: This is TESTNET. All tokens are test tokens with no real value. Feel free to experiment!
