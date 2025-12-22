/**
 * useEVMWallet Hook
 * Manages Phantom EVM connection and Ethereum state
 */

import { useState, useEffect, useCallback } from 'react'
import { ethereumService } from '../services/ethereum.service'
import { api } from '../services/api'
import { toast } from 'sonner'
import type { EthereumWallet } from '../types/blockchain'

interface EVMWalletState {
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  usdtBalance: number
  ethBalance: string
}

export function useEVMWallet() {
  const [state, setState] = useState<EVMWalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    usdtBalance: 0,
    ethBalance: '0',
  })

  /**
   * Connect to Phantom EVM
   */
  const connect = useCallback(async () => {
    if (!ethereumService.isWalletInstalled()) {
      toast.error('Please install Phantom wallet')
      window.open('https://phantom.app/download', '_blank')
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true }))

    try {
      const wallet: EthereumWallet = await ethereumService.connect()

      // Get USDT balance (with error handling)
      let usdtBalance = 0
      try {
        usdtBalance = await ethereumService.getUSDTBalance(wallet.address)
      } catch (balanceError) {
        console.warn('Failed to get USDT balance:', balanceError)
        // Continue without USDT balance
      }

      setState({
        address: wallet.address,
        chainId: wallet.chainId,
        isConnected: true,
        isConnecting: false,
        usdtBalance,
        ethBalance: wallet.balance,
      })

      // Save Ethereum address to backend if user is authenticated (with debounce)
      if (api.isAuthenticated()) {
        try {
          await api.connectEthereum(wallet.address)
          toast.success('Phantom connected and saved')
        } catch (backendError: any) {
          console.error('Failed to save Ethereum address:', backendError)
          // Don't show error toast to avoid annoying the user
        }
      } else {
        toast.success('Phantom connected successfully')
      }
    } catch (error: any) {
      console.error('Phantom connection error:', error)
      toast.error(error.message || 'Failed to connect Phantom')
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [])

  /**
   * Disconnect Phantom
   */
  const disconnect = useCallback(() => {
    ethereumService.disconnect()
    setState({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      usdtBalance: 0,
      ethBalance: '0',
    })
    toast.info('Phantom disconnected')
  }, [])

  /**
   * Refresh balances
   */
  const refreshBalances = useCallback(async () => {
    if (!state.address) return

    try {
      const [usdtBalance, ethBalance] = await Promise.all([
        ethereumService.getUSDTBalance(state.address),
        ethereumService.getBalance(state.address),
      ])

      setState((prev) => ({
        ...prev,
        usdtBalance,
        ethBalance,
      }))
    } catch (error) {
      console.error('Failed to refresh balances:', error)
    }
  }, [state.address])

  /**
   * Transfer USDT
   */
  const transferUSDT = useCallback(
    async (toAddress: string, amount: number) => {
      if (!state.isConnected || !state.address) {
        throw new Error('Phantom not connected')
      }

      const result = await ethereumService.transferUSDT({
        amount,
        toAddress,
        fromAddress: state.address,
      })

      // Refresh balances after transfer
      await refreshBalances()

      return result
    },
    [state.isConnected, state.address, refreshBalances]
  )

  /**
   * Check network and switch if needed
   */
  const checkAndSwitchNetwork = useCallback(async () => {
    const isCorrectNetwork = await ethereumService.checkNetwork()
    if (!isCorrectNetwork) {
      await ethereumService.switchToMainnet()
      toast.info('Switched to Ethereum Mainnet')
    }
  }, [])

  /**
   * Get gas estimate for USDT transfer
   */
  const estimateTransferGas = useCallback(
    async (toAddress: string, amount: number) => {
      return await ethereumService.estimateGas(toAddress, amount)
    },
    []
  )

  /**
   * Listen for account/chain changes
   */
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        disconnect()
      } else if (accounts[0] !== state.address && state.address !== null) {
        // Account changed - just update state without reconnecting
        setState((prev) => ({
          ...prev,
          address: accounts[0],
        }))

        // Save new address if authenticated
        if (api.isAuthenticated()) {
          api.connectEthereum(accounts[0]).catch((err) => {
            console.error('Failed to save new Ethereum address:', err)
          })
        }
      }
    }

    const handleChainChanged = () => {
      // Reload page on chain change
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [state.address, disconnect])

  /**
   * Auto-connect if user is authenticated and previously connected
   */
  useEffect(() => {
    const autoConnect = async () => {
      // Only auto-connect if user is authenticated
      if (!api.isAuthenticated()) return
      if (!ethereumService.isWalletInstalled()) return

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
    checkAndSwitchNetwork,
    estimateTransferGas,
    isWalletInstalled: ethereumService.isWalletInstalled(),
    formatAddress: ethereumService.formatAddress,
    isValidAddress: ethereumService.isValidAddress,
  }
}
