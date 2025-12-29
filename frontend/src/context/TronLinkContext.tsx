/**
 * TronLink Context Provider
 * Manages TronLink wallet connection state globally across the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import * as Sentry from '@sentry/react'
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
  transferTRX: (amount: string) => Promise<{ hash: string }>
  isTronLinkInstalled: boolean
}

const TronLinkContext = createContext<TronLinkContextType | null>(null)

// TRC20 USDT Contract Address
const USDT_CONTRACT_ADDRESS = import.meta.env.VITE_USDT_CONTRACT_TRON || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
// Platform wallet address for receiving USDT
const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET_TRON || ''
// TRON Network endpoint (Mainnet)
const TRON_FULL_HOST = import.meta.env.VITE_TRON_FULL_HOST || 'https://api.trongrid.io'

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
   * Wait for TronWeb to be ready
   */
  const waitForTronWeb = async (maxAttempts = 30): Promise<any> => {
    // Debug: Log all available wallet objects
    console.log('Checking available TRON wallets:', {
      tronWeb: typeof window.tronWeb,
      tronLink: typeof window.tronLink,
      trustwallet: typeof (window as any).trustwallet,
    })

    // Try to request accounts first
    if (window.tronLink) {
      try {
        console.log('Requesting Trust Wallet accounts...')
        const res = await window.tronLink.request({ method: 'tron_requestAccounts' })
        console.log('Request result:', res)
      } catch (e: any) {
        console.log('Request attempt:', e?.message || e)
      }
    }

    // Wait for tronWeb with address
    for (let i = 0; i < maxAttempts; i++) {
      const tronWeb = window.tronWeb

      if (tronWeb) {
        // Trust Wallet may not set ready=true, so check for address instead
        const address = tronWeb.defaultAddress?.base58 ||
                       tronWeb.defaultAddress?.hex

        console.log(`Attempt ${i + 1}: ready=${tronWeb.ready}, address=${address}`)

        // Accept if we have an address, even if ready is false
        if (address && address !== 'false' && address.length > 10) {
          console.log('TronWeb available! Address:', address)

          // Verify essential methods exist
          if (tronWeb.transactionBuilder && tronWeb.trx) {
            console.log('TronWeb methods available:', {
              transactionBuilder: !!tronWeb.transactionBuilder,
              trx: !!tronWeb.trx,
              contract: !!tronWeb.contract,
            })
            return tronWeb
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Final debug info
    const debugInfo = {
      tronWeb: !!window.tronWeb,
      tronWebReady: window.tronWeb?.ready,
      tronWebAddress: window.tronWeb?.defaultAddress,
      tronLink: !!window.tronLink,
    }
    console.error('TRON wallet debug:', debugInfo)

    // Send to Sentry
    Sentry.captureMessage('TRON wallet not ready', {
      level: 'error',
      tags: { component: 'TronLinkContext', action: 'waitForTronWeb' },
      extra: debugInfo
    })

    throw new Error('TRON wallet not ready. Please make sure Trust Wallet is unlocked and connected to this site.')
  }

  /**
   * Transfer USDT (TRC20) using Trust Wallet's tronWeb
   */
  const transferUSDT = useCallback(
    async (amount: string): Promise<{ hash: string }> => {
      if (!state.isConnected || !state.address) {
        throw new Error('Trust Wallet not connected')
      }

      if (!PLATFORM_WALLET) {
        throw new Error('Platform wallet address not configured')
      }

      // Wait for wallet to be ready
      const tronWeb = await waitForTronWeb()

      try {
        console.log('Starting USDT transfer via Trust Wallet:', {
          amount,
          from: state.address,
          to: PLATFORM_WALLET,
          contract: USDT_CONTRACT_ADDRESS,
        })

        const amountInSun = Math.floor(parseFloat(amount) * 1e6)

        // Method 1: Try using transactionBuilder.triggerSmartContract directly
        console.log('Building TRC20 transfer transaction...')

        const functionSelector = 'transfer(address,uint256)'
        const parameter = [
          { type: 'address', value: PLATFORM_WALLET },
          { type: 'uint256', value: amountInSun }
        ]

        const tx = await tronWeb.transactionBuilder.triggerSmartContract(
          USDT_CONTRACT_ADDRESS,
          functionSelector,
          {
            feeLimit: 100000000,
            callValue: 0,
          },
          parameter,
          state.address
        )

        console.log('Transaction built:', tx)

        if (!tx.result || !tx.result.result) {
          throw new Error(tx.result?.message || 'Failed to build transaction')
        }

        // Sign transaction
        console.log('Requesting signature from Trust Wallet...')
        const signedTx = await tronWeb.trx.sign(tx.transaction)
        console.log('Transaction signed:', signedTx)

        // Broadcast transaction
        console.log('Broadcasting transaction...')
        const result = await tronWeb.trx.sendRawTransaction(signedTx)
        console.log('Broadcast result:', result)

        if (!result.result) {
          throw new Error(result.message || 'Failed to broadcast transaction')
        }

        return { hash: result.txid || signedTx.txID }
      } catch (error: any) {
        console.error('USDT transfer error:', error)

        // Send to Sentry
        Sentry.captureException(error, {
          tags: { component: 'TronLinkContext', action: 'transferUSDT' },
          extra: { amount, from: state.address, to: PLATFORM_WALLET }
        })

        let errorMessage = 'Failed to transfer USDT'

        if (typeof error === 'string') {
          errorMessage = error
        } else if (error?.message) {
          errorMessage = error.message
        } else if (error?.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error)
        }

        if (errorMessage.includes('Confirmation declined') || errorMessage.includes('cancel') || errorMessage.includes('rejected')) {
          errorMessage = 'Transaction was cancelled by user'
        } else if (errorMessage.includes('balance') || errorMessage.includes('BALANCE_NOT_ENOUGH')) {
          errorMessage = 'Insufficient TRX balance for transaction fees'
        } else if (errorMessage.includes('401')) {
          errorMessage = 'Trust Wallet session expired. Please reconnect your wallet.'
        }

        throw new Error(errorMessage)
      }
    },
    [state.isConnected, state.address]
  )

  /**
   * Transfer TRX (native token) using Trust Wallet's tronWeb
   */
  const transferTRX = useCallback(
    async (amount: string): Promise<{ hash: string }> => {
      if (!state.isConnected || !state.address) {
        throw new Error('Trust Wallet not connected')
      }

      if (!PLATFORM_WALLET) {
        throw new Error('Platform wallet address not configured')
      }

      // Wait for wallet to be ready
      const tronWeb = await waitForTronWeb()

      try {
        console.log('Starting TRX transfer via Trust Wallet:', {
          amount,
          from: state.address,
          to: PLATFORM_WALLET,
        })

        // Convert TRX to SUN (1 TRX = 1,000,000 SUN)
        const amountInSun = Math.floor(parseFloat(amount) * 1e6)

        console.log('Building TRX transfer transaction...')

        // Build native TRX transfer transaction
        const tx = await tronWeb.transactionBuilder.sendTrx(
          PLATFORM_WALLET,
          amountInSun,
          state.address
        )

        console.log('Transaction built:', tx)

        // Sign transaction
        console.log('Requesting signature from Trust Wallet...')
        const signedTx = await tronWeb.trx.sign(tx)
        console.log('Transaction signed:', signedTx)

        // Broadcast transaction
        console.log('Broadcasting transaction...')
        const result = await tronWeb.trx.sendRawTransaction(signedTx)
        console.log('Broadcast result:', result)

        if (!result.result) {
          throw new Error(result.message || 'Failed to broadcast transaction')
        }

        return { hash: result.txid || signedTx.txID }
      } catch (error: any) {
        console.error('TRX transfer error:', error)

        // Send to Sentry
        Sentry.captureException(error, {
          tags: { component: 'TronLinkContext', action: 'transferTRX' },
          extra: { amount, from: state.address, to: PLATFORM_WALLET }
        })

        let errorMessage = 'Failed to transfer TRX'

        if (typeof error === 'string') {
          errorMessage = error
        } else if (error?.message) {
          errorMessage = error.message
        } else if (error?.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error)
        }

        if (errorMessage.includes('Confirmation declined') || errorMessage.includes('cancel') || errorMessage.includes('rejected')) {
          errorMessage = 'Transaction was cancelled by user'
        } else if (errorMessage.includes('balance') || errorMessage.includes('BALANCE_NOT_ENOUGH')) {
          errorMessage = 'Insufficient TRX balance'
        } else if (errorMessage.includes('401')) {
          errorMessage = 'Trust Wallet session expired. Please reconnect your wallet.'
        }

        throw new Error(errorMessage)
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
    transferTRX,
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
