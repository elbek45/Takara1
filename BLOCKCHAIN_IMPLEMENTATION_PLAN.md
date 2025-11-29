# Blockchain Implementation Plan - Dev Mode

## Цель
Реализовать полную блокчейн функциональность на Solana Devnet для разработки и тестирования.

---

## Фаза 1: Подготовка Devnet окружения (30 мин)

### 1.1 Установка зависимостей

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend
npm install --save @metaplex-foundation/js @metaplex-foundation/mpl-token-metadata
npm install --save-dev @solana/spl-token-registry
```

### 1.2 Создание dev wallet

```bash
# Создать новый devnet wallet
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json

# Получить devnet SOL
solana airdrop 2 --url devnet

# Получить public key
solana address --keypair ~/.config/solana/devnet-wallet.json
```

### 1.3 Создать тестовые SPL tokens на devnet

Использовать `spl-token` CLI:
```bash
# Create USDT test token
spl-token create-token --decimals 6 --url devnet

# Create TAKARA test token
spl-token create-token --decimals 6 --url devnet

# Create LAIKA test token
spl-token create-token --decimals 6 --url devnet

# Create token accounts and mint initial supply
spl-token create-account <TOKEN_MINT> --url devnet
spl-token mint <TOKEN_MINT> 1000000 --url devnet
```

### 1.4 Environment variables для devnet

```env
# .env.development
NODE_ENV=development
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Platform wallet (from step 1.2)
PLATFORM_WALLET_PRIVATE_KEY=<base58-private-key>
PLATFORM_WALLET_ADDRESS=<public-key>

# Test token mints (from step 1.3)
USDT_TOKEN_MINT=<devnet-usdt-mint>
TAKARA_TOKEN_MINT=<devnet-takara-mint>
LAIKA_TOKEN_MINT=<devnet-laika-mint>

# Skip TX verification in dev
SKIP_TX_VERIFICATION=true
```

---

## Фаза 2: Реализация NFT Minting (Metaplex) (2-3 часа)

### 2.1 Создать Metaplex NFT service

**Файл**: `backend/src/services/metaplex.service.ts`

```typescript
import { Metaplex, keypairIdentity, bundlrStorage } from '@metaplex-foundation/js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { connection } from './solana.service';

// Initialize Metaplex
const platformWallet = ...; // Load from env
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(platformWallet))
  .use(bundlrStorage()); // или mockStorage() для devnet

export async function mintInvestmentNFT(params) {
  const { nft } = await metaplex.nfts().create({
    uri: metadataUri,
    name: metadata.name,
    symbol: 'TKRA-INV',
    sellerFeeBasisPoints: 250, // 2.5%
    tokenOwner: new PublicKey(ownerWallet)
  });

  return {
    mintAddress: nft.address.toBase58(),
    signature: nft.response.signature
  };
}
```

### 2.2 Загрузка метаданных на IPFS

Использовать **NFT.Storage** (бесплатно):

```typescript
import { NFTStorage, File } from 'nft.storage';

const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

export async function uploadMetadataToIPFS(metadata: NFTMetadata) {
  const blob = new Blob([JSON.stringify(metadata)]);
  const cid = await client.storeBlob(blob);
  return `https://nftstorage.link/ipfs/${cid}`;
}
```

### 2.3 NFT Images

Создать простые SVG изображения для каждого tier:

```typescript
function generateNFTImage(tier: string): string {
  return `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${tierColors[tier]}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="48">
        Takara Gold ${tier}
      </text>
    </svg>
  `;
}
```

---

## Фаза 3: Token Transfers (1-2 часа)

### 3.1 Раскомментировать withdrawal processing

**Файл**: `backend/src/controllers/admin.controller.ts:397`

```typescript
// BEFORE (commented):
// await transferFromPlatform(...);

// AFTER (uncommented):
await transferFromPlatform(
  withdrawal.destinationWallet,
  tokenMint,
  Number(withdrawal.amount)
);
```

### 3.2 Implement claim functions

**В** `investment.controller.ts`:

```typescript
// claimYield - line 414
const txSignature = await transferUSDTReward(user.walletAddress, pendingAmount);

// claimTakara - line 523
const txSignature = await transferTAKARAReward(user.walletAddress, pendingAmount);
```

### 3.3 Добавить error handling

```typescript
try {
  const sig = await transferTokens(...);

  // Wait for confirmation
  await connection.confirmTransaction(sig, 'confirmed');

  return sig;
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    throw new Error('Platform wallet has insufficient token balance');
  }
  throw error;
}
```

---

## Фаза 4: Transaction Verification (1 час)

### 4.1 Always verify transactions (remove NODE_ENV check)

**Файл**: `investment.controller.ts:81`

```typescript
// BEFORE:
if (process.env.NODE_ENV === 'production') {
  const txVerified = await verifyTransaction(txSignature);
  ...
}

