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
  const [boostToken, setBoostToken] = useState<'LAIKA' | 'TAKARA'>('LAIKA')
  const [laikaAmount, setLaikaAmount] = useState<number>(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: vaultResponse, isLoading: vaultLoading } = useQuery({
    queryKey: ['vault', id],
    queryFn: () => api.getVaultById(id!),
    enabled: !!id,
  })

  const vault = vaultResponse?.data?.vault

  // Fetch LAIKA price on page load (v2.7) - refetch when laikaAmount changes
  const { data: laikaPriceResponse, isFetching: laikaPriceFetching, refetch: refetchLaikaPrice } = useQuery({
    queryKey: ['laikaPrice'],
    queryFn: () => api.getLaikaPrice(),
    staleTime: 30 * 1000, // 30 seconds (shorter for more frequent updates)
    refetchInterval: 60 * 1000, // Refresh every 1 minute
  })

  // Handler to update LAIKA amount and refresh price
  const handleLaikaAmountChange = (newAmount: number) => {
    setLaikaAmount(newAmount)
    // Refresh price when amount changes
    refetchLaikaPrice()
  }

  const { data: calculationResponse, isLoading: calculating } = useQuery({
    queryKey: ['calculate', id, usdtAmount, laikaAmount],
    queryFn: () =>
      // @ts-ignore - Type definitions need updating
      api.calculateInvestment(id!, {
        usdtAmount: parseFloat(usdtAmount),
        // @ts-ignore - Type definitions need updating
        laikaAmount: laikaAmount > 0 ? laikaAmount : undefined,
      }),
    enabled: !!id && !!usdtAmount && parseFloat(usdtAmount) > 0,
  })

  const calculation = calculationResponse?.data

  // Calculate max LAIKA based on 50% of USDT amount
  // Platform values LAIKA 50% HIGHER (boost = market * 1.5)
  // So users need LESS LAIKA: to get $X boost, need $X/1.5 market value
  // @ts-ignore - Type definitions need updating
  const laikaToUsdtRate = calculation?.investment?.laikaPrice || laikaPriceResponse?.data?.price || 0.0000007
  const maxLaikaBoostUSD = usdtAmount ? parseFloat(usdtAmount) * 0.5 : 0
  // Platform values LAIKA 50% higher, so need less market value: divide by 1.5
  const maxLaikaMarketValueUSD = maxLaikaBoostUSD / 1.5
  const maxLaikaBoost = laikaToUsdtRate > 0 ? maxLaikaMarketValueUSD / laikaToUsdtRate : 0

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
                    <span className="text-sm text-gray-400">TAKARA APY</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{vault.baseTakaraAPY}% → {vault.maxTakaraAPY}%</div>
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

              {/* Total Return Highlight */}
              <div className="mt-4 p-4 bg-gradient-to-r from-gold-500/20 to-gold-600/10 border border-gold-500/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Total Return ({vault.duration}M)</div>
                    <div className="text-xs text-gray-500">APY × Duration</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gold-400">
                      {(vault.baseAPY * vault.duration / 12).toFixed(0)}% → {(vault.maxAPY * vault.duration / 12).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Range */}
              <div className="mt-6 p-4 bg-background-elevated rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-gold-500" />
                  <span className="text-sm font-medium text-gray-300">Minimum Investment</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="text-2xl font-bold text-white">
                    ${vault.minInvestment.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    No maximum limit
                  </div>
                </div>
              </div>

              {/* TAKARA Requirement */}
              {vault.requireTAKARA && vault.takaraRatio && (
                <div className="mt-6 p-4 bg-green-900/10 border border-green-900/30 rounded-lg">
                  <div className="text-sm text-green-400 font-medium mb-1">
                    ⚡ TAKARA Required
                  </div>
                  <div className="text-gray-300 text-sm">
                    <span className="font-semibold text-gold-400">{vault.takaraRatio} TAKARA</span> per <span className="font-semibold">$100 USDT</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Example: $1,000 investment requires {(vault.takaraRatio * 10).toLocaleString()} TAKARA tokens
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Investment Calculator */}
          <div className="space-y-6">
            {/* 2-Step Payment Process Info */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💳</span>
                </div>
                <h3 className="text-lg font-bold text-white">2-Step Payment Process</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-gold-500 text-black rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <div className="font-semibold text-white">USDT Payment (Phantom - Ethereum)</div>
                    <div className="text-gray-400">Main investment amount via Phantom wallet</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-black rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <div className="font-semibold text-white">TAKARA + LAIKA (Phantom - Solana)</div>
                    <div className="text-gray-400">
                      {vault.requireTAKARA ? 'Required TAKARA tokens' : 'No TAKARA required'} + optional LAIKA boost for extra APY
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                  placeholder={`Min: ${vault.minInvestment} (no max limit)`}
                  min={vault.minInvestment}
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 focus:border-gold-500 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                />
                {usdtAmount && parseFloat(usdtAmount) < vault.minInvestment && parseFloat(usdtAmount) > 0 && (
                  <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      Minimum investment is <strong>${vault.minInvestment.toLocaleString()} USDT</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Boost Token Selector */}
              <div className="mb-4">
                <label className="text-sm font-semibold text-white mb-3 block">
                  Choose Boost Token (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBoostToken('LAIKA')
                      handleLaikaAmountChange(0)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      boostToken === 'LAIKA'
                        ? 'bg-laika-purple/20 border-laika-purple shadow-lg shadow-laika-purple/20'
                        : 'bg-background-elevated border-gray-700 hover:border-laika-purple/50'
                    }`}
                  >
                    <div className="text-lg font-bold text-laika-purple mb-1">🐕 LAIKA</div>
                    <div className="text-xs text-gray-400">Dog-themed meme token</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBoostToken('TAKARA')
                      handleLaikaAmountChange(0)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      boostToken === 'TAKARA'
                        ? 'bg-gold/20 border-gold shadow-lg shadow-gold/20'
                        : 'bg-background-elevated border-gray-700 hover:border-gold/50'
                    }`}
                  >
                    <div className="text-lg font-bold text-gold mb-1">💎 TAKARA</div>
                    <div className="text-xs text-gray-400">Platform native token</div>
                  </button>
                </div>
              </div>

              {/* Boost Amount Input */}
              <div className="mb-6">
                <div className={`border rounded-lg p-4 ${
                  boostToken === 'LAIKA'
                    ? 'bg-gradient-laika/10 border-laika-purple/30'
                    : 'bg-gold/5 border-gold/30'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <label className={`text-sm font-bold flex items-center gap-2 ${
                      boostToken === 'LAIKA' ? 'text-laika-purple' : 'text-gold'
                    }`}>
                      <span className="text-lg">🚀</span>
                      {boostToken} Boost (Optional)
                    </label>
                    <div className="text-right">
                      <span className={`text-lg font-bold block ${
                        boostToken === 'LAIKA' ? 'text-laika-purple' : 'text-gold'
                      }`}>
                        {laikaAmount.toLocaleString()} {boostToken}
                      </span>
                      <span className="text-xs text-gray-400">
                        ≈ ${(laikaAmount * (calculation?.investment?.laikaPrice || laikaToUsdtRate)).toFixed(2)} USDT
                      </span>
                    </div>
                  </div>

                  {/* Input Field */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-400 mb-2">
                      {boostToken} Amount (Max: {maxLaikaBoost.toLocaleString()} {boostToken})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={maxLaikaBoost}
                      step="100"
                      value={laikaAmount || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        handleLaikaAmountChange(Math.min(value, maxLaikaBoost))
                      }}
                      placeholder={`Enter ${boostToken} amount (0 for no boost)`}
                      disabled={!usdtAmount || parseFloat(usdtAmount) === 0}
                      className={`w-full px-4 py-3 bg-background-elevated border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                        boostToken === 'LAIKA'
                          ? 'border-laika-purple/30 focus:border-laika-purple'
                          : 'border-gold/30 focus:border-gold'
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter 0 for no boost, or up to {maxLaikaBoost.toLocaleString()} {boostToken} for maximum boost
                    </p>

                    {/* Max Boost Button */}
                    <button
                      onClick={() => handleLaikaAmountChange(maxLaikaBoost)}
                      disabled={!usdtAmount || parseFloat(usdtAmount) === 0}
                      className={`mt-2 w-full py-2.5 rounded-lg font-semibold transition-all text-sm ${
                        boostToken === 'LAIKA'
                          ? 'bg-laika-purple hover:bg-laika-purple/80 text-white'
                          : 'bg-gold-500 hover:bg-gold-400 text-black'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      🚀 Set Max Boost ({maxLaikaBoost.toLocaleString()} {boostToken})
                    </button>
                  </div>

                  {/* Boost Preview */}
                  {laikaAmount > 0 && calculation && (
                    <div className="bg-black/20 rounded p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{boostToken} Boost Value:</span>
                        <span className={`font-bold text-sm ${
                          boostToken === 'LAIKA' ? 'text-laika-purple' : 'text-gold'
                        }`}>
                          ${calculation.investment.laikaDiscountedValueUSD?.toFixed(2) || '0.00'} USDT
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">1 {boostToken} Price:</span>
                        <span className="text-white font-medium text-sm flex items-center gap-2">
                          {laikaPriceFetching ? (
                            <span className="animate-pulse">Updating...</span>
                          ) : (
                            <>${(calculation?.investment?.laikaPrice || laikaToUsdtRate).toFixed(8)} USDT</>
                          )}
                          <button
                            onClick={() => refetchLaikaPrice()}
                            className="text-xs text-laika-purple hover:text-laika-green transition-colors"
                            title="Refresh price"
                          >
                            🔄
                          </button>
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-700 pt-2">
                        <span className="text-laika-green font-bold">Extra APY:</span>
                        <span className="text-laika-green font-bold text-sm">
                          +{calculation.earnings.laikaBoostAPY || 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {!usdtAmount || parseFloat(usdtAmount) === 0 ? (
                    <div className="text-xs text-gray-500 italic mt-2">
                      💡 Enter USDT amount first to enable {boostToken} boost
                    </div>
                  ) : laikaAmount === 0 ? (
                    <div className="text-xs text-gray-400 italic mt-2">
                      💡 Enter {boostToken} amount to add boost and increase your APY!
                    </div>
                  ) : null}
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
          laikaAmount={laikaAmount}
        />
      )}
    </div>
  )
}
