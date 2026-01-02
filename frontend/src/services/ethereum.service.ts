/**
 * Ethereum Service
 *
 * Handles EVM wallet integration (Trust Wallet, MetaMask, etc.) for USDT payments
 */

import { ethers } from 'ethers';
import {
  EthereumWallet,
  USDTDepositParams,
  USDTDepositResult,
  WalletNotFoundError,
  WalletConnectionError,
  TransactionError,
  InsufficientBalanceError,
  WrongNetworkError,
} from '../types/blockchain';

// ERC-20 USDT ABI (only methods we need)
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Extend Window interface for ethereum and trustwallet
declare global {
  interface Window {
    ethereum?: any;
    trustwallet?: any;
  }
}

/**
 * Get Trust Wallet provider specifically
 * Trust Wallet can be found at:
 * 1. window.ethereum (with isTrust flag)
 * 2. window.ethereum.providers array
 * 3. window.trustwallet (dedicated namespace)
 */
function getTrustWalletProvider(): any | null {
  const isTrustWallet = (provider: any) => !!provider?.isTrust;

  // Check if any ethereum provider exists
  if (typeof window === 'undefined') {
    return null;
  }

  // First check window.trustwallet (most reliable)
  if (window.trustwallet) {
    return window.trustwallet;
  }

  // Check if window.ethereum is Trust Wallet
  if (window.ethereum && isTrustWallet(window.ethereum)) {
    return window.ethereum;
  }

  // Check providers array (when multiple wallets installed)
  if (window.ethereum?.providers) {
    const trustProvider = window.ethereum.providers.find(isTrustWallet);
    if (trustProvider) {
      return trustProvider;
    }
  }

  return null;
}

/**
 * Get any EVM provider (MetaMask, Phantom EVM, etc.)
 */
function getAnyEVMProvider(): any | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Prefer Trust Wallet if available
  const trustProvider = getTrustWalletProvider();
  if (trustProvider) {
    return trustProvider;
  }

  // Fallback to any ethereum provider
  return window.ethereum || null;
}

