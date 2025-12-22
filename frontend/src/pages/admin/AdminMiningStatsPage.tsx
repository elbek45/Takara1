import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Coins, TrendingUp, Users, Award } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'

export default function AdminMiningStatsPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: miningData, isLoading } = useQuery({
    queryKey: ['adminMiningStats'],
    queryFn: () => adminApiService.getMiningStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      </AdminLayout>
    )
  }

  const stats = miningData?.data

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Mining Statistics</h2>
          <p className="text-gray-400">Real-time TAKARA mining analytics</p>
        </div>

        {/* Overall Mining Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Coins className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Total Mined</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {(stats?.totalMined || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400 mt-1">TAKARA</div>
          </div>

          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gold-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-gold-500" />
              </div>
              <span className="text-sm text-gray-400">Takara APY</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {(stats?.totalMiningPower || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total Power</div>
          </div>

          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Active Miners</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {stats?.activeMiners || 0}
            </div>
            <div className="text-sm text-green-400 mt-1">Currently mining</div>
          </div>

          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Award className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Avg. Daily</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {(stats?.averageDailyMining || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400 mt-1">TAKARA/day</div>
          </div>
        </div>

        {/* Mining by Vault */}
        <div className="bg-background-card rounded-xl border border-green-900/20 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Mining by Vault</h3>
          <div className="space-y-4">
            {stats?.byVault?.map((vault: any) => (
              <div key={vault.vaultId} className="bg-background-elevated rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">{vault.vaultName}</div>
                    <div className="text-xs text-gray-400">{vault.activeInvestments} active investments</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-purple-400">
                      {vault.totalMined.toLocaleString()} TAKARA
                    </div>
                    <div className="text-xs text-gray-400">
                      Power: {vault.totalMiningPower.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-background-primary rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-gold-500 h-2 rounded-full"
                    style={{
                      width: `${(vault.totalMined / (stats?.totalMined || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {((vault.totalMined / (stats?.totalMined || 1)) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
            {!stats?.byVault?.length && (
              <p className="text-sm text-gray-500 text-center py-4">No mining activity yet</p>
            )}
          </div>
        </div>

        {/* Top Miners */}
        <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Miners</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-green-900/20 bg-green-900/5">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    TAKARA Mined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Takara APY
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Investments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/20">
                {stats?.topMiners?.map((miner: any, index: number) => (
                  <tr key={miner.userId} className="hover:bg-green-900/5">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="h-5 w-5 text-gold-500" />}
                        {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                        {index === 2 && <Award className="h-5 w-5 text-amber-700" />}
                        <span className="text-sm font-medium text-white">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{miner.username}</div>
                      <div className="text-xs text-gray-500">{miner.wallet.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-purple-400">
                        {miner.totalMined.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-white">{miner.takaraAPY.toLocaleString()}%</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">{miner.investments}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!stats?.topMiners?.length && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No miners yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
