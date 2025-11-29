# Testnet Quick Start 🚀

Быстрый старт для тестирования Takara Gold на testnet networks.

## Prerequisites

Убедитесь, что установлены:
- Node.js v18+
- PostgreSQL 14+
- Solana CLI
- Git

## 3-Minute Setup

### Шаг 1: Получить API ключи (2 минуты)

**Alchemy (для Ethereum Sepolia):**
1. Зарегистрируйтесь: https://dashboard.alchemy.com/
2. Create App → Ethereum → Sepolia
3. Скопируйте API key

**NFT.Storage (для IPFS):**
1. Зарегистрируйтесь: https://nft.storage/
2. API Keys → Create new key
3. Скопируйте API key

### Шаг 2: Обновить .env.testnet (1 минута)

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend
nano .env.testnet
```

Замените:
```env
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NFT_STORAGE_API_KEY=your_nft_storage_api_key_here
```

На ваши реальные ключи.

### Шаг 3: Запустить автоматический setup

```bash
cd /home/elbek/TakaraClaude/takara-gold/backend
./scripts/setup-testnet.sh
```

Этот скрипт автоматически:
- ✅ Проверит Solana wallet
- ✅ Получит devnet SOL
- ✅ Создаст database
- ✅ Запустит migrations

### Шаг 4: Получить testnet ETH

Перейдите на faucet и запросите ETH для адреса:
```
0x5B2De17a0aC667B08B501C92e6B271ed110665E1
```

Faucets:
- https://sepoliafaucet.com/
- https://sepolia-faucet.pk910.de/

### Шаг 5: Deploy Mock USDT

```bash
node scripts/deploy-mock-usdt.js
```

Скопируйте contract address из вывода и обновите `.env.testnet`:
```env
USDT_CONTRACT_ADDRESS=0x...  # Адрес из вывода
```

### Шаг 6: Проверить балансы

```bash
node scripts/check-testnet-balances.js
```

Должны увидеть:
- ✅ ETH Balance: >0.01 ETH
- ✅ SOL Balance: >0.5 SOL
- ✅ Mock USDT Contract deployed

### Шаг 7: Запустить сервер

```bash
npm run dev
```

## Уже Созданные Ресурсы

### Ethereum Sepolia
```
Platform Wallet: 0x5B2De17a0aC667B08B501C92e6B271ed110665E1
Private Key: (в .env.testnet)
```

### Solana Devnet
```
Platform Wallet: AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i
TAKARA Token: 2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn
LAIKA Token: 8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM
```

## Режимы Тестирования

### Mock Mode (быстрая разработка)

В `.env.testnet`:
```env
ENABLE_REAL_ETH_TRANSFERS=false
ENABLE_REAL_TOKEN_TRANSFERS=false
ENABLE_REAL_NFT_MINTING=false
SKIP_TX_VERIFICATION=true
```

Используйте для:
- UI/UX разработки
- Быстрого тестирования flow
- Без реальных blockchain транзакций

### Real Testnet Mode (полное тестирование)

В `.env.testnet`:
```env
ENABLE_REAL_ETH_TRANSFERS=true
ENABLE_REAL_TOKEN_TRANSFERS=true
ENABLE_REAL_NFT_MINTING=true
SKIP_TX_VERIFICATION=false
```

Используйте для:
- Тестирования реальных blockchain операций
- Проверки NFT minting
- Верификации транзакций

## Useful Commands

```bash
# Проверить балансы
node scripts/check-testnet-balances.js

# Создать новый Ethereum wallet
node scripts/create-eth-wallet.js

# Пополнить SOL
solana airdrop 1 AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i --url devnet

# Проверить SOL баланс
solana balance AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i --url devnet

# Проверить TAKARA balance
spl-token balance 2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn --url devnet
```

## Explorers

**Ethereum Sepolia:**
- Platform Wallet: https://sepolia.etherscan.io/address/0x5B2De17a0aC667B08B501C92e6B271ed110665E1

**Solana Devnet:**
- Platform Wallet: https://explorer.solana.com/address/AinafdFme7f68yGjJwfnmYgtJpZPu9RAHuJBcRTXif4i?cluster=devnet
- TAKARA Token: https://explorer.solana.com/address/2Mx29ELkJxNZshN2mUYtStcyi54FK2Cve68QAASXfWjn?cluster=devnet
- LAIKA Token: https://explorer.solana.com/address/8aCNPGawekMyWTq9W9C3NnKL1ycEbb6pZxBJ1DMmeWEM?cluster=devnet

## Troubleshooting

**"Insufficient funds"**
- Ethereum: Получите больше ETH от faucet
- Solana: `solana airdrop 1 ADDRESS --url devnet`

**"Transaction not confirmed"**
- Подождите 30-60 секунд (Sepolia может быть медленным)
- Проверьте на Etherscan

**"NFT minting failed"**
- Проверьте NFT_STORAGE_API_KEY
- Убедитесь, что есть SOL для fees

**"Database connection error"**
- Проверьте PostgreSQL запущен: `pg_ctl status`
- Проверьте DATABASE_URL в .env.testnet

## Полная Документация

Для подробной документации смотрите:
- [TESTNET_SETUP_GUIDE.md](./TESTNET_SETUP_GUIDE.md) - Полная инструкция
- [BLOCKCHAIN_IMPLEMENTATION_PLAN.md](./BLOCKCHAIN_IMPLEMENTATION_PLAN.md) - План реализации

---

**Ready to test! 🎉**