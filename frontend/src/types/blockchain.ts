/**
 * Blockchain Types and Interfaces
 *
 * Defines types for multi-chain support (Ethereum + Solana)
 */

export type BlockchainType = 'ethereum' | 'solana';
export type WalletType = 'metamask' | 'phantom';

export interface WalletConnection {
  type: WalletType;
  blockchain: BlockchainType;
  address: string;
  chainId?: number; // For Ethereum
  network?: string; // For Solana
  isConnected: boolean;
}

export interface EthereumWallet {
  address: string;
  chainId: number;
  balance: string;
  provider: any; // ethers.BrowserProvider
}

export interface SolanaWallet {
  address: string;
  publicKey: string;
  balance: number;
  provider: any; // Phantom provider
}

export interface USDTDepositParams {
  amount: number;
  toAddress: string;
  fromAddress: string;
}

export interface USDTDepositResult {
  txHash: string;
  amount: number;
  blockchain: BlockchainType;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface LAIKABoostParams {
  amount: number;
  investmentId: string;
  solanaAddress: string;
}

export interface LAIKABoostResult {
  txSignature: string;
  amount: number;
  additionalAPY: number;
  timestamp: number;
}

export interface InvestmentTransaction {
  // Ethereum USDT deposit
  usdtTxHash: string;
  usdtAmount: number;
  ethereumAddress: string;

  // Solana LAIKA boost (optional)
  laikaTxHash?: string;
  laikaAmount?: number;

  // Solana NFT and rewards
  solanaAddress: string;
  nftMintAddress?: string;
}

export interface BlockchainConfig {
  ethereum: {
    chainId: number;
    rpcUrl: string;
    usdtContract: string;
    networkName: string;
  };
  solana: {
    network: string;
    rpcUrl: string;
    usdtContract: string;
    laikaContract: string;
    takaraContract: string;
  };
}

// Error types
export class WalletNotFoundError extends Error {
  constructor(walletType: WalletType) {
    super(`${walletType} wallet not found. Please install the extension.`);
    this.name = 'WalletNotFoundError';
  }
}

export class WalletConnectionError extends Error {
  constructor(walletType: WalletType, reason: string) {
    super(`Failed to connect to ${walletType}: ${reason}`);
    this.name = 'WalletConnectionError';
  }
}

export class TransactionError extends Error {
  constructor(message: string, public txHash?: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(required: number, available: number, token: string) {
    super(`Insufficient ${token} balance. Required: ${required}, Available: ${available}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class WrongNetworkError extends Error {
  constructor(expected: string | number, actual: string | number) {
    super(`Wrong network. Expected: ${expected}, Connected to: ${actual}`);
    this.name = 'WrongNetworkError';
  }
}
