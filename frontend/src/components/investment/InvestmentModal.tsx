import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { api } from '../../services/api'
import { solanaService } from '../../services/solana.service'
import { useMetaMask } from '../../hooks/useMetaMask'
import { useTronLink } from '../../hooks/useTronLink'
import { toast } from 'sonner'
import type { InvestmentCalculation } from '../../types'

type PaymentNetwork = 'ETH' | 'TRC20'

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  vaultId: string
  calculation: InvestmentCalculation
  usdtAmount: number
  laikaAmountLKI: number
}

type Step = 'review' | 'transfer' | 'confirm' | 'success'

export default function InvestmentModal({
  isOpen,
  onClose,
  vaultId,
  calculation,
  usdtAmount,
  laikaAmountLKI,
}: InvestmentModalProps) {
  const { publicKey, signTransaction } = useWallet()
  const { transferUSDT: transferUSDTMetaMask, isConnected: metaMaskConnected, address: ethAddress } = useMetaMask()
  const { transferUSDT: transferUSDTTronLink, isConnected: tronLinkConnected } = useTronLink()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('review')
  const [txSignature, setTxSignature] = useState<string>('')
  const [paymentNetwork, setPaymentNetwork] = useState<PaymentNetwork>('ETH')

  const investMutation = useMutation({
    mutationFn: async () => {
      // Check wallet connections based on selected network
      if (paymentNetwork === 'ETH' && !metaMaskConnected) {
        throw new Error('Please connect MetaMask for USDT payment (Ethereum)')
      }

      if (paymentNetwork === 'TRC20' && !tronLinkConnected) {
        throw new Error('Please connect TronLink for USDT payment (TRC20)')
      }

      if (!publicKey || !signTransaction) {
        throw new Error('Please connect Phantom wallet for TAKARA/LAIKA tokens')
      }

      // Step 1: Transfer USDT based on selected network
      let usdtSignature: string

      if (paymentNetwork === 'ETH') {
        if (!ethAddress) {
          throw new Error('MetaMask address not available')
        }

        toast.info('Transferring USDT via MetaMask (Ethereum)...')

        // Get platform wallet address from environment
        const platformWalletETH = import.meta.env.VITE_PLATFORM_WALLET_ETH || ethAddress

        const result = await transferUSDTMetaMask(platformWalletETH, usdtAmount)
        usdtSignature = result.txHash
      } else {
        toast.info('Transferring USDT via TronLink (TRC20)...')
        const result = await transferUSDTTronLink(usdtAmount.toString())
        usdtSignature = result.hash
      }

      toast.success('USDT transferred successfully!')

      // Step 2: Transfer TAKARA if required (via Phantom/Solana)
      if (calculation.investment.requiredTAKARA > 0) {
        toast.info('Transferring TAKARA via Phantom...')
        const platformWallet = solanaService.getPlatformWalletAddress()
        await solanaService.transferTAKARA(
          publicKey,
          platformWallet,
          calculation.investment.requiredTAKARA,
          signTransaction
        )
        toast.success('TAKARA transferred successfully!')
      }

      // Step 3: Transfer LAIKA if boosting (via Phantom/Solana)
      if (laikaAmountLKI > 0) {
        toast.info('Transferring LAIKA via Phantom...')
        const platformWallet = solanaService.getPlatformWalletAddress()
        await solanaService.transferLAIKA(
          publicKey,
          platformWallet,
          laikaAmountLKI,
          signTransaction
        )
        toast.success('LAIKA transferred successfully!')
      }

      setTxSignature(usdtSignature)

      // Step 4: Create investment record in backend
      toast.info('Creating investment...')
      const response = await api.createInvestment({
        vaultId,
        usdtAmount,
        takaraAmount: calculation.investment.requiredTAKARA,
        laikaBoost: laikaAmountLKI > 0
          ? {
              laikaAmount: laikaAmountLKI,
              // @ts-ignore - Type definitions need updating
              laikaValueUSD: calculation.investment.laikaValueUSD || 0,
            }
          : undefined,
        txSignature: usdtSignature,
      })

      return response
    },
    onSuccess: () => {
      setStep('success')
      toast.success('Investment created successfully!')
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Investment failed')
      console.error('Investment error:', error)
    },
  })

  const handleInvest = async () => {
    setStep('transfer')
    try {
      await investMutation.mutateAsync()
    } catch (error) {
      setStep('review')
    }
  }

  const handleClose = () => {
    if (step !== 'transfer') {
      setStep('review')
      setTxSignature('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-green-900/20">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-green-900/20">
          <h2 className="text-2xl font-bold text-white">
            {step === 'success' ? 'Investment Successful!' : 'Confirm Investment'}
          </h2>
          {step !== 'transfer' && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Payment Network Selection */}
              <div className="bg-background-elevated rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Select USDT Payment Network</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentNetwork('ETH')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentNetwork === 'ETH'
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-green-900/30 bg-background-card hover:border-green-900/50'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">Ethereum (ERC20)</div>
                    <div className="text-xs text-gray-400">Mainnet USDT</div>
                    <div className="text-xs text-green-400 mt-2">Recommended</div>
                  </button>
                  <button
                    onClick={() => setPaymentNetwork('TRC20')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentNetwork === 'TRC20'
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-green-900/30 bg-background-card hover:border-green-900/50'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">TRC20 (TRON)</div>
                    <div className="text-xs text-gray-400">Lowest fees</div>
                  </button>
                </div>
              </div>

              {/* Wallet Connection Status */}
              {((paymentNetwork === 'ETH' && !metaMaskConnected) ||
                (paymentNetwork === 'TRC20' && !tronLinkConnected) ||
                !publicKey) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="text-sm text-yellow-400 font-medium mb-2">
                    ⚠️ Required Wallets
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    {paymentNetwork === 'ETH' && !metaMaskConnected && (
                      <div>• Connect MetaMask for USDT payment (Ethereum Mainnet)</div>
                    )}
                    {paymentNetwork === 'TRC20' && !tronLinkConnected && (
                      <div>• Connect TronLink for USDT payment (TRC20 Network)</div>
                    )}
                    {!publicKey && (
                      <div>• Connect Phantom for TAKARA/LAIKA tokens (Solana)</div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-background-elevated rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Investment Summary</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Vault</div>
                    <div className="text-white font-medium">{calculation.vault.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Duration</div>
                    <div className="text-white font-medium">
                      {calculation.vault.duration} months
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">USDT Amount</div>
                    <div className="text-white font-medium">
                      ${usdtAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Final APY</div>
                    <div className="text-gold-500 font-bold text-lg">
                      {calculation.earnings.finalAPY}%
                    </div>
                  </div>
                </div>
              </div>

              {calculation.investment.requiredTAKARA > 0 && (
                <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-4">
                  <div className="text-sm text-green-400 font-medium mb-2">
                    TAKARA Required
                  </div>
                  <div className="text-white font-semibold">
                    {calculation.investment.requiredTAKARA.toLocaleString()} TAKARA
                  </div>
                </div>
              )}

              {laikaAmountLKI > 0 && (
                <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-4">
                  <div className="text-sm text-laika-purple font-medium mb-2">
                    LAIKA Boost
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">Amount</div>
                      <div className="text-white font-semibold">
                        {laikaAmountLKI.toLocaleString()} LKI
                      </div>
                       <div className="text-xs text-gray-500">
                        {/* @ts-ignore - Type definitions need updating */}
                        ≈ ${calculation.investment.laikaValueUSD?.toFixed(2) || 0} USDT
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Boost APY</div>
                      <div className="text-laika-green font-semibold">
                        +{calculation.earnings.laikaBoostAPY}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-3">Expected Returns</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total USDT Earnings</span>
                    <span className="text-white font-semibold">
                      ${calculation.earnings.totalUSDT.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total TAKARA Mined</span>
                    <span className="text-green-400 font-semibold">
                      {calculation.mining.totalTAKARA.toFixed(2)} TAKARA
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gold-500/30 pt-2 mt-2">
                    <span className="text-gray-300">ROI</span>
                    <span className="text-gold-500 font-bold text-lg">
                      {calculation.summary.roi}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-yellow-400">
                  ⏱️ <strong>72-Hour Activation:</strong> Your investment will be pending for 72
                  hours before activation. During this time, you cannot withdraw.
                </div>
              </div>

              <button
                onClick={handleInvest}
                disabled={investMutation.isPending}
                className="btn-gold w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2"
              >
                Proceed to Transfer
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Transfer Step */}
          {step === 'transfer' && (
            <div className="text-center py-12 space-y-6">
              <Loader2 className="h-16 w-16 text-gold-500 animate-spin mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Processing Transaction</h3>
                <p className="text-gray-400">
                  Please confirm the transaction in your wallet...
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-12 space-y-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Investment Created!</h3>
                <p className="text-gray-400 mb-4">
                  Your investment has been created successfully. It will be activated after 72
                  hours.
                </p>
                {txSignature && (
                  <div className="bg-background-elevated rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-2">Transaction Hash</div>
                    <a
                      href={
                        paymentNetwork === 'ETH'
                          ? `https://etherscan.io/tx/${txSignature}`
                          : `https://tronscan.org/#/transaction/${txSignature}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-500 hover:text-gold-400 text-sm break-all"
                    >
                      {txSignature}
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    window.location.href = '/dashboard'
                  }}
                  className="btn-gold flex-1 py-3 rounded-lg font-semibold"
                >
                  View Dashboard
                </button>
                <button
                  onClick={handleClose}
                  className="btn-outline-gold flex-1 py-3 rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
