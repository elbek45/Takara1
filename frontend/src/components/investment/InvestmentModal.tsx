import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowRight, Loader2, CheckCircle, Wallet } from 'lucide-react'
import { api } from '../../services/api'
import { solanaService } from '../../services/solana.service'
import { useTronLink } from '../../hooks/useTronLink'
import { toast } from 'sonner'
import type { InvestmentCalculation } from '../../types'

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  vaultId: string
  calculation: InvestmentCalculation
  usdtAmount: number
  laikaAmount: number
}

type Step = 'review' | 'transfer' | 'confirm' | 'success'

export default function InvestmentModal({
  isOpen,
  onClose,
  vaultId,
  calculation,
  usdtAmount,
  laikaAmount,
}: InvestmentModalProps) {
  const { publicKey, signTransaction } = useWallet()
  const { transferUSDT, isConnected: tronConnected, address: tronAddress, usdtBalance, trxBalance } = useTronLink()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('review')
  const [txSignature, setTxSignature] = useState<string>('')
  const [takaraBalance, setTakaraBalance] = useState<number>(0)
  const [laikaBalance, setLaikaBalance] = useState<number>(0)
  const [solBalance, setSolBalance] = useState<number>(0)

  // Fetch Solana balances when wallet is connected
  useEffect(() => {
    const fetchSolanaBalances = async () => {
      if (publicKey) {
        try {
          const [takara, laika, sol] = await Promise.all([
            solanaService.getTAKARABalance(publicKey),
            solanaService.getLAIKABalance(publicKey),
            solanaService.getBalance(publicKey),
          ])
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
      // Critical validation: Check all required wallets are connected
      if (!tronConnected) {
        throw new Error('TronLink/Trust Wallet must be connected for USDT payment (TRON network)')
      }

      if (calculation.investment.requiredTAKARA > 0 && (!publicKey || !signTransaction)) {
        throw new Error('Phantom wallet must be connected for TAKARA payment. Your investment will be REJECTED without it!')
      }

      if (laikaAmount > 0 && (!publicKey || !signTransaction)) {
        throw new Error('Phantom wallet must be connected for LAIKA boost')
      }

      // Step 1: Transfer USDT via TronLink/Trust Wallet (TRON Network)
      if (!tronAddress) {
        throw new Error('TRON wallet address not available')
      }

      toast.info('Step 1/3: Transferring USDT via TronLink (TRON Network)...')

      // Transfer USDT on TRON network
      const result = await transferUSDT(usdtAmount.toString())
      const usdtSignature = result.hash

      toast.success('✓ USDT transferred successfully!')

      // Step 2: Transfer TAKARA if required (via Phantom/Solana)
      let stepNumber = 2
      if (calculation.investment.requiredTAKARA > 0) {
        const totalSteps = laikaAmount > 0 ? 4 : 3
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
      if (laikaAmount > 0) {
        const totalSteps = calculation.investment.requiredTAKARA > 0 ? 4 : 3
        toast.info(`Step ${stepNumber}/${totalSteps}: Transferring LAIKA via Phantom (Solana) for APY boost...`)
        const platformWallet = solanaService.getPlatformWalletAddress()
        await solanaService.transferLAIKA(
          publicKey!,
          platformWallet,
          laikaAmount,
          signTransaction!
        )
        toast.success('✓ LAIKA boost transferred successfully!')
        stepNumber++
      }

      setTxSignature(usdtSignature)

      // Final Step: Create investment record and Wexel on Solana
      const totalSteps = (calculation.investment.requiredTAKARA > 0 ? 1 : 0) + (laikaAmount > 0 ? 1 : 0) + 2
      toast.info(`Step ${stepNumber}/${totalSteps}: Creating investment and minting Wexel on Solana...`)
      const response = await api.createInvestment({
        vaultId,
        usdtAmount,
        takaraAmount: calculation.investment.requiredTAKARA,
        laikaBoost: laikaAmount > 0
          ? {
              laikaAmount: laikaAmount,
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
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/40 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">💳</span>
                  <div className="text-lg font-bold text-blue-400">
                    2-Step Payment Process
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Step 1: USDT */}
                  <div className="bg-black/20 rounded-lg p-4 border border-gold-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center font-bold text-lg">1</div>
                      <div className="font-bold text-white text-base">USDT Payment (TronLink/Trust Wallet)</div>
                    </div>
                    <div className="pl-11 space-y-1 text-sm">
                      <div className="text-gray-300">Network: <span className="text-red-400 font-medium">TRON Network</span></div>
                      <div className="text-gray-300">Amount: <span className="text-gold-500 font-bold">${usdtAmount.toLocaleString()} USDT</span></div>
                      <div className="text-gray-400 text-xs italic">Main investment deposit</div>
                    </div>
                  </div>

                  {/* Step 2: TAKARA + LAIKA */}
                  <div className="bg-black/20 rounded-lg p-4 border border-green-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-black rounded-full flex items-center justify-center font-bold text-lg">2</div>
                      <div className="font-bold text-white text-base">TAKARA + LAIKA (Phantom)</div>
                    </div>
                    <div className="pl-11 space-y-2 text-sm">
                      <div className="text-gray-300">Network: <span className="text-purple-400 font-medium">Solana</span></div>
                      {calculation.investment.requiredTAKARA > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                          <div className="text-green-400 font-medium">✓ TAKARA Required: <span className="font-bold">{calculation.investment.requiredTAKARA.toLocaleString()} TAKARA</span></div>
                        </div>
                      )}
                      {laikaAmount > 0 && (
                        <div className="bg-laika-purple/10 border border-laika-purple/20 rounded p-2">
                          <div className="text-laika-purple font-medium">🚀 LAIKA Boost: <span className="font-bold">{laikaAmount.toLocaleString()} LAIKA</span></div>
                          <div className="text-laika-green text-xs">Extra APY: +{calculation.earnings.laikaBoostAPY}%</div>
                        </div>
                      )}
                      {!calculation.investment.requiredTAKARA && !laikaAmount && (
                        <div className="text-gray-400 text-xs italic">No TAKARA or LAIKA required for this investment</div>
                      )}
                    </div>
                  </div>

                  {/* Auto Wexel */}
                  <div className="bg-purple-500/10 rounded p-3 text-center">
                    <div className="text-sm text-purple-400">
                      ✨ <strong>Investment Wexel</strong> will be minted automatically after payment
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Connection Status - CRITICAL WARNING */}
              {(!tronConnected || (calculation.investment.requiredTAKARA > 0 && !publicKey)) && (
                <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4">
                  <div className="text-sm text-red-400 font-bold mb-3">
                    ⚠️ CRITICAL: Required Wallets Not Connected!
                  </div>
                  <div className="text-sm text-gray-300 space-y-2 mb-3">
                    <div className="text-red-300 font-medium">
                      You MUST connect these wallets BEFORE proceeding with payment:
                    </div>
                    {!tronConnected && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">✗</span>
                        <span><strong>TronLink/Trust Wallet</strong> - Required for USDT payment (${usdtAmount.toLocaleString()})</span>
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
                    <strong>WARNING:</strong> Connect all required wallets before proceeding. Your investment may fail without proper wallet connections!
                  </div>
                </div>
              )}

              {/* Wallet Connection Status - Success with Balances */}
              {tronConnected && (calculation.investment.requiredTAKARA === 0 || publicKey) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-green-400 font-medium mb-3">
                    <Wallet className="h-4 w-4" />
                    <span>Connected Wallets & Balances</span>
                  </div>
                  <div className="space-y-3">
                    {/* TRON Wallet */}
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300 flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          TronLink (TRON)
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {tronAddress?.slice(0, 6)}...{tronAddress?.slice(-4)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-gold-500/10 rounded px-2 py-1">
                          <span className="text-gray-400">USDT: </span>
                          <span className={`font-bold ${parseFloat(usdtBalance) >= usdtAmount ? 'text-green-400' : 'text-red-400'}`}>
                            {usdtBalance}
                          </span>
                        </div>
                        <div className="bg-gray-500/10 rounded px-2 py-1">
                          <span className="text-gray-400">TRX: </span>
                          <span className="text-white font-bold">{trxBalance}</span>
                        </div>
                      </div>
                      {parseFloat(usdtBalance) < usdtAmount && (
                        <div className="text-xs text-red-400 mt-2">
                          ⚠️ Insufficient USDT! Need {usdtAmount}, have {usdtBalance}
                        </div>
                      )}
                    </div>

                    {/* Solana Wallet */}
                    {publicKey && (
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-300 flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            Phantom (Solana)
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-green-500/10 rounded px-2 py-1">
                            <span className="text-gray-400">TAKARA: </span>
                            <span className={`font-bold ${takaraBalance >= (calculation.investment.requiredTAKARA || 0) ? 'text-green-400' : 'text-red-400'}`}>
                              {takaraBalance.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-purple-500/10 rounded px-2 py-1">
                            <span className="text-gray-400">LAIKA: </span>
                            <span className={`font-bold ${laikaBalance >= laikaAmount ? 'text-green-400' : 'text-red-400'}`}>
                              {laikaBalance.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-gray-500/10 rounded px-2 py-1">
                            <span className="text-gray-400">SOL: </span>
                            <span className="text-white font-bold">{solBalance.toFixed(4)}</span>
                          </div>
                        </div>
                        {calculation.investment.requiredTAKARA > 0 && takaraBalance < calculation.investment.requiredTAKARA && (
                          <div className="text-xs text-red-400 mt-2">
                            ⚠️ Insufficient TAKARA! Need {calculation.investment.requiredTAKARA}, have {takaraBalance}
                          </div>
                        )}
                        {laikaAmount > 0 && laikaBalance < laikaAmount && (
                          <div className="text-xs text-red-400 mt-2">
                            ⚠️ Insufficient LAIKA! Need {laikaAmount}, have {laikaBalance}
                          </div>
                        )}
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

              {laikaAmount > 0 && (
                <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-4">
                  <div className="text-sm text-laika-purple font-medium mb-2">
                    🚀 LAIKA Boost
                  </div>
                  <div className="space-y-3">
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

                    <div className="text-xs text-gray-400 italic">
                      💡 LAIKA tokens will be returned at the end of your vault term
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
                    <div>• Vault must reach its target capacity to activate</div>
                    <div>• Earnings start accruing after activation</div>
                    <div>• Payouts according to vault schedule</div>
                  </div>
                </div>
              </div>

              {(() => {
                const hasInsufficientUSDT = parseFloat(usdtBalance) < usdtAmount
                const hasInsufficientTAKARA = calculation.investment.requiredTAKARA > 0 && takaraBalance < calculation.investment.requiredTAKARA
                const hasInsufficientLAIKA = laikaAmount > 0 && laikaBalance < laikaAmount
                const walletsNotConnected = !tronConnected || (calculation.investment.requiredTAKARA > 0 && !publicKey)
                const isDisabled = investMutation.isPending || walletsNotConnected || hasInsufficientUSDT || hasInsufficientTAKARA || hasInsufficientLAIKA

                let buttonText = 'Proceed to Transfer'
                if (walletsNotConnected) buttonText = 'Connect Required Wallets First'
                else if (hasInsufficientUSDT) buttonText = 'Insufficient USDT Balance'
                else if (hasInsufficientTAKARA) buttonText = 'Insufficient TAKARA Balance'
                else if (hasInsufficientLAIKA) buttonText = 'Insufficient LAIKA Balance'

                return (
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
                )
              })()}
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
                    <div className="text-sm text-gray-400 mb-2">USDT Transaction Hash (TRON)</div>
                    <a
                      href={`https://shasta.tronscan.org/#/transaction/${txSignature}`}
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
