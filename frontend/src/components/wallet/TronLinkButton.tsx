/**
 * Trust Wallet Button Component
 * Button for connecting to Trust Wallet for USDT on TRON
 */

import { Wallet } from 'lucide-react'
import { useTronLink } from '../../hooks/useTronLink'

interface TronLinkButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  showBalance?: boolean
  className?: string
}

export function TronLinkButton({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  showBalance = true,
  className = '',
}: TronLinkButtonProps) {
  const {
    isConnected,
    address,
    usdtBalance,
    trxBalance,
    isConnecting,
    connect,
    disconnect,
    isTronLinkInstalled,
  } = useTronLink()

  const handleClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Variant styles
  const variantStyles = {
    primary: 'bg-gradient-gold text-background-primary hover:opacity-90',
    secondary: isConnected
      ? 'bg-red-600 text-white hover:opacity-90'
      : 'bg-gray-700 text-gray-300 hover:opacity-90',
    outline: 'border-2 border-red-500 text-red-500 hover:bg-red-500/10',
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
          ? `Trust Wallet: ${address} | USDT: ${usdtBalance}`
          : isConnecting
          ? 'Connecting...'
          : 'Connect Trust Wallet'
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
            <span className="hidden xl:inline text-xs opacity-80 ml-1">
              ({usdtBalance} USDT)
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
interface TronLinkButtonCompactProps {
  className?: string
}

export function TronLinkButtonCompact({ className = '' }: TronLinkButtonCompactProps) {
  const {
    isConnected,
    address,
    usdtBalance,
    isConnecting,
    connect,
    disconnect,
  } = useTronLink()

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
        ${isConnected ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}
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
          {address.slice(0, 6)}...{address.slice(-4)} ({usdtBalance} USDT)
        </span>
      ) : (
        <span>Connect Trust Wallet</span>
      )}
    </button>
  )
}

export default TronLinkButton
