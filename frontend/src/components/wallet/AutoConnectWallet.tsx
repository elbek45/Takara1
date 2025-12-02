import { useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../../services/api'

/**
 * Auto-connect Phantom wallet if user is authenticated
 * This component handles wallet reconnection after page navigation
 */
export function AutoConnectWallet() {
  const { connect, connected, wallet } = useWallet()

  useEffect(() => {
    const autoConnect = async () => {
      // Only auto-connect if:
      // 1. User is authenticated
      // 2. Wallet exists and is ready
      // 3. Not already connected
      if (!api.isAuthenticated()) return
      if (!wallet || !wallet.readyState) return
      if (connected) return

      try {
        // Check if wallet was previously connected
        const walletName = localStorage.getItem('walletName')
        if (walletName && walletName === wallet.adapter.name) {
          await connect()
        }
      } catch (error) {
        console.error('Phantom auto-connect failed:', error)
      }
    }

    autoConnect()
  }, [wallet, connected, connect])

  return null
}
