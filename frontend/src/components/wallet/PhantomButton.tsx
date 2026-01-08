/**
 * Phantom Wallet Button
 * Uses Solana Wallet Adapter for consistent state across all components
 * Shows USDT, TAKARA and LAIKA balances on Solana
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Wallet, ChevronDown, LogOut, Copy, Check } from 'lucide-react'
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
  const [usdtBalance, setUsdtBalance] = useState<string>('0')
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch balances when connected
  useEffect(() => {
    if (!publicKey) {
      setUsdtBalance('0')
      setTakaraBalance('0')
      setLaikaBalance('0')
      return
    }

    const fetchBalances = async () => {
      try {
        const [usdt, takara, laika] = await Promise.all([
          solanaService.getUSDTBalance(publicKey),
          solanaService.getTAKARABalance(publicKey),
          solanaService.getLAIKABalance(publicKey),
        ])
        setUsdtBalance(usdt.toFixed(2))
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
      setIsMenuOpen(!isMenuOpen)
    } else {
      handleConnect()
    }
  }

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58())
      setCopied(true)
      toast.success('Address copied!')
      setTimeout(() => setCopied(false), 2000)
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
    <div className="relative" ref={menuRef}>
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
      >
        <Wallet className="h-4 w-4" />
        {connecting ? (
          <span>Connecting...</span>
        ) : connected && publicKey ? (
          <span className="flex items-center gap-2">
            <span>{formatAddress(publicKey.toBase58())}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </span>
        ) : (
          <span>Phantom</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && connected && publicKey && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-background-card border border-green-900/30 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Wallet Address */}
          <div className="p-4 border-b border-green-900/20">
            <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-mono">{formatAddress(publicKey.toBase58())}</span>
              <button
                onClick={handleCopyAddress}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Balances */}
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-400 mb-2">Balances</div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">USDT</span>
              <span className="text-blue-400 font-semibold">${usdtBalance}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">TAKARA</span>
              <span className="text-green-400 font-semibold">{takaraBalance}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">LAIKA</span>
              <span className="text-purple-400 font-semibold">{laikaBalance}</span>
            </div>
          </div>

          {/* Disconnect Button */}
          <div className="p-3 border-t border-green-900/20">
            <button
              onClick={() => {
                handleDisconnect()
                setIsMenuOpen(false)
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for mobile
export function PhantomButtonCompact({ className = '' }: { className?: string }) {
  const { publicKey, connected, connecting, connect, disconnect, select, wallets } = useWallet()
  const [usdtBalance, setUsdtBalance] = useState<string>('0')
  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!publicKey) {
      setUsdtBalance('0')
      setTakaraBalance('0')
      setLaikaBalance('0')
      return
    }

    const fetchBalances = async () => {
      try {
        const [usdt, takara, laika] = await Promise.all([
          solanaService.getUSDTBalance(publicKey),
          solanaService.getTAKARABalance(publicKey),
          solanaService.getLAIKABalance(publicKey),
        ])
        setUsdtBalance(usdt.toFixed(2))
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

  const handleConnect = async () => {
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

  const handleClick = () => {
    if (connected) {
      setIsMenuOpen(!isMenuOpen)
    } else {
      handleConnect()
    }
  }

  return (
    <div className="relative" ref={menuRef}>
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
          <span className="flex items-center gap-1.5">
            <span>{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </span>
        ) : (
          'Connect Phantom'
        )}
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && connected && publicKey && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background-card border border-green-900/30 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Balances */}
          <div className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">USDT</span>
              <span className="text-blue-400 font-semibold">${usdtBalance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">TAKARA</span>
              <span className="text-green-400 font-semibold">{takaraBalance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">LAIKA</span>
              <span className="text-purple-400 font-semibold">{laikaBalance}</span>
            </div>
          </div>

          {/* Disconnect */}
          <div className="p-3 border-t border-green-900/20">
            <button
              onClick={async () => {
                try {
                  await disconnect()
                  toast.info('Disconnected')
                } catch {}
                setIsMenuOpen(false)
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhantomButton
