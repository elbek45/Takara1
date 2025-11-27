import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { VaultTier } from '../types'

export default function VaultsPage() {
  const [selectedTier, setSelectedTier] = useState<VaultTier | 'ALL'>('ALL')
  const [selectedDuration, setSelectedDuration] = useState<number | 'ALL'>('ALL')

  const { data: vaultsResponse, isLoading, error } = useQuery({
    queryKey: ['vaults', selectedTier, selectedDuration],
    queryFn: () =>
      api.getVaults({
        tier: selectedTier === 'ALL' ? undefined : selectedTier,
        duration: selectedDuration === 'ALL' ? undefined : selectedDuration,
        isActive: true,
      }),
  })

  const vaults = vaultsResponse?.data || []

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Investment Vaults
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Choose from 9 premium vaults with varying durations, APY rates, and mining rewards
          </p>
        </div>

        {/* Filters */}
        <div className="bg-background-card rounded-xl p-6 mb-8 border border-green-900/20">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Filter by Tier
              </label>
              <div className="flex flex-wrap gap-2">
                {['ALL', VaultTier.STARTER, VaultTier.PRO, VaultTier.ELITE].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier as VaultTier | 'ALL')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedTier === tier
                        ? 'bg-gold-500 text-background-primary'
                        : 'bg-background-elevated text-gray-300 hover:bg-green-900/20'
                    }`}
                  >
                    {tier === 'ALL' ? 'All Tiers' : tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Filter by Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {['ALL', 12, 24, 36].map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration as number | 'ALL')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedDuration === duration
                        ? 'bg-gold-500 text-background-primary'
                        : 'bg-background-elevated text-gray-300 hover:bg-green-900/20'
                    }`}
                  >
                    {duration === 'ALL' ? 'All Durations' : `${duration} Months`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vaults Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-400">Loading vaults...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400">Error loading vaults. Please try again.</p>
          </div>
        ) : vaults.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No vaults found matching your filters.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                className="bg-background-card rounded-xl p-6 border border-green-900/20 card-glow hover:border-gold-500/50 transition-all"
              >
                {/* Tier Badge */}
                <div className={`tier-${vault.tier.toLowerCase()} inline-block mb-4`}>
                  {vault.tier}
                </div>

                {/* Vault Name */}
                <h3 className="text-xl font-bold text-white mb-2">{vault.name}</h3>

                {/* Duration */}
                <p className="text-gray-400 mb-4">{vault.duration} Months Lock-up</p>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Base APY</span>
                    <span className="text-lg font-semibold text-gold-500">
                      {vault.baseAPY}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Max APY (with boost)</span>
                    <span className="text-lg font-semibold text-gradient-gold">
                      {vault.maxAPY}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Mining Power</span>
                    <span className="text-lg font-semibold text-green-400">
                      {vault.miningPower}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Min Investment</span>
                    <span className="text-sm font-medium text-white">
                      ${vault.minInvestment.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Max Investment</span>
                    <span className="text-sm font-medium text-white">
                      ${vault.maxInvestment.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payout Schedule */}
                <div className="mb-6 p-3 bg-background-elevated rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Payout Schedule</div>
                  <div className="text-sm font-medium text-white">
                    {vault.payoutSchedule.replace('_', ' ')}
                  </div>
                </div>

                {/* Active Investments */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Active Investments</span>
                    <span className="text-white font-medium">{vault.activeInvestments}</span>
                  </div>
                  <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-gold"
                      style={{
                        width: vault.totalCapacity
                          ? `${(vault.currentFilled / vault.totalCapacity) * 100}%`
                          : '0%',
                      }}
                    ></div>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href={`/vaults/${vault.id}`}
                  className="btn-gold w-full text-center block py-3 rounded-lg font-semibold"
                >
                  View Details
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