class EthereumService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private usdtContract: ethers.Contract | null = null;
  private rawProvider: any = null; // Store the raw ethereum provider

  // Network configuration from environment
  private readonly EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_ETHEREUM_CHAIN_ID) || 1;
  private readonly NETWORK_NAME = import.meta.env.VITE_ETHEREUM_NETWORK === 'sepolia' ? 'Sepolia Testnet' : 'Ethereum Mainnet';
  private readonly USDT_CONTRACT_ADDRESS = import.meta.env.VITE_USDT_CONTRACT_ETH;
  private readonly USDT_DECIMALS = 6; // USDT has 6 decimals

  /**
   * Check if EVM wallet is installed (Trust Wallet, MetaMask, etc.)
   */
  isWalletInstalled(): boolean {
    return getAnyEVMProvider() !== null;
  }

  /**
   * Check if Trust Wallet is specifically installed
   */
  isTrustWalletInstalled(): boolean {
    return getTrustWalletProvider() !== null;
  }

  /**
   * Alias for backward compatibility
   */
  isMetaMaskInstalled(): boolean {
    return this.isWalletInstalled();
  }

  /**
   * Connect to EVM wallet (Trust Wallet, MetaMask, etc.)
   */
  async connect(): Promise<EthereumWallet> {
    // Get the appropriate provider (prefer Trust Wallet)
    this.rawProvider = getAnyEVMProvider();

    if (!this.rawProvider) {
      throw new WalletNotFoundError('evm');
    }

    const providerName = this.rawProvider.isTrust ? 'Trust Wallet' :
                         this.rawProvider.isPhantom ? 'Phantom' :
                         this.rawProvider.isMetaMask ? 'MetaMask' : 'EVM Wallet';
    console.log(`Connecting to ${providerName}...`);

    try {
      // Request account access using the specific provider
      const accounts = await this.rawProvider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new WalletConnectionError('evm', 'No accounts found');
      }

      // Create provider and signer using the specific raw provider
      this.provider = new ethers.BrowserProvider(this.rawProvider);
      this.signer = await this.provider.getSigner();

      // Get network info
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      // Get balance
      const balance = await this.provider.getBalance(accounts[0]);
      const balanceInEth = ethers.formatEther(balance);

      // Initialize USDT contract only if contract address is configured
      if (this.USDT_CONTRACT_ADDRESS) {
        this.usdtContract = new ethers.Contract(
          this.USDT_CONTRACT_ADDRESS,
          USDT_ABI,
          this.signer
        );
      } else {
        console.warn('USDT contract address not configured (VITE_USDT_CONTRACT_ETH)');
        this.usdtContract = null;
      }

      // Listen for account changes (use the specific provider)
      this.rawProvider.on('accountsChanged', this.handleAccountsChanged.bind(this));

      // Listen for chain changes
      this.rawProvider.on('chainChanged', this.handleChainChanged.bind(this));

      return {
        address: accounts[0],
        chainId,
        balance: balanceInEth,
        provider: this.provider,
      };
    } catch (error: any) {
      console.error('EVM wallet connection error:', error);
      // Provide more helpful error messages
      let errorMessage = 'Unknown error occurred';
      if (error.code === 4001) {
        errorMessage = 'Connection rejected by user';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending. Check your wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new WalletConnectionError('evm', errorMessage);
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (this.rawProvider) {
      try {
        this.rawProvider.removeListener('accountsChanged', this.handleAccountsChanged);
        this.rawProvider.removeListener('chainChanged', this.handleChainChanged);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    this.provider = null;
    this.signer = null;
    this.usdtContract = null;
    this.rawProvider = null;
  }

  /**
   * Get current account address
   */
  async getAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  /**
   * Get ETH balance
   */
  async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const addr = address || await this.getAddress();
    if (!addr) {
      throw new Error('No address provided');
    }

    const balance = await this.provider.getBalance(addr);
    return ethers.formatEther(balance);
  }

  /**
   * Get USDT balance
   */
  async getUSDTBalance(address?: string): Promise<number> {
    if (!this.usdtContract || !this.provider) {
      return 0; // Silently return 0 if not initialized
    }

    // Check network before trying to get balance
    const isCorrectNetwork = await this.checkNetwork();
    if (!isCorrectNetwork) {
      return 0; // Wrong network, return 0 silently
    }

    const addr = address || await this.getAddress();
    if (!addr) {
      return 0;
    }

    try {
      const balance = await this.usdtContract.balanceOf(addr);
      return Number(ethers.formatUnits(balance, this.USDT_DECIMALS));
    } catch (error: any) {
      // Silently return 0 on error (wrong network, contract not deployed, etc.)
      return 0;
    }
  }

  /**
   * Check if connected to correct network
   */
  async checkNetwork(): Promise<boolean> {
    if (!this.provider) return false;

    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    return chainId === this.EXPECTED_CHAIN_ID;
  }

  /**
   * Switch to expected network
   */
  async switchToExpectedNetwork(): Promise<void> {
    const provider = this.rawProvider || getAnyEVMProvider();
    if (!provider) {
      throw new Error('EVM wallet not found');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Error switching network:', error);
      throw new WrongNetworkError(this.NETWORK_NAME, 'Unknown network');
    }
  }

  /**
   * Alias for backward compatibility
   */
  async switchToMainnet(): Promise<void> {
    return this.switchToExpectedNetwork();
  }

  /**
   * Approve USDT spending
   */
  async approveUSDT(spenderAddress: string, amount: number): Promise<string> {
    if (!this.usdtContract || !this.signer) {
      throw new Error('USDT contract or signer not initialized');
    }

    // Check network
    const isCorrectNetwork = await this.checkNetwork();
    if (!isCorrectNetwork) {
      throw new WrongNetworkError(this.NETWORK_NAME, 'Wrong network');
    }

    try {
      // Convert amount to contract units (6 decimals for USDT)
      const amountInUnits = ethers.parseUnits(amount.toString(), this.USDT_DECIMALS);

      // Send approve transaction
      const tx = await this.usdtContract.approve(spenderAddress, amountInUnits);

      console.log('USDT approve transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log('USDT approved:', receipt.hash);

      return receipt.hash;
    } catch (error: any) {
      console.error('Error approving USDT:', error);
      throw new TransactionError(`Failed to approve USDT: ${error.message}`);
    }
  }

  /**
   * Transfer USDT
   */
  async transferUSDT(params: USDTDepositParams): Promise<USDTDepositResult> {
    if (!this.usdtContract || !this.signer) {
      throw new Error('USDT contract or signer not initialized');
    }

    // Check network
    const isCorrectNetwork = await this.checkNetwork();
    if (!isCorrectNetwork) {
      await this.switchToMainnet();
    }

    try {
      // Check balance
      const balance = await this.getUSDTBalance(params.fromAddress);
      if (balance < params.amount) {
        throw new InsufficientBalanceError(params.amount, balance, 'USDT');
      }

      // Convert amount to contract units
      const amountInUnits = ethers.parseUnits(params.amount.toString(), this.USDT_DECIMALS);

      // Send transfer transaction
      const tx = await this.usdtContract.transfer(params.toAddress, amountInUnits);

      console.log('USDT transfer transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log('USDT transfer confirmed:', receipt.hash);

      return {
        txHash: receipt.hash,
        amount: params.amount,
        blockchain: 'ethereum',
        timestamp: Date.now(),
        status: receipt.status === 1 ? 'confirmed' : 'failed',
      };
    } catch (error: any) {
      console.error('Error transferring USDT:', error);

      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new InsufficientBalanceError(params.amount, 0, 'ETH for gas');
      }

      throw new TransactionError(`Failed to transfer USDT: ${error.message}`, error.hash);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Estimate gas for USDT transfer
   */
  async estimateGas(toAddress: string, amount: number): Promise<bigint> {
    if (!this.usdtContract) {
      throw new Error('USDT contract not initialized');
    }

    const amountInUnits = ethers.parseUnits(amount.toString(), this.USDT_DECIMALS);

    try {
      return await this.usdtContract.transfer.estimateGas(toAddress, amountInUnits);
    } catch (error: any) {
      console.error('Error estimating gas:', error);
      // Return default gas limit for USDT transfers
      return BigInt(65000);
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const feeData = await this.provider.getFeeData();
    if (!feeData.gasPrice) {
      return '0';
    }

    return ethers.formatUnits(feeData.gasPrice, 'gwei');
  }

  /**
   * Format address for display (0x1234...5678)
   */
  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Event handlers
  private handleAccountsChanged(accounts: string[]) {
    console.log('Accounts changed:', accounts);
    if (accounts.length === 0) {
      // User disconnected wallet
      this.disconnect();
    } else {
      // Account switched
      window.location.reload();
    }
  }

  private handleChainChanged(chainId: string) {
    console.log('Chain changed:', chainId);
    // Reload page on chain change
    window.location.reload();
  }
}

// Export singleton instance
export const ethereumService = new EthereumService();
export default ethereumService;
