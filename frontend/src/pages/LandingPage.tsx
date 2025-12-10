import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Shield, Zap, Coins, ChevronDown, Pickaxe, Rocket, CreditCard } from 'lucide-react'

export default function LandingPage() {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null)

  const toggleBlock = (blockId: number) => {
    setExpandedBlock(expandedBlock === blockId ? null : blockId)
  }
  return (
    <div className="relative">
      {/* Token Listing Banner - v2.2 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4 text-center">
        <p className="text-white font-semibold text-sm sm:text-base">
          🚀 Listing will start when all 21,000,000 TAKARA tokens are mined!
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center space-y-8">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              <span className="block text-gradient-gold">Premium Takara Vaults</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-300">
              Stake USDT in Takara treasury premium vaults, boost APY and earn TAKARA tokens through mining.
              Secured on Solana blockchain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/vaults"
                className="btn-gold inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-lg"
              >
                Explore Vaults
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/marketplace"
                className="btn-outline-gold inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-lg"
              >
                View Marketplace
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gradient-gold">9</div>
                <div className="text-sm text-gray-400">Takara Vaults</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gradient-gold">12-25%</div>
                <div className="text-sm text-gray-400">Base APY Range</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gradient-gold">Up to 500%</div>
                <div className="text-sm text-gray-400">Takara APY</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gradient-gold">Monthly</div>
                <div className="text-sm text-gray-400">Payouts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why Choose Takara <span className="text-gold-500">宝</span>?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Experience the next generation of DeFi vaults with multiple earning opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gold-500/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-gold-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">High APY</h3>
              <p className="text-gray-400">
                Earn 4-8% base APY on USDT deposits, up to 12% max APY with optional LAIKA boost
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gold-500/20 rounded-lg flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-gold-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">TAKARA Mining</h3>
              <p className="text-gray-400">
                Mine TAKARA tokens daily with dynamic difficulty based on your vault's mining power
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gold-500/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-gold-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">LAIKA Boost 🎁</h3>
              <p className="text-gray-400">
                Boost APY up to +4%. Deposit up to 90% of USDT value in LAIKA. LAIKA returned at term end.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gold-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-gold-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Marketplace</h3>
              <p className="text-gray-400">
                Trade your Wexel on the marketplace before maturity term
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Takara Utility Section - Scarcity, Yield & Real-World Utility */}
      <section className="py-24 bg-gradient-to-b from-background-secondary via-background-primary to-background-secondary relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gold-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-green-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Slogan Section */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-block">
              <div className="text-5xl sm:text-6xl font-bold mb-2">
                <span className="text-gradient-gold">宝</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
                Takara - Scarcity, Yield, and Real-World Utility in One Token
              </h2>
              <p className="text-lg sm:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                A 21 million supply crafted like Bitcoin, a stake-to-mine system built for users,
                and a path toward real-world spending through crypto to fiat card utility.
              </p>
            </div>
          </div>

          {/* Three Clickable Blocks */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Block 1 - Stake to Mine */}
            <div
              onClick={() => toggleBlock(1)}
              className="group bg-background-card p-8 rounded-2xl border border-gold-500/30 hover:border-gold-500/60 transition-all duration-300 cursor-pointer card-glow"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-gold-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pickaxe className="h-8 w-8 text-gold-500" />
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-gold-400 transition-colors">
                  Stake to Mine, Not to Dilute
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Takara isn't pre-mined. 90% of its 21M supply can only be earned by staking.
                </p>
                <div className="flex items-center gap-2 text-gold-400 font-medium">
                  <span>Click to learn how Takara enters circulation</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${expandedBlock === 1 ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              <div className={`mt-6 pt-6 border-t border-gold-500/20 overflow-hidden transition-all duration-500 ${expandedBlock === 1 ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 text-gray-300">
                  <p className="leading-relaxed">
                    Takara's supply follows a <span className="text-gold-400 font-semibold">Bitcoin-inspired model</span>: a fixed 21 million tokens designed for long-term scarcity.
                  </p>
                  <p className="leading-relaxed">
                    <span className="text-gold-400 font-semibold">90% of the entire supply</span> will be mined directly by users through staking vaults, while only 10% is reserved for the team to fund development, growth, and operations.
                  </p>
                  <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4 my-4">
                    <p className="text-gold-400 font-semibold text-center">
                      There are no insider mints and no hidden allocations.
                    </p>
                  </div>
                  <p className="leading-relaxed">
                    Takara enters circulation only through user participation, making it one of the few tokens where distribution is <span className="text-gold-400 font-semibold">earned, not granted</span>.
                  </p>
                  <p className="leading-relaxed">
                    Holders mine Takara over time by staking, reinforcing a fair, transparent, and community-driven supply model.
                  </p>
                </div>
              </div>
            </div>

            {/* Block 2 - Boost APY */}
            <div
              onClick={() => toggleBlock(2)}
              className="group bg-background-card p-8 rounded-2xl border border-green-500/30 hover:border-green-500/60 transition-all duration-300 cursor-pointer card-glow"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">
                  Boost Your APY the Smart Way
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Takara unlocks higher APY tiers in every vault. No-risk staking with USDT APY, while Takara yields can reach up to 500%.
                </p>
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <span>Click to see how boosts work</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${expandedBlock === 2 ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              <div className={`mt-6 pt-6 border-t border-green-500/20 overflow-hidden transition-all duration-500 ${expandedBlock === 2 ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 text-gray-300">
                  <p className="leading-relaxed">
                    Takara is the ecosystem's <span className="text-green-400 font-semibold">exclusive APY booster</span>.
                  </p>
                  <p className="leading-relaxed">
                    USDT vaults offer competitive base APY with <span className="text-green-400 font-semibold">NO RISK</span> and Takara allows users to climb toward the maximum APY tier for some vaults.
                  </p>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 my-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-green-400">•</span>
                      <span>Base APY stays steady</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400">•</span>
                      <span>Takara APY increases dynamically with vault choice</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gold-400">⚡</span>
                      <span className="text-gold-400 font-semibold">Advanced vaults offer up to 500% Takara APY</span>
                    </div>
                  </div>
                  <p className="leading-relaxed text-center text-green-400 font-semibold">
                    Holding Takara is the key to unlocking deeper yield.
                  </p>
                </div>
              </div>
            </div>

            {/* Block 3 - Card Utility */}
            <div
              onClick={() => toggleBlock(3)}
              className="group bg-background-card p-8 rounded-2xl border border-gold-500/30 hover:border-gold-500/60 transition-all duration-300 cursor-pointer card-glow"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-gold-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-8 w-8 text-gold-500" />
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-gold-400 transition-colors">
                  Your Token, Your Card, Your Rewards
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Future Takara Visa/Mastercard integration brings real-world utility. Spend crypto anywhere and earn Takara rewards.
                </p>
                <div className="flex items-center gap-2 text-gold-400 font-medium">
                  <span>Click to explore upcoming card benefits</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${expandedBlock === 3 ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              <div className={`mt-6 pt-6 border-t border-gold-500/20 overflow-hidden transition-all duration-500 ${expandedBlock === 3 ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 text-gray-300">
                  <p className="leading-relaxed">
                    Takara is building <span className="text-gold-400 font-semibold">real-world utility</span> through a crypto to fiat Visa/Mastercard, allowing users to:
                  </p>
                  <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4 my-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-gold-400 mt-1">💳</span>
                      <span><span className="font-semibold">Spend crypto anywhere</span> cards are accepted</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold-400 mt-1">🎁</span>
                      <span><span className="font-semibold">Earn Takara rewards</span> for every purchase</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold-400 mt-1">⭐</span>
                      <span><span className="font-semibold">Enjoy tiered benefits</span> based on Takara holdings</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold-400 mt-1">🔗</span>
                      <span><span className="font-semibold">Combine daily spending</span> with ecosystem growth</span>
                    </div>
                  </div>
                  <p className="leading-relaxed text-center text-gold-400 font-semibold italic">
                    A seamless bridge between digital yield and real-world use, powered by Takara's scarcity and staking mechanics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">Ready to start earning Takara?</p>
            <Link
              to="/vaults"
              className="btn-gold inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold"
            >
              Explore Vaults
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Vaults Preview Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Choose Your Vault
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              9 vaults across 3 tiers: Starter, Pro, and Elite. Select based on your amount and duration.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Starter Tier */}
            <div className="bg-background-card p-8 rounded-xl border border-blue-500/30">
              <div className="tier-starter inline-block mb-4">STARTER</div>
              <h3 className="text-2xl font-bold text-white mb-2">From $100</h3>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 12M: 8% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 30M: 10% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 36M: 12% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-blue-400">⚡</span> Up to 500% Takara APY
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">•</span> Monthly payouts
                </p>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-background-card p-8 rounded-xl border border-purple-500/30">
              <div className="tier-pro inline-block mb-4">PRO</div>
              <h3 className="text-2xl font-bold text-white mb-2">From $1,000</h3>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 12M: 12% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 30M: 20.5% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 36M: 25% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">⚡</span> Up to 500% Takara APY
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">•</span> Monthly payouts
                </p>
              </div>
            </div>

            {/* Elite Tier */}
            <div className="bg-background-card p-8 rounded-xl border border-gold-500/30">
              <div className="tier-elite inline-block mb-4">ELITE</div>
              <h3 className="text-2xl font-bold text-white mb-2">From $5,000</h3>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 12M: 15% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 30M: 17% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 36M: 19% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-400">⚡</span> Up to 500% Takara APY
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">•</span> Monthly payouts
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/vaults"
              className="btn-gold inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold"
            >
              View All Vaults
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-green-900/20 to-transparent">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-gray-300">
            Connect your Solana and Ethereum wallet and start stacking in Takara vaults today
          </p>
          <Link
            to="/vaults"
            className="btn-gold inline-flex items-center gap-2 px-10 py-4 rounded-lg font-semibold text-lg"
          >
            Get Started
            <ArrowRight className="h-6 w-6" />
          </Link>
        </div>
      </section>
    </div>
  )
}
