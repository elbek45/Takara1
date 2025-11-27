import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { LogOut, Users, TrendingUp, DollarSign, Coins, Package, ShoppingCart, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const navigate = useNavigate()

  // Check authentication
  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminApiService.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleLogout = () => {
    adminApiService.logout()
    toast.success('Logged out successfully')
    navigate('/admin/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  const stats = dashboardData?.data?.stats

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="bg-background-card border-b border-green-900/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-gray-400">Takara Gold v2.1.1</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</div>
          </div>

          {/* Total Investments */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Investments</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.totalInvestments || 0}</div>
            <div className="text-sm text-green-400 mt-1">
              {stats?.activeInvestments || 0} active
            </div>
          </div>

          {/* Total Value Locked */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gold-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-gold-500" />
              </div>
              <span className="text-sm text-gray-400">TVL (USDT)</span>
            </div>
            <div className="text-3xl font-bold text-white">
              ${(stats?.totalValueLocked || 0).toLocaleString()}
            </div>
          </div>

          {/* Total TAKARA Mined */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Coins className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">TAKARA Mined</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {(stats?.totalTAKARAMined || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pending Withdrawals */}
          <div className="bg-background-card rounded-xl border border-yellow-900/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Pending Withdrawals</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{stats?.pendingWithdrawals || 0}</div>
          </div>

          {/* Marketplace Listings */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <ShoppingCart className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Marketplace Listings</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{stats?.marketplaceListings || 0}</div>
          </div>

          {/* Total USDT Paid */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">USDT Paid Out</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              ${(stats?.totalUSDTPaid || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Investments */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Investments</h3>
            <div className="space-y-3">
              {dashboardData?.data?.recentInvestments?.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex justify-between items-center p-3 bg-background-elevated rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">{inv.user}</div>
                    <div className="text-xs text-gray-400">{inv.vault}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gold-500">${inv.amount.toLocaleString()}</div>
                    <div className={`text-xs ${inv.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {inv.status}
                    </div>
                  </div>
                </div>
              ))}
              {!dashboardData?.data?.recentInvestments?.length && (
                <p className="text-sm text-gray-500 text-center py-4">No recent investments</p>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Users</h3>
            <div className="space-y-3">
              {dashboardData?.data?.recentUsers?.map((user: any) => (
                <div key={user.id} className="flex justify-between items-center p-3 bg-background-elevated rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {user.username || user.walletAddress.slice(0, 8) + '...'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-green-400">New</div>
                </div>
              ))}
              {!dashboardData?.data?.recentUsers?.length && (
                <p className="text-sm text-gray-500 text-center py-4">No recent users</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
