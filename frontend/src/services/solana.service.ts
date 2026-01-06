/**
 * Solana Service
 * Handles all Solana blockchain interactions
 *
 * Balance fetching uses backend proxy to avoid CORS and rate limiting
 * Transactions still use direct RPC via wallet adapter
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

// Backend API URL for proxy endpoints
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Direct RPC URL (only used for transactions, not balance fetching)
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

// Simulation mode - skips real blockchain transactions for testing
const SIMULATION_MODE = import.meta.env.VITE_SIMULATION_MODE === 'true'

// Token mint addresses (Mainnet)
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') // USDT on Solana mainnet
const TAKARA_MINT = new PublicKey('6biyv9NcaHmf8rKfLFGmj6eTwR9LBQtmi8dGUp2vRsgA') // TAKARA Token (mainnet)
const LAIKA_MINT = new PublicKey('27yzfJSNvYLBjgSNbMyXMMUWzx6T9q4B9TP7KVBS5vPo') // LAIKA Token (mainnet - Cosmodog)

// Local cache for immediate access (backend also caches with Redis)
const CACHE_TTL = 60000 // 1 minute local cache (backend caches for 5 min)
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

/**
 * Fetch balance from backend proxy
 * Falls back to 0 on any error (non-critical feature)
 */
async function fetchBalanceFromProxy(endpoint: string): Promise<number> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`)
    if (!response.ok) return 0
    const data = await response.json()
    return data.success ? data.data.balance : 0
  } catch {
    return 0
  }
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
   * Get SOL balance via backend proxy (with local caching)
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const address = publicKey.toBase58()
    const cacheKey = `sol:${address}`
    const cached = getCachedBalance(cacheKey)
    if (cached !== null) return cached

    const balance = await fetchBalanceFromProxy(`/solana/balance/${address}`)
    setCachedBalance(cacheKey, balance)
    return balance
  }

  /**
   * Get SPL token balance via backend proxy (with local caching)
   */
  async getTokenBalance(
    walletPublicKey: PublicKey,
    mintPublicKey: PublicKey
  ): Promise<number> {
    const address = walletPublicKey.toBase58()
    const mint = mintPublicKey.toBase58()
    const cacheKey = `token:${address}:${mint}`
    const cached = getCachedBalance(cacheKey)
    if (cached !== null) return cached

    // Determine token name for cleaner URL
    let tokenName = mint
    if (mint === USDT_MINT.toBase58()) tokenName = 'USDT'
    else if (mint === TAKARA_MINT.toBase58()) tokenName = 'TAKARA'
    else if (mint === LAIKA_MINT.toBase58()) tokenName = 'LAIKA'

    const balance = await fetchBalanceFromProxy(`/solana/token/${address}/${tokenName}`)
    setCachedBalance(cacheKey, balance)
    return balance
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