// AFTER:
if (!process.env.SKIP_TX_VERIFICATION) {
  const txVerified = await verifyTransaction(txSignature);
  if (!txVerified) {
    res.status(400).json({
      success: false,
      message: 'Transaction not found or not confirmed'
    });
    return;
  }
}
```

### 4.2 Enhanced verification

```typescript
export async function verifyTransaction(signature: string): Promise<{
  confirmed: boolean;
  amount?: number;
  token?: string;
  from?: string;
  to?: string;
}> {
  const tx = await connection.getParsedTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0
  });

  if (!tx || tx.meta?.err) {
    return { confirmed: false };
  }

  // Extract transfer details
  const instructions = tx.transaction.message.instructions;
  // Parse SPL token transfer...

  return {
    confirmed: true,
    amount,
    token,
    from,
    to
  };
}
```

---

## Фаза 5: Frontend Integration (2 часа)

### 5.1 Wallet connection handling

Убедиться что:
- Phantom wallet подключен к devnet
- Frontend отправляет реальные транзакции
- Proper error handling для rejected transactions

### 5.2 Transaction signing flow

```typescript
// InvestmentModal.tsx
const handleInvest = async () => {
  try {
    // 1. Create investment record (pending)
    const investment = await api.createInvestment({
      vaultId,
      usdtAmount,
      txSignature: 'pending'
    });

    // 2. Sign transaction with Phantom
    const { signature } = await solana.sendTransaction(transaction);

    // 3. Wait for confirmation
    await connection.confirmTransaction(signature);

    // 4. Update investment with signature
    await api.updateInvestmentSignature(investment.id, signature);

    toast.success('Investment successful!');
  } catch (error) {
    toast.error('Investment failed');
  }
};
```

---

## Фаза 6: Testing на Devnet (1-2 часа)

### 6.1 Manual testing checklist

- [ ] User registration with wallet
- [ ] Investment creation
- [ ] NFT minting (check on Solscan devnet)
- [ ] USDT yield claim
- [ ] TAKARA mining claim
- [ ] NFT marketplace listing
- [ ] NFT purchase
- [ ] Withdrawal request + admin approval

### 6.2 Проверить на Solana Explorer

```
https://explorer.solana.com/?cluster=devnet
```

Проверить:
- NFT metadata правильная
- Token transfers successful
- Signatures valid

---

## Фаза 7: Automated Tests (опционально, 2-3 часа)

### 7.1 Integration tests с devnet

```typescript
describe('Devnet Integration Tests', () => {
  it('should mint NFT on devnet', async () => {
    const result = await mintInvestmentNFT({
      investmentId: 'test-123',
      vaultName: 'Test Vault',
      // ...
    });

    expect(result.mintAddress).toBeDefined();

    // Verify on-chain
    const nft = await metaplex.nfts().findByMint({
      mintAddress: new PublicKey(result.mintAddress)
    });

    expect(nft).toBeDefined();
  });
});
```

---

## Полезные команды

### Devnet wallet management

```bash
# Check balance
solana balance --url devnet

# Get more SOL
solana airdrop 2 --url devnet

# Check token balance
spl-token balance <TOKEN_MINT> --url devnet

# Transfer tokens
spl-token transfer <TOKEN_MINT> <AMOUNT> <RECIPIENT> --url devnet
```

### Monitoring

```bash
# Watch logs
solana logs --url devnet <WALLET_ADDRESS>

# Get transaction details
solana confirm <SIGNATURE> --url devnet
```

---

## Потенциальные проблемы и решения

### Problem: "insufficient funds"
**Solution**: Airdrop more devnet SOL or test tokens

### Problem: "NFT upload to IPFS failed"
**Solution**: Use mockStorage() для devnet или создать NFT.Storage аккаунт

### Problem: "Transaction failed"
**Solution**: Check wallet has enough SOL for fees (~0.01 SOL per transaction)

### Problem: "Metaplex candy machine not found"
**Solution**: We're not using candy machine, just direct NFT minting

---

## Production Readiness Checklist

После успешного тестирования на devnet:

- [ ] Switch to mainnet RPC URL
- [ ] Use real tokens (USDT, not test tokens)
- [ ] Deploy NFT images to permanent storage
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Implement rate limiting
- [ ] Add Redis for nonce storage
- [ ] Security audit
- [ ] Load testing

---

## Resources

- [Solana Cookbook](https://solanacookbook.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [SPL Token CLI](https://spl.solana.com/token)
- [NFT.Storage](https://nft.storage/)
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)

---

## Timeline Estimate

| Phase | Time | Priority |
|-------|------|----------|
| 1. Devnet Setup | 30 min | HIGH |
| 2. NFT Minting | 2-3 hrs | HIGH |
| 3. Token Transfers | 1-2 hrs | HIGH |
| 4. TX Verification | 1 hr | MEDIUM |
| 5. Frontend Integration | 2 hrs | HIGH |
| 6. Manual Testing | 1-2 hrs | HIGH |
| 7. Automated Tests | 2-3 hrs | LOW |

**Total**: 9-13 hours

---

**Следующий шаг**: Начать с Фазы 1 - Setup Devnet окружения
