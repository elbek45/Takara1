/**
 * Phantom Wallet Button Component
 * Direct button for connecting/disconnecting Phantom wallet without popup
 */

import { useState, useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { solanaService } from '../../services/solana.service'
import { api } from '../../services/api'

// Global ref to track if address was already saved in this session
let savedSolanaAddress: string | null = null

interface PhantomButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  showBalance?: boolean
  className?: string
}

export function PhantomButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  showBalance = true,
  className = '',
}: PhantomButtonProps) {
  const { publicKey, connected, connecting, disconnect, select, wallets } = useWallet()
  const { setVisible } = useWalletModal()
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')

  // Save wallet address to backend when connected (using global variable)
  useEffect(() => {
    const saveWalletToBackend = async () => {
      if (connected && publicKey && api.isAuthenticated()) {
        const address = publicKey.toBase58()
        // Only save if not already saved in this session
        if (savedSolanaAddress !== address) {
          try {
            await api.connectSolana(address)
            savedSolanaAddress = address
            console.log('Solana wallet saved to backend:', address)
          } catch (error) {
            console.error('Failed to save Solana wallet to backend:', error)
          }
        }
      }
    }
    saveWalletToBackend()
  }, [connected, publicKey])

  // Fetch balances when connected
  useEffect(() => {
    const fetchBalances = async () => {
      if (publicKey) {
        try {
          const [takara, laika] = await Promise.all([
            solanaService.getTAKARABalance(publicKey),
            solanaService.getLAIKABalance(publicKey),
          ])
          setTakaraBalance(takara.toFixed(2))
          setLaikaBalance(laika.toFixed(2))
        } catch (error) {
          console.error('Failed to fetch balances:', error)
        }
      }
    }
    fetchBalances()
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  const handleClick = () => {
    if (connected) {
      disconnect()
    } else {
      // Find Phantom wallet
      const phantomWallet = wallets.find(
        (w) => w.adapter.name.toLowerCase().includes('phantom')
      )
      if (phantomWallet) {
        select(phantomWallet.adapter.name)
      } else {
        // Fallback to modal if Phantom not found
        setVisible(true)
      }
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  // Variant styles - Phantom brand purple
  const variantStyles = {
    primary: connected
      ? 'bg-purple-700 text-white hover:opacity-90'
      : 'bg-purple-600 text-white hover:opacity-90',
    secondary: connected
      ? 'bg-purple-700 text-white hover:opacity-90'
      : 'bg-purple-600 text-white hover:opacity-90',
    outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-500/10',
  }

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={`
        flex items-center justify-center gap-2 rounded-lg font-semibold transition-opacity
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthClass}
        ${connecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={
        connected && publicKey
          ? `Phantom: ${publicKey.toBase58()} | TAKARA: ${takaraBalance} | LAIKA: ${laikaBalance}`
          : connecting
          ? 'Connecting...'
          : 'Connect Phantom'
      }
    >
      <Wallet className={size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />

      {connecting ? (
        <span>Connecting...</span>
      ) : connected && publicKey ? (
        <>
          <span className="hidden lg:inline">
            {formatAddress(publicKey.toBase58())}
          </span>
          {showBalance && (
            <span className="hidden xl:inline text-xs opacity-80 ml-1">
              ({takaraBalance} TAKARA)
            </span>
          )}
        </>
      ) : (
        <span className="hidden lg:inline">Phantom</span>
      )}
    </button>
  )
}

// Compact version for mobile
interface PhantomButtonCompactProps {
  className?: string
}

export function PhantomButtonCompact({ className = '' }: PhantomButtonCompactProps) {
  const { publicKey, connected, connecting, disconnect, select, wallets } = useWallet()
  const { setVisible } = useWalletModal()
  const [takaraBalance, setTakaraBalance] = useState<string>('0')

  // Save wallet address to backend when connected (using global variable)
  useEffect(() => {
    const saveWalletToBackend = async () => {
      if (connected && publicKey && api.isAuthenticated()) {
        const address = publicKey.toBase58()
        if (savedSolanaAddress !== address) {
          try {
            await api.connectSolana(address)
            savedSolanaAddress = address
          } catch (error) {
            console.error('Failed to save Solana wallet to backend:', error)
          }
        }
      }
    }
    saveWalletToBackend()
  }, [connected, publicKey])

  useEffect(() => {
    const fetchBalances = async () => {
      if (publicKey) {
        try {
          const takara = await solanaService.getTAKARABalance(publicKey)
          setTakaraBalance(takara.toFixed(2))
        } catch (error) {
          console.error('Failed to fetch balance:', error)
        }
      }
    }
    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  const handleClick = () => {
    if (connected) {
      disconnect()
    } else {
      const phantomWallet = wallets.find(
        (w) => w.adapter.name.toLowerCase().includes('phantom')
      )
      if (phantomWallet) {
        select(phantomWallet.adapter.name)
      } else {
        setVisible(true)
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={`
        flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-opacity
        ${connected ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white'}
        hover:opacity-90
        ${connecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <Wallet className="h-4 w-4" />
      {connecting ? (
        <span>Connecting...</span>
      ) : connected && publicKey ? (
        <span>
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)} ({takaraBalance} TAKARA)
        </span>
      ) : (
        <span>Connect Phantom</span>
      )}
    </button>
  )
}

export default PhantomButton
