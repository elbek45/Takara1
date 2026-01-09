import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Shield, Zap, Coins, ChevronDown, Pickaxe, Rocket, CreditCard, Building2, Loader2 } from 'lucide-react'
import { PoweredBySlider } from '../components/landing'
import { api } from '../services/api'

// Brand colors from brandbook
const GOLD = '#EFCE92'
const NAVY = '#0F1F40'

export default function LandingPage() {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null)

  // Fetch vaults from API
  const { data: vaultsData, isLoading: vaultsLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.getVaults(),
    staleTime: 5 * 60 * 1000,
  })

  const vaults = vaultsData?.data || []

  // Group vaults by tier and get max APY for each tier
  const getTierStats = (tier: string) => {
    const tierVaults = vaults.filter((v: any) => v.tier === tier)
    if (tierVaults.length === 0) return null

    const maxBaseAPY = Math.max(...tierVaults.map((v: any) => v.maxAPY || v.baseAPY || 0))
    const maxTakaraAPY = Math.max(...tierVaults.map((v: any) => v.maxTakaraAPY || 0))
    const minDeposit = Math.min(...tierVaults.map((v: any) => v.minInvestment || 0))

    // Calculate max total returns (APY * duration / 12)
    const maxTotalReturns = Math.max(...tierVaults.map((v: any) => {
      const apy = v.maxAPY || v.baseAPY || 0
      const duration = v.duration || 12
      return Math.round(apy * duration / 12)
    }))

    return { maxBaseAPY, maxTakaraAPY, minDeposit, maxTotalReturns }
  }

  const starterStats = getTierStats('STARTER')
  const proStats = getTierStats('PRO')
  const eliteStats = getTierStats('ELITE')

  const toggleBlock = (blockId: number) => {
    setExpandedBlock(expandedBlock === blockId ? null : blockId)
  }

  return (
    <div className="relative">
      {/* Solana Ecosystem Badge */}
      <div className="bg-navy-800 py-2 px-4 text-center border-b border-gold-300/20">
        <p style={{ color: GOLD }} className="font-medium text-sm sm:text-base flex items-center justify-center gap-2">
          <span className="px-2 py-0.5 bg-gold-300/10 rounded text-xs uppercase tracking-wider">Solana Ecosystem</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Takara listing starts after 10,000,000 TAKARA will be mined</span>
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-navy-900 min-h-[80vh] flex items-center">
        {/* Japanese Background Patterns */}
        <div className="absolute inset-0 zen-circles"></div>
        <div className="absolute inset-0 seigaiha-pattern opacity-50"></div>

        {/* Gold Tree - Animated */}
        <div className="absolute top-10 right-0 w-[500px] h-[500px] opacity-30 animate-float hidden lg:block">
          <img src="/images/brand/gold-tree.png" alt="" className="w-full h-full object-contain drop-shadow-2xl" />
        </div>

        {/* Floating Gold Coins */}
        <div className="absolute top-[15%] left-[5%] w-24 h-24 opacity-40 animate-float hidden md:block" style={{ animationDelay: '0s', animationDuration: '6s' }}>
          <img src="/images/brand/gold-coin.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-[60%] left-[8%] w-16 h-16 opacity-30 animate-float hidden md:block" style={{ animationDelay: '2s', animationDuration: '8s' }}>
          <img src="/images/brand/gold-coin.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-[40%] right-[15%] w-20 h-20 opacity-25 animate-float hidden lg:block" style={{ animationDelay: '1s', animationDuration: '7s' }}>
          <img src="/images/brand/icon.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Abstract Gold Shape */}
        <div className="absolute bottom-10 left-[10%] w-48 h-48 opacity-15 animate-spin-slow hidden lg:block">
          <img src="/images/brand/gold-abstract.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Decorative gold circles with blur */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: GOLD }}></div>
        <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: GOLD }}></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10 blur-2xl" style={{ background: GOLD }}></div>

        {/* Animated floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float-particle"
              style={{
                width: `${4 + (i % 5) * 3}px`,
                height: `${4 + (i % 5) * 3}px`,
                background: GOLD,
                opacity: 0.3 + (i % 3) * 0.1,
                top: `${5 + (i * 6) % 90}%`,
                left: `${3 + (i * 7) % 94}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${4 + (i % 4) * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Logo */}
              <div className="flex items-center">
                <img
                  src="/images/brand/logo-takara.png"
                  alt="Takara"
                  className="h-16 sm:h-20 w-auto"
                />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                Where DeFi Meets{' '}
                <span style={{ color: GOLD }}>Real-World Assets</span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed">
                Mine $TKR and earn insured RWA yield with principal-protected USDT vaults.
                100% community mined, no pre-mint.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/vaults"
                  className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg"
                >
                  Start Earning
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/faq"
                  className="btn-outline-gold inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right Content - Main Icon */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-80 h-80 xl:w-96 xl:h-96 animate-float">
                <img
                  src="/images/brand/icon.png"
                  alt="Takara"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-30 -z-10"
                  style={{ background: GOLD }}
                />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-8 border-t border-gold-300/20">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: GOLD }}>Up to 20%</div>
              <div className="text-sm text-gray-400 mt-1">USDT APY</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: GOLD }}>Up to 60%</div>
              <div className="text-sm text-gray-400 mt-1">Total USDT Returns</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: GOLD }}>Up to 1000%</div>
              <div className="text-sm text-gray-400 mt-1">Takara APY</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: GOLD }}>Monthly</div>
              <div className="text-sm text-gray-400 mt-1">Payouts</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="py-24 bg-navy-800 relative overflow-hidden">
        {/* Japanese pattern background */}
        <div className="absolute inset-0 asanoha-pattern"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 60%)` }}></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 60%)` }}></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why Choose Takara?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Principal protected, community mined, insured RWA yield
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Principal Protected */}
            <div className="bg-navy-900 p-8 rounded-2xl border border-gold-300/20 card-glow relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative">
                <div className="h-14 w-14 bg-gold-300/10 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Principal Protected</h3>
                <p className="text-gray-400 leading-relaxed">
                  USDT funds sit in secure structures, avoiding high-volatility leverage trades
                </p>
              </div>
            </div>

            {/* Community Mined */}
            <div className="bg-navy-900 p-8 rounded-2xl border border-gold-300/20 card-glow relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative">
                <div className="h-14 w-14 bg-gold-300/10 rounded-xl flex items-center justify-center mb-6">
                  <Pickaxe className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Community Mined</h3>
                <p className="text-gray-400 leading-relaxed">
                  100% of the 21M $TKR supply is mined by users. No pre-mint, no team allocation
                </p>
              </div>
            </div>

            {/* Insured RWA Yield */}
            <div className="bg-navy-900 p-8 rounded-2xl border border-gold-300/20 card-glow relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative">
                <div className="h-14 w-14 bg-gold-300/10 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Insured RWA Yield</h3>
                <p className="text-gray-400 leading-relaxed">
                  Yield engine supported by Digital Commercial Bank connecting on-chain to real world
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Powered By Slider */}
      <PoweredBySlider />

      {/* How It Works Section */}
      <section className="py-24 bg-navy-900 relative overflow-hidden">
        {/* Japanese zen circles background */}
        <div className="absolute inset-0 zen-circles opacity-50"></div>
        {/* Decorative lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}></div>
          <div className="absolute top-1/3 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}></div>
          <div className="absolute top-2/3 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}></div>
        </div>
        {/* Corner circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 60%)` }}></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 60%)` }}></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              User Journey
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Start earning in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Deposit USDT', desc: 'Into a term-based vault' },
              { step: 2, title: 'Receive Wexel NFT', desc: 'Proof of Position' },
              { step: 3, title: 'Mine $TKR', desc: '+ Earn Monthly Yield' },
              { step: 4, title: 'Stake $TKR', desc: 'To boost APY tiers' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-navy-800 p-6 rounded-xl border border-gold-300/20 text-center h-full relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-24 h-24 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
                  <div className="relative">
                    <div className="w-12 h-12 text-navy-900 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4" style={{ background: GOLD }}>
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
                {item.step < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-gold-300/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="py-24 bg-navy-800 relative overflow-hidden">
        {/* Japanese wave pattern */}
        <div className="absolute inset-0 seigaiha-pattern opacity-30"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-[100px]" style={{ background: GOLD }}></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full blur-[100px]" style={{ background: GOLD }}></div>
        </div>

        {/* Floating coins decoration */}
        <div className="absolute top-[10%] right-[5%] w-20 h-20 opacity-20 animate-float hidden lg:block" style={{ animationDelay: '0.5s' }}>
          <img src="/images/brand/icon.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div className="absolute bottom-[20%] left-[3%] w-16 h-16 opacity-15 animate-float hidden lg:block" style={{ animationDelay: '1.5s' }}>
          <img src="/images/brand/icon.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Floating concentric circles */}
        <div className="absolute top-1/4 left-1/4 w-40 h-40 opacity-10 animate-spin-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke={GOLD} strokeWidth="0.5" />
            <circle cx="50" cy="50" r="35" fill="none" stroke={GOLD} strokeWidth="0.5" />
            <circle cx="50" cy="50" r="25" fill="none" stroke={GOLD} strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Coin Image with animation */}
            <div className="flex justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[350px] h-[350px] rounded-full opacity-30 blur-3xl animate-pulse" style={{ background: GOLD }}></div>
              </div>
              {/* Main coin */}
              <div className="relative animate-float" style={{ animationDuration: '5s' }}>
                <img
                  src="/images/brand/icon.png"
                  alt="$TKR Token"
                  className="w-[320px] h-auto relative z-10 drop-shadow-2xl"
                />
                {/* Orbiting smaller coins */}
                <div className="absolute -top-4 -right-4 w-16 h-16 animate-float" style={{ animationDelay: '0.5s', animationDuration: '3s' }}>
                  <img src="/images/brand/icon.png" alt="" className="w-full h-full object-contain opacity-60" />
                </div>
                <div className="absolute -bottom-2 -left-6 w-12 h-12 animate-float" style={{ animationDelay: '1s', animationDuration: '4s' }}>
                  <img src="/images/brand/icon.png" alt="" className="w-full h-full object-contain opacity-50" />
                </div>
              </div>
            </div>

            {/* Right - Tokenomics Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Tokenomics: <span style={{ color: GOLD }}>$TKR</span>
                </h2>
                <p className="text-gray-400 text-lg">
                  A Bitcoin-inspired supply model designed for long-term scarcity
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-4 border-b border-gold-300/20">
                  <span className="text-gray-300">Total Supply (Hard Cap)</span>
                  <span style={{ color: GOLD }} className="font-bold text-xl">21,000,000 TKR</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-gold-300/20">
                  <span className="text-gray-300">Distribution Method</span>
                  <span style={{ color: GOLD }} className="font-bold text-xl">100% User Mined</span>
                </div>
              </div>

              <div className="bg-navy-900 rounded-xl p-6 border border-gold-300/20">
                <p className="text-gray-300 leading-relaxed">
                  <strong style={{ color: GOLD }}>Utility Loop:</strong> Holding and staking $TKR unlocks higher USDT APY tiers across vaults. The more you mine, the stronger your stablecoin reward stream becomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Clickable Blocks - Takara Utility */}
      <section className="py-24 bg-navy-900 relative overflow-hidden">
        {/* Japanese combined pattern */}
        <div className="absolute inset-0 japan-pattern"></div>
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: `${8 + (i % 4) * 4}px`,
                height: `${8 + (i % 4) * 4}px`,
                background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
                top: `${10 + (i * 7) % 80}%`,
                left: `${5 + (i * 8) % 90}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i % 3)}s`
              }}
            />
          ))}
        </div>
        {/* Large decorative circles */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 50%)` }}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 50%)` }}></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Takara - Scarcity, Yield, and Real-World Utility in One Token
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              A 21 million supply designed like Bitcoin, stake-to-mine mechanics built for users,
              and a path toward real-world spending through future crypto-to-fiat card utility.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Block 1 - Stake to Mine */}
            <div
              onClick={() => toggleBlock(1)}
              className="group bg-navy-800 p-8 rounded-2xl border border-gold-300/30 hover:border-gold-300/60 transition-all duration-300 cursor-pointer card-glow relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-gold-300/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pickaxe className="h-8 w-8" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                  Stake to Mine, Not to Dilute
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  The token features no pre-mining, with all 21M supply earned exclusively through staking mechanisms.
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: GOLD }}>
                  <span>Learn more</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedBlock === 1 ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              <div className={`mt-6 pt-6 border-t border-gold-300/20 overflow-hidden transition-all duration-500 ${expandedBlock === 1 ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 text-gray-300 text-sm">
                  <p>
                    Fixed <span style={{ color: GOLD }} className="font-semibold">21 million token cap</span> inspired by Bitcoin's scarcity model.
                  </p>
                  <div className="bg-gold-300/10 border border-gold-300/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Users accumulate tokens entirely through staking vaults</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>No insider allocations or hidden distributions</span>
                    </div>
                  </div>
                  <p className="text-center font-semibold" style={{ color: GOLD }}>
                    Distribution mechanism prioritizes community participation.
                  </p>
                </div>
              </div>
            </div>

            {/* Block 2 - Boost APY */}
            <div
              onClick={() => toggleBlock(2)}
              className="group bg-navy-800 p-8 rounded-2xl border border-gold-300/30 hover:border-gold-300/60 transition-all duration-300 cursor-pointer card-glow relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-gold-300/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="h-8 w-8" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                  Boost Your APY the Smart Way
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Takara functions as an exclusive APY enhancement tool within the ecosystem.
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: GOLD }}>
                  <span>See how boosts work</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedBlock === 2 ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              <div className={`mt-6 pt-6 border-t border-gold-300/20 overflow-hidden transition-all duration-500 ${expandedBlock === 2 ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 text-gray-300 text-sm">
                  <p>
                    Takara is the ecosystem's <span style={{ color: GOLD }} className="font-semibold">exclusive APY booster</span>.
                  </p>
                  <div className="bg-gold-300/10 border border-gold-300/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Base USDT vault APY up to 20%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Takara holdings unlock progressive APY tier increases</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Advanced vault options offer up to 1000% Takara APY</span>
                    </div>
                  </div>
                  <p className="text-center font-semibold" style={{ color: GOLD }}>
                    Token holdings determine maximum achievable yield levels.
                  </p>
                </div>
              </div>
            </div>

            {/* Block 3 - Card Utility */}
            <div
              onClick={() => toggleBlock(3)}
              className="group bg-navy-800 p-8 rounded-2xl border border-gold-300/30 hover:border-gold-300/60 transition-all duration-300 cursor-pointer card-glow relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-gold-300/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-8 w-8" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                  Your Token, Your Card, Your Rewards
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Future integration with Visa/Mastercard platforms for real-world spending capability.
                </p>
                <div className="flex items-center gap-2 font-medium text-sm" style={{ color: GOLD }}>
                  <span>Explore card benefits</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedBlock === 3 ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Content */}
              <div className={`mt-6 pt-6 border-t border-gold-300/20 overflow-hidden transition-all duration-500 ${expandedBlock === 3 ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 text-gray-300 text-sm">
                  <p>
                    <span style={{ color: GOLD }} className="font-semibold">Planned Functionality:</span>
                  </p>
                  <div className="bg-gold-300/10 border border-gold-300/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Cryptocurrency spending at any card-accepting merchant</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Takara reward accumulation on purchases</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Tiered benefits aligned with token holdings</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span style={{ color: GOLD }}>•</span>
                      <span>Bridge between yield generation and everyday utility</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vault Tiers Section - Dynamic from DB */}
      <section className="py-24 bg-navy-800 relative overflow-hidden">
        {/* Japanese asanoha pattern */}
        <div className="absolute inset-0 asanoha-pattern opacity-50"></div>
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-px h-full" style={{ background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)` }}></div>
          <div className="absolute top-0 left-1/2 w-px h-full" style={{ background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)` }}></div>
          <div className="absolute top-0 left-3/4 w-px h-full" style={{ background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)` }}></div>
        </div>
        {/* Concentric circles decoration */}
        <div className="absolute top-10 right-10 w-60 h-60 opacity-5">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="48" fill="none" stroke={GOLD} strokeWidth="0.3" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={GOLD} strokeWidth="0.3" />
            <circle cx="50" cy="50" r="32" fill="none" stroke={GOLD} strokeWidth="0.3" />
            <circle cx="50" cy="50" r="24" fill="none" stroke={GOLD} strokeWidth="0.3" />
          </svg>
        </div>
        <div className="absolute bottom-10 left-10 w-60 h-60 opacity-5">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="48" fill="none" stroke={GOLD} strokeWidth="0.3" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={GOLD} strokeWidth="0.3" />
            <circle cx="50" cy="50" r="32" fill="none" stroke={GOLD} strokeWidth="0.3" />
            <circle cx="50" cy="50" r="24" fill="none" stroke={GOLD} strokeWidth="0.3" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Choose Your Vault
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              9 vaults across 3 tiers: Starter, Pro, and Elite
            </p>
          </div>

          {vaultsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Starter Tier */}
              <div className="bg-navy-900 p-8 rounded-2xl border border-blue-500/30 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 bg-blue-500 blur-3xl"></div>
                <div className="relative">
                  <div className="tier-starter inline-block px-3 py-1 rounded-full text-sm font-medium mb-4">STARTER</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    From ${starterStats?.minDeposit?.toLocaleString() || '300'}
                  </h3>
                  <div className="space-y-3 text-gray-300 mt-6">
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>✓</span> Up to {starterStats?.maxBaseAPY || 16}% USDT APY
                    </p>
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>✓</span> Up to {starterStats?.maxTotalReturns || 18}% Total Returns
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-blue-400">⚡</span> Up to {starterStats?.maxTakaraAPY || 300}% Takara APY
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Tier */}
              <div className="bg-navy-900 p-8 rounded-2xl border border-purple-500/30 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 bg-purple-500 blur-3xl"></div>
                <div className="relative">
                  <div className="tier-pro inline-block px-3 py-1 rounded-full text-sm font-medium mb-4">PRO</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    From ${proStats?.minDeposit?.toLocaleString() || '1,000'}
                  </h3>
                  <div className="space-y-3 text-gray-300 mt-6">
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>✓</span> Up to {proStats?.maxBaseAPY || 18}% USDT APY
                    </p>
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>✓</span> Up to {proStats?.maxTotalReturns || 24}% Total Returns
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-purple-400">⚡</span> Up to {proStats?.maxTakaraAPY || 600}% Takara APY
                    </p>
                  </div>
                </div>
              </div>

              {/* Elite Tier */}
              <div className="bg-navy-900 p-8 rounded-2xl border border-gold-300/30 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 blur-3xl" style={{ background: GOLD }}></div>
                <div className="absolute top-0 right-0 text-navy-900 text-xs font-bold px-3 py-1" style={{ background: GOLD }}>
                  BEST VALUE
                </div>
                <div className="relative">
                  <div className="tier-elite inline-block px-3 py-1 rounded-full text-sm font-medium mb-4">ELITE</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    From ${eliteStats?.minDeposit?.toLocaleString() || '5,000'}
                  </h3>
                  <div className="space-y-3 text-gray-300 mt-6">
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>✓</span> Up to {eliteStats?.maxBaseAPY || 20}% USDT APY
                    </p>
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>✓</span> Up to {eliteStats?.maxTotalReturns || 60}% Total Returns
                    </p>
                    <p className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>⚡</span> Up to {eliteStats?.maxTakaraAPY || 1000}% Takara APY
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link
              to="/vaults"
              className="btn-gold inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg"
            >
              View All Vaults
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Treasury & Roadmap */}
      <section className="py-24 bg-navy-900 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 50%)` }}></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Treasury */}
            <div className="bg-navy-800 p-8 rounded-2xl border border-gold-300/20 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <Coins className="h-8 w-8" style={{ color: GOLD }} />
                  <h3 className="text-2xl font-bold text-white">Treasury & Roadmap</h3>
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Protocol growth is funded by a <span style={{ color: GOLD }} className="font-semibold">5% claiming fee</span> on rewards and early exit fees.
                </p>
                <div className="bg-navy-900 rounded-xl p-6 border border-gold-300/10">
                  <h4 style={{ color: GOLD }} className="font-semibold mb-2">Future:</h4>
                  <p className="text-gray-400">
                    Crypto-to-fiat card integration for direct spending of rewards.
                  </p>
                </div>
              </div>
            </div>

            {/* Wexel NFT */}
            <div className="bg-navy-800 p-8 rounded-2xl border border-gold-300/20 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 opacity-10" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-8 w-8" style={{ color: GOLD }} />
                  <h3 className="text-2xl font-bold text-white">Wexel Account NFT</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Your entire position is represented by a single NFT. This provides a clear exit path:
                  <span style={{ color: GOLD }} className="font-semibold"> keep for the full term</span> or
                  <span style={{ color: GOLD }} className="font-semibold"> sell early</span> via the protocol's liquidity model (subject to discount fees).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-b from-navy-800 to-navy-900 relative overflow-hidden">
        {/* Japanese patterns */}
        <div className="absolute inset-0 zen-circles opacity-30"></div>
        <div className="absolute inset-0 seigaiha-pattern opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 animate-pulse" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 40%)` }}></div>

        {/* Gold Tree on left */}
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-15 hidden lg:block">
          <img src="/images/brand/gold-tree.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Floating coins */}
        <div className="absolute top-[15%] right-[10%] w-20 h-20 opacity-30 animate-float hidden md:block" style={{ animationDuration: '5s' }}>
          <img src="/images/brand/gold-coin.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div className="absolute bottom-[25%] left-[15%] w-16 h-16 opacity-25 animate-float hidden md:block" style={{ animationDelay: '1s', animationDuration: '6s' }}>
          <img src="/images/brand/icon.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-[40%] left-[5%] w-12 h-12 opacity-20 animate-float hidden lg:block" style={{ animationDelay: '2s', animationDuration: '7s' }}>
          <img src="/images/brand/gold-coin.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Abstract shape */}
        <div className="absolute top-10 right-10 w-32 h-32 opacity-10 animate-spin-slow hidden lg:block">
          <img src="/images/brand/gold-abstract.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Animated concentric circles */}
        <div className="absolute top-20 left-20 w-40 h-40 opacity-15 animate-spin-slow" style={{ animationDuration: '30s' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke={GOLD} strokeWidth="0.5" />
            <circle cx="50" cy="50" r="35" fill="none" stroke={GOLD} strokeWidth="0.5" />
            <circle cx="50" cy="50" r="25" fill="none" stroke={GOLD} strokeWidth="0.5" />
          </svg>
        </div>
        <div className="absolute bottom-20 right-20 w-40 h-40 opacity-15 animate-spin-slow" style={{ animationDuration: '25s', animationDirection: 'reverse' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke={GOLD} strokeWidth="0.5" />
            <circle cx="50" cy="50" r="35" fill="none" stroke={GOLD} strokeWidth="0.5" />
            <circle cx="50" cy="50" r="25" fill="none" stroke={GOLD} strokeWidth="0.5" />
          </svg>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={`cta-particle-${i}`}
              className="absolute rounded-full animate-float-particle"
              style={{
                width: `${3 + (i % 4) * 2}px`,
                height: `${3 + (i % 4) * 2}px`,
                background: GOLD,
                opacity: 0.4,
                top: `${10 + (i * 8) % 80}%`,
                left: `${5 + (i * 10) % 90}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${5 + (i % 3) * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="animate-float" style={{ animationDuration: '6s' }}>
            <img
              src="/images/brand/logo-takara.png"
              alt="Takara"
              className="h-16 md:h-20 w-auto mx-auto mb-4 drop-shadow-lg"
            />
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Takara is for users who want capital protection first and rewards second
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Aligning deposit safety, real world yield, and long-term token scarcity on Solana
          </p>
          <div className="pt-4">
            <Link
              to="/vaults"
              className="btn-gold inline-flex items-center gap-2 px-10 py-4 rounded-lg font-semibold text-lg animate-pulse-glow"
            >
              Start Earning Today
              <ArrowRight className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
