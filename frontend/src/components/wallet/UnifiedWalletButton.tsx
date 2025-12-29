/**
 * Unified Wallet Button Component
 *
 * Supports both Phantom and Trust Wallet for Solana.
 * Trust Wallet can also handle TRON - one wallet for everything!
 */

import { useState, useEffect, useMemo } from 'react'
import { Wallet, ChevronDown } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { solanaService } from '../../services/solana.service'
import { useTronLink } from '../../hooks/useTronLink'
import { api } from '../../services/api'

// Track saved addresses
let savedSolanaAddress: string | null = null

interface UnifiedWalletButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function UnifiedWalletButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: UnifiedWalletButtonProps) {
  const { publicKey, connected: solanaConnected, connecting, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const {
    isConnected: tronConnected,
    address: tronAddress,
    usdtBalance,
    trxBalance,
    connect: connectTron
  } = useTronLink()

  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [laikaBalance, setLaikaBalance] = useState<string>('0')
  const [showBalances, setShowBalances] = useState(false)

  // Detect if Trust Wallet is connected for Solana
  const isTrustWalletSolana = useMemo(() => {
    return wallet?.adapter.name.toLowerCase().includes('trust')
  }, [wallet])

  // Auto-connect TRON when Trust Wallet is connected for Solana
  useEffect(() => {
    if (solanaConnected && isTrustWalletSolana && !tronConnected) {
      // Trust Wallet is connected for Solana - auto-connect TRON
      console.log('Trust Wallet detected for Solana, auto-connecting TRON...')
      connectTron().catch(err => {
        console.log('Auto TRON connect failed (user may need to approve):', err)
      })
    }
  }, [solanaConnected, isTrustWalletSolana, tronConnected, connectTron])

  // Save wallet address to backend
  useEffect(() => {
    const saveWalletToBackend = async () => {
      if (solanaConnected && publicKey && api.isAuthenticated()) {
        const address = publicKey.toBase58()
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
  }, [solanaConnected, publicKey])

  // Fetch Solana balances
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
          console.error('Failed to fetch Solana balances:', error)
        }
      }
    }
    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  const handleClick = () => {
    if (solanaConnected) {
      setShowBalances(!showBalances)
    } else {
      setVisible(true)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowBalances(false)
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`

  // Determine wallet name
  const walletName = wallet?.adapter.name || 'Wallet'

  // Variant styles
  const variantStyles = {
    primary: solanaConnected
      ? 'bg-gradient-to-r from-purple-600 to-gold-600 text-white'
      : 'bg-gradient-to-r from-purple-600 to-green-600 text-white hover:opacity-90',
    secondary: solanaConnected
      ? 'bg-gray-700 text-white hover:opacity-90'
      : 'bg-gray-600 text-white hover:opacity-90',
    outline: 'border-2 border-gold-500 text-gold-500 hover:bg-gold-500/10',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={connecting}
        className={`
          flex items-center justify-center gap-2 rounded-lg font-semibold transition-all
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${connecting ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <Wallet className={size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />

        {connecting ? (
          <span>Connecting...</span>
        ) : solanaConnected && publicKey ? (
          <>
            <span className="hidden sm:inline">{walletName}</span>
            <span className="text-xs opacity-80">
              {formatAddress(publicKey.toBase58())}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showBalances ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>

      {/* Balances Dropdown */}
      {showBalances && solanaConnected && (
        <div className="absolute right-0 mt-2 w-72 bg-background-elevated border border-gold-500/30 rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-3">
            {/* Wallet Info */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isTrustWalletSolana ? 'bg-blue-500' : 'bg-purple-500'}`} />
                <span className="font-medium text-white">{walletName}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>

            {/* Solana Balances */}
            <div>
              <div className="text-xs text-gray-400 mb-2">Solana Network</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-500/10 rounded px-3 py-2">
                  <div className="text-xs text-gray-400">TAKARA</div>
                  <div className="font-bold text-green-400">{takaraBalance}</div>
                </div>
                <div className="bg-purple-500/10 rounded px-3 py-2">
                  <div className="text-xs text-gray-400">LAIKA</div>
                  <div className="font-bold text-purple-400">{laikaBalance}</div>
                </div>
              </div>
            </div>

            {/* TRON Balances (if Trust Wallet or TRON connected) */}
            {(isTrustWalletSolana || tronConnected) && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>TRON Network</span>
                  {!tronConnected && (
                    <button
                      onClick={() => connectTron()}
                      className="text-gold-500 hover:text-gold-400"
                    >
                      Connect TRON
                    </button>
                  )}
                </div>
                {tronConnected ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gold-500/10 rounded px-3 py-2">
                      <div className="text-xs text-gray-400">USDT</div>
                      <div className="font-bold text-gold-400">{usdtBalance}</div>
                    </div>
                    <div className="bg-red-500/10 rounded px-3 py-2">
                      <div className="text-xs text-gray-400">TRX</div>
                      <div className="font-bold text-red-400">{trxBalance}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500 text-sm">
                    Connect TRON to see USDT/TRX balances
                  </div>
                )}
              </div>
            )}

            {/* Addresses */}
            <div className="pt-2 border-t border-gray-700 text-xs">
              {publicKey && (
                <div className="flex justify-between text-gray-400">
                  <span>Solana:</span>
                  <span className="font-mono">{formatAddress(publicKey.toBase58())}</span>
                </div>
              )}
              {tronConnected && tronAddress && (
                <div className="flex justify-between text-gray-400 mt-1">
                  <span>TRON:</span>
                  <span className="font-mono">{formatAddress(tronAddress)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for mobile
interface UnifiedWalletButtonCompactProps {
  className?: string
}

export function UnifiedWalletButtonCompact({ className = '' }: UnifiedWalletButtonCompactProps) {
  const { publicKey, connected: solanaConnected, connecting, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const {
    isConnected: tronConnected,
    address: tronAddress,
    usdtBalance,
    connect: connectTron
  } = useTronLink()

  const [takaraBalance, setTakaraBalance] = useState<string>('0')
  const [showBalances, setShowBalances] = useState(false)

  const isTrustWalletSolana = useMemo(() => {
    return wallet?.adapter.name.toLowerCase().includes('trust')
  }, [wallet])

  // Auto-connect TRON when Trust Wallet is connected
  useEffect(() => {
    if (solanaConnected && isTrustWalletSolana && !tronConnected) {
      connectTron().catch(() => {})
    }
  }, [solanaConnected, isTrustWalletSolana, tronConnected, connectTron])

  // Fetch Solana balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (publicKey) {
        try {
          const takara = await solanaService.getTAKARABalance(publicKey)
          setTakaraBalance(takara.toFixed(2))
        } catch (error) {
          console.error('Failed to fetch balances:', error)
        }
      }
    }
    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  const handleClick = () => {
    if (solanaConnected) {
      setShowBalances(!showBalances)
    } else {
      setVisible(true)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowBalances(false)
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`
  const walletName = wallet?.adapter.name || 'Wallet'

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={connecting}
        className={`
          flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all
          ${solanaConnected
            ? 'bg-gradient-to-r from-purple-600 to-gold-600 text-white'
            : 'bg-gradient-to-r from-purple-600 to-green-600 text-white hover:opacity-90'}
          ${connecting ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <Wallet className="h-4 w-4" />
        {connecting ? (
          <span>Connecting...</span>
        ) : solanaConnected && publicKey ? (
          <span>
            {walletName} {formatAddress(publicKey.toBase58())}
          </span>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>

      {/* Mobile Dropdown */}
      {showBalances && solanaConnected && (
        <div className="absolute right-0 mt-2 w-72 bg-background-elevated border border-gold-500/30 rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-3">
            {/* Wallet Info */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isTrustWalletSolana ? 'bg-blue-500' : 'bg-purple-500'}`} />
                <span className="font-medium text-white">{walletName}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>

            {/* Solana Balances */}
            <div>
              <div className="text-xs text-gray-400 mb-2">Solana</div>
              <div className="bg-green-500/10 rounded px-3 py-2">
                <div className="text-xs text-gray-400">TAKARA</div>
                <div className="font-bold text-green-400">{takaraBalance}</div>
              </div>
            </div>

            {/* TRON Balances */}
            {(isTrustWalletSolana || tronConnected) && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>TRON</span>
                  {!tronConnected && (
                    <button onClick={() => connectTron()} className="text-gold-500 hover:text-gold-400">
                      Connect
                    </button>
                  )}
                </div>
                {tronConnected ? (
                  <div className="bg-gold-500/10 rounded px-3 py-2">
                    <div className="text-xs text-gray-400">USDT</div>
                    <div className="font-bold text-gold-400">{usdtBalance}</div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500 text-sm">
                    Connect for USDT balance
                  </div>
                )}
              </div>
            )}

            {/* Addresses */}
            <div className="pt-2 border-t border-gray-700 text-xs">
              {publicKey && (
                <div className="flex justify-between text-gray-400">
                  <span>Solana:</span>
                  <span className="font-mono">{formatAddress(publicKey.toBase58())}</span>
                </div>
              )}
              {tronConnected && tronAddress && (
                <div className="flex justify-between text-gray-400 mt-1">
                  <span>TRON:</span>
                  <span className="font-mono">{formatAddress(tronAddress)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnifiedWalletButton
