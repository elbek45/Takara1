/**
 * Phantom Wallet Button
 * Uses Solana Wallet Adapter for consistent state across all components
 * Shows TAKARA and LAIKA (Cosmodog) balances
 */

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Wallet } from 'lucide-react'
import { solanaService } from '../../services/solana.service'
import { api } from '../../services/api'
import { toast } from 'sonner'

interface PhantomButtonProps {
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PhantomButton({
  variant = 'primary',
  size = 'md',
  className = '',
}: PhantomButtonProps) {
  const { publicKey, connected, connecting, connect, disconnect, select, wallets } = useWallet()
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')

  // Fetch balances when connected
  useEffect(() => {
    if (!publicKey) {
      setTakaraBalance('0')
      setLaikaBalance('0')
      return
    }

    const fetchBalances = async () => {
      try {
        const [takara, laika] = await Promise.all([
          solanaService.getTAKARABalance(publicKey),
          solanaService.getLAIKABalance(publicKey),
        ])
        setTakaraBalance(takara.toFixed(2))
        setLaikaBalance(laika.toFixed(2))
      } catch (err) {
        console.error('Balance fetch error:', err)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  // Save wallet to backend when connected
  useEffect(() => {
    if (!publicKey || !api.isAuthenticated()) return

    api.connectSolana(publicKey.toBase58()).catch(err => {
      console.error('Failed to save wallet:', err)
    })
  }, [publicKey])

  const handleConnect = useCallback(async () => {
    try {
      // Find Phantom wallet in available wallets
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')

      if (!phantomWallet) {
        toast.error('Phantom wallet not found')
        window.open('https://phantom.app/', '_blank')
        return
      }

      // Select Phantom wallet
      select(phantomWallet.adapter.name)

      // Connect
      await connect()
      toast.success('Phantom connected')
    } catch (err: unknown) {
      console.error('Phantom connect error:', err)
      const error = err as { code?: number; message?: string; name?: string }

      if (error.name === 'WalletNotReadyError') {
        toast.error('Phantom wallet not found')
        window.open('https://phantom.app/', '_blank')
      } else if (error.code === 4001 || error.message?.includes('User rejected')) {
        toast.error('Connection rejected')
      } else {
        toast.error('Connection failed - try refreshing the page')
      }
    }
  }, [connect, select, wallets])

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect()
      toast.info('Phantom disconnected')
    } catch {
      // Already disconnected
    }
  }, [disconnect])

  const handleClick = () => {
    if (connected) {
      handleDisconnect()
    } else {
      handleConnect()
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const variantStyles = {
    primary: connected ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white',
    outline: 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10',
  }

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={`
        flex items-center justify-center gap-2 rounded-lg font-semibold transition-all
        hover:opacity-90
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${connecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={connected && publicKey ? `${publicKey.toBase58()}\nTAKARA: ${takaraBalance}\nLAIKA: ${laikaBalance}` : 'Connect Phantom'}
    >
      <Wallet className="h-4 w-4" />
      {connecting ? (
        <span>Connecting...</span>
      ) : connected && publicKey ? (
        <span>
          {formatAddress(publicKey.toBase58())}
          <span className="ml-1 text-xs opacity-80">
            ({takaraBalance} TAKARA / {laikaBalance} LAIKA)
          </span>
        </span>
      ) : (
        <span>Phantom</span>
      )}
    </button>
  )
}

// Compact version for mobile
export function PhantomButtonCompact({ className = '' }: { className?: string }) {
  const { publicKey, connected, connecting, connect, disconnect, select, wallets } = useWallet()
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')

  useEffect(() => {
    if (!publicKey) {
      setTakaraBalance('0')
      setLaikaBalance('0')
      return
    }

    const fetchBalances = async () => {
      try {
        const [takara, laika] = await Promise.all([
          solanaService.getTAKARABalance(publicKey),
          solanaService.getLAIKABalance(publicKey),
        ])
        setTakaraBalance(takara.toFixed(2))
        setLaikaBalance(laika.toFixed(2))
      } catch {
        // ignore
      }
    }
    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  useEffect(() => {
    if (!publicKey || !api.isAuthenticated()) return
    api.connectSolana(publicKey.toBase58()).catch(() => {})
  }, [publicKey])

  const handleClick = async () => {
    if (connected) {
      try {
        await disconnect()
        toast.info('Disconnected')
      } catch {}
      return
    }

    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')

      if (!phantomWallet) {
        toast.error('Phantom not found')
        window.open('https://phantom.app/', '_blank')
        return
      }

      select(phantomWallet.adapter.name)
      await connect()
      toast.success('Connected')
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string; name?: string }
      if (error.name === 'WalletNotReadyError') {
        toast.error('Phantom not found')
        window.open('https://phantom.app/', '_blank')
      } else if (error.code === 4001 || error.message?.includes('User rejected')) {
        toast.error('Rejected')
      } else {
        toast.error('Failed - try refreshing')
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={`
        flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold
        ${connected ? 'bg-purple-700' : 'bg-purple-600'} text-white
        hover:opacity-90 transition-opacity
        ${connecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <Wallet className="h-4 w-4" />
      {connecting ? (
        'Connecting...'
      ) : connected && publicKey ? (
        `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)} (${takaraBalance}/${laikaBalance})`
      ) : (
        'Connect Phantom'
      )}
    </button>
  )
}

export default PhantomButton
