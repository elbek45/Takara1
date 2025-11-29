# Blockchain Implementation Plan - Hybrid Architecture

## ⚠️ ВАЖНО: Гибридная Архитектура

Платформа Takara Gold использует **две блокчейн сети**:

### 💳 **Ethereum (для USDT)**
- **Сеть**: Ethereum Mainnet / Sepolia Testnet
- **Кошелек**: MetaMask
- **Токен**: ERC-20 USDT (6 decimals)
- **Библиотека**: Web3.js
- **Операции**: Deposits, Withdrawals, Yield Claims

### 🎨 **Solana (для NFT и токенов)**
- **Сеть**: Solana Mainnet / Devnet
- **Кошелек**: Phantom
- **Токены**: SPL (TAKARA, LAIKA)
- **NFT**: Metaplex
- **Библиотека**: @solana/web3.js
- **Операции**: NFT Minting, TAKARA/LAIKA transfers

---

## Фаза 1: Подготовка Devnet окружения ✅ ЗАВЕРШЕНО

### 1.1 Установка зависимостей ✅

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend

# Solana + Metaplex
npm install --save @metaplex-foundation/js @metaplex-foundation/mpl-token-metadata
npm install --save nft.storage

# Ethereum + Web3.js
npm install --save web3
npm install --save-dev @types/web3
```

**Статус**: ✅ Установлено (633ee71, fa90b04)

### 1.2 Создание Solana dev wallet ✅

```bash
# Создать новый devnet wallet
solana-keygen new --outfile ~/.config/solana/devnet-platform-wallet.json

# Получить devnet SOL
solana airdrop 2 --url devnet

# Получить public key
solana address --keypair ~/.config/solana/devnet-platform-wallet.json
```

**Результат**:
- Wallet создан: `AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i`
- Файл: `~/.config/solana/devnet-platform-wallet.json`

### 1.3 Создание Ethereum testnet wallet

Для тестирования USDT на Sepolia:

```bash
# Вариант 1: Создать через MetaMask UI
# - Установить MetaMask
# - Переключить на Sepolia network
# - Создать новый аккаунт "Platform Wallet"
# - Экспортировать private key

# Вариант 2: Создать через Web3.js
node -e "const Web3 = require('web3'); const account = new Web3().eth.accounts.create(); console.log('Address:', account.address); console.log('Private Key:', account.privateKey);"

# Получить testnet ETH от faucet
# https://sepoliafaucet.com/
```

### 1.4 Создать тестовые SPL tokens на Solana devnet

⚠️ **ВАЖНО**: USDT теперь НЕ создается на Solana! Используется Ethereum.

Использовать `spl-token` CLI только для TAKARA и LAIKA:
```bash
# Create TAKARA test token
spl-token create-token --decimals 6 --url devnet

# Create LAIKA test token
spl-token create-token --decimals 6 --url devnet

# Create token accounts and mint initial supply
spl-token create-account <TOKEN_MINT> --url devnet
spl-token mint <TOKEN_MINT> 1000000 --url devnet
```

### 1.5 Environment variables для hybrid dev mode ✅

```env
# .env.development

# ========== SOLANA CONFIGURATION ==========
NODE_ENV=development
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Solana Platform wallet
PLATFORM_WALLET_PRIVATE_KEY=<base58-private-key>
PLATFORM_WALLET_ADDRESS=AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i

# SPL Token mints (только TAKARA и LAIKA)
TAKARA_TOKEN_MINT=<devnet-takara-mint>
LAIKA_TOKEN_MINT=<devnet-laika-mint>

# NFT Storage для Metaplex
NFT_STORAGE_API_KEY=<your-nft-storage-key>
ENABLE_REAL_NFT_MINTING=false

# ========== ETHEREUM CONFIGURATION ==========
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# или Alchemy: https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Ethereum Platform wallet
PLATFORM_ETHEREUM_PRIVATE_KEY=0x...
PLATFORM_ETHEREUM_ADDRESS=0x...

# USDT на Sepolia (testnet)
# Для тестирования можно задеплоить свой ERC-20 или использовать mock
USDT_CONTRACT_ADDRESS=0x...  # Sepolia testnet USDT mock contract

ENABLE_REAL_ETH_TRANSFERS=false  # Mock режим для разработки

# ========== SHARED CONFIGURATION ==========
SKIP_TX_VERIFICATION=true  # Для ускорения разработки
ENABLE_REAL_TOKEN_TRANSFERS=false  # Mock режим для Solana токенов
```

**Статус**: ✅ Файл создан с гибридной конфигурацией

---

## Фаза 2: Реализация NFT Minting (Metaplex) ✅ ЗАВЕРШЕНО

**Статус**: ✅ NFT минтинг реализован (commit 633ee71)

### 2.1 Metaplex NFT service ✅

**Файл**: `backend/src/services/nft.service.ts` (323 lines)

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

## Фаза 3: Token Transfers - Hybrid Implementation ✅ ЗАВЕРШЕНО

**Статус**: ✅ Гибридные переводы реализованы (commits 633ee71, fa90b04)

### 3.1 Ethereum Service для USDT ✅

**Файл**: `backend/src/services/ethereum.service.ts` (259 lines)

**Реализованные функции**:
```typescript
// Верификация USDT транзакции на Ethereum
export async function verifyUSDTTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: number
): Promise<boolean>

// Перевод USDT с платформенного кошелька
export async function transferUSDTFromPlatform(
  toAddress: string,
  amount: number
): Promise<string>

// Проверка балансов
export async function getUSDTBalance(address: string): Promise<number>
export async function getPlatformUSDTBalance(): Promise<number>
export async function getPlatformETHBalance(): Promise<number>
```

### 3.2 Обновленный Withdrawal Processing ✅

**Файл**: `backend/src/controllers/admin.controller.ts:383-451`

Гибридная логика для разных токенов:

```typescript
// USDT - через Ethereum
if (withdrawal.tokenType === 'USDT') {
  if (process.env.ENABLE_REAL_ETH_TRANSFERS === 'true') {
    actualTxSignature = await transferUSDTFromPlatform(
      withdrawal.destinationWallet,
      Number(withdrawal.amount)
    );
    logger.info({ blockchain: 'Ethereum' }, 'USDT transferred');
  }
}

// TAKARA/LAIKA - через Solana
else {
  const tokenMint = withdrawal.tokenType === 'TAKARA'
    ? process.env.TAKARA_TOKEN_MINT
    : process.env.LAIKA_TOKEN_MINT;

  if (process.env.ENABLE_REAL_TOKEN_TRANSFERS === 'true') {
    actualTxSignature = await transferFromPlatform(
      withdrawal.destinationWallet,
      tokenMint,
      Number(withdrawal.amount)
    );
    logger.info({ blockchain: 'Solana' }, 'Token transferred');
  }
}
```

### 3.3 Claim Functions - Hybrid ✅

**Файл**: `backend/src/controllers/investment.controller.ts`

**USDT Yield Claim** (lines 438-455) - через Ethereum:
```typescript
// Get user's Ethereum wallet
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { ethereumAddress: true }
});

// Transfer USDT via Ethereum
txSignature = await transferUSDTFromPlatform(
  user.ethereumAddress,
  pendingAmount
);
```

**TAKARA Claim** - через Solana (без изменений):
```typescript
// Uses Solana transferTAKARAReward
const txSignature = await transferTAKARAReward(
  user.walletAddress,
  pendingAmount
);
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
