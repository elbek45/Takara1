import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Calculator,
  BarChart3,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import adminApiService from '../../services/admin.api'

export default function AdminTakaraPricingPage() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['takaraPricing'],
    queryFn: () => adminApiService.getTakaraPricingCalculations(),
    refetchInterval: 60000, // Refresh every minute
  })

  const pricingData = data?.data

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dashboard-dark p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading pricing calculations...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dashboard-dark p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-red-500">Failed to load pricing calculations</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-dark p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 bg-gold-dark/20 hover:bg-gold-dark/30 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gold" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">TAKARA Pricing Calculator</h1>
              <p className="text-gray-400 mt-1">Dynamic pricing analysis and recommendations</p>
            </div>
          </div>
        </div>

        {/* Current Price Section */}
        <div className="bg-gradient-to-br from-gold-dark/20 to-gold/10 border border-gold/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <DollarSign className="h-6 w-6 text-gold mr-2" />
              Current TAKARA Price
            </h2>
            <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
              {pricingData?.currentPrice.source}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Price</p>
              <p className="text-3xl font-bold text-gold">
                ${pricingData?.currentPrice.price.toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Base Price</p>
              <p className="text-2xl font-semibold text-white">
                ${pricingData?.currentPrice.basePrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Difficulty</p>
              <p className="text-2xl font-semibold text-white">
                {pricingData?.currentPrice.difficulty.toFixed(2)}x
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Difficulty Multiplier</p>
              <p className="text-2xl font-semibold text-white">
                {pricingData?.currentPrice.difficultyMultiplier.toFixed(4)}x
              </p>
            </div>
          </div>
        </div>

        {/* Economics Overview */}
        <div className="bg-dashboard-card border border-gold/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <BarChart3 className="h-6 w-6 text-gold mr-2" />
            Mining Economics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Supply</p>
              <p className="text-2xl font-bold text-white">
                {pricingData?.economics.totalSupply.toLocaleString()} TAKARA
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Mined</p>
              <p className="text-2xl font-bold text-white">
                {pricingData?.economics.totalMined.toLocaleString()} TAKARA
              </p>
              <p className="text-sm text-gold">
                {pricingData?.economics.percentMined.toFixed(4)}% mined
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Mining Period</p>
              <p className="text-2xl font-bold text-white">
                {pricingData?.economics.miningPeriodMonths} months
              </p>
              <p className="text-sm text-gray-400">({(pricingData?.economics.miningPeriodMonths || 0) / 12} years)</p>
            </div>
          </div>
        </div>

        {/* Example Calculations */}
        <div className="bg-dashboard-card border border-gold/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Calculator className="h-6 w-6 text-gold mr-2" />
            Example Calculations ($10,000 Investment)
          </h2>
          <div className="space-y-4">
            {pricingData?.exampleCalculations.map((calc: any, index: number) => (
              <div
                key={index}
                className="bg-dashboard-dark/50 border border-gold/10 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{calc.vaultName}</h3>
                    <p className="text-sm text-gray-400">
                      {calc.tier} Tier • {calc.duration} months • {calc.takaraAPY}% Takara APY
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    calc.roi > 1000
                      ? 'bg-green-500/20 text-green-500'
                      : calc.roi > 500
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {calc.roi.toFixed(0)}% ROI
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">Entry Cost</p>
                    <p className="text-white font-semibold">
                      {calc.takaraRequired.toLocaleString()} TAKARA
                    </p>
                    <p className="text-gold">${calc.takaraRequiredCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Daily Mining</p>
                    <p className="text-white font-semibold">{calc.dailyMining.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Total Mined</p>
                    <p className="text-white font-semibold">{calc.totalMined.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Mining Value</p>
                    <p className="text-green-500 font-semibold">${calc.totalMiningValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Net Profit</p>
                    <p className="text-green-500 font-bold">${calc.netProfit.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{calc.annualizedROI.toFixed(0)}% annual</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Scenarios */}
        <div className="bg-dashboard-card border border-gold/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <TrendingUp className="h-6 w-6 text-gold mr-2" />
            Price Scenarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingData?.priceScenarios.map((scenario: any, index: number) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  scenario.price === pricingData.recommendations.launchPrice
                    ? 'bg-gold/10 border-gold'
                    : 'bg-dashboard-dark/50 border-gold/10'
                }`}
              >
                {scenario.price === pricingData.recommendations.launchPrice && (
                  <div className="flex items-center mb-2">
                    <CheckCircle2 className="h-5 w-5 text-gold mr-2" />
                    <span className="text-sm font-semibold text-gold">RECOMMENDED</span>
                  </div>
                )}
                <p className="text-3xl font-bold text-white mb-2">
                  ${scenario.price.toFixed(2)}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market Cap</span>
                    <span className="text-white font-medium">
                      ${(scenario.marketCap / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">LAIKA Multiple</span>
                    <span className="text-gold font-medium">{scenario.laikaMultiplier.toFixed(0)}x</span>
                  </div>
                  <p className="text-gray-300 text-xs mt-3">{scenario.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gradient-to-br from-green-500/10 to-gold/10 border border-green-500/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
            Launch Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Recommended Launch Price</p>
              <p className="text-4xl font-bold text-gold">
                ${pricingData?.recommendations.launchPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Target Price Range</p>
              <p className="text-2xl font-bold text-white">
                ${pricingData?.recommendations.targetPriceRange.min.toFixed(2)} -{' '}
                ${pricingData?.recommendations.targetPriceRange.max.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-white font-semibold">Key Rationale:</p>
            <ul className="space-y-2">
              {pricingData?.recommendations.reasoning.map((reason: string, index: number) => (
                <li key={index} className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* TAKARA Mining Calculation Formulas */}
        <div className="bg-dashboard-card border border-gold/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Calculator className="h-6 w-6 text-gold mr-2" />
            TAKARA Mining Calculation Formulas
          </h2>

          <div className="space-y-6">
            {/* Daily Mining Formula */}
            <div className="bg-dashboard-dark/50 border border-gold/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gold mb-3">1. Daily TAKARA Mining</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="bg-black/30 p-3 rounded">
                  <span className="text-gray-400">dailyRate = </span>
                  <span className="text-white">(takaraAPY / 100) / 365</span>
                </div>
                <div className="bg-black/30 p-3 rounded">
                  <span className="text-gray-400">dailyTAKARA = </span>
                  <span className="text-white">usdtInvested × dailyRate × difficultyMultiplier</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                <p>• <strong>takaraAPY</strong>: Vault-specific TAKARA APY (50% - 500%)</p>
                <p>• <strong>difficultyMultiplier</strong>: Adjusts based on current mining difficulty (1.0x - 10.0x)</p>
              </div>
            </div>

            {/* Total Mining Formula */}
            <div className="bg-dashboard-dark/50 border border-gold/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gold mb-3">2. Total TAKARA Mined</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="bg-black/30 p-3 rounded">
                  <span className="text-gray-400">totalDays = </span>
                  <span className="text-white">durationMonths × 30</span>
                </div>
                <div className="bg-black/30 p-3 rounded">
                  <span className="text-gray-400">totalTAKARA = </span>
                  <span className="text-white">dailyTAKARA × totalDays</span>
                </div>
              </div>
            </div>

            {/* ROI Formula */}
            <div className="bg-dashboard-dark/50 border border-gold/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gold mb-3">3. TAKARA Mining ROI</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="bg-black/30 p-3 rounded">
                  <span className="text-gray-400">miningValue = </span>
                  <span className="text-white">totalTAKARA × takaraPrice</span>
                </div>
                <div className="bg-black/30 p-3 rounded">
                  <span className="text-gray-400">roi = </span>
                  <span className="text-white">(miningValue / usdtInvested) × 100</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                <p>• Current TAKARA Price: <span className="text-gold">${pricingData?.currentPrice.price.toFixed(6)}</span></p>
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-gradient-to-br from-gold/10 to-green-500/5 border border-gold/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gold mb-3">Example: $10,000 in Elite 36M Vault</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-2">Parameters:</p>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Investment: <span className="text-white font-semibold">$10,000</span></li>
                    <li>• TAKARA APY: <span className="text-green-400 font-semibold">500%</span></li>
                    <li>• Duration: <span className="text-white font-semibold">36 months</span></li>
                    <li>• Difficulty: <span className="text-white font-semibold">{pricingData?.currentPrice.difficulty.toFixed(2)}x</span></li>
                  </ul>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Results:</p>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Daily: <span className="text-white font-semibold">~137 TAKARA</span></li>
                    <li>• Total Mined: <span className="text-green-400 font-semibold">~148,500 TAKARA</span></li>
                    <li>• Value: <span className="text-gold font-semibold">~$7,425</span></li>
                    <li>• ROI: <span className="text-gold font-bold">~74%</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Note */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold text-white mb-1">Price Configuration</p>
              <p>
                To override the calculated price, set <code className="bg-dashboard-dark px-2 py-1 rounded text-gold">TAKARA_PRICE_OVERRIDE</code> in your .env.production file.
                The current price is dynamically calculated based on mining difficulty and platform economics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
