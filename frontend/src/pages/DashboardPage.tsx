import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../services/api'
import { TrendingUp, DollarSign, Coins, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useClaimAll } from '../hooks/useInvestmentActions'

export default function DashboardPage() {
  const { connected } = useWallet()
  const { claimAllUSDT, claimAllTAKARA, isLoading: isClaimingAll } = useClaimAll()

  const { data: userResponse } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
    enabled: connected && api.isAuthenticated(),
  })

  const { data: investmentsResponse } = useQuery({
    queryKey: ['myInvestments'],
    queryFn: () => api.getMyInvestments(),
    enabled: connected && api.isAuthenticated(),
  })

  const user = userResponse?.data
  const investments = investmentsResponse?.data || []

  const activeInvestments = investments.filter((inv) => inv.status === 'ACTIVE')
  const totalPendingUSDT = investments.reduce((sum, inv) => sum + inv.pendingUSDT, 0)
  const totalPendingTAKARA = investments.reduce((sum, inv) => sum + inv.pendingTAKARA, 0)

  const investmentsWithPendingUSDT = investments
    .filter((inv) => inv.pendingUSDT > 0)
    .map((inv) => inv.id)

  const investmentsWithPendingTAKARA = investments
    .filter((inv) => inv.pendingTAKARA > 0)
    .map((inv) => inv.id)

  const handleClaimAllUSDT = async () => {
    await claimAllUSDT(investmentsWithPendingUSDT)
  }

  const handleClaimAllTAKARA = async () => {
    await claimAllTAKARA(investmentsWithPendingTAKARA)
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Wallet className="h-16 w-16 text-gray-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Overview of your investments and earnings</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Invested */}
          <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Invested</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${user?.totalInvested.toLocaleString() || '0'}
            </div>
          </div>

          {/* Total Earned USDT */}
          <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-gold-400" />
              </div>
              <span className="text-sm text-gray-400">Total Earned USDT</span>
            </div>
            <div className="text-2xl font-bold text-gold-500">
              ${user?.totalEarnedUSDT.toLocaleString() || '0'}
            </div>
          </div>

          {/* Total Mined TAKARA */}
          <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Coins className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Total Mined TAKARA</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {user?.totalMinedTAKARA.toLocaleString() || '0'}
            </div>
          </div>

          {/* Active Investments */}
          <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Active Investments</span>
            </div>
            <div className="text-2xl font-bold text-white">{activeInvestments.length}</div>
          </div>
        </div>

        {/* Pending Claims */}
        {(totalPendingUSDT > 0 || totalPendingTAKARA > 0) && (
          <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Pending Claims</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {totalPendingUSDT > 0 && (
                <div className="bg-background-card rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Claimable USDT</div>
                  <div className="text-2xl font-bold text-gold-500 mb-3">
                    ${totalPendingUSDT.toFixed(2)}
                  </div>
                  <button
                    onClick={handleClaimAllUSDT}
                    disabled={isClaimingAll}
                    className="btn-gold w-full py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaimingAll ? 'Claiming...' : 'Claim All USDT'}
                  </button>
                </div>
              )}
              {totalPendingTAKARA > 0 && (
                <div className="bg-background-card rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Claimable TAKARA</div>
                  <div className="text-2xl font-bold text-green-400 mb-3">
                    {totalPendingTAKARA.toFixed(2)}
                  </div>
                  <button
                    onClick={handleClaimAllTAKARA}
                    disabled={isClaimingAll}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-full py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    {isClaimingAll ? 'Claiming...' : 'Claim All TAKARA'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Investments List */}
        <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Your Active Investments</h2>
            <Link
              to="/portfolio"
              className="text-sm text-gold-500 hover:text-gold-400 transition-colors"
            >
              View All →
            </Link>
          </div>

          {activeInvestments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">You don't have any active investments yet</p>
              <Link to="/vaults" className="btn-gold inline-block px-6 py-2 rounded-lg">
                Explore Vaults
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeInvestments.slice(0, 5).map((investment) => (
                <div
                  key={investment.id}
                  className="bg-background-elevated rounded-lg p-4 border border-green-900/20"
                >
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className={`tier-${investment.vaultTier.toLowerCase()} inline-block mb-2`}>
                        {investment.vaultTier}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {investment.vaultName}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Started: {new Date(investment.startDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Investment</div>
                        <div className="text-sm font-semibold text-white">
                          ${investment.usdtAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">APY</div>
                        <div className="text-sm font-semibold text-gold-500">
                          {investment.finalAPY}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Earned USDT</div>
                        <div className="text-sm font-semibold text-green-400">
                          ${investment.totalEarnedUSDT.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Mined TAKARA</div>
                        <div className="text-sm font-semibold text-green-400">
                          {investment.totalMinedTAKARA.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
