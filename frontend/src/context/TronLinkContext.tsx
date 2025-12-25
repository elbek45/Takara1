/**
 * TronLink Context Provider
 * Manages TronLink wallet connection state globally across the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '../services/api'

interface TronLinkState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  usdtBalance: string
  trxBalance: string
}

interface TronLinkContextType extends TronLinkState {
  connect: () => Promise<void>
  disconnect: () => void
  refreshBalances: () => Promise<void>
  transferUSDT: (amount: string) => Promise<{ hash: string }>
  isTronLinkInstalled: boolean
}

const TronLinkContext = createContext<TronLinkContextType | null>(null)

// TRC20 USDT Contract Address
const USDT_CONTRACT_ADDRESS = import.meta.env.VITE_USDT_CONTRACT_TRON || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
// Platform wallet address for receiving USDT
const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET_TRON || ''
// TRON Network endpoint (Shasta testnet)
const TRON_FULL_HOST = import.meta.env.VITE_TRON_FULL_HOST || 'https://api.shasta.trongrid.io'

declare global {
  interface Window {
    tronWeb?: any
    tronLink?: any
  }
}

/**
 * Convert TRON base58 address to hex format
 */
function base58ToHex(base58Address: string): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let num = BigInt(0)
  for (const char of base58Address) {
    num = num * BigInt(58) + BigInt(ALPHABET.indexOf(char))
  }
  let hex = num.toString(16)
  while (hex.length < 50) {
    hex = '0' + hex
  }
  return hex.slice(0, 42)
}

// Store connected address in localStorage for persistence
const TRON_CONNECTED_KEY = 'tronlink_connected_address'

