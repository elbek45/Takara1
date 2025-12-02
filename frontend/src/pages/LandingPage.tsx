import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Shield, Zap, Coins } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative">
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
                <div className="text-3xl font-bold text-gradient-gold">4-8%</div>
                <div className="text-sm text-gray-400">Base APY Range</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gradient-gold">Up to +12%</div>
                <div className="text-sm text-gray-400">Max Boost</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gradient-gold">100%</div>
                <div className="text-sm text-gray-400">On Solana</div>
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
              Why Choose Takara Gold?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Experience the next generation of DeFi investment vaults with multiple earning opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gradient-gold rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-background-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">High APY</h3>
              <p className="text-gray-400">
                Earn 4-16% base APY on USDT deposits, plus up to 12% additional APY with LAIKA boost
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gradient-green rounded-lg flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-background-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">TAKARA Mining</h3>
              <p className="text-gray-400">
                Mine TAKARA tokens daily with dynamic difficulty based on your vault's mining power
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gradient-laika rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-background-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">LAIKA Boost 🎁</h3>
              <p className="text-gray-400">
                Get 10% discount on LAIKA! Boost APY up to +12%. Deposit up to 90% of USDT value. LAIKA returned at term end.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background-card p-6 rounded-xl border border-green-900/20 card-glow">
              <div className="h-12 w-12 bg-gold-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-gold-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">NFT Marketplace</h3>
              <p className="text-gray-400">
                Trade your investment NFTs on the marketplace before term maturity
              </p>
            </div>
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
              9 vaults across 3 tiers: Starter, Pro, and Elite. Select based on your investment amount and duration.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Starter Tier */}
            <div className="bg-background-card p-8 rounded-xl border border-blue-500/30">
              <div className="tier-starter inline-block mb-4">STARTER</div>
              <h3 className="text-2xl font-bold text-white mb-2">$100 - $5,000</h3>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 4-8% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> +8% Max Boost
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 50-100 Mining Power
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 3 Vault Options
                </p>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-background-card p-8 rounded-xl border border-purple-500/30">
              <div className="tier-pro inline-block mb-4">PRO</div>
              <h3 className="text-2xl font-bold text-white mb-2">$5,001 - $50,000</h3>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 8-12% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> +10% Max Boost
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 150-200 Mining Power
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 3 Vault Options
                </p>
              </div>
            </div>

            {/* Elite Tier */}
            <div className="bg-background-card p-8 rounded-xl border border-gold-500/30">
              <div className="tier-elite inline-block mb-4">ELITE</div>
              <h3 className="text-2xl font-bold text-white mb-2">$50,001+</h3>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 12-16% Base APY
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> +12% Max Boost
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 250-400 Mining Power
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold-500">✓</span> 3 Vault Options
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
            Connect your Solana wallet and start investing in premium vaults today
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
