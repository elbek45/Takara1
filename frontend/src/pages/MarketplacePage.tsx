import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { VaultTier, MarketplaceListing } from '../types'
import { TrendingUp, Clock, DollarSign, ExternalLink } from 'lucide-react'
import BuyNFTModal from '../components/marketplace/BuyNFTModal'

export default function MarketplacePage() {
  const isAuthenticated = api.isAuthenticated()
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [tierFilter, setTierFilter] = useState<VaultTier | 'ALL'>('ALL')
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false)

  const { data: listingsResponse, isLoading } = useQuery({
    queryKey: ['marketplace', sortBy, sortOrder, tierFilter],
    queryFn: () =>
      api.getMarketplaceListings({
        status: 'ACTIVE',
        sortBy,
        sortOrder,
      }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ['marketplaceStats'],
    queryFn: () => api.getMarketplaceStats(),
  })

  const listings = listingsResponse?.data || []
  const stats = statsResponse?.data

  const filteredListings =
    tierFilter === 'ALL'
      ? listings
      : listings.filter((listing) => listing.vault.tier === tierFilter)

  const handleBuyClick = (listing: MarketplaceListing) => {
    setSelectedListing(listing)
    setIsBuyModalOpen(true)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Wexel Marketplace</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Trade investment Wexels before term maturity. Buy active investments or list yours for sale.
          </p>
        </div>

        {/* Marketplace Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="text-sm text-gray-400 mb-2">Total Listings</div>
              <div className="text-2xl font-bold text-white">{stats.totalListings || 0}</div>
            </div>
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="text-sm text-gray-400 mb-2">Total Volume</div>
              <div className="text-2xl font-bold text-gold-500">
                ${(stats.totalVolume || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="text-sm text-gray-400 mb-2">Floor Price</div>
              <div className="text-2xl font-bold text-white">
                ${(stats.floorPrice || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="text-sm text-gray-400 mb-2">Active Listings</div>
              <div className="text-2xl font-bold text-green-400">
                {stats.activeListings || 0}
              </div>
            </div>
          </div>
        )}

        {/* Filters & Sort */}
        <div className="bg-background-card rounded-xl p-6 mb-8 border border-green-900/20">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Tier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Filter by Tier
              </label>
              <div className="flex flex-wrap gap-2">
                {['ALL', VaultTier.STARTER, VaultTier.PRO, VaultTier.ELITE].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier as VaultTier | 'ALL')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tierFilter === tier
                        ? 'bg-gold-500 text-background-primary'
                        : 'bg-background-elevated text-gray-300 hover:bg-green-900/20'
                    }`}
                  >
                    {tier === 'ALL' ? 'All' : tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
              >
                <option value="createdAt">Newest</option>
                <option value="priceUSDT">Price</option>
                <option value="finalAPY">APY</option>
                <option value="remainingMonths">Time Remaining</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-400">Loading marketplace...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No listings available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-background-card rounded-xl p-6 border border-green-900/20 card-glow hover:border-gold-500/50 transition-all"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`tier-${listing.vault.tier.toLowerCase()} inline-block`}>
                    {listing.vault.tier}
                  </div>
                  {listing.nftMintAddress && (
                    <a
                      href={`https://solscan.io/token/${listing.nftMintAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gold-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Vault Name */}
                <h3 className="text-lg font-bold text-white mb-1">{listing.vault.name}</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {listing.vault.duration} Months Vault
                </p>

                {/* Price */}
                <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-gold-500" />
                    <span className="text-sm text-gray-400">Listing Price</span>
                  </div>
                  <div className="text-3xl font-bold text-gold-500">
                    ${listing.priceUSDT.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Original: ${listing.originalInvestment.toLocaleString()}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gold-500" />
                      <span className="text-sm text-gray-400">APY</span>
                    </div>
                    <span className="text-sm font-semibold text-gold-500">
                      {listing.finalAPY}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Time Left</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {listing.remainingMonths} months
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                    <span className="text-sm text-gray-400">Earned USDT</span>
                    <span className="text-sm font-semibold text-green-400">
                      ${listing.totalEarnedUSDT.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                    <span className="text-sm text-gray-400">Mined TAKARA</span>
                    <span className="text-sm font-semibold text-green-400">
                      {listing.totalMinedTAKARA.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* LAIKA Boost */}
                {listing.laikaBoost && (
                  <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-3 mb-4">
                    <div className="text-xs text-laika-purple font-medium mb-2">
                      LAIKA Boost Active
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Boost APY</span>
                      <span className="text-laika-green font-semibold">
                        +{listing.laikaBoost.additionalAPY}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Seller Info */}
                <div className="text-xs text-gray-500 mb-4">
                  Seller: {listing.seller.walletAddress
                    ? `${listing.seller.walletAddress.slice(0, 6)}...${listing.seller.walletAddress.slice(-4)}`
                    : listing.seller.username || 'Anonymous'}
                </div>

                {/* Platform Fee */}
                <div className="text-xs text-gray-500 mb-4">
                  Platform fee: {listing.platformFee}%
                </div>

                {/* Buy Button */}
                {!isAuthenticated ? (
                  <div className="text-center py-3 text-sm text-gray-400">
                    Connect wallet to buy
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuyClick(listing)}
                    className="btn-gold w-full py-3 rounded-lg font-semibold"
                  >
                    Buy Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Wexel Modal */}
      {selectedListing && (
        <BuyNFTModal
          isOpen={isBuyModalOpen}
          onClose={() => {
            setIsBuyModalOpen(false)
            setSelectedListing(null)
          }}
          listing={selectedListing}
        />
      )}
    </div>
  )
}
