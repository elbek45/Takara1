import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { VaultTier } from '../types'

export default function VaultsPage() {
  const [selectedTier, setSelectedTier] = useState<VaultTier | 'ALL'>('ALL')
  const [selectedDuration, setSelectedDuration] = useState<number | 'ALL'>('ALL')
  const [takaraFilter, setTakaraFilter] = useState<'ALL' | 'WITH' | 'WITHOUT'>('ALL')

  const { data: vaultsResponse, isLoading, error } = useQuery({
    queryKey: ['vaults', selectedTier, selectedDuration],
    queryFn: () =>
      api.getVaults({
        tier: selectedTier === 'ALL' ? undefined : selectedTier,
        duration: selectedDuration === 'ALL' ? undefined : selectedDuration,
        isActive: true,
      }),
  })

  // Apply TAKARA filter on the client side
  const allVaults = vaultsResponse?.data || []
  const vaults = allVaults.filter((vault) => {
    if (takaraFilter === 'WITH') return vault.requireTAKARA
    if (takaraFilter === 'WITHOUT') return !vault.requireTAKARA
    return true
  })

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
                {['ALL', 18, 30, 36].map((duration) => (
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

            {/* TAKARA Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Filter by TAKARA
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'ALL', label: 'All' },
                  { value: 'WITH', label: 'With TAKARA' },
                  { value: 'WITHOUT', label: 'Without TAKARA' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTakaraFilter(option.value as 'ALL' | 'WITH' | 'WITHOUT')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      takaraFilter === option.value
                        ? 'bg-gold-500 text-background-primary'
                        : 'bg-background-elevated text-gray-300 hover:bg-green-900/20'
                    }`}
                  >
                    {option.label}
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
                {/* Header with Tier Badge and TAKARA Badge */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className={`tier-${vault.tier.toLowerCase()} inline-block`}>
                    {vault.tier}
                  </div>
                  {vault.requireTAKARA && vault.takaraRatio && (
                    <div className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-gold-500/20 border border-gold-500/40 rounded-lg text-xs font-semibold text-gold-400 text-center">
                      <div className="whitespace-nowrap">{vault.takaraRatio} TAKARA</div>
                      <div className="text-[10px] text-gold-500/70">per 100 USDT</div>
                    </div>
                  )}
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
                    <span className="text-sm text-gray-400">Max APY</span>
                    <span className="text-lg font-semibold text-gradient-gold">
                      {vault.maxAPY}%
                    </span>
                  </div>
                  {/* Total Return */}
                  <div className="bg-gradient-to-r from-gold-500/10 to-green-500/10 -mx-2 px-3 py-3 rounded-lg border border-gold-500/20">
                    <div className="text-sm font-medium text-gray-300 mb-2">Total Return</div>
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Base</div>
                        <div className="text-lg font-bold text-gray-300">{(vault.baseAPY * vault.duration / 12).toFixed(1)}%</div>
                      </div>
                      <div className="text-gray-500">→</div>
                      <div className="text-center">
                        <div className="text-xs text-gold-400 mb-1">Max</div>
                        <div className="text-xl font-bold text-gold-400">{(vault.maxAPY * vault.duration / 12).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                  {vault.requireTAKARA && vault.takaraRatio && (
                    <div className="flex justify-between items-center bg-green-900/10 -mx-2 px-2 py-2 rounded">
                      <span className="text-sm text-gray-400">TAKARA Required</span>
                      <span className="text-sm font-semibold text-gold-400">
                        {vault.takaraRatio} per 100 USDT
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Takara APY</span>
                    <span className="text-lg font-semibold text-green-400">
                      up to {vault.takaraAPY}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Min Investment</span>
                    <span className="text-sm font-medium text-white">
                      ${vault.minInvestment.toLocaleString()}
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

                {/* Earnings Projections */}
                <div className="mb-6 space-y-4">
                  {/* USDT Earnings */}
                  <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                    <div className="text-xs text-blue-400 font-semibold mb-3">
                      USDT Earnings (Min ${vault.minInvestment.toLocaleString()})
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start text-xs">
                        <span className="text-gray-400">Monthly</span>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${((vault.minInvestment * vault.baseAPY / 100 * (vault.duration / 12)) / vault.duration).toFixed(2)}
                          </div>
                          <div className="text-gold-400 text-[10px]">
                            ${((vault.minInvestment * vault.maxAPY / 100 * (vault.duration / 12)) / vault.duration).toFixed(2)} max
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-start text-xs">
                        <span className="text-gray-400">Yearly</span>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${(vault.minInvestment * vault.baseAPY / 100).toFixed(2)}
                          </div>
                          <div className="text-gold-400 text-[10px]">
                            ${(vault.minInvestment * vault.maxAPY / 100).toFixed(2)} max
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-start text-xs border-t border-blue-900/20 pt-2">
                        <span className="text-gray-400">Total ({vault.duration}M)</span>
                        <div className="text-right">
                          <div className="text-blue-400 font-bold">
                            ${(vault.minInvestment * vault.baseAPY / 100 * (vault.duration / 12)).toFixed(2)}
                          </div>
                          <div className="text-gold-400 text-[10px] font-semibold">
                            ${(vault.minInvestment * vault.maxAPY / 100 * (vault.duration / 12)).toFixed(2)} max
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TAKARA Mining */}
                  <div className="p-4 bg-green-900/10 border border-green-900/30 rounded-lg">
                    <div className="text-xs text-green-400 font-semibold mb-3">
                      TAKARA Mining (Min ${vault.minInvestment.toLocaleString()})
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Daily</span>
                        <span className="text-white font-medium">
                          {((vault.minInvestment * vault.takaraAPY / 100) / 365).toFixed(2)} TAKARA
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Monthly</span>
                        <span className="text-white font-medium">
                          {(((vault.minInvestment * vault.takaraAPY / 100) / 365) * 30).toFixed(2)} TAKARA
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Yearly</span>
                        <span className="text-white font-medium">
                          {(vault.minInvestment * vault.takaraAPY / 100).toFixed(2)} TAKARA
                        </span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-green-900/20 pt-2">
                        <span className="text-gray-400">Total ({vault.duration}M)</span>
                        <span className="text-green-400 font-bold">
                          {(((vault.minInvestment * vault.takaraAPY / 100) / 365) * vault.duration * 30).toFixed(2)} TAKARA
                        </span>
                      </div>
                    </div>
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
