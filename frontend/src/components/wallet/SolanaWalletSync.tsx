/**
 * Solana Wallet Sync Component
 * Automatically syncs Solana wallet address to backend when connected
 */

import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../../services/api'
import { toast } from 'sonner'

export function SolanaWalletSync() {
  const { publicKey, connected } = useWallet()
  const previousPublicKey = useRef<string | null>(null)
  const isSyncing = useRef(false)

  useEffect(() => {
    const syncWalletAddress = async () => {
      if (!connected || !publicKey) {
        previousPublicKey.current = null
        return
      }

      const walletAddress = publicKey.toBase58()

      // Only sync if this is a new connection or different wallet
      if (walletAddress === previousPublicKey.current) {
        return
      }

      // Prevent concurrent sync requests
      if (isSyncing.current) {
        return
      }

      previousPublicKey.current = walletAddress

      // Only save if user is authenticated
      if (!api.isAuthenticated()) {
        console.log('Phantom connected but user not authenticated')
        return
      }

      isSyncing.current = true

      try {
        const response = await api.connectSolana(walletAddress)
        if (response.success) {
          toast.success('Phantom wallet connected and saved')
        }
      } catch (error: any) {
        console.error('Failed to save Solana address:', error)
        // Don't show error toast to avoid annoying the user
      } finally {
        isSyncing.current = false
      }
    }

    syncWalletAddress()
  }, [connected, publicKey])

  // This component doesn't render anything
  return null
}
