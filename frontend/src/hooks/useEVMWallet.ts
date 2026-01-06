/**
 * useEVMWallet Hook
 * Manages EVM wallet connection (Trust Wallet, MetaMask, etc.) for USDT payments
 */

import { useState, useEffect, useCallback } from 'react'
import { ethereumService } from '../services/ethereum.service'
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
   * Connect to EVM wallet (Trust Wallet, MetaMask, etc.)
   */
  const connect = useCallback(async () => {
    if (!ethereumService.isWalletInstalled()) {
      toast.error('Please install an EVM wallet (Trust Wallet, MetaMask, etc.)')
      window.open('https://trustwallet.com/download', '_blank')
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

      toast.success('Trust Wallet connected successfully')
    } catch (error: any) {
      console.error('EVM wallet connection error:', error)
      toast.error(error.message || 'Failed to connect Trust Wallet')
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [])

  /**
   * Disconnect EVM wallet
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
    toast.info('Trust Wallet disconnected')
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
      toast.info('Switched to EVM network')
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
   * Note: Event listeners are managed in ethereumService when connected
   */

  /**
   * Auto-connect if previously connected
   */
  useEffect(() => {
    const autoConnect = async () => {
      if (!ethereumService.isWalletInstalled()) return

      try {
        // Get the appropriate provider (prefer Trust Wallet)
        const provider = (window as any).trustwallet || window.ethereum
        if (!provider) return

        const accounts = await provider.request({ method: 'eth_accounts' })
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
