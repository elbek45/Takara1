import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { api } from '../../services/api'
import { solanaService } from '../../services/solana.service'
import { useMetaMask } from '../../hooks/useMetaMask'
import { toast } from 'sonner'
import type { InvestmentCalculation } from '../../types'

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
  const { transferUSDT, isConnected: metaMaskConnected, address: ethAddress } = useMetaMask()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('review')
  const [txSignature, setTxSignature] = useState<string>('')

  const investMutation = useMutation({
    mutationFn: async () => {
      // Critical validation: Check all required wallets are connected
      if (!metaMaskConnected) {
        throw new Error('MetaMask must be connected for USDT payment')
      }

      if (calculation.investment.requiredTAKARA > 0 && (!publicKey || !signTransaction)) {
        throw new Error('Phantom wallet must be connected for TAKARA payment. Your investment will be REJECTED without it!')
      }

      if (laikaAmountLKI > 0 && (!publicKey || !signTransaction)) {
        throw new Error('Phantom wallet must be connected for LAIKA boost')
      }

      // Step 1: Transfer USDT via MetaMask (Ethereum Mainnet)
      if (!ethAddress) {
        throw new Error('MetaMask address not available')
      }

      toast.info('Step 1/3: Transferring USDT via MetaMask (Ethereum Mainnet)...')

      // Get platform wallet address from environment
      const platformWalletETH = import.meta.env.VITE_PLATFORM_WALLET_ETH || ethAddress

      const result = await transferUSDT(platformWalletETH, usdtAmount)
      const usdtSignature = result.txHash

      toast.success('✓ USDT transferred successfully!')

      // Step 2: Transfer TAKARA if required (via Phantom/Solana)
      let stepNumber = 2
      if (calculation.investment.requiredTAKARA > 0) {
        const totalSteps = laikaAmountLKI > 0 ? 4 : 3
        toast.info(`Step ${stepNumber}/${totalSteps}: Transferring TAKARA via Phantom (Solana)...`)
        const platformWallet = solanaService.getPlatformWalletAddress()
        await solanaService.transferTAKARA(
          publicKey!,
          platformWallet,
          calculation.investment.requiredTAKARA,
          signTransaction!
        )
        toast.success('✓ TAKARA transferred successfully!')
        stepNumber++
      }

      // Step 3: Transfer LAIKA if boosting (via Phantom/Solana)
      if (laikaAmountLKI > 0) {
        const totalSteps = calculation.investment.requiredTAKARA > 0 ? 4 : 3
        toast.info(`Step ${stepNumber}/${totalSteps}: Transferring LKI via Phantom (Solana) for APY boost...`)
        const platformWallet = solanaService.getPlatformWalletAddress()
        await solanaService.transferLAIKA(
          publicKey!,
          platformWallet,
          laikaAmountLKI,
          signTransaction!
        )
        toast.success('✓ LKI boost transferred successfully!')
        stepNumber++
      }

      setTxSignature(usdtSignature)

      // Final Step: Create investment record and NFT on Solana
      const totalSteps = (calculation.investment.requiredTAKARA > 0 ? 1 : 0) + (laikaAmountLKI > 0 ? 1 : 0) + 2
      toast.info(`Step ${stepNumber}/${totalSteps}: Creating investment and minting NFT on Solana...`)
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
              {/* Payment Flow Information */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-400 mb-3">
                  💳 Payment Process
                </div>
                <div className="text-sm text-gray-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">1.</span>
                    <span><strong>USDT Payment</strong> via MetaMask (Ethereum Mainnet)</span>
                  </div>
                  {calculation.investment.requiredTAKARA > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold">2.</span>
                      <span><strong>TAKARA Payment</strong> via Phantom (Solana) - Required for this vault</span>
                    </div>
                  )}
                  {laikaAmountLKI > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold">{calculation.investment.requiredTAKARA > 0 ? '3' : '2'}.</span>
                      <span><strong>LKI Boost</strong> via Phantom (Solana) - Optional APY boost</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">{calculation.investment.requiredTAKARA > 0 ? (laikaAmountLKI > 0 ? '4' : '3') : (laikaAmountLKI > 0 ? '3' : '2')}.</span>
                    <span><strong>NFT Creation</strong> on Solana - Automatic</span>
                  </div>
                </div>
              </div>

              {/* Wallet Connection Status - CRITICAL WARNING */}
              {(!metaMaskConnected || (calculation.investment.requiredTAKARA > 0 && !publicKey)) && (
                <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4">
                  <div className="text-sm text-red-400 font-bold mb-3">
                    ⚠️ CRITICAL: Required Wallets Not Connected!
                  </div>
                  <div className="text-sm text-gray-300 space-y-2 mb-3">
                    <div className="text-red-300 font-medium">
                      You MUST connect these wallets BEFORE proceeding with payment:
                    </div>
                    {!metaMaskConnected && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">✗</span>
                        <span><strong>MetaMask</strong> - Required for USDT payment (${usdtAmount.toLocaleString()})</span>
                      </div>
                    )}
                    {calculation.investment.requiredTAKARA > 0 && !publicKey && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">✗</span>
                        <span><strong>Phantom</strong> - Required for TAKARA payment ({calculation.investment.requiredTAKARA.toLocaleString()} TAKARA)</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-red-500/20 border border-red-500/40 rounded p-3 text-xs text-red-300">
                    <strong>WARNING:</strong> If you pay USDT without connecting Phantom for TAKARA payment, your investment will be REJECTED and you may lose funds!
                  </div>
                </div>
              )}

              {/* Wallet Connection Status - Success */}
              {metaMaskConnected && (calculation.investment.requiredTAKARA === 0 || publicKey) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="text-sm text-green-400 font-medium mb-2">
                    ✓ All Required Wallets Connected
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>MetaMask connected - Ready for USDT payment</span>
                    </div>
                    {calculation.investment.requiredTAKARA > 0 && publicKey && (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span>Phantom connected - Ready for TAKARA payment</span>
                      </div>
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

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm text-blue-400 space-y-2">
                  <div>
                    <strong>📊 Vault Activation Process:</strong>
                  </div>
                  <div className="pl-4 space-y-1">
                    <div>• Vault must collect minimum <strong>$100,000 USDT</strong> in total investments</div>
                    <div>• After reaching this target, a <strong>72-hour countdown</strong> begins</div>
                    <div>• During pending period, you cannot withdraw</div>
                    <div>• Earnings start accruing after activation</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleInvest}
                disabled={
                  investMutation.isPending ||
                  !metaMaskConnected ||
                  (calculation.investment.requiredTAKARA > 0 && !publicKey)
                }
                className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 ${
                  !metaMaskConnected || (calculation.investment.requiredTAKARA > 0 && !publicKey)
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'btn-gold'
                }`}
              >
                {!metaMaskConnected || (calculation.investment.requiredTAKARA > 0 && !publicKey)
                  ? 'Connect Required Wallets First'
                  : 'Proceed to Transfer'}
                {metaMaskConnected && (calculation.investment.requiredTAKARA === 0 || publicKey) && (
                  <ArrowRight className="h-5 w-5" />
                )}
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
                  Your investment has been created successfully. It will be activated once the vault reaches $100,000 USDT and the 72-hour countdown completes.
                </p>
                {txSignature && (
                  <div className="bg-background-elevated rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-2">USDT Transaction Hash (Ethereum)</div>
                    <a
                      href={`https://etherscan.io/tx/${txSignature}`}
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
