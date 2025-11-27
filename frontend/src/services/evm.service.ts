/**
 * EVM Service (MetaMask)
 * Handles Ethereum/BSC blockchain interactions for USDT payments
 */

import { ethers } from 'ethers'

// BSC Testnet configuration
const BSC_TESTNET_CONFIG = {
  chainId: '0x61', // 97 in hex
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
}

// USDT Contract on BSC Testnet
const USDT_CONTRACT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' // BSC Testnet USDT

// ERC20 ABI (minimal for USDT transfers)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]

class EVMService {
  private provider: ethers.BrowserProvider | null = null
  private signer: ethers.JsonRpcSigner | null = null

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  /**
   * Connect to MetaMask
   */
  async connect(): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask extension.')
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in MetaMask')
      }

      // Initialize provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum)
      this.signer = await this.provider.getSigner()

      // Switch to BSC Testnet if needed
      await this.switchToBSCTestnet()

      return accounts[0]
    } catch (error: any) {
      console.error('MetaMask connection error:', error)
      throw new Error(error.message || 'Failed to connect to MetaMask')
    }
  }

  /**
   * Switch to BSC Testnet
   */
  async switchToBSCTestnet(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found')
    }

    try {
      // Try to switch to BSC Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET_CONFIG.chainId }],
      })
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET_CONFIG],
          })
        } catch (addError) {
          console.error('Failed to add BSC Testnet:', addError)
          throw new Error('Failed to add BSC Testnet to MetaMask')
        }
      } else {
        throw switchError
      }
    }
  }

  /**
   * Get connected wallet address
   */
  async getAddress(): Promise<string | null> {
    if (!this.signer) {
      return null
    }
    return await this.signer.getAddress()
  }

  /**
   * Get USDT balance
   */
  async getUSDTBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }

    try {
      const contract = new ethers.Contract(
        USDT_CONTRACT_ADDRESS,
        ERC20_ABI,
        this.provider
      )

      const balance = await contract.balanceOf(address)
      const decimals = await contract.decimals()

      // Convert from wei to USDT
      return ethers.formatUnits(balance, decimals)
    } catch (error) {
      console.error('Error getting USDT balance:', error)
      return '0'
    }
  }

  /**
   * Get BNB balance
   */
  async getBNBBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }

    try {
      const balance = await this.provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Error getting BNB balance:', error)
      return '0'
    }
  }

  /**
   * Transfer USDT to platform wallet
   */
  async transferUSDT(
    toAddress: string,
    amount: string
  ): Promise<{ hash: string; receipt: any }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect MetaMask first.')
    }

    try {
      const contract = new ethers.Contract(
        USDT_CONTRACT_ADDRESS,
        ERC20_ABI,
        this.signer
      )

      // Get decimals
      const decimals = await contract.decimals()

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, decimals)

      // Send transaction
      const tx = await contract.transfer(toAddress, amountWei)

      console.log('USDT transfer transaction sent:', tx.hash)

      // Wait for confirmation
      const receipt = await tx.wait()

      console.log('USDT transfer confirmed:', receipt.hash)

      return {
        hash: tx.hash,
        receipt,
      }
    } catch (error: any) {
      console.error('USDT transfer error:', error)

      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by user')
      }

      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient BNB for gas fees')
      }

      throw new Error(error.message || 'Failed to transfer USDT')
    }
  }

  /**
   * Get platform wallet address (where to send USDT)
   */
  getPlatformWalletAddress(): string {
    // Platform's MetaMask/BSC wallet address
    // TODO: Replace with actual platform wallet address
    return import.meta.env.VITE_PLATFORM_EVM_WALLET || '0x0000000000000000000000000000000000000000'
  }

  /**
   * Disconnect MetaMask
   */
  disconnect(): void {
    this.provider = null
    this.signer = null
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback)
    }
  }

  /**
   * Listen for chain changes
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback)
    }
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}

export const evmService = new EVMService()
export default evmService
