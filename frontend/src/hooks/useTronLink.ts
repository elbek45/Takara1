/**
 * useTronLink Hook
 * Manages TronLink connection and USDT (TRC20) transfers
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface TronLinkState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  usdtBalance: string
  trxBalance: string
}

// TRC20 USDT Contract Address on TRON Mainnet
const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
// Platform wallet address for receiving USDT
const PLATFORM_WALLET = 'TYour_Platform_Wallet_Address_Here' // TODO: Set actual platform wallet

declare global {
  interface Window {
    tronWeb?: any
    tronLink?: any
  }
}

export function useTronLink() {
  const [state, setState] = useState<TronLinkState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    usdtBalance: '0',
    trxBalance: '0',
  })

  /**
   * Check if TronLink is installed
   */
  const isTronLinkInstalled = useCallback(() => {
    return typeof window !== 'undefined' && (!!window.tronWeb || !!window.tronLink)
  }, [])

  /**
   * Connect to TronLink
   */
  const connect = useCallback(async () => {
    if (!isTronLinkInstalled()) {
      toast.error('Please install TronLink extension')
      window.open('https://www.tronlink.org/', '_blank')
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true }))

    try {
      // Request account access
      const res = await window.tronLink.request({
        method: 'tron_requestAccounts',
      })

      if (res.code === 200) {
        const tronWeb = window.tronWeb
        const address = tronWeb.defaultAddress.base58

        // Get balances
        const [trxBalance, usdtBalance] = await Promise.all([
          getTRXBalance(address),
          getUSDTBalance(address),
        ])

        setState({
          address,
          isConnected: true,
          isConnecting: false,
          usdtBalance,
          trxBalance,
        })

        toast.success('TronLink connected successfully')
      } else {
        throw new Error('User rejected the connection')
      }
    } catch (error: any) {
      console.error('TronLink connection error:', error)
      toast.error(error.message || 'Failed to connect TronLink')
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [isTronLinkInstalled])

  /**
   * Disconnect TronLink
   */
  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      usdtBalance: '0',
      trxBalance: '0',
    })
    toast.info('TronLink disconnected')
  }, [])

  /**
   * Get TRX balance
   */
  const getTRXBalance = async (address: string): Promise<string> => {
    try {
      const balance = await window.tronWeb.trx.getBalance(address)
      return (balance / 1e6).toFixed(2) // Convert from sun to TRX
    } catch (error) {
      console.error('Failed to get TRX balance:', error)
      return '0'
    }
  }

  /**
   * Get USDT (TRC20) balance
   */
  const getUSDTBalance = async (address: string): Promise<string> => {
    try {
      const contract = await window.tronWeb.contract().at(USDT_CONTRACT_ADDRESS)
      const balance = await contract.balanceOf(address).call()
      return (balance.toString() / 1e6).toFixed(2) // USDT has 6 decimals
    } catch (error) {
      console.error('Failed to get USDT balance:', error)
      return '0'
    }
  }

  /**
   * Transfer USDT (TRC20)
   */
  const transferUSDT = useCallback(
    async (amount: string): Promise<{ hash: string }> => {
      if (!state.isConnected || !state.address) {
        throw new Error('TronLink not connected')
      }

      try {
        const tronWeb = window.tronWeb
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS)

        // Convert amount to smallest unit (6 decimals for USDT)
        const amountInSun = Math.floor(parseFloat(amount) * 1e6)

        // Call transfer function
        const tx = await contract.transfer(PLATFORM_WALLET, amountInSun).send({
          feeLimit: 100_000_000, // 100 TRX fee limit
          callValue: 0,
          shouldPollResponse: true,
        })

        return { hash: tx }
      } catch (error: any) {
        console.error('USDT transfer error:', error)
        throw new Error(error.message || 'Failed to transfer USDT')
      }
    },
    [state.isConnected, state.address]
  )

  /**
   * Refresh balances
   */
  const refreshBalances = useCallback(async () => {
    if (!state.address) return

    try {
      const [trxBalance, usdtBalance] = await Promise.all([
        getTRXBalance(state.address),
        getUSDTBalance(state.address),
      ])

      setState((prev) => ({
        ...prev,
        usdtBalance,
        trxBalance,
      }))
    } catch (error) {
      console.error('Failed to refresh balances:', error)
    }
  }, [state.address])

  /**
   * Auto-connect if already authorized
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (isTronLinkInstalled() && window.tronWeb && window.tronWeb.ready) {
        const address = window.tronWeb.defaultAddress.base58
        if (address) {
          const [trxBalance, usdtBalance] = await Promise.all([
            getTRXBalance(address),
            getUSDTBalance(address),
          ])

          setState({
            address,
            isConnected: true,
            isConnecting: false,
            usdtBalance,
            trxBalance,
          })
        }
      }
    }

    // Check after a short delay to ensure tronWeb is fully loaded
    const timer = setTimeout(checkConnection, 1000)
    return () => clearTimeout(timer)
  }, [isTronLinkInstalled])

  /**
   * Listen for account changes
   */
  useEffect(() => {
    if (!isTronLinkInstalled()) return

    const handleAccountsChanged = (message: any) => {
      if (message.data.message && message.data.message.action === 'accountsChanged') {
        const newAddress = message.data.message.data.address
        if (newAddress && newAddress !== state.address) {
          // Reconnect with new address
          connect()
        } else if (!newAddress && state.isConnected) {
          // Disconnect if no address
          disconnect()
        }
      }
    }

    window.addEventListener('message', handleAccountsChanged)
    return () => window.removeEventListener('message', handleAccountsChanged)
  }, [isTronLinkInstalled, state.address, state.isConnected, connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    transferUSDT,
    refreshBalances,
    isTronLinkInstalled: isTronLinkInstalled(),
  }
}
