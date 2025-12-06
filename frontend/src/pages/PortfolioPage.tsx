import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../services/api'
import { InvestmentStatus, Investment } from '../types'
import { Wallet, ExternalLink, Tag, X } from 'lucide-react'
import { useClaimUSDT, useClaimTAKARA } from '../hooks/useInvestmentActions'
import { useCancelListing } from '../hooks/useMarketplace'
import ListNFTModal from '../components/marketplace/ListNFTModal'

export default function PortfolioPage() {
  const { connected } = useWallet()
  const [statusFilter, setStatusFilter] = useState<InvestmentStatus | 'ALL'>('ALL')
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const claimUSDT = useClaimUSDT()
  const claimTAKARA = useClaimTAKARA()
  const cancelListing = useCancelListing()

  const { data: investmentsResponse, isLoading } = useQuery({
    queryKey: ['myInvestments', statusFilter],
    queryFn: () =>
      api.getMyInvestments(statusFilter === 'ALL' ? undefined : statusFilter),
    enabled: connected && api.isAuthenticated(),
  })

  const investments = investmentsResponse?.data || []

  // Fetch user's listings
  const { data: listingsResponse } = useQuery({
    queryKey: ['myListings'],
    queryFn: () => api.getMyListings(),
    enabled: connected && api.isAuthenticated(),
  })

  const myListings = listingsResponse?.data || []

  // Check if investment is listed
  const isListed = (investmentId: string) => {
    return myListings.some((listing: any) => listing.investmentId === investmentId)
  }

  // Get listing ID for investment
  const getListingId = (investmentId: string) => {
    const listing = myListings.find((l: any) => l.investmentId === investmentId)
    return listing?.id
  }

  const handleListClick = (investment: Investment) => {
    setSelectedInvestment(investment)
    setIsListModalOpen(true)
  }

  const handleCancelListing = async (investmentId: string) => {
    const listingId = getListingId(investmentId)
    if (listingId) {
      await cancelListing.mutateAsync(listingId)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Wallet className="h-16 w-16 text-gray-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view your portfolio</p>
        </div>
      </div>
    )
  }

  const statusColors: Record<InvestmentStatus, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
    COMPLETED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    WITHDRAWN: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    SOLD: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Portfolio</h1>
          <p className="text-gray-400">View and manage all your investments</p>
        </div>

        {/* Status Filter */}
        <div className="bg-background-card rounded-xl p-6 mb-8 border border-green-900/20">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Filter by Status
          </label>
          <div className="flex flex-wrap gap-2">
            {['ALL', ...Object.values(InvestmentStatus)].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as InvestmentStatus | 'ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-500 text-background-primary'
                    : 'bg-background-elevated text-gray-300 hover:bg-green-900/20'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Investments List */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-400">Loading investments...</p>
          </div>
        ) : investments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No investments found</p>
            <a href="/vaults" className="btn-gold inline-block px-6 py-2 rounded-lg">
              Browse Vaults
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map((investment) => (
              <div
                key={investment.id}
                className="bg-background-card rounded-xl p-6 border border-green-900/20 hover:border-gold-500/30 transition-all"
              >
                {/* Header */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`tier-${investment.vaultTier.toLowerCase()} inline-block`}>
                        {investment.vaultTier}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                          statusColors[investment.status]
                        }`}
                      >
                        {investment.status}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {investment.vaultName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(investment.startDate).toLocaleDateString()} -{' '}
                      {new Date(investment.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  {investment.nftMintAddress && (
                    <a
                      href={`https://solscan.io/token/${investment.nftMintAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400 transition-colors"
                    >
                      View Wexel
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-background-elevated rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">USDT Investment</div>
                    <div className="text-lg font-semibold text-white">
                      ${investment.usdtAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-background-elevated rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">TAKARA Locked</div>
                    <div className="text-lg font-semibold text-white">
                      {investment.takaraLocked.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-background-elevated rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Final APY</div>
                    <div className="text-lg font-semibold text-gold-500">
                      {investment.finalAPY}%
                    </div>
                  </div>

                  <div className="bg-background-elevated rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Earned</div>
                    <div className="text-lg font-semibold text-green-400">
                      ${investment.totalEarnedUSDT.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-background-elevated rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Mined</div>
                    <div className="text-lg font-semibold text-green-400">
                      {investment.totalMinedTAKARA.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-background-elevated rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <div className="text-sm font-medium text-white">{investment.status}</div>
                  </div>
                </div>

                {/* LAIKA Boost Info */}
                {investment.laikaBoost && (
                  <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-4 mb-6">
                    <div className="text-sm text-laika-purple font-medium mb-2">
                      LAIKA Boost Active
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">LAIKA Amount</div>
                        <div className="text-white font-semibold">
                          ${investment.laikaBoost.laikaAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Additional APY</div>
                        <div className="text-laika-green font-semibold">
                          +{investment.laikaBoost.additionalAPY}%
                        </div>
                      </div>
                    </div>
                    {investment.laikaBoost.isReturned && (
                      <div className="mt-2 text-sm text-green-400">✓ LAIKA returned</div>
                    )}
                  </div>
                )}

                {/* TAKARA Boost Info - v2.2 */}
                {investment.takaraBoost && (
                  <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-4 mb-6">
                    <div className="text-sm text-green-400 font-medium mb-2">
                      TAKARA Boost Active ⚡
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">TAKARA Amount</div>
                        <div className="text-white font-semibold">
                          {investment.takaraBoost.takaraAmount.toLocaleString()} TAKARA
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Value (USD)</div>
                        <div className="text-white font-semibold">
                          ${investment.takaraBoost.takaraValueUSD.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Additional APY</div>
                        <div className="text-green-400 font-semibold">
                          +{investment.takaraBoost.additionalAPY}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Boost: {investment.takaraBoost.boostPercentage}% of max allowed (${investment.takaraBoost.maxAllowedUSD})
                    </div>
                    {investment.takaraBoost.isReturned && (
                      <div className="mt-2 text-sm text-green-400">✓ TAKARA returned</div>
                    )}
                  </div>
                )}

                {/* Instant Sale Info - v2.2 */}
                {investment.status === 'ACTIVE' && investment.instantSalePrice && (
                  <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-yellow-400 font-medium">
                        Instant Sale {investment.isInstantSaleEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        investment.isInstantSaleEnabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {investment.isInstantSaleEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Instant Sale Price</div>
                        <div className="text-white font-semibold">
                          ${investment.instantSalePrice.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Original Value</div>
                        <div className="text-gray-300">
                          ${investment.usdtAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-yellow-400">
                      💡 20% discount for instant sale. Platform purchases at market value.
                    </div>
                  </div>
                )}

                {/* List / Cancel Listing Actions */}
                {investment.status === 'ACTIVE' && (
                  <div className="border-t border-green-900/20 pt-4">
                    {isListed(investment.id) ? (
                      <button
                        onClick={() => handleCancelListing(investment.id)}
                        disabled={cancelListing.isPending}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        {cancelListing.isPending ? 'Cancelling...' : 'Cancel Listing'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleListClick(investment)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Tag className="h-4 w-4" />
                        List for Sale
                      </button>
                    )}
                  </div>
                )}

                {/* Pending Claims */}
                {(investment.pendingUSDT > 0 || investment.pendingTAKARA > 0) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {investment.pendingUSDT > 0 && (
                      <div className="bg-background-elevated rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">Pending USDT</div>
                        <div className="text-xl font-bold text-gold-500 mb-3">
                          ${investment.pendingUSDT.toFixed(2)}
                        </div>
                        <button
                          onClick={() => claimUSDT.mutate(investment.id)}
                          disabled={claimUSDT.isPending}
                          className="btn-gold w-full py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claimUSDT.isPending ? 'Claiming...' : 'Claim USDT'}
                        </button>
                      </div>
                    )}

                    {investment.pendingTAKARA > 0 && (
                      <div className="bg-background-elevated rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">Pending TAKARA</div>
                        <div className="text-xl font-bold text-green-400 mb-3">
                          {investment.pendingTAKARA.toFixed(2)}
                        </div>
                        <button
                          onClick={() => claimTAKARA.mutate(investment.id)}
                          disabled={claimTAKARA.isPending}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-full py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                          {claimTAKARA.isPending ? 'Claiming...' : 'Claim TAKARA'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List Wexel Modal */}
      {selectedInvestment && (
        <ListNFTModal
          isOpen={isListModalOpen}
          onClose={() => {
            setIsListModalOpen(false)
            setSelectedInvestment(null)
          }}
          investment={selectedInvestment}
        />
      )}
    </div>
  )
}
