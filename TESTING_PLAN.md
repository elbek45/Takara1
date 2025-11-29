# План Тестирования Takara Gold Platform

Комплексный план тестирования frontend и backend компонентов с фокусом на гибридную blockchain архитектуру.

---

## Оглавление

1. [Backend Testing](#backend-testing)
2. [Frontend Testing](#frontend-testing)
3. [Integration Testing](#integration-testing)
4. [Blockchain Testing](#blockchain-testing)
5. [Security Testing](#security-testing)
6. [Performance Testing](#performance-testing)

---

## Backend Testing

### Priority 1: Critical API Endpoints

#### 1.1 Authentication & Authorization

**Test Suite: Auth API**

```typescript
describe('Authentication API', () => {
  // Registration
  test('POST /api/auth/register - успешная регистрация', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
  });

  test('POST /api/auth/register - дубликат email', async () => {
    // Создать пользователя
    // Попытаться создать с тем же email
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already exists');
  });

  test('POST /api/auth/register - слабый пароль', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: '123', // Слабый пароль
        username: 'testuser'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('password');
  });

  // Login
  test('POST /api/auth/login - успешный вход', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  test('POST /api/auth/login - неверный пароль', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(401);
  });

  test('POST /api/auth/login - несуществующий пользователь', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'SomePassword'
      });

    expect(response.status).toBe(404);
  });

  // JWT Token Validation
  test('Protected route - без токена', async () => {
    const response = await request(app)
      .get('/api/investments');

    expect(response.status).toBe(401);
  });

  test('Protected route - с валидным токеном', async () => {
    const token = await loginAndGetToken();
    const response = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  test('Protected route - с истекшим токеном', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });
});
```

**Файл**: `backend/tests/auth.test.ts`

---

#### 1.2 Investment API

**Test Suite: Investment Creation & Management**

```typescript
describe('Investment API', () => {
  let authToken: string;
  let testVault: any;

  beforeEach(async () => {
    authToken = await loginAndGetToken();
    testVault = await createTestVault();
  });

  // Investment Creation
  test('POST /api/investments - создание инвестиции с USDT', async () => {
    const response = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vaultId: testVault.id,
        usdtAmount: 1000,
        txSignature: 'mock_eth_tx_12345'
      });

    expect(response.status).toBe(201);
    expect(response.body.investment).toHaveProperty('id');
    expect(response.body.investment.usdtAmount).toBe(1000);
    expect(response.body.investment.status).toBe('PENDING');
  });

  test('POST /api/investments - минимальная сумма', async () => {
    const response = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vaultId: testVault.id,
        usdtAmount: 50, // Меньше минимума
        txSignature: 'mock_eth_tx_12345'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('minimum');
  });

  test('POST /api/investments - максимальная capacity хранилища', async () => {
    // Заполнить vault до capacity
    await fillVaultToCapacity(testVault.id);

    const response = await request(app)
      .post('/api/investments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vaultId: testVault.id,
        usdtAmount: 1000,
        txSignature: 'mock_eth_tx_12345'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('capacity');
  });

  // Get Investments
  test('GET /api/investments - получить все инвестиции пользователя', async () => {
    await createTestInvestment(authToken);
    await createTestInvestment(authToken);

    const response = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.investments).toBeInstanceOf(Array);
    expect(response.body.investments.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/investments/:id - получить конкретную инвестицию', async () => {
    const investment = await createTestInvestment(authToken);

    const response = await request(app)
      .get(`/api/investments/${investment.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.investment.id).toBe(investment.id);
  });

  test('GET /api/investments/:id - доступ к чужой инвестиции', async () => {
    const otherUserToken = await createUserAndGetToken('other@example.com');
    const investment = await createTestInvestment(otherUserToken);

    const response = await request(app)
      .get(`/api/investments/${investment.id}`)
      .set('Authorization', `Bearer ${authToken}`); // Другой пользователь

    expect(response.status).toBe(403);
  });

  // Yield Calculation
  test('GET /api/investments/:id/yield - расчет доходности', async () => {
    const investment = await createTestInvestment(authToken, {
      usdtAmount: 10000,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней назад
    });

    const response = await request(app)
      .get(`/api/investments/${investment.id}/yield`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalYield');
    expect(response.body).toHaveProperty('pendingYield');
    expect(response.body.totalYield).toBeGreaterThan(0);
  });

  // Claim Yield
  test('POST /api/investments/:id/claim - claim доходности', async () => {
    const investment = await createTestInvestment(authToken, {
      usdtAmount: 10000,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    });

    const response = await request(app)
      .post(`/api/investments/${investment.id}/claim`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('claimAmount');
    expect(response.body).toHaveProperty('txSignature');
  });

  test('POST /api/investments/:id/claim - повторный claim без накопленного', async () => {
    const investment = await createTestInvestment(authToken);
    await claimYield(investment.id, authToken);

    const response = await request(app)
      .post(`/api/investments/${investment.id}/claim`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('No pending yield');
  });
});
```

**Файл**: `backend/tests/investment.test.ts`

---

#### 1.3 Vault API

**Test Suite: Vault Management**

```typescript
describe('Vault API', () => {
  let authToken: string;

  beforeEach(async () => {
    authToken = await loginAndGetToken();
  });

  test('GET /api/vaults - получить все vaults', async () => {
    const response = await request(app)
      .get('/api/vaults')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.vaults).toBeInstanceOf(Array);
    expect(response.body.vaults.length).toBeGreaterThan(0);
  });

  test('GET /api/vaults/:id - получить конкретный vault', async () => {
    const vaults = await getVaults();
    const vaultId = vaults[0].id;

    const response = await request(app)
      .get(`/api/vaults/${vaultId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.vault.id).toBe(vaultId);
    expect(response.body.vault).toHaveProperty('name');
    expect(response.body.vault).toHaveProperty('tier');
    expect(response.body.vault).toHaveProperty('apy');
  });

  test('GET /api/vaults/:id - несуществующий vault', async () => {
    const response = await request(app)
      .get('/api/vaults/nonexistent-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
  });

  test('GET /api/vaults/:id/stats - статистика vault', async () => {
    const vaults = await getVaults();
    const vaultId = vaults[0].id;

    const response = await request(app)
      .get(`/api/vaults/${vaultId}/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalInvested');
    expect(response.body).toHaveProperty('investorCount');
    expect(response.body).toHaveProperty('utilizationRate');
  });
});
```

**Файл**: `backend/tests/vault.test.ts`

---

#### 1.4 Withdrawal API

**Test Suite: Withdrawal Processing**

```typescript
describe('Withdrawal API', () => {
  let authToken: string;
  let testInvestment: any;

  beforeEach(async () => {
    authToken = await loginAndGetToken();
    testInvestment = await createTestInvestment(authToken, {
      usdtAmount: 10000,
      status: 'ACTIVE'
    });
  });

  test('POST /api/withdrawals - создание withdrawal request', async () => {
    const response = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tokenType: 'USDT',
        amount: 5000,
        destinationWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
      });

    expect(response.status).toBe(201);
    expect(response.body.withdrawal).toHaveProperty('id');
    expect(response.body.withdrawal.status).toBe('PENDING');
    expect(response.body.withdrawal.tokenType).toBe('USDT');
  });

  test('POST /api/withdrawals - insufficient balance', async () => {
    const response = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tokenType: 'USDT',
        amount: 999999, // Больше чем есть
        destinationWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Insufficient');
  });

  test('POST /api/withdrawals - invalid wallet address', async () => {
    const response = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tokenType: 'USDT',
        amount: 1000,
        destinationWallet: 'invalid-address'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid');
  });

  test('GET /api/withdrawals - получить все withdrawals', async () => {
    await createTestWithdrawal(authToken);
    await createTestWithdrawal(authToken);

    const response = await request(app)
      .get('/api/withdrawals')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.withdrawals).toBeInstanceOf(Array);
    expect(response.body.withdrawals.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/admin/withdrawals/:id/approve - admin approval (ADMIN only)', async () => {
    const adminToken = await getAdminToken();
    const withdrawal = await createTestWithdrawal(authToken);

    const response = await request(app)
      .post(`/api/admin/withdrawals/${withdrawal.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.withdrawal.status).toBe('COMPLETED');
    expect(response.body).toHaveProperty('txSignature');
  });

  test('POST /api/admin/withdrawals/:id/reject - admin rejection (ADMIN only)', async () => {
    const adminToken = await getAdminToken();
    const withdrawal = await createTestWithdrawal(authToken);

    const response = await request(app)
      .post(`/api/admin/withdrawals/${withdrawal.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Suspicious activity'
      });

    expect(response.status).toBe(200);
    expect(response.body.withdrawal.status).toBe('REJECTED');
  });
});
```

**Файл**: `backend/tests/withdrawal.test.ts`

---

### Priority 2: Blockchain Services

#### 2.1 Ethereum Service Tests

**Test Suite: USDT Operations**

```typescript
describe('Ethereum Service', () => {
  describe('verifyUSDTTransaction', () => {
    test('должен верифицировать валидную USDT транзакцию', async () => {
      const result = await verifyUSDTTransaction(
        'valid_tx_hash',
        '0xFromAddress',
        '0xToAddress',
        1000
      );

      expect(result).toBe(true);
    });

    test('должен отклонить транзакцию с неверным amount', async () => {
      const result = await verifyUSDTTransaction(
        'valid_tx_hash',
        '0xFromAddress',
        '0xToAddress',
        9999 // Неверная сумма
      );

      expect(result).toBe(false);
    });

    test('должен отклонить транзакцию с failed статусом', async () => {
      const result = await verifyUSDTTransaction(
        'failed_tx_hash',
        '0xFromAddress',
        '0xToAddress',
        1000
      );

      expect(result).toBe(false);
    });
  });

  describe('transferUSDTFromPlatform', () => {
    test('должен успешно перевести USDT (mock mode)', async () => {
      process.env.ENABLE_REAL_ETH_TRANSFERS = 'false';

      const txHash = await transferUSDTFromPlatform(
        '0xRecipient',
        1000
      );

      expect(txHash).toContain('mock_eth_tx_');
    });

    test('должен кинуть ошибку при insufficient ETH for gas', async () => {
      // Mock zero ETH balance
      await expect(
        transferUSDTFromPlatform('0xRecipient', 1000)
      ).rejects.toThrow('Insufficient ETH');
    });
  });

  describe('getUSDTBalance', () => {
    test('должен вернуть корректный USDT баланс', async () => {
      const balance = await getUSDTBalance('0xAddress');

      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Файл**: `backend/tests/ethereum.service.test.ts`

---

#### 2.2 Solana Service Tests

**Test Suite: NFT & SPL Token Operations**

```typescript
describe('Solana Service', () => {
  describe('transferTAKARAReward', () => {
    test('должен успешно перевести TAKARA (mock mode)', async () => {
      process.env.ENABLE_REAL_TOKEN_TRANSFERS = 'false';

      const signature = await transferTAKARAReward(
        'SolanaWalletAddress',
        100
      );

      expect(signature).toContain('mock_sol_tx_');
    });
  });

  describe('transferLAIKAReward', () => {
    test('должен успешно перевести LAIKA (mock mode)', async () => {
      process.env.ENABLE_REAL_TOKEN_TRANSFERS = 'false';

      const signature = await transferLAIKAReward(
        'SolanaWalletAddress',
        50
      );

      expect(signature).toContain('mock_sol_tx_');
    });
  });
});
```

**Файл**: `backend/tests/solana.service.test.ts`

---

#### 2.3 NFT Service Tests

**Test Suite: Metaplex NFT Minting**

```typescript
describe('NFT Service', () => {
  describe('mintInvestmentNFT', () => {
    test('должен успешно mint NFT (mock mode)', async () => {
      process.env.ENABLE_REAL_NFT_MINTING = 'false';

      const result = await mintInvestmentNFT({
        investmentId: 'inv-123',
        vaultName: 'Gold Vault',
        tier: 'GOLD',
        usdtAmount: 10000,
        ownerWallet: 'SolanaWalletAddress'
      }, mockPlatformWallet);

      expect(result).toHaveProperty('mintAddress');
      expect(result).toHaveProperty('metadataUri');
      expect(result.mintAddress).toContain('mock_nft_');
    });

    test('должен создать корректные NFT metadata', () => {
      const metadata = generateNFTMetadata({
        investmentId: 'inv-123',
        vaultName: 'Gold Vault',
        tier: 'GOLD',
        usdtAmount: 10000,
        timestamp: Date.now()
      });

      expect(metadata.name).toContain('Investment Certificate');
      expect(metadata.symbol).toBe('TKRA-INV');
      expect(metadata.attributes).toBeInstanceOf(Array);
      expect(metadata.attributes.find(a => a.trait_type === 'Tier').value).toBe('GOLD');
    });
  });

  describe('uploadMetadata', () => {
    test('должен загрузить metadata на IPFS (mock mode)', async () => {
      const metadata = generateNFTMetadata({...});
      const uri = await uploadMetadata(metadata);

      expect(uri).toContain('https://');
    });
  });
});
```

**Файл**: `backend/tests/nft.service.test.ts`

---

### Priority 3: Database & Models

#### 3.1 Prisma Models Tests

**Test Suite: User Model**

```typescript
describe('User Model', () => {
  test('должен создать пользователя с валидными данными', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        username: 'testuser'
      }
    });

    expect(user).toHaveProperty('id');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('USER'); // Default role
  });

  test('не должен создать пользователя с дубликатом email', async () => {
    await createUser('test@example.com');

    await expect(
      createUser('test@example.com')
    ).rejects.toThrow();
  });

  test('должен обновить wallet addresses', async () => {
    const user = await createUser('test@example.com');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ethereumAddress: '0x123...',
        walletAddress: 'Solana123...'
      }
    });

    expect(updated.ethereumAddress).toBe('0x123...');
    expect(updated.walletAddress).toBe('Solana123...');
  });
});
```

**Файл**: `backend/tests/models/user.test.ts`

---

**Test Suite: Investment Model**

```typescript
describe('Investment Model', () => {
  test('должен создать инвестицию с правильными relationships', async () => {
    const user = await createTestUser();
    const vault = await createTestVault();

    const investment = await prisma.investment.create({
      data: {
        userId: user.id,
        vaultId: vault.id,
        usdtAmount: 10000,
        txSignature: 'eth_tx_123',
        status: 'PENDING'
      },
      include: {
        user: true,
        vault: true
      }
    });

    expect(investment.user.email).toBe(user.email);
    expect(investment.vault.name).toBe(vault.name);
  });

  test('должен cascade delete yields при удалении investment', async () => {
    const investment = await createTestInvestment();
    await createTestYield(investment.id);

    await prisma.investment.delete({
      where: { id: investment.id }
    });

    const yields = await prisma.yield.findMany({
      where: { investmentId: investment.id }
    });

    expect(yields.length).toBe(0);
  });
});
```

**Файл**: `backend/tests/models/investment.test.ts`

---

## Frontend Testing

### Priority 1: Critical User Flows

#### 4.1 Authentication Flow

**Test Suite: Login & Registration**

```typescript
// frontend/src/components/Auth/Login.test.tsx
describe('Login Component', () => {
  test('должен отобразить форму логина', () => {
    render(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('должен показать ошибку при пустых полях', async () => {
    render(<Login />);

    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  test('должен успешно залогинить пользователя', async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      token: 'mock_token',
      user: { id: '1', email: 'test@example.com' }
    });

    render(<Login onLogin={mockLogin} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  test('должен показать ошибку при неверных credentials', async () => {
    const mockLogin = jest.fn().mockRejectedValue({
      message: 'Invalid credentials'
    });

    render(<Login onLogin={mockLogin} />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

**Файл**: `frontend/src/components/Auth/Login.test.tsx`

---

#### 4.2 Investment Flow

**Test Suite: Investment Modal**

```typescript
// frontend/src/components/Investment/InvestmentModal.test.tsx
describe('InvestmentModal Component', () => {
  const mockVault = {
    id: 'vault-1',
    name: 'Gold Vault',
    tier: 'GOLD',
    minimumInvestment: 100,
    capacity: 1000000,
    currentUtilization: 500000,
    apy: 12.5
  };

  test('должен отобразить информацию о vault', () => {
    render(<InvestmentModal vault={mockVault} isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Gold Vault')).toBeInTheDocument();
    expect(screen.getByText(/12.5% APY/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum.*100/i)).toBeInTheDocument();
  });

  test('должен показать ошибку при сумме меньше minimum', async () => {
    render(<InvestmentModal vault={mockVault} isOpen={true} onClose={() => {}} />);

    const input = screen.getByLabelText(/amount/i);
    fireEvent.change(input, { target: { value: '50' } });

    const investButton = screen.getByRole('button', { name: /invest/i });
    fireEvent.click(investButton);

    expect(await screen.findByText(/minimum investment is 100/i)).toBeInTheDocument();
  });

  test('должен connect MetaMask при клике на invest', async () => {
    const mockConnectWallet = jest.fn();

    render(
      <WalletContext.Provider value={{ connectWallet: mockConnectWallet, connected: false }}>
        <InvestmentModal vault={mockVault} isOpen={true} onClose={() => {}} />
      </WalletContext.Provider>
    );

    const input = screen.getByLabelText(/amount/i);
    fireEvent.change(input, { target: { value: '1000' } });

    const investButton = screen.getByRole('button', { name: /invest/i });
    fireEvent.click(investButton);

    await waitFor(() => {
      expect(mockConnectWallet).toHaveBeenCalled();
    });
  });

  test('должен показать loading state во время транзакции', async () => {
    const mockInvest = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <InvestmentModal
        vault={mockVault}
        isOpen={true}
        onClose={() => {}}
        onInvest={mockInvest}
      />
    );

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /invest/i }));

    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invest/i })).toBeDisabled();
  });

  test('должен показать success message после успешной инвестиции', async () => {
    const mockInvest = jest.fn().mockResolvedValue({
      id: 'inv-123',
      txSignature: 'eth_tx_456'
    });

    render(
      <InvestmentModal
        vault={mockVault}
        isOpen={true}
        onClose={() => {}}
        onInvest={mockInvest}
      />
    );

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /invest/i }));

    expect(await screen.findByText(/investment successful/i)).toBeInTheDocument();
  });
});
```

**Файл**: `frontend/src/components/Investment/InvestmentModal.test.tsx`

---

#### 4.3 Wallet Connection

**Test Suite: Wallet Provider**

```typescript
// frontend/src/contexts/WalletContext.test.tsx
describe('WalletContext', () => {
  test('должен connect MetaMask wallet', async () => {
    const mockEthereum = {
      request: jest.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']),
      on: jest.fn()
    };
    global.window.ethereum = mockEthereum;

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider
    });

    await act(async () => {
      await result.current.connectMetaMask();
    });

    expect(result.current.ethereumAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    expect(result.current.isMetaMaskConnected).toBe(true);
  });

  test('должен connect Phantom wallet', async () => {
    const mockSolana = {
      connect: jest.fn().mockResolvedValue({
        publicKey: { toString: () => 'SolanaAddress123' }
      }),
      on: jest.fn()
    };
    global.window.solana = mockSolana;

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider
    });

    await act(async () => {
      await result.current.connectPhantom();
    });

    expect(result.current.solanaAddress).toBe('SolanaAddress123');
    expect(result.current.isPhantomConnected).toBe(true);
  });

  test('должен disconnect оба кошелька', async () => {
    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider
    });

    // Connect both
    await act(async () => {
      await result.current.connectMetaMask();
      await result.current.connectPhantom();
    });

    // Disconnect
    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.ethereumAddress).toBeNull();
    expect(result.current.solanaAddress).toBeNull();
    expect(result.current.isMetaMaskConnected).toBe(false);
    expect(result.current.isPhantomConnected).toBe(false);
  });
});
```

**Файл**: `frontend/src/contexts/WalletContext.test.tsx`

---

### Priority 2: UI Components

#### 4.4 VaultCard Component

```typescript
describe('VaultCard Component', () => {
  const mockVault = {
    id: 'vault-1',
    name: 'Gold Vault',
    tier: 'GOLD',
    apy: 12.5,
    minimumInvestment: 100,
    capacity: 1000000,
    currentUtilization: 750000
  };

  test('должен отобразить корректную информацию', () => {
    render(<VaultCard vault={mockVault} />);

    expect(screen.getByText('Gold Vault')).toBeInTheDocument();
    expect(screen.getByText(/12.5%/i)).toBeInTheDocument();
    expect(screen.getByText(/min.*100/i)).toBeInTheDocument();
  });

  test('должен показать utilization progress bar', () => {
    render(<VaultCard vault={mockVault} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75'); // 750k/1000k = 75%
  });

  test('должен открыть modal при клике на Invest', () => {
    const mockOnInvest = jest.fn();
    render(<VaultCard vault={mockVault} onInvestClick={mockOnInvest} />);

    const investButton = screen.getByRole('button', { name: /invest/i });
    fireEvent.click(investButton);

    expect(mockOnInvest).toHaveBeenCalledWith(mockVault);
  });

  test('должен показать FULL badge когда capacity заполнена', () => {
    const fullVault = { ...mockVault, currentUtilization: 1000000 };
    render(<VaultCard vault={fullVault} />);

    expect(screen.getByText(/full/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invest/i })).toBeDisabled();
  });
});
```

**Файл**: `frontend/src/components/Vault/VaultCard.test.tsx`

---

## Integration Testing

### Priority 1: E2E Critical Flows

#### 5.1 Complete Investment Flow

**Test: Full Investment Cycle**

```typescript
// e2e/investment-flow.spec.ts
describe('Complete Investment Flow', () => {
  test('пользователь может создать инвестицию от начала до конца', async () => {
    // 1. Register
    await page.goto('/register');
    await page.fill('[name="email"]', 'investor@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="username"]', 'investor');
    await page.click('button:has-text("Register")');

    // 2. Login
    await page.waitForURL('/login');
    await page.fill('[name="email"]', 'investor@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Login")');

    // 3. Connect Wallets
    await page.waitForURL('/dashboard');
    await page.click('button:has-text("Connect MetaMask")');
    // Mock MetaMask connection
    await page.evaluate(() => {
      window.ethereum = {
        request: () => Promise.resolve(['0x123...'])
      };
    });
    await page.waitForSelector('text=Connected');

    // 4. Select Vault
    await page.goto('/vaults');
    await page.click('.vault-card:first-child button:has-text("Invest")');

    // 5. Fill Investment Amount
    await page.fill('[name="amount"]', '1000');

    // 6. Confirm Investment
    await page.click('button:has-text("Confirm Investment")');

    // 7. Wait for Transaction
    await page.waitForSelector('text=Investment Successful');

    // 8. Verify Investment appears in Dashboard
    await page.goto('/investments');
    await expect(page.locator('.investment-card')).toBeVisible();
    await expect(page.locator('.investment-card')).toContainText('1000 USDT');
  });
});
```

**Файл**: `e2e/investment-flow.spec.ts`

---

#### 5.2 Withdrawal Flow

**Test: Request and Process Withdrawal**

```typescript
// e2e/withdrawal-flow.spec.ts
describe('Withdrawal Flow', () => {
  test('пользователь может запросить withdrawal, admin approve', async () => {
    // Setup: Create investment with balance
    const { user, investment } = await setupInvestmentWithBalance();

    // User: Request Withdrawal
    await loginAs(user);
    await page.goto('/wallet');
    await page.click('button:has-text("Withdraw")');
    await page.fill('[name="amount"]', '500');
    await page.selectOption('[name="tokenType"]', 'USDT');
    await page.fill('[name="wallet"]', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    await page.click('button:has-text("Submit")');

    await expect(page.locator('text=Withdrawal request submitted')).toBeVisible();

    // Admin: Approve Withdrawal
    await loginAsAdmin();
    await page.goto('/admin/withdrawals');
    await page.click(`.withdrawal-row:has-text("${user.email}") button:has-text("Approve")`);
    await page.click('button:has-text("Confirm Approval")');

    await expect(page.locator('text=Withdrawal approved')).toBeVisible();

    // Verify: Check transaction was sent
    const withdrawal = await getWithdrawal();
    expect(withdrawal.status).toBe('COMPLETED');
    expect(withdrawal.txSignature).toBeTruthy();
  });
});
```

**Файл**: `e2e/withdrawal-flow.spec.ts`

---

## Blockchain Testing

### Priority 1: Testnet Integration

#### 6.1 Ethereum USDT Operations

**Test: Real Ethereum Transactions (Testnet)**

```typescript
describe('Ethereum USDT Operations (Sepolia Testnet)', () => {
  beforeAll(async () => {
    // Setup testnet environment
    process.env.ETHEREUM_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/...';
    process.env.ENABLE_REAL_ETH_TRANSFERS = 'true';
  });

  test('должен верифицировать реальную USDT транзакцию на Sepolia', async () => {
    // Send actual USDT transaction on Sepolia
    const txHash = await sendTestnetUSDT('0xRecipient', 100);

    // Wait for confirmation
    await waitForConfirmation(txHash);

    // Verify
    const isValid = await verifyUSDTTransaction(
      txHash,
      process.env.PLATFORM_ETHEREUM_ADDRESS,
      '0xRecipient',
      100
    );

    expect(isValid).toBe(true);
  });

  test('должен успешно transferить USDT от platform wallet', async () => {
    const initialBalance = await getUSDTBalance(testRecipient);

    const txHash = await transferUSDTFromPlatform(testRecipient, 50);
    await waitForConfirmation(txHash);

    const finalBalance = await getUSDTBalance(testRecipient);
    expect(finalBalance - initialBalance).toBe(50);
  });

  test('должен проверить gas fees before transfer', async () => {
    const ethBalance = await getPlatformETHBalance();
    expect(ethBalance).toBeGreaterThan(0.01); // Min для gas
  });
});
```

**Файл**: `backend/tests/integration/ethereum.testnet.test.ts`

---

#### 6.2 Solana NFT Minting

**Test: Real NFT Minting (Devnet)**

```typescript
describe('Solana NFT Minting (Devnet)', () => {
  beforeAll(async () => {
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
    process.env.ENABLE_REAL_NFT_MINTING = 'true';
  });

  test('должен mint NFT на Solana devnet', async () => {
    const result = await mintInvestmentNFT({
      investmentId: 'test-inv-123',
      vaultName: 'Gold Vault',
      tier: 'GOLD',
      usdtAmount: 10000,
      ownerWallet: testWallet.publicKey.toBase58()
    }, platformWallet);

    expect(result.mintAddress).toBeTruthy();
    expect(result.signature).toBeTruthy();

    // Verify NFT exists on-chain
    const nft = await metaplex.nfts().findByMint({
      mintAddress: new PublicKey(result.mintAddress)
    });

    expect(nft).toBeTruthy();
    expect(nft.name).toContain('Investment Certificate');
  });

  test('должен загрузить metadata на IPFS', async () => {
    const metadata = generateNFTMetadata({...});
    const uri = await uploadMetadata(metadata);

    expect(uri).toMatch(/^https:\/\//);

    // Verify metadata is accessible
    const response = await fetch(uri);
    const data = await response.json();

    expect(data.name).toBeTruthy();
    expect(data.attributes).toBeInstanceOf(Array);
  });
});
```

**Файл**: `backend/tests/integration/nft.devnet.test.ts`

---

## Security Testing

### Priority 1: Authentication & Authorization

#### 7.1 JWT Security

```typescript
describe('JWT Security', () => {
  test('не должен принимать tampered token', async () => {
    const validToken = await generateToken(user);
    const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

    const response = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(response.status).toBe(401);
  });

  test('не должен принимать expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );

    const response = await request(app)
      .get('/api/investments')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  test('должен refresh token before expiry', async () => {
    const token = await generateToken(user, '5m');

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('newToken');
  });
});
```

---

#### 7.2 SQL Injection Prevention

```typescript
describe('SQL Injection Prevention', () => {
  test('не должен быть уязвим к SQL injection в email', async () => {
    const maliciousEmail = "admin'--";

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: maliciousEmail,
        password: 'anything'
      });

    expect(response.status).not.toBe(200);
  });

  test('должен sanitize user input в search', async () => {
    const maliciousQuery = "1' OR '1'='1";

    const response = await request(app)
      .get(`/api/vaults/search?q=${encodeURIComponent(maliciousQuery)}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.vaults).toBeInstanceOf(Array);
    // Should not return all vaults
  });
});
```

---

#### 7.3 XSS Prevention

```typescript
describe('XSS Prevention', () => {
  test('должен sanitize username на регистрации', async () => {
    const xssPayload = '<script>alert("xss")</script>';

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: xssPayload
      });

    expect(response.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    expect(user.username).not.toContain('<script>');
  });
});
```

---

## Performance Testing

### Priority 1: Load Testing

#### 8.1 API Performance

```typescript
describe('API Performance', () => {
  test('GET /api/vaults должен отвечать < 200ms', async () => {
    const start = Date.now();

    const response = await request(app)
      .get('/api/vaults')
      .set('Authorization', `Bearer ${validToken}`);

    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('должен handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .get('/api/vaults')
        .set('Authorization', `Bearer ${validToken}`)
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    expect(responses.every(r => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(5000); // All requests < 5s
  });
});
```

---

#### 8.2 Database Query Performance

```typescript
describe('Database Performance', () => {
  test('должен fetch user investments с pagination < 100ms', async () => {
    // Create 1000 investments
    await createManyInvestments(1000);

    const start = Date.now();

    const investments = await prisma.investment.findMany({
      where: { userId: testUser.id },
      take: 20,
      skip: 0,
      include: {
        vault: true
      }
    });

    const duration = Date.now() - start;

    expect(investments.length).toBe(20);
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Test Execution Plan

### Phase 1: Unit Tests (Week 1)
- [ ] Backend Services (Ethereum, Solana, NFT)
- [ ] Database Models
- [ ] Utility Functions

### Phase 2: API Tests (Week 2)
- [ ] Authentication API
- [ ] Investment API
- [ ] Vault API
- [ ] Withdrawal API

### Phase 3: Frontend Tests (Week 3)
- [ ] Component Tests
- [ ] Context/Hook Tests
- [ ] UI Integration Tests

### Phase 4: E2E Tests (Week 4)
- [ ] Critical User Flows
- [ ] Admin Workflows

### Phase 5: Blockchain Tests (Week 5)
- [ ] Testnet Integration
- [ ] Real Transaction Verification

### Phase 6: Security & Performance (Week 6)
- [ ] Security Audit Tests
- [ ] Load Testing
- [ ] Stress Testing

---

## Test Coverage Goals

- **Overall Coverage**: >80%
- **Critical Paths**: 100%
- **Services**: >90%
- **Controllers**: >85%
- **Components**: >75%

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm install
      - name: Run tests
        run: cd backend && npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v2

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Run tests
        run: cd frontend && npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v2

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Install Playwright
        run: npx playwright install
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Useful Commands

```bash
# Backend
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.ts

# Run in watch mode
npm run test:watch

# Frontend
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# E2E
cd e2e

# Run Playwright tests
npx playwright test

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

**Начать тестирование с Priority 1 задач!**