/**
 * Solana Service
 * Handles all Solana blockchain interactions
 */

import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token'

const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet'
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || `https://api.${SOLANA_NETWORK}.solana.com`

// Token mint addresses (replace with actual addresses)
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') // Devnet USDT
const TAKARA_MINT = new PublicKey('TAKARA_MINT_ADDRESS_HERE') // Replace with actual TAKARA mint
const LAIKA_MINT = new PublicKey('LAIKA_MINT_ADDRESS_HERE') // Replace with actual LAIKA mint

class SolanaService {
  private connection: Connection

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed')
  }

  /**
   * Get SOL balance
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  }

  /**
   * Get SPL token balance
   */
  async getTokenBalance(
    walletPublicKey: PublicKey,
    mintPublicKey: PublicKey
  ): Promise<number> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        walletPublicKey
      )

      const accountInfo = await getAccount(this.connection, tokenAccount)
      return Number(accountInfo.amount) / Math.pow(10, 6) // Assuming 6 decimals
    } catch (error) {
      console.error('Error getting token balance:', error)
      return 0
    }
  }

  /**
   * Transfer SPL tokens
   */
  async transferToken(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    mintPublicKey: PublicKey,
    amount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        fromPublicKey
      )

      let toTokenAccount = await getAssociatedTokenAddress(
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

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = fromPublicKey

      // Sign transaction
      const signedTransaction = await signTransaction(transaction)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize()
      )

      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed')

      return signature
    } catch (error) {
      console.error('Token transfer error:', error)
      throw error
    }
  }

  /**
   * Transfer USDT
   */
  async transferUSDT(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    return this.transferToken(
      fromPublicKey,
      toPublicKey,
      USDT_MINT,
      amount,
      signTransaction
    )
  }

  /**
   * Transfer TAKARA
   */
  async transferTAKARA(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    return this.transferToken(
      fromPublicKey,
      toPublicKey,
      TAKARA_MINT,
      amount,
      signTransaction
    )
  }

  /**
   * Transfer LAIKA
   */
  async transferLAIKA(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    return this.transferToken(
      fromPublicKey,
      toPublicKey,
      LAIKA_MINT,
      amount,
      signTransaction
    )
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
    // Replace with actual platform wallet address
    return new PublicKey('PLATFORM_WALLET_ADDRESS_HERE')
  }
}

export const solanaService = new SolanaService()
export default solanaService
