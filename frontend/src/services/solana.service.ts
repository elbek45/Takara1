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

const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet'
// Use environment RPC or fall back to public RPC (with rate limits)
// For production, consider using Helius, Alchemy, or QuickNode
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || `https://api.${SOLANA_NETWORK}.solana.com`

// Fallback RPC endpoints for when primary fails (403 rate limit)
const FALLBACK_RPC_URLS = [
  'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy demo
  'https://rpc.ankr.com/solana', // Ankr free tier
]

// Simulation mode - skips real blockchain transactions for testing
const SIMULATION_MODE = import.meta.env.VITE_SIMULATION_MODE === 'true'

// Token mint addresses (Devnet)
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') // Not used - USDT via TRON
const TAKARA_MINT = new PublicKey('6biyv9NcaHmf8rKfLFGmj6eTwR9LBQtmi8dGUp2vRsgA') // TAKARA Token (Devnet - 21M supply)
const LAIKA_MINT = new PublicKey('8o5XXBWEGmKJ7hn6hPaEzYNfuMxCWhwBQu5NSZSReKPd') // LAIKA Token (Devnet - 1B supply)

// Type for sendTransaction function from wallet adapter
type SendTransactionFn = (
  transaction: Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean }
) => Promise<string>

class SolanaService {
  private connection: Connection
  private fallbackConnections: Connection[]

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed')
    this.fallbackConnections = FALLBACK_RPC_URLS.map(url => new Connection(url, 'confirmed'))
  }

  /**
   * Get SOL balance with fallback RPC support
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return balance / LAMPORTS_PER_SOL
    } catch (error: any) {
      // Try fallback RPCs on 403/rate limit
      if (error?.message?.includes('403') || error?.message?.includes('rate')) {
        for (const fallbackConn of this.fallbackConnections) {
          try {
            const balance = await fallbackConn.getBalance(publicKey)
            return balance / LAMPORTS_PER_SOL
          } catch {
            continue
          }
        }
      }
      // Silently return 0 - balance check is non-critical
      return 0
    }
  }

  /**
   * Get SPL token balance with fallback RPC support
   */
  async getTokenBalance(
    walletPublicKey: PublicKey,
    mintPublicKey: PublicKey
  ): Promise<number> {
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    )

    // Try primary connection first
    try {
      const accountInfo = await getAccount(this.connection, tokenAccount)
      return Number(accountInfo.amount) / Math.pow(10, 6) // Assuming 6 decimals
    } catch (error: any) {
      // On 403/rate limit, try fallback RPCs
      if (error?.message?.includes('403') || error?.message?.includes('rate')) {
        for (const fallbackConn of this.fallbackConnections) {
          try {
            const accountInfo = await getAccount(fallbackConn, tokenAccount)
            return Number(accountInfo.amount) / Math.pow(10, 6)
          } catch {
            continue
          }
        }
      }
      // Token account doesn't exist or all RPCs failed - return 0 silently
      // This is expected for wallets that haven't received this token yet
      return 0
    }
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
