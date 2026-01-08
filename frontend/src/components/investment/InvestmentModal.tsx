import { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowRight, Loader2, CheckCircle, Wallet } from 'lucide-react'
import { api } from '../../services/api'
import { solanaService } from '../../services/solana.service'
import { toast } from 'sonner'
import type { InvestmentCalculation, PaymentMethod } from '../../types'

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  vaultId: string
  calculation: InvestmentCalculation
  usdtAmount: number
  laikaAmount: number
  acceptedPayments?: string // "USDT", "TAKARA", "USDT,TAKARA" etc.
}

type Step = 'review' | 'transfer' | 'confirm' | 'success'

export default function InvestmentModal({
  isOpen,
  onClose,
  vaultId,
  calculation,
  usdtAmount,
  laikaAmount,
  acceptedPayments = 'USDT,TAKARA',
}: InvestmentModalProps) {
  const { publicKey, sendTransaction } = useWallet()

  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('review')
  const [txSignature, setTxSignature] = useState<string>('')
  const [usdtBalance, setUsdtBalance] = useState<number>(0)
  const [takaraBalance, setTakaraBalance] = useState<number>(0)
  const [laikaBalance, setLaikaBalance] = useState<number>(0)
  const [solBalance, setSolBalance] = useState<number>(0)

  // Parse accepted payment methods
  const availablePayments = useMemo(() => {
    const methods = acceptedPayments.split(',').map(m => m.trim().toUpperCase())
    return {
      usdt: methods.includes('USDT'),
      takara: methods.includes('TAKARA'),
    }
  }, [acceptedPayments])

  // Payment method state with explicit union type
  const [paymentMethod, setPaymentMethod] = useState<'USDT' | 'TAKARA'>(
    availablePayments.usdt ? 'USDT' : 'TAKARA'
  )

  // Fetch Solana balances when wallet is connected
  useEffect(() => {
    const fetchSolanaBalances = async () => {
      if (publicKey) {
        try {
          const [usdt, takara, laika, sol] = await Promise.all([
            solanaService.getUSDTBalance(publicKey),
            solanaService.getTAKARABalance(publicKey),
            solanaService.getLAIKABalance(publicKey),
            solanaService.getBalance(publicKey),
          ])
          setUsdtBalance(usdt)
          setTakaraBalance(takara)
          setLaikaBalance(laika)
          setSolBalance(sol)
        } catch (error) {
          console.error('Failed to fetch Solana balances:', error)
        }
      }
    }
    fetchSolanaBalances()
  }, [publicKey])

  const investMutation = useMutation({
    mutationFn: async () => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Phantom wallet must be connected')
      }

      let paymentSignature: string
      const platformWallet = solanaService.getPlatformWalletAddress()

      if (paymentMethod === 'USDT') {
        // USDT payment via Phantom (Solana)
        toast.info('Step 1/2: Transferring USDT via Phantom...')
        paymentSignature = await solanaService.transferUSDT(
          publicKey,
          platformWallet,
          usdtAmount,
          sendTransaction
        )
        toast.success('USDT transferred successfully!')

        // If TAKARA is also required for this vault
        if (calculation.investment.requiredTAKARA > 0) {
          toast.info('Step 2/2: Transferring TAKARA via Phantom...')
          await solanaService.transferTAKARA(
            publicKey,
            platformWallet,
            calculation.investment.requiredTAKARA,
            sendTransaction
          )
          toast.success('TAKARA transferred successfully!')
        }
      } else {
        // TAKARA payment via Phantom (Solana)
        const takaraPaymentAmount = calculation.investment.requiredTAKARA || usdtAmount
        if (takaraPaymentAmount > 0) {
          toast.info('Step 1/2: Transferring TAKARA via Phantom...')
          const result = await solanaService.transferTAKARA(
            publicKey,
            platformWallet,
            takaraPaymentAmount,
            sendTransaction
          )
          paymentSignature = result || `takara-${Date.now()}`
          toast.success('TAKARA transferred successfully!')
        } else {
          paymentSignature = `investment-${Date.now()}`
        }
      }

      // Transfer LAIKA if boosting (always via Phantom)
      console.log('🔍 LAIKA boost check:', { laikaAmount, hasPublicKey: !!publicKey, hasSendTransaction: !!sendTransaction })
      if (laikaAmount > 0) {
        if (!publicKey || !sendTransaction) {
          throw new Error('Phantom wallet must be connected for LAIKA boost')
        }
        console.log('📤 Starting LAIKA transfer:', { laikaAmount, platformWallet: solanaService.getPlatformWalletAddress().toBase58() })
        toast.info('Transferring LAIKA for APY boost...')
        const platformWallet = solanaService.getPlatformWalletAddress()
        try {
          const laikaTxSignature = await solanaService.transferLAIKA(
            publicKey,
            platformWallet,
            laikaAmount,
            sendTransaction
          )
          console.log('✅ LAIKA transfer successful:', laikaTxSignature)
          toast.success('LAIKA boost transferred successfully!')
        } catch (laikaError) {
          console.error('❌ LAIKA transfer failed:', laikaError)
          throw laikaError // Re-throw to fail the whole mutation
        }
      } else {
        console.log('⏭️ Skipping LAIKA transfer: laikaAmount is 0')
      }

      setTxSignature(paymentSignature)

      // Create investment record
      toast.info('Creating investment and minting Wexel...')
      const response = await api.createInvestment({
        vaultId,
        usdtAmount,
        takaraAmount: calculation.investment.requiredTAKARA,
        laikaBoost: laikaAmount > 0
          ? {
              laikaAmount: laikaAmount,
              laikaValueUSD: calculation.investment.laikaValueUSD || 0,
            }
          : undefined,
        txSignature: paymentSignature,
        paymentMethod,
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
      toast.error(error.response?.data?.message || error.message || 'Investment failed')
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

  // Calculate requirements
  const takaraRequired = paymentMethod === 'TAKARA'
    ? (calculation.investment.requiredTAKARA || usdtAmount)
    : calculation.investment.requiredTAKARA || 0

  const hasInsufficientUSDT = paymentMethod === 'USDT' && usdtBalance < usdtAmount
  const hasInsufficientTAKARA = takaraRequired > 0 && takaraBalance < takaraRequired
  const hasInsufficientLAIKA = laikaAmount > 0 && laikaBalance < laikaAmount

  // Wallet requirements - all payments via Phantom now
  const missingPhantom = !publicKey

  const isDisabled = investMutation.isPending || missingPhantom || hasInsufficientUSDT || hasInsufficientTAKARA || hasInsufficientLAIKA

  let buttonText = `Proceed to Transfer (${paymentMethod})`
  if (missingPhantom) buttonText = 'Connect Phantom Wallet First'
  else if (hasInsufficientUSDT) buttonText = 'Insufficient USDT Balance'
  else if (hasInsufficientTAKARA) buttonText = 'Insufficient TAKARA Balance'
  else if (hasInsufficientLAIKA) buttonText = 'Insufficient LAIKA Balance'

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
              {/* Payment Method Selector */}
              <div className="bg-gradient-to-br from-gold-500/10 to-blue-500/10 border-2 border-gold-500/40 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">💰</span>
                  <div className="text-lg font-bold text-gold-400">
                    Select Payment Method
                  </div>
                </div>

                <div className={`grid gap-3 mb-4 ${
                  availablePayments.usdt && availablePayments.takara ? 'grid-cols-2' : 'grid-cols-1'
                }`}>
                  {/* USDT Option */}
                  {availablePayments.usdt && (
                    <button
                      onClick={() => setPaymentMethod('USDT')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'USDT'
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 bg-black/20 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">💵</div>
                        <div className={`font-bold ${paymentMethod === 'USDT' ? 'text-blue-400' : 'text-gray-300'}`}>
                          USDT
                        </div>
                        <div className="text-sm text-gray-400">
                          ${usdtAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          via Phantom (Solana)
                        </div>
                      </div>
                    </button>
                  )}

                  {/* TAKARA Option */}
                  {availablePayments.takara && (
                    <button
                      onClick={() => setPaymentMethod('TAKARA')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'TAKARA'
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-gray-600 bg-black/20 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">🟢</div>
                        <div className={`font-bold ${paymentMethod === 'TAKARA' ? 'text-green-400' : 'text-gray-300'}`}>
                          TAKARA
                        </div>
                        <div className="text-sm text-gray-400">
                          {(calculation.investment.requiredTAKARA || usdtAmount).toLocaleString()} TAKARA
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          via Phantom
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3 text-sm text-purple-300">
                  <strong>Note:</strong> All payments via Phantom wallet on Solana network.
                </div>
              </div>

              {/* LAIKA Boost Info */}
              {laikaAmount > 0 && (
                <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-4">
                  <div className="text-sm text-laika-purple font-medium mb-2">
                    LAIKA Boost (via Phantom)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">LAIKA Amount</div>
                      <div className="text-white font-semibold">
                        {laikaAmount.toLocaleString()} LAIKA
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

              {/* Wallet Connection Status */}
              {missingPhantom && (
                <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4">
                  <div className="text-sm text-red-400 font-bold mb-2">
                    Phantom Wallet Not Connected
                  </div>
                  <div className="text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">✗</span>
                      <span><strong>Phantom</strong> - Required for all payments on Solana</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected Wallet & Balances */}
              {!missingPhantom && publicKey && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-green-400 font-medium mb-3">
                    <Wallet className="h-4 w-4" />
                    <span>Connected Wallet</span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="text-sm text-gray-300">Phantom</span>
                      <span className="text-xs text-gray-500">{publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {paymentMethod === 'USDT' && (
                        <div className="bg-blue-500/10 rounded px-2 py-1">
                          <span className="text-gray-400 text-sm">USDT: </span>
                          <span className={`font-bold text-sm ${usdtBalance >= usdtAmount ? 'text-green-400' : 'text-red-400'}`}>
                            {usdtBalance.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="bg-green-500/10 rounded px-2 py-1">
                        <span className="text-gray-400 text-sm">TAKARA: </span>
                        <span className={`font-bold text-sm ${takaraBalance >= takaraRequired ? 'text-green-400' : 'text-red-400'}`}>
                          {takaraBalance.toLocaleString()}
                        </span>
                      </div>
                      {laikaAmount > 0 && (
                        <div className="bg-purple-500/10 rounded px-2 py-1">
                          <span className="text-gray-400 text-sm">LAIKA: </span>
                          <span className={`font-bold text-sm ${laikaBalance >= laikaAmount ? 'text-green-400' : 'text-red-400'}`}>
                            {laikaBalance.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="bg-gray-500/10 rounded px-2 py-1">
                        <span className="text-gray-400 text-sm">SOL: </span>
                        <span className="text-white text-sm font-bold">{solBalance.toFixed(4)}</span>
                      </div>
                    </div>
                    {hasInsufficientUSDT && (
                      <div className="text-xs text-red-400 mt-2">
                        Insufficient USDT! Need ${usdtAmount.toLocaleString()}, have ${usdtBalance.toFixed(2)}
                      </div>
                    )}
                    {hasInsufficientTAKARA && (
                      <div className="text-xs text-red-400 mt-2">
                        Insufficient TAKARA! Need {takaraRequired.toLocaleString()}, have {takaraBalance.toLocaleString()}
                      </div>
                    )}
                    {hasInsufficientLAIKA && (
                      <div className="text-xs text-red-400 mt-2">
                        Insufficient LAIKA! Need {laikaAmount.toLocaleString()}, have {laikaBalance.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Investment Summary */}
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
                    <div className="text-sm text-gray-400">Investment</div>
                    <div className="text-white font-medium">
                      {paymentMethod === 'USDT'
                        ? `$${usdtAmount.toLocaleString()} USDT`
                        : `${takaraRequired.toLocaleString()} TAKARA`
                      }
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

              {/* Expected Returns */}
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

              {/* Submit Button */}
              <button
                onClick={handleInvest}
                disabled={isDisabled}
                className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 ${
                  isDisabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'btn-gold'
                }`}
              >
                {buttonText}
                {!isDisabled && <ArrowRight className="h-5 w-5" />}
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
                  Your investment has been created successfully. Earnings will start accruing once the vault is activated.
                </p>
                {txSignature && (
                  <div className="bg-background-elevated rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-2">
                      Transaction Signature
                    </div>
                    <span className="text-green-400 text-sm break-all">
                      {txSignature}
                    </span>
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
