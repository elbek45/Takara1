/**
 * Trust Wallet Button Component
 * For USDT payments via BSC/Ethereum
 */

import { Wallet } from 'lucide-react'
import { useEVMWallet } from '../../hooks/useEVMWallet'

interface TrustWalletButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  showBalance?: boolean
  className?: string
}

export function TrustWalletButton({
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  showBalance = true,
  className = '',
}: TrustWalletButtonProps) {
  const {
    isConnected,
    address,
    usdtBalance,
    isConnecting,
    connect,
    disconnect,
    formatAddress,
  } = useEVMWallet()

  const handleClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }

  // Variant styles (Trust Wallet blue branding)
  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90',
    secondary: isConnected
      ? 'bg-blue-600 text-white hover:opacity-90'
      : 'bg-gray-700 text-gray-300 hover:opacity-90',
    outline: isConnected
      ? 'border-2 border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
      : 'border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10',
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
      disabled={isConnecting}
      className={`
        flex items-center justify-center gap-2 rounded-lg font-semibold transition-all
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthClass}
        ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={
        isConnected
          ? `Trust Wallet: ${address} | USDT: ${usdtBalance}`
          : isConnecting
          ? 'Connecting...'
          : 'Connect Trust Wallet for USDT'
      }
    >
      <Wallet className={size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />

      {isConnecting ? (
        <span>Connecting...</span>
      ) : isConnected && address ? (
        <>
          <span className="hidden lg:inline">
            {formatAddress(address)}
          </span>
          {showBalance && (
            <span className="text-xs opacity-80">
              ({usdtBalance.toFixed(2)} USDT)
            </span>
          )}
        </>
      ) : (
        <span className="hidden lg:inline">Trust Wallet</span>
      )}
    </button>
  )
}

// Compact version for mobile
interface TrustWalletButtonCompactProps {
  className?: string
}

export function TrustWalletButtonCompact({ className = '' }: TrustWalletButtonCompactProps) {
  const {
    isConnected,
    address,
    usdtBalance,
    isConnecting,
    connect,
    disconnect,
  } = useEVMWallet()

  const handleClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={`
        flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all
        ${isConnected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}
        hover:opacity-90
        ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <Wallet className="h-4 w-4" />
      {isConnecting ? (
        <span>Connecting...</span>
      ) : isConnected && address ? (
        <span>
          Trust: {address.slice(0, 6)}...{address.slice(-4)} ({usdtBalance.toFixed(2)} USDT)
        </span>
      ) : (
        <span>Connect Trust Wallet</span>
      )}
    </button>
  )
}

export default TrustWalletButton
