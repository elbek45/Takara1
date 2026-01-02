import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Pickaxe, TrendingUp, Users, DollarSign, CheckCircle, Clock, Target } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'

interface VaultWithStats {
  id: string
  name: string
  tier: string
  duration: number
  minInvestment: number
  maxInvestment: number
  baseAPY: number
  maxAPY: number
  baseTakaraAPY: number
  maxTakaraAPY: number
  currentFilled: number
  totalCapacity: number | null
  miningThreshold: number
  isMining: boolean
  isActive: boolean
  statistics: {
    totalInvestments: number
    activeInvestments: number
    totalUSDT: number
    fillPercentage: number | null
  }
}

export default function AdminMiningVaultsPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: vaultsData, isLoading } = useQuery({
    queryKey: ['adminVaults'],
    queryFn: () => adminApiService.getVaults(),
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

  const vaults: VaultWithStats[] = vaultsData?.data || []

  // Separate active mining vaults from pending
  const miningVaults = vaults.filter(v => v.isMining && v.isActive)
  const pendingMiningVaults = vaults.filter(v => !v.isMining && v.isActive)

  // Calculate totals
  const totalMiningUSDT = miningVaults.reduce((sum, v) => sum + Number(v.currentFilled), 0)
  const totalMiningInvestments = miningVaults.reduce((sum, v) => sum + v.statistics.activeInvestments, 0)

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STARTER': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'PRO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'ELITE': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const calculateMiningProgress = (vault: VaultWithStats) => {
    const threshold = Number(vault.miningThreshold)
    const current = Number(vault.currentFilled)
    if (threshold <= 0) return 100
    return Math.min(100, (current / threshold) * 100)
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Pickaxe className="h-6 w-6 text-gold-400" />
            Active Mining Vaults
          </h2>
          <p className="text-gray-400">Vaults that have reached their investment threshold and started TAKARA mining</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background-card rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Pickaxe className="h-4 w-4" />
              <span className="text-xs font-medium">MINING VAULTS</span>
            </div>
            <div className="text-2xl font-bold text-white">{miningVaults.length}</div>
          </div>
          <div className="bg-background-card rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">PENDING START</span>
            </div>
            <div className="text-2xl font-bold text-white">{pendingMiningVaults.length}</div>
          </div>
          <div className="bg-background-card rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">TOTAL TVL (MINING)</span>
            </div>
            <div className="text-2xl font-bold text-white">${totalMiningUSDT.toLocaleString()}</div>
          </div>
          <div className="bg-background-card rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">ACTIVE INVESTMENTS</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalMiningInvestments}</div>
          </div>
        </div>

        {/* Active Mining Vaults */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Mining Active ({miningVaults.length})
          </h3>

          {miningVaults.length === 0 ? (
            <div className="bg-background-card rounded-xl border border-green-900/20 p-8 text-center">
              <Pickaxe className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No vaults have started mining yet</p>
              <p className="text-sm text-gray-500 mt-1">Vaults start mining when they reach their investment threshold</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {miningVaults.map((vault) => (
                <div key={vault.id} className="bg-background-card rounded-xl border border-green-500/30 p-5 relative overflow-hidden">
                  {/* Mining indicator */}
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 font-medium">MINING</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTierColor(vault.tier)}`}>
                      {vault.tier}
                    </span>
                    <span className="text-xs text-gray-500">{vault.duration} months</span>
                  </div>

                  <h4 className="text-lg font-bold text-white mb-3">{vault.name}</h4>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Invested</span>
                      <span className="text-white font-medium">${Number(vault.currentFilled).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mining Threshold</span>
                      <span className="text-green-400 font-medium">${Number(vault.miningThreshold).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Investments</span>
                      <span className="text-white font-medium">{vault.statistics.activeInvestments}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">TAKARA APY</span>
                      <span className="text-gold-400 font-medium">{vault.baseTakaraAPY}% - {vault.maxTakaraAPY}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">USDT APY</span>
                      <span className="text-green-400 font-medium">{vault.baseAPY}% - {vault.maxAPY}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Mining Vaults */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-yellow-400" />
            Pending Mining Start ({pendingMiningVaults.length})
          </h3>

          {pendingMiningVaults.length === 0 ? (
            <div className="bg-background-card rounded-xl border border-green-900/20 p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-gray-400">All active vaults have reached their mining threshold</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingMiningVaults.map((vault) => {
                const progress = calculateMiningProgress(vault)
                const remaining = Math.max(0, Number(vault.miningThreshold) - Number(vault.currentFilled))

                return (
                  <div key={vault.id} className="bg-background-card rounded-xl border border-yellow-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTierColor(vault.tier)}`}>
                        {vault.tier}
                      </span>
                      <span className="text-xs text-gray-500">{vault.duration} months</span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-3">{vault.name}</h4>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress to Mining</span>
                        <span className="text-gold-400">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-gold-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Invested</span>
                        <span className="text-white font-medium">${Number(vault.currentFilled).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Threshold</span>
                        <span className="text-yellow-400 font-medium">${Number(vault.miningThreshold).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Remaining</span>
                        <span className="text-red-400 font-medium">${remaining.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Active Investments</span>
                        <span className="text-white font-medium">{vault.statistics.activeInvestments}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">TAKARA APY (after mining)</span>
                        <span className="text-gold-400 font-medium">{vault.baseTakaraAPY}% - {vault.maxTakaraAPY}%</span>
                      </div>
                    </div>

                    {progress >= 80 && (
                      <div className="mt-4 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <p className="text-xs text-yellow-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Almost there! {(100 - progress).toFixed(1)}% to go
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