export function TronLinkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TronLinkState>(() => {
    // Try to restore from localStorage on initial load
    const savedAddress = localStorage.getItem(TRON_CONNECTED_KEY)
    if (savedAddress) {
      return {
        address: savedAddress,
        isConnected: true,
        isConnecting: false,
        usdtBalance: '0',
        trxBalance: '0',
      }
    }
    return {
      address: null,
      isConnected: false,
      isConnecting: false,
      usdtBalance: '0',
      trxBalance: '0',
    }
  })
  const savedAddressRef = useRef<string | null>(null)

  /**
   * Check if TronLink is installed
   */
  const isTronLinkInstalled = useCallback(() => {
    return typeof window !== 'undefined' && (!!window.tronWeb || !!window.tronLink)
  }, [])

  /**
   * Get TRX balance via TronGrid API
   */
  const getTRXBalance = async (address: string): Promise<string> => {
    try {
      const response = await fetch(`${TRON_FULL_HOST}/v1/accounts/${address}`)
      const data = await response.json()
      if (data.data && data.data[0]) {
        const balance = data.data[0].balance || 0
        return (balance / 1e6).toFixed(2)
      }
      return '0'
    } catch (error) {
      console.error('Failed to get TRX balance:', error)
      return '0'
    }
  }

  /**
   * Get USDT (TRC20) balance via TronGrid API
   */
  const getUSDTBalance = async (address: string): Promise<string> => {
    try {
      const contractHex = base58ToHex(USDT_CONTRACT_ADDRESS)
      const ownerHex = base58ToHex(address)

      const response = await fetch(`${TRON_FULL_HOST}/wallet/triggerconstantcontract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_address: ownerHex,
          contract_address: contractHex,
          function_selector: 'balanceOf(address)',
          parameter: ownerHex.slice(2).padStart(64, '0'),
        })
      })

      const data = await response.json()
      if (data.constant_result && data.constant_result[0]) {
        const balance = parseInt(data.constant_result[0], 16)
        return (balance / 1e6).toFixed(2)
      }
      return '0'
    } catch (error) {
      console.error('Failed to get USDT balance:', error)
      return '0'
    }
  }

  /**
   * Save TRON wallet address to backend
   */
  const saveWalletToBackend = useCallback(async (address: string) => {
    if (api.isAuthenticated() && savedAddressRef.current !== address) {
      try {
        await api.connectTron(address)
        savedAddressRef.current = address
        console.log('TRON wallet saved to backend:', address)
      } catch (error) {
        console.error('Failed to save TRON wallet to backend:', error)
      }
    }
  }, [])

  /**
   * Connect to TronLink
   */
  const connect = useCallback(async () => {
    if (!isTronLinkInstalled()) {
      toast.error('Please install TronLink extension or Trust Wallet')
      window.open('https://www.tronlink.org/', '_blank')
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true }))

    try {
      const res = await window.tronLink.request({
        method: 'tron_requestAccounts',
      })

      if (res.code === 200) {
        const tronWeb = window.tronWeb
        const address = tronWeb.defaultAddress.base58

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

        // Save to localStorage for persistence
        localStorage.setItem(TRON_CONNECTED_KEY, address)

        // Save to backend
        await saveWalletToBackend(address)

        toast.success('Trust Wallet connected successfully')
      } else {
        throw new Error('User rejected the connection')
      }
    } catch (error: any) {
      console.error('TronLink connection error:', error)
      toast.error(error.message || 'Failed to connect Trust Wallet')
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [isTronLinkInstalled, saveWalletToBackend])

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
    savedAddressRef.current = null
    localStorage.removeItem(TRON_CONNECTED_KEY)
    toast.info('Trust Wallet disconnected')
  }, [])

  /**
   * Transfer USDT (TRC20)
   */
  const transferUSDT = useCallback(
    async (amount: string): Promise<{ hash: string }> => {
      if (!state.isConnected || !state.address) {
        throw new Error('Trust Wallet not connected')
      }

      try {
        const tronWeb = window.tronWeb
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS)
        const amountInSun = Math.floor(parseFloat(amount) * 1e6)

        const tx = await contract.transfer(PLATFORM_WALLET, amountInSun).send({
          feeLimit: 100_000_000,
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
   * Fetch balances when address is set but balances are 0
   */
  useEffect(() => {
    if (state.address && state.isConnected && state.usdtBalance === '0') {
      // Balances are 0, try to fetch them
      const fetchBalances = async () => {
        try {
          const [trxBalance, usdtBalance] = await Promise.all([
            getTRXBalance(state.address!),
            getUSDTBalance(state.address!),
          ])
          setState((prev) => ({
            ...prev,
            usdtBalance,
            trxBalance,
          }))
        } catch (error) {
          console.error('Failed to fetch balances:', error)
        }
      }

      // Small delay to ensure TronGrid API is ready
      const timer = setTimeout(fetchBalances, 500)
      return () => clearTimeout(timer)
    }
  }, [state.address, state.isConnected, state.usdtBalance])

  /**
   * Auto-connect and refresh balances on mount
   */
  useEffect(() => {
    let mounted = true
    let retryCount = 0
    const maxRetries = 15

    const checkAndRefresh = async () => {
      if (!mounted) return

      // Check if TronLink is ready
      if (isTronLinkInstalled() && window.tronWeb && window.tronWeb.ready) {
        const tronAddress = window.tronWeb.defaultAddress.base58
        if (tronAddress && tronAddress !== 'false') {
          try {
            const [trxBalance, usdtBalance] = await Promise.all([
              getTRXBalance(tronAddress),
              getUSDTBalance(tronAddress),
            ])

            if (mounted) {
              setState({
                address: tronAddress,
                isConnected: true,
                isConnecting: false,
                usdtBalance,
                trxBalance,
              })

              // Save to localStorage
              localStorage.setItem(TRON_CONNECTED_KEY, tronAddress)

              // Save to backend
              saveWalletToBackend(tronAddress)
            }
          } catch (error) {
            console.error('TronLink balance fetch error:', error)
            if (mounted) {
              setState(prev => ({
                ...prev,
                address: tronAddress,
                isConnected: true,
                isConnecting: false,
              }))
              localStorage.setItem(TRON_CONNECTED_KEY, tronAddress)
            }
          }
          return // Success, stop retrying
        }
      }

      // If we have a saved address but tronWeb isn't ready yet, keep retrying
      const savedAddress = localStorage.getItem(TRON_CONNECTED_KEY)
      if (savedAddress && retryCount < maxRetries) {
        retryCount++
        setTimeout(checkAndRefresh, 500)
      } else if (!savedAddress && retryCount < 5) {
        // Also try a few times even without saved address (for auto-connect)
        retryCount++
        setTimeout(checkAndRefresh, 500)
      }
    }

    // Start checking after a short delay
    const timer = setTimeout(checkAndRefresh, 300)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [isTronLinkInstalled, saveWalletToBackend])

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

  const value: TronLinkContextType = {
    ...state,
    connect,
    disconnect,
    refreshBalances,
    transferUSDT,
    isTronLinkInstalled: isTronLinkInstalled(),
  }

  return (
    <TronLinkContext.Provider value={value}>
      {children}
    </TronLinkContext.Provider>
  )
}

export function useTronLinkContext() {
  const context = useContext(TronLinkContext)
  if (!context) {
    throw new Error('useTronLinkContext must be used within a TronLinkProvider')
  }
  return context
}
