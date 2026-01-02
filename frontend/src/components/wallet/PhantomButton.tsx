/**
 * Phantom Wallet Button
 * Direct connection to window.phantom.solana
 * Shows TAKARA and LAIKA (Cosmodog) balances
 */

import { useState, useEffect, useCallback } from 'react'
import { Wallet } from 'lucide-react'
import { PublicKey } from '@solana/web3.js'
import { solanaService } from '../../services/solana.service'
import { api } from '../../services/api'
import { toast } from 'sonner'

interface PhantomProvider {
  isPhantom: boolean
  publicKey: PublicKey | null
  isConnected: boolean
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>
  disconnect: () => Promise<void>
  on: (event: string, callback: (...args: unknown[]) => void) => void
  off: (event: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider
    }
  }
}

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null

  if (window.phantom?.solana?.isPhantom) {
    return window.phantom.solana
  }

  return null
}

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
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')

  const connected = !!publicKey

  // Check existing connection on mount
  useEffect(() => {
    const checkExisting = async () => {
      // Wait a bit for extensions to inject
      await new Promise(r => setTimeout(r, 500))

      const provider = getPhantomProvider()
      if (!provider) return

      // If already connected, get the public key
      if (provider.isConnected && provider.publicKey) {
        setPublicKey(provider.publicKey)
        return
      }

      // Try eager connect (only if previously authorized)
      try {
        const resp = await provider.connect({ onlyIfTrusted: true })
        setPublicKey(resp.publicKey)
      } catch {
        // User needs to click to connect
      }
    }
    checkExisting()
  }, [])

  // Listen for wallet events
  useEffect(() => {
    const provider = getPhantomProvider()
    if (!provider) return

    const handleAccountChange = (newKey: PublicKey | null) => {
      setPublicKey(newKey)
    }

    const handleDisconnect = () => {
      setPublicKey(null)
      setTakaraBalance('0')
      setLaikaBalance('0')
    }

    provider.on('accountChanged', handleAccountChange)
    provider.on('disconnect', handleDisconnect)

    return () => {
      provider.off('accountChanged', handleAccountChange)
      provider.off('disconnect', handleDisconnect)
    }
  }, [])

  // Fetch balances
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

  // Save wallet to backend
  useEffect(() => {
    if (!publicKey || !api.isAuthenticated()) return

    api.connectSolana(publicKey.toBase58()).catch(err => {
      console.error('Failed to save wallet:', err)
    })
  }, [publicKey])

  const connect = useCallback(async () => {
    const provider = getPhantomProvider()

    if (!provider) {
      toast.error('Phantom wallet not found')
      window.open('https://phantom.app/', '_blank')
      return
    }

    setConnecting(true)
    try {
      const resp = await provider.connect()
      setPublicKey(resp.publicKey)
      toast.success('Phantom connected')
    } catch (err: unknown) {
      console.error('Phantom connect error:', err)
      const error = err as { code?: number; message?: string }

      if (error.code === 4001 || error.message?.includes('User rejected')) {
        toast.error('Connection rejected')
      } else {
        toast.error('Connection failed - try refreshing the page')
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider()
    if (provider) {
      try {
        await provider.disconnect()
      } catch {
        // Already disconnected
      }
    }
    setPublicKey(null)
    setTakaraBalance('0')
    setLaikaBalance('0')
    toast.info('Phantom disconnected')
  }, [])

  const handleClick = () => {
    if (connected) {
      disconnect()
    } else {
      connect()
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
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')

  const connected = !!publicKey

  useEffect(() => {
    const checkExisting = async () => {
      await new Promise(r => setTimeout(r, 500))
      const provider = getPhantomProvider()
      if (!provider) return

      if (provider.isConnected && provider.publicKey) {
        setPublicKey(provider.publicKey)
        return
      }

      try {
        const resp = await provider.connect({ onlyIfTrusted: true })
        setPublicKey(resp.publicKey)
      } catch {
        // User needs to click
      }
    }
    checkExisting()
  }, [])

  useEffect(() => {
    const provider = getPhantomProvider()
    if (!provider) return

    const handleAccountChange = (newKey: PublicKey | null) => setPublicKey(newKey)
    const handleDisconnect = () => {
      setPublicKey(null)
      setTakaraBalance('0')
      setLaikaBalance('0')
    }

    provider.on('accountChanged', handleAccountChange)
    provider.on('disconnect', handleDisconnect)

    return () => {
      provider.off('accountChanged', handleAccountChange)
      provider.off('disconnect', handleDisconnect)
    }
  }, [])

  useEffect(() => {
    if (!publicKey) return

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
    const provider = getPhantomProvider()

    if (connected) {
      if (provider) {
        try { await provider.disconnect() } catch {}
      }
      setPublicKey(null)
      toast.info('Disconnected')
      return
    }

    if (!provider) {
      toast.error('Phantom not found')
      window.open('https://phantom.app/', '_blank')
      return
    }

    setConnecting(true)
    try {
      const resp = await provider.connect()
      setPublicKey(resp.publicKey)
      toast.success('Connected')
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string }
      if (error.code === 4001 || error.message?.includes('User rejected')) {
        toast.error('Rejected')
      } else {
        toast.error('Failed - try refreshing')
      }
    } finally {
      setConnecting(false)
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
