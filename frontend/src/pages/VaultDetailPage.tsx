import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../services/api'
import { ArrowLeft, TrendingUp, Coins, Calendar, DollarSign } from 'lucide-react'
import InvestmentModal from '../components/investment/InvestmentModal'
import { useAuth } from '../hooks/useAuth'

export default function VaultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { connected } = useWallet()
  const { isAuthenticated } = useAuth()
  const [usdtAmount, setUsdtAmount] = useState<string>('')
  const [laikaBoostUSD, setLaikaBoostUSD] = useState<number>(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: vaultResponse, isLoading: vaultLoading } = useQuery({
    queryKey: ['vault', id],
    queryFn: () => api.getVaultById(id!),
    enabled: !!id,
  })

  const vault = vaultResponse?.data?.vault

  const { data: calculationResponse, isLoading: calculating } = useQuery({
    queryKey: ['calculate', id, usdtAmount, laikaBoostUSD],
    queryFn: () =>
      api.calculateInvestment(id!, {
        usdtAmount: parseFloat(usdtAmount),
        laikaBoostUSD: laikaBoostUSD > 0 ? laikaBoostUSD : undefined,
      }),
    enabled: !!id && !!usdtAmount && parseFloat(usdtAmount) > 0,
  })

  const calculation = calculationResponse?.data

  const maxLaikaBoost = usdtAmount ? parseFloat(usdtAmount) * 0.9 : 0

  if (vaultLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!vault) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Vault not found</p>
          <button
            onClick={() => navigate('/vaults')}
            className="btn-outline-gold px-6 py-2 rounded-lg"
          >
            Back to Vaults
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/vaults')}
          className="flex items-center gap-2 text-gray-400 hover:text-gold-400 mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Vaults
        </button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Vault Info */}
          <div className="space-y-6">
            <div className="bg-background-card rounded-xl p-8 border border-green-900/20">
              <div className={`tier-${vault.tier.toLowerCase()} inline-block mb-4`}>
                {vault.tier}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{vault.name}</h1>
              <p className="text-gray-400 mb-6">{vault.duration} Months Lock-up Period</p>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-gold-500" />
                    <span className="text-sm text-gray-400">Base APY</span>
                  </div>
                  <div className="text-2xl font-bold text-gold-500">{vault.baseAPY}%</div>
                </div>

                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-gradient-gold" />
                    <span className="text-sm text-gray-400">Max APY</span>
                  </div>
                  <div className="text-2xl font-bold text-gradient-gold">{vault.maxAPY}%</div>
                </div>

                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-5 w-5 text-green-400" />
                    <span className="text-sm text-gray-400">Mining Power</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{vault.miningPower}</div>
                </div>

                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Payouts</span>
                  </div>
                  <div className="text-sm font-medium text-white">
                    {vault.payoutSchedule.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Investment Range */}
              <div className="mt-6 p-4 bg-background-elevated rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-gold-500" />
                  <span className="text-sm font-medium text-gray-300">Investment Range</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500">Minimum</div>
                    <div className="text-lg font-bold text-white">
                      ${vault.minInvestment.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-gray-600">—</div>
                  <div>
                    <div className="text-xs text-gray-500">Maximum</div>
                    <div className="text-lg font-bold text-white">
                      ${vault.maxInvestment.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* TAKARA Requirement */}
              {vault.requireTAKARA && vault.takaraRatio && (
                <div className="mt-6 p-4 bg-green-900/10 border border-green-900/30 rounded-lg">
                  <div className="text-sm text-green-400 font-medium mb-1">
                    TAKARA Required
                  </div>
                  <div className="text-gray-300">
                    {vault.takaraRatio}:1 ratio (${vault.takaraRatio} TAKARA per $1 USDT)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Investment Calculator */}
          <div className="space-y-6">
            <div className="bg-background-card rounded-xl p-8 border border-green-900/20">
              <h2 className="text-2xl font-bold text-white mb-6">Investment Calculator</h2>

              {/* USDT Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  USDT Amount
                </label>
                <input
                  type="number"
                  value={usdtAmount}
                  onChange={(e) => setUsdtAmount(e.target.value)}
                  placeholder={`Min: ${vault.minInvestment}`}
                  min={vault.minInvestment}
                  max={vault.maxInvestment}
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* LAIKA Boost Slider */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    LAIKA Boost (Optional)
                  </label>
                  <span className="text-sm text-gold-500 font-medium">
                    ${laikaBoostUSD.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxLaikaBoost}
                  step="100"
                  value={laikaBoostUSD}
                  onChange={(e) => setLaikaBoostUSD(parseFloat(e.target.value))}
                  disabled={!usdtAmount || parseFloat(usdtAmount) === 0}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$0</span>
                  <span>Max: ${maxLaikaBoost.toFixed(2)} (90% of USDT)</span>
                </div>
              </div>

              {/* Calculation Results */}
              {calculating && (
                <div className="text-center py-8">
                  <div className="loading-spinner mx-auto mb-2"></div>
                  <p className="text-sm text-gray-400">Calculating...</p>
                </div>
              )}

              {calculation && !calculating && (
                <div className="space-y-4">
                  {/* Final APY */}
                  <div className="p-4 bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Your Final APY</div>
                    <div className="text-3xl font-bold text-gradient-gold">
                      {calculation.earnings.finalAPY}%
                    </div>
                    {calculation.earnings.laikaBoostAPY > 0 && (
                      <div className="text-sm text-green-400 mt-1">
                        +{calculation.earnings.laikaBoostAPY}% from LAIKA boost
                      </div>
                    )}
                  </div>

                  {/* Earnings Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-background-elevated rounded-lg">
                      <span className="text-gray-400">Total USDT Earnings</span>
                      <span className="text-white font-semibold">
                        ${calculation.earnings.totalUSDT.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-background-elevated rounded-lg">
                      <span className="text-gray-400">Payout Amount</span>
                      <span className="text-white font-semibold">
                        ${calculation.earnings.payoutAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-background-elevated rounded-lg">
                      <span className="text-gray-400">Number of Payouts</span>
                      <span className="text-white font-semibold">
                        {calculation.earnings.numberOfPayouts}
                      </span>
                    </div>
                  </div>

                  {/* TAKARA Mining */}
                  <div className="p-4 bg-green-900/10 border border-green-900/30 rounded-lg">
                    <div className="text-sm text-green-400 font-medium mb-3">
                      TAKARA Mining Projection
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Daily</span>
                        <span className="text-white font-medium">
                          {calculation.mining.dailyTAKARA.toFixed(4)} TAKARA
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Monthly</span>
                        <span className="text-white font-medium">
                          {calculation.mining.monthlyTAKARA.toFixed(2)} TAKARA
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total</span>
                        <span className="text-green-400 font-bold">
                          {calculation.mining.totalTAKARA.toFixed(2)} TAKARA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Total ROI</div>
                    <div className="text-2xl font-bold text-gold-500">
                      {calculation.summary.roi}
                    </div>
                  </div>

                  {/* Invest Button */}
                  {!connected ? (
                    <div className="text-center py-4 text-gray-400">
                      Please connect your wallet to invest
                    </div>
                  ) : !isAuthenticated ? (
                    <div className="text-center py-4 text-gray-400">
                      Authenticating...
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="btn-gold w-full py-4 rounded-lg font-semibold text-lg"
                    >
                      Invest Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Modal */}
      {calculation && (
        <InvestmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          vaultId={id!}
          calculation={calculation}
          usdtAmount={parseFloat(usdtAmount)}
          laikaBoostUSD={laikaBoostUSD}
        />
      )}
    </div>
  )
}
