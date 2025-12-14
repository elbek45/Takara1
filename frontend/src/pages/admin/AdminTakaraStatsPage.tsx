import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { adminApiService } from '../../services/admin.api'
import AdminLayout from '../../components/admin/AdminLayout'

export default function AdminTakaraStatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'takara', 'stats'],
    queryFn: () => adminApiService.getTakaraStats(),
    refetchInterval: 30000 // Обновлять каждые 30 секунд
  })

  const { data: breakdown } = useQuery({
    queryKey: ['admin', 'takara', 'breakdown'],
    queryFn: () => adminApiService.getTakaraBreakdown(),
    refetchInterval: 60000
  })

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading TAKARA statistics...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!stats?.data) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-neutral-400">No data available</p>
        </div>
      </AdminLayout>
    )
  }

  const supply = stats.data.supply
  const price = stats.data.price
  const treasury = stats.data.treasury
  const statsInfo = stats.data.stats

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">TAKARA Statistics</h1>
            <p className="text-neutral-400 mt-1">Comprehensive TAKARA supply tracking & analytics</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-400">Last updated</p>
            <p className="text-white font-medium">
              {format(new Date(supply.calculatedAt), 'PPp')}
            </p>
          </div>
        </div>

        {/* Supply Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-800 rounded-lg p-6 border border-emerald-600/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-400">Total Mined</h3>
              <span className="text-emerald-400 text-xs">↗ Mining Pool</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {supply.totalMined.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Earned through mining
            </p>
          </div>

          <div className="bg-neutral-800 rounded-lg p-6 border border-amber-600/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-400">Entry Locked</h3>
              <span className="text-amber-400 text-xs">⟲ Returns to Users</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {supply.totalEntryLocked.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {statsInfo.investmentsWithTakara} active investments
            </p>
          </div>

          <div className="bg-neutral-800 rounded-lg p-6 border border-blue-600/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-400">Boost Locked</h3>
              <span className="text-blue-400 text-xs">⟲ Returns to Users</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {supply.totalBoostLocked.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {statsInfo.activeBoosts} active boosts
            </p>
          </div>

          <div className="bg-neutral-800 rounded-lg p-6 border border-red-600/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-400">Claim Tax (5%)</h3>
              <span className="text-red-400 text-xs">⊗ Treasury</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {supply.totalClaimTax.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Stays in treasury
            </p>
          </div>
        </div>

        {/* Circulating Supply & Price */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Circulating Supply */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Circulating Supply</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Circulating Supply</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {supply.circulatingSupply.toLocaleString()}
                </span>
              </div>

              <div className="h-px bg-neutral-700"></div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Mined (User-owned)</span>
                  <span className="text-white">{supply.totalMined.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Entry Locked (Returns)</span>
                  <span className="text-white">+{supply.totalEntryLocked.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Boost Locked (Returns)</span>
                  <span className="text-white">+{supply.totalBoostLocked.toLocaleString()}</span>
                </div>
              </div>

              <div className="h-px bg-neutral-700"></div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Total Supply (600M)</span>
                <span className="text-white">{(600_000_000).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">% Circulating</span>
                <span className="text-emerald-400 font-medium">
                  {((supply.circulatingSupply / 600_000_000) * 100).toFixed(4)}%
                </span>
              </div>

              <div className="mt-4 bg-neutral-900 rounded-lg p-4">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  <strong className="text-emerald-400">Formula:</strong> Circulating Supply =
                  Mined + Entry Locked + Boost Locked
                  <br />
                  <span className="text-neutral-500">
                    (All TAKARA owned by users, including what will be returned)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Price Information */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Dynamic Pricing</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Current Price</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ${price.currentPrice.toFixed(6)}
                </span>
              </div>

              <div className="h-px bg-neutral-700"></div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400">Time Factor ({(price.timeFactor * 100).toFixed(2)}%)</span>
                    <span className="text-xs text-white">{(price.timeFactor * 0.40 * 100).toFixed(2)}% weight</span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2 rounded-full"
                      style={{ width: `${price.timeFactor * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400">Supply Factor ({(price.supplyFactor * 100).toFixed(2)}%)</span>
                    <span className="text-xs text-white">{(price.supplyFactor * 0.40 * 100).toFixed(2)}% weight</span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full"
                      style={{ width: `${price.supplyFactor * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400">Difficulty Factor ({(price.difficultyFactor * 100).toFixed(2)}%)</span>
                    <span className="text-xs text-white">{(price.difficultyFactor * 0.20 * 100).toFixed(2)}% weight</span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-600 to-amber-400 h-2 rounded-full"
                      style={{ width: `${price.difficultyFactor * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-neutral-700"></div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-400 text-xs">Initial Price</p>
                  <p className="text-white font-medium">${price.initialPrice?.toFixed(6) || '0.001000'}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs">Target Price (5 years)</p>
                  <p className="text-white font-medium">${price.targetPrice?.toFixed(6) || '0.100000'}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs">Days Elapsed</p>
                  <p className="text-white font-medium">{Math.floor(price.daysElapsed)} / {price.totalDays}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs">Progress</p>
                  <p className="text-emerald-400 font-medium">{price.percentComplete.toFixed(2)}%</p>
                </div>
              </div>

              {price.projectedPrice30Days && (
                <>
                  <div className="h-px bg-neutral-700"></div>
                  <div className="bg-emerald-900/20 rounded-lg p-3">
                    <p className="text-xs text-neutral-400 mb-1">30-Day Projection</p>
                    <p className="text-lg font-bold text-emerald-400">
                      ${price.projectedPrice30Days.toFixed(6)}
                      <span className="text-sm text-emerald-500 ml-2">
                        (+{price.projectedIncrease30Days?.toFixed(2)}%)
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Treasury Information */}
        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
          <h3 className="text-lg font-semibold text-white mb-4">Treasury (Claim Tax)</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-neutral-400 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-white">
                {treasury.balance.toLocaleString()} TAKARA
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                ${(treasury.balance * price.currentPrice).toFixed(2)} USD
              </p>
            </div>

            <div>
              <p className="text-sm text-neutral-400 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-400">
                {treasury.totalCollected.toLocaleString()} TAKARA
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                5% claim tax on all TAKARA withdrawals
              </p>
            </div>

            <div>
              <p className="text-sm text-neutral-400 mb-1">Total Withdrawn (Admin)</p>
              <p className="text-2xl font-bold text-amber-400">
                {treasury.totalWithdrawn.toLocaleString()} TAKARA
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Administrative withdrawals from treasury
              </p>
            </div>
          </div>
        </div>

        {/* Recent Tax Records */}
        {stats.data.recentTaxRecords && stats.data.recentTaxRecords.length > 0 && (
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Claim Tax Records</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left text-xs font-medium text-neutral-400 pb-3">User ID</th>
                    <th className="text-right text-xs font-medium text-neutral-400 pb-3">Before Tax</th>
                    <th className="text-right text-xs font-medium text-neutral-400 pb-3">Tax (5%)</th>
                    <th className="text-right text-xs font-medium text-neutral-400 pb-3">After Tax</th>
                    <th className="text-right text-xs font-medium text-neutral-400 pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700">
                  {stats.data.recentTaxRecords.slice(0, 10).map((record) => (
                    <tr key={record.id}>
                      <td className="py-3 text-sm text-neutral-300 font-mono">
                        {record.userId.substring(0, 8)}...
                      </td>
                      <td className="py-3 text-sm text-right text-white">
                        {record.amountBeforeTax.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-right text-red-400">
                        {record.taxAmount.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-right text-emerald-400">
                        {record.amountAfterTax.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-right text-neutral-400">
                        {format(new Date(record.createdAt), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Breakdown */}
        {breakdown?.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entry Locked Breakdown */}
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Entry Locked Breakdown
                <span className="text-sm text-neutral-400 ml-2">
                  ({breakdown.data.entryLocked.count} investments)
                </span>
              </h3>

              <div className="mb-4">
                <p className="text-sm text-neutral-400">Total Entry Locked</p>
                <p className="text-2xl font-bold text-amber-400">
                  {breakdown.data.entryLocked.total.toLocaleString()} TAKARA
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {breakdown.data.entryLocked.investments.slice(0, 20).map((inv) => (
                  <div key={inv.id} className="bg-neutral-900 rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-neutral-400 font-mono text-xs">
                        {inv.userId.substring(0, 8)}...
                      </span>
                      <span className="text-white font-medium">
                        {inv.takaraLocked.toFixed(2)} TAKARA
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">{inv.status}</span>
                      <span className="text-neutral-500">
                        Returns: {format(new Date(inv.endDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Boost Locked Breakdown */}
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Boost Locked Breakdown
                <span className="text-sm text-neutral-400 ml-2">
                  ({breakdown.data.boostLocked.count} boosts)
                </span>
              </h3>

              <div className="mb-4">
                <p className="text-sm text-neutral-400">Total Boost Locked</p>
                <p className="text-2xl font-bold text-blue-400">
                  {breakdown.data.boostLocked.total.toLocaleString()} TAKARA
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {breakdown.data.boostLocked.boosts.slice(0, 20).map((boost) => (
                  <div key={boost.id} className="bg-neutral-900 rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-neutral-400 font-mono text-xs">
                        {boost.userId.substring(0, 8)}...
                      </span>
                      <span className="text-white font-medium">
                        {boost.takaraAmount.toFixed(2)} TAKARA
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">
                        ${boost.takaraValueUSD.toFixed(2)} USD
                      </span>
                      <span className="text-neutral-500">
                        Returns: {format(new Date(boost.returnDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
