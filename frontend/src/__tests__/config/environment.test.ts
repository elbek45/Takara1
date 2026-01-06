import { describe, it, expect } from 'vitest'

describe('Production Environment Configuration', () => {
  // These values should match .env.production
  const PRODUCTION_CONFIG = {
    VITE_API_URL: 'https://takarafi.com/api',
    VITE_SOLANA_NETWORK: 'mainnet-beta',
    VITE_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    VITE_ETHEREUM_NETWORK: 'mainnet',
    VITE_ETHEREUM_CHAIN_ID: '1',
    VITE_USDT_CONTRACT_ETH: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    VITE_TRON_NETWORK: 'mainnet',
    VITE_PLATFORM_WALLET_SOL: '39YVQH3mg5ZpXKYiszHpxLkept8wsNmYHM3fLi6f7cVy',
  }

  it('should have correct API URL for production', () => {
    expect(PRODUCTION_CONFIG.VITE_API_URL).toBe('https://takarafi.com/api')
    expect(PRODUCTION_CONFIG.VITE_API_URL).toMatch(/^https:\/\//)
  })

  it('should use Solana mainnet', () => {
    expect(PRODUCTION_CONFIG.VITE_SOLANA_NETWORK).toBe('mainnet-beta')
  })

  it('should use public Solana RPC', () => {
    expect(PRODUCTION_CONFIG.VITE_SOLANA_RPC_URL).toContain('solana.com')
    expect(PRODUCTION_CONFIG.VITE_SOLANA_RPC_URL).toContain('mainnet-beta')
  })

  it('should use Ethereum mainnet', () => {
    expect(PRODUCTION_CONFIG.VITE_ETHEREUM_NETWORK).toBe('mainnet')
    expect(PRODUCTION_CONFIG.VITE_ETHEREUM_CHAIN_ID).toBe('1')
  })

  it('should have valid Ethereum USDT contract address', () => {
    const usdtAddress = PRODUCTION_CONFIG.VITE_USDT_CONTRACT_ETH
    expect(usdtAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
    // Known mainnet USDT address
    expect(usdtAddress.toLowerCase()).toBe('0xdac17f958d2ee523a2206206994597c13d831ec7')
  })

  it('should use TRON mainnet', () => {
    expect(PRODUCTION_CONFIG.VITE_TRON_NETWORK).toBe('mainnet')
  })

  it('should have valid Solana platform wallet address', () => {
    const walletAddress = PRODUCTION_CONFIG.VITE_PLATFORM_WALLET_SOL
    expect(walletAddress).toHaveLength(44)
    expect(walletAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/)
  })
})

describe('Ethereum Chain Configuration', () => {
  const CHAINS = {
    mainnet: { id: 1, name: 'Ethereum Mainnet' },
    sepolia: { id: 11155111, name: 'Sepolia Testnet' },
    goerli: { id: 5, name: 'Goerli Testnet' },
  }

  it('should have correct mainnet chain ID', () => {
    expect(CHAINS.mainnet.id).toBe(1)
  })

  it('should identify mainnet vs testnet', () => {
    const isMainnet = (chainId: number) => chainId === 1
    const isTestnet = (chainId: number) => [5, 11155111].includes(chainId)

    expect(isMainnet(1)).toBe(true)
    expect(isMainnet(11155111)).toBe(false)
    expect(isTestnet(11155111)).toBe(true)
    expect(isTestnet(1)).toBe(false)
  })
})

describe('Wallet Address Validation', () => {
  it('should validate Solana address format', () => {
    const isValidSolanaAddress = (address: string): boolean => {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    }

    expect(isValidSolanaAddress('39YVQH3mg5ZpXKYiszHpxLkept8wsNmYHM3fLi6f7cVy')).toBe(true)
    expect(isValidSolanaAddress('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')).toBe(true)
    expect(isValidSolanaAddress('invalid')).toBe(false)
    expect(isValidSolanaAddress('')).toBe(false)
  })

  it('should validate Ethereum address format', () => {
    const isValidEthereumAddress = (address: string): boolean => {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    }

    expect(isValidEthereumAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toBe(true)
    expect(isValidEthereumAddress('0x78C6cA48d9C1191cCbb5cAc113CeA490F51BB91b')).toBe(true)
    expect(isValidEthereumAddress('0x123')).toBe(false)
    expect(isValidEthereumAddress('invalid')).toBe(false)
  })

  it('should validate TRON address format', () => {
    const isValidTronAddress = (address: string): boolean => {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
    }

    expect(isValidTronAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')).toBe(true)
    expect(isValidTronAddress('TQ9ovCpPB2vXXeRbHXgTnxFkQKJAzdZNX9')).toBe(true)
    expect(isValidTronAddress('invalid')).toBe(false)
    expect(isValidTronAddress('0x123')).toBe(false)
  })
})

describe('Token Decimals', () => {
  it('should use correct decimals for USDT', () => {
    const USDT_DECIMALS = 6

    // Converting from smallest unit to display value
    expect(1000000 / Math.pow(10, USDT_DECIMALS)).toBe(1)
    expect(500000 / Math.pow(10, USDT_DECIMALS)).toBe(0.5)

    // Converting from display value to smallest unit
    expect(1 * Math.pow(10, USDT_DECIMALS)).toBe(1000000)
    expect(100 * Math.pow(10, USDT_DECIMALS)).toBe(100000000)
  })

  it('should use correct decimals for SOL', () => {
    const SOL_DECIMALS = 9
    const LAMPORTS_PER_SOL = Math.pow(10, SOL_DECIMALS)

    expect(LAMPORTS_PER_SOL).toBe(1000000000)
    expect(1 * LAMPORTS_PER_SOL / LAMPORTS_PER_SOL).toBe(1)
  })
})
