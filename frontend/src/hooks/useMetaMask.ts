/**
 * useMetaMask Hook
 * Manages MetaMask connection and state
 */

import { useState, useEffect, useCallback } from 'react'
import { evmService } from '../services/evm.service'
import { toast } from 'sonner'

interface MetaMaskState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  usdtBalance: string
  bnbBalance: string
}

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    usdtBalance: '0',
    bnbBalance: '0',
  })

  /**
   * Connect to MetaMask
   */
  const connect = useCallback(async () => {
    if (!evmService.isMetaMaskInstalled()) {
      toast.error('Please install MetaMask extension')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true }))

    try {
      const address = await evmService.connect()

      // Get balances
      const [usdtBalance, bnbBalance] = await Promise.all([
        evmService.getUSDTBalance(address),
        evmService.getBNBBalance(address),
      ])

      setState({
        address,
        isConnected: true,
        isConnecting: false,
        usdtBalance,
        bnbBalance,
      })

      toast.success('MetaMask connected successfully')
    } catch (error: any) {
      console.error('MetaMask connection error:', error)
      toast.error(error.message || 'Failed to connect MetaMask')
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [])

  /**
   * Disconnect MetaMask
   */
  const disconnect = useCallback(() => {
    evmService.disconnect()
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      usdtBalance: '0',
      bnbBalance: '0',
    })
    toast.info('MetaMask disconnected')
  }, [])

  /**
   * Refresh balances
   */
  const refreshBalances = useCallback(async () => {
    if (!state.address) return

    try {
      const [usdtBalance, bnbBalance] = await Promise.all([
        evmService.getUSDTBalance(state.address),
        evmService.getBNBBalance(state.address),
      ])

      setState((prev) => ({
        ...prev,
        usdtBalance,
        bnbBalance,
      }))
    } catch (error) {
      console.error('Failed to refresh balances:', error)
    }
  }, [state.address])

  /**
   * Transfer USDT
   */
  const transferUSDT = useCallback(
    async (amount: string) => {
      if (!state.isConnected) {
        throw new Error('MetaMask not connected')
      }

      const platformAddress = evmService.getPlatformWalletAddress()
      const result = await evmService.transferUSDT(platformAddress, amount)

      // Refresh balances after transfer
      await refreshBalances()

      return result
    },
    [state.isConnected, refreshBalances]
  )

  /**
   * Listen for account/chain changes
   */
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else if (accounts[0] !== state.address) {
        // Account changed, reconnect
        connect()
      }
    }

    const handleChainChanged = () => {
      // Reload page on chain change (recommended by MetaMask)
      window.location.reload()
    }

    evmService.onAccountsChanged(handleAccountsChanged)
    evmService.onChainChanged(handleChainChanged)

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [state.address, connect, disconnect])

  /**
   * Auto-connect if previously connected
   */
  useEffect(() => {
    const autoConnect = async () => {
      if (!evmService.isMetaMaskInstalled()) return

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts && accounts.length > 0) {
          await connect()
        }
      } catch (error) {
        console.error('Auto-connect failed:', error)
      }
    }

    autoConnect()
  }, [connect])

  return {
    ...state,
    connect,
    disconnect,
    refreshBalances,
    transferUSDT,
    isMetaMaskInstalled: evmService.isMetaMaskInstalled(),
  }
}
