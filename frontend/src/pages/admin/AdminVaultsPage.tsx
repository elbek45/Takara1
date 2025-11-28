import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { ChevronLeft, ChevronRight, TrendingUp, Users, DollarSign } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { toast } from 'sonner'

export default function AdminVaultsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: vaultsData, isLoading } = useQuery({
    queryKey: ['adminVaults', page],
    queryFn: () => adminApiService.getInvestments({ page, limit }),
  })

  const toggleVaultMutation = useMutation({
    mutationFn: (data: { vaultId: string; isActive: boolean }) =>
      adminApiService.toggleVaultStatus(data.vaultId, data.isActive),
    onSuccess: () => {
      toast.success('Vault status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['adminVaults'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vault status')
    },
  })

  const handleToggleVault = (vault: any) => {
    const newStatus = !vault.isActive
    const action = newStatus ? 'activate' : 'deactivate'

    if (window.confirm(`Are you sure you want to ${action} this vault?`)) {
      toggleVaultMutation.mutate({
        vaultId: vault.id,
        isActive: newStatus,
      })
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      </AdminLayout>
    )
  }

  const vaults = vaultsData?.data || []
  const pagination = vaultsData?.pagination

  // Group investments by vault to get vault statistics
  const vaultStats = vaults.reduce((acc: any, inv: any) => {
    const vaultId = inv.vaultId
    if (!acc[vaultId]) {
      acc[vaultId] = {
        id: vaultId,
        name: inv.vault,
        isActive: inv.vaultActive,
        totalInvestments: 0,
        activeInvestments: 0,
        totalAmount: 0,
        uniqueUsers: new Set(),
      }
    }
    acc[vaultId].totalInvestments++
    if (inv.status === 'ACTIVE') {
      acc[vaultId].activeInvestments++
    }
    acc[vaultId].totalAmount += inv.amount
    acc[vaultId].uniqueUsers.add(inv.userId)
    return acc
  }, {})

  const vaultList = Object.values(vaultStats).map((vault: any) => ({
    ...vault,
    uniqueUsers: vault.uniqueUsers.size,
  }))

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Vaults Management</h2>
          <p className="text-gray-400">Total: {vaultList.length} vaults</p>
        </div>

        {/* Vaults Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {vaultList.map((vault: any) => (
            <div
              key={vault.id}
              className={`bg-background-card rounded-xl border p-6 ${
                vault.isActive ? 'border-green-900/20' : 'border-red-900/30'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{vault.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      vault.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {vault.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleVault(vault)}
                  disabled={toggleVaultMutation.isPending}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    vault.isActive
                      ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                      : 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {vault.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              {/* Vault Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Investments</span>
                  </div>
                  <div className="text-lg font-bold text-white">{vault.totalInvestments}</div>
                  <div className="text-xs text-green-400">{vault.activeInvestments} active</div>
                </div>

                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gold-500" />
                    <span className="text-xs text-gray-400">Total Value</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    ${vault.totalAmount.toLocaleString()}
                  </div>
                </div>

                <div className="bg-background-elevated rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-gray-400">Users</span>
                  </div>
                  <div className="text-lg font-bold text-white">{vault.uniqueUsers}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!vaultList.length && (
          <div className="bg-background-card rounded-xl border border-green-900/20 p-12 text-center">
            <p className="text-gray-500">No vaults found</p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-background-card border border-green-900/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-900/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-background-card border border-green-900/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-900/10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
