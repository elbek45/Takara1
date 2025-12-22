/**
 * Phantom EVM Connect Button Component
 * Reusable button for connecting to Phantom wallet (EVM)
 */

import { Wallet } from 'lucide-react'
import { useEVMWallet } from '../../hooks/useEVMWallet'

interface EVMWalletButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  showBalance?: boolean
  className?: string
}

export function EVMWalletButton({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  showBalance = false,
  className = '',
}: EVMWalletButtonProps) {
  const {
    isConnected,
    address,
    ethBalance,
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

  // Variant styles
  const variantStyles = {
    primary: 'bg-gradient-gold text-background-primary hover:opacity-90',
    secondary: isConnected
      ? 'bg-purple-500 text-white hover:opacity-90'
      : 'bg-gray-700 text-gray-300 hover:opacity-90',
    outline: 'border-2 border-gold-500 text-gold-500 hover:bg-gold-500/10',
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
        flex items-center justify-center gap-2 rounded-lg font-semibold transition-opacity
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthClass}
        ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={
        isConnected
          ? `Phantom: ${address}`
          : isConnecting
          ? 'Connecting...'
          : 'Connect Phantom'
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
            <span className="hidden xl:inline text-xs opacity-80">
              ({ethBalance.slice(0, 6)} ETH)
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
interface EVMWalletButtonCompactProps {
  className?: string
}

export function EVMWalletButtonCompact({ className = '' }: EVMWalletButtonCompactProps) {
  const {
    isConnected,
    address,
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
        flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-opacity
        ${isConnected ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}
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
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      ) : (
        <span>Connect Phantom</span>
      )}
    </button>
  )
}

export default EVMWalletButton
