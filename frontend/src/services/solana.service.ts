/**
 * Solana Service
 * Handles all Solana blockchain interactions
 */

import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  SendTransactionError,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token'

// Use environment RPC or fall back to public mainnet RPC
// Primary: Helius public endpoint, Fallback: official Solana RPC
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff'

// Simulation mode - skips real blockchain transactions for testing
const SIMULATION_MODE = import.meta.env.VITE_SIMULATION_MODE === 'true'

// Token mint addresses (Mainnet)
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') // USDT on Solana mainnet
const TAKARA_MINT = new PublicKey('6biyv9NcaHmf8rKfLFGmj6eTwR9LBQtmi8dGUp2vRsgA') // TAKARA Token (mainnet)
const LAIKA_MINT = new PublicKey('27yzfJSNvYLBjgSNbMyXMMUWzx6T9q4B9TP7KVBS5vPo') // LAIKA Token (mainnet - Cosmodog)

// Balance cache to reduce RPC calls (60 second TTL)
const CACHE_TTL = 60000
const balanceCache = new Map<string, { value: number; timestamp: number }>()

function getCachedBalance(key: string): number | null {
  const cached = balanceCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value
  }
  return null
}

function setCachedBalance(key: string, value: number): void {
  balanceCache.set(key, { value, timestamp: Date.now() })
}

// Type for sendTransaction function from wallet adapter
type SendTransactionFn = (
  transaction: Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean }
) => Promise<string>

class SolanaService {
  private connection: Connection

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed')
  }

  /**
   * Get SOL balance with caching
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const cacheKey = `sol:${publicKey.toBase58()}`
    const cached = getCachedBalance(cacheKey)
    if (cached !== null) return cached

    try {
      const balance = await this.connection.getBalance(publicKey)
      const result = balance / LAMPORTS_PER_SOL
      setCachedBalance(cacheKey, result)
      return result
    } catch {
      // Silently return 0 - balance check is non-critical
      return 0
    }
  }

  /**
   * Get SPL token balance with caching
   */
  async getTokenBalance(
    walletPublicKey: PublicKey,
    mintPublicKey: PublicKey
  ): Promise<number> {
    const cacheKey = `token:${walletPublicKey.toBase58()}:${mintPublicKey.toBase58()}`
    const cached = getCachedBalance(cacheKey)
    if (cached !== null) return cached

    try {
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        walletPublicKey
      )
      const accountInfo = await getAccount(this.connection, tokenAccount)
      const result = Number(accountInfo.amount) / Math.pow(10, 6) // Assuming 6 decimals
      setCachedBalance(cacheKey, result)
      return result
    } catch {
      // Token account doesn't exist or RPC error - return 0 silently
      // This is expected for wallets that haven't received this token yet
      setCachedBalance(cacheKey, 0)
      return 0
    }
  }

  /**
   * Clear balance cache (call after transactions)
   */
  clearCache(): void {
    balanceCache.clear()
  }

  /**
   * Transfer SPL tokens using wallet adapter's sendTransaction
   * This method handles blockhash management internally and avoids "Blockhash not found" errors
   * In SIMULATION_MODE, returns a fake signature without doing real transactions
   */
  async transferToken(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    mintPublicKey: PublicKey,
    amount: number,
    sendTransaction: SendTransactionFn
  ): Promise<string> {
    // SIMULATION MODE - Return fake signature for testing
    if (SIMULATION_MODE) {
      console.log('🧪 SIMULATION MODE: Skipping real blockchain transaction')
      console.log(`   From: ${fromPublicKey.toBase58()}`)
      console.log(`   To: ${toPublicKey.toBase58()}`)
      console.log(`   Amount: ${amount}`)
      console.log(`   Mint: ${mintPublicKey.toBase58()}`)

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Return fake signature
      const fakeSignature = `SIM_${Date.now()}_${Math.random().toString(36).substring(7)}`
      console.log(`   Fake Signature: ${fakeSignature}`)
      return fakeSignature
    }

    try {
      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        fromPublicKey
      )

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        toPublicKey
      )

      const transaction = new Transaction()

      // Check if destination token account exists, if not create it
      try {
        await getAccount(this.connection, toTokenAccount)
      } catch (error) {
        // Account doesn't exist, add instruction to create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey,
            toTokenAccount,
            toPublicKey,
            mintPublicKey
          )
        )
      }

      // Add transfer instruction
      const transferAmount = amount * Math.pow(10, 6) // Assuming 6 decimals
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      )

      // Set fee payer
      transaction.feePayer = fromPublicKey

      // Use wallet adapter's sendTransaction which handles blockhash internally
      // This prevents "Blockhash not found" errors by getting a fresh blockhash right before sending
      const signature = await sendTransaction(transaction, this.connection, {
        skipPreflight: false,
      })

      // Wait for confirmation
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed')
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      )

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      return signature
    } catch (error: any) {
      console.error('Token transfer error:', error)

      // Extract more detailed error info if available
      if (error instanceof SendTransactionError) {
        const logs = await error.getLogs(this.connection)
        console.error('Transaction logs:', logs)
      }

      throw error
    }
  }

  /**
   * Check if simulation mode is enabled
   */
  isSimulationMode(): boolean {
    return SIMULATION_MODE
  }

  /**
   * Transfer USDT
   */
  async transferUSDT(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    sendTransaction: SendTransactionFn
  ): Promise<string> {
    return this.transferToken(
      fromPublicKey,
      toPublicKey,
      USDT_MINT,
      amount,
      sendTransaction
    )
  }

  /**
   * Transfer TAKARA
   */
  async transferTAKARA(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    sendTransaction: SendTransactionFn
  ): Promise<string> {
    return this.transferToken(
      fromPublicKey,
      toPublicKey,
      TAKARA_MINT,
      amount,
      sendTransaction
    )
  }

  /**
   * Transfer LAIKA
   */
  async transferLAIKA(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    sendTransaction: SendTransactionFn
  ): Promise<string> {
    return this.transferToken(
      fromPublicKey,
      toPublicKey,
      LAIKA_MINT,
      amount,
      sendTransaction
    )
  }

  /**
   * Get the connection instance (for wallet adapter's sendTransaction)
   */
  getConnection(): Connection {
    return this.connection
  }

  /**
   * Get USDT balance
   */
  async getUSDTBalance(walletPublicKey: PublicKey): Promise<number> {
    return this.getTokenBalance(walletPublicKey, USDT_MINT)
  }

  /**
   * Get TAKARA balance
   */
  async getTAKARABalance(walletPublicKey: PublicKey): Promise<number> {
    return this.getTokenBalance(walletPublicKey, TAKARA_MINT)
  }

  /**
   * Get LAIKA balance
   */
  async getLAIKABalance(walletPublicKey: PublicKey): Promise<number> {
    return this.getTokenBalance(walletPublicKey, LAIKA_MINT)
  }

  /**
   * Get platform wallet address (where to send tokens)
   */
  getPlatformWalletAddress(): PublicKey {
    // Platform wallet address from environment
    const walletAddress = import.meta.env.VITE_PLATFORM_WALLET_SOL || '39YVQH3mg5ZpXKYiszHpxLkept8wsNmYHM3fLi6f7cVy'
    return new PublicKey(walletAddress)
  }
}

export const solanaService = new SolanaService()
export default solanaService
