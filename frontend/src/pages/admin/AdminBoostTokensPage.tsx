import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, TrendingUp, X, Rocket } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { toast } from 'sonner'

interface BoostToken {
  id: string
  tokenSymbol: string
  tokenName: string
  tokenMint: string
  isEnabled: boolean
  maxBoostPercent: number
  displayOrder: number
  createdAt: string
  updatedAt: string
}

interface BoostTokenFormData {
  tokenSymbol: string
  tokenName: string
  tokenMint: string
  isEnabled: boolean
  maxBoostPercent: number
  displayOrder: number
}

const initialFormData: BoostTokenFormData = {
  tokenSymbol: '',
  tokenName: '',
  tokenMint: '',
  isEnabled: true,
  maxBoostPercent: 100,
  displayOrder: 0
}

export default function AdminBoostTokensPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedToken, setSelectedToken] = useState<BoostToken | null>(null)
  const [formData, setFormData] = useState<BoostTokenFormData>(initialFormData)

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: tokensData, isLoading } = useQuery({
    queryKey: ['adminBoostTokens'],
    queryFn: () => adminApiService.getBoostTokens(),
  })

  const { data: statsData } = useQuery({
    queryKey: ['adminBoostTokensStats'],
    queryFn: () => adminApiService.getBoostTokenStatistics(),
  })

  const createTokenMutation = useMutation({
    mutationFn: (data: BoostTokenFormData) => adminApiService.createBoostToken(data),
    onSuccess: () => {
      toast.success('Boost token created successfully')
      queryClient.invalidateQueries({ queryKey: ['adminBoostTokens'] })
      queryClient.invalidateQueries({ queryKey: ['adminBoostTokensStats'] })
      setShowCreateModal(false)
      setFormData(initialFormData)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create boost token')
    },
  })

  const updateTokenMutation = useMutation({
    mutationFn: ({ symbol, data }: { symbol: string; data: Partial<BoostTokenFormData> }) =>
      adminApiService.updateBoostToken(symbol, data),
    onSuccess: () => {
      toast.success('Boost token updated successfully')
      queryClient.invalidateQueries({ queryKey: ['adminBoostTokens'] })
      queryClient.invalidateQueries({ queryKey: ['adminBoostTokensStats'] })
      setShowEditModal(false)
      setSelectedToken(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update boost token')
    },
  })

  const deleteTokenMutation = useMutation({
    mutationFn: (symbol: string) => adminApiService.deleteBoostToken(symbol),
    onSuccess: () => {
      toast.success('Boost token deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['adminBoostTokens'] })
      queryClient.invalidateQueries({ queryKey: ['adminBoostTokensStats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete boost token')
    },
  })

  const handleOpenCreateModal = () => {
    setFormData(initialFormData)
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (token: BoostToken) => {
    setSelectedToken(token)
    setFormData({
      tokenSymbol: token.tokenSymbol,
      tokenName: token.tokenName,
      tokenMint: token.tokenMint,
      isEnabled: token.isEnabled,
      maxBoostPercent: token.maxBoostPercent,
      displayOrder: token.displayOrder
    })
    setShowEditModal(true)
  }

  const handleToggleEnabled = (token: BoostToken) => {
    updateTokenMutation.mutate({
      symbol: token.tokenSymbol,
      data: { isEnabled: !token.isEnabled }
    })
  }

  const handleCreate = () => {
    createTokenMutation.mutate(formData)
  }

  const handleUpdate = () => {
    if (!selectedToken) return
    updateTokenMutation.mutate({
      symbol: selectedToken.tokenSymbol,
      data: {
        isEnabled: formData.isEnabled,
        maxBoostPercent: formData.maxBoostPercent,
        displayOrder: formData.displayOrder
      }
    })
  }

  const handleDelete = (symbol: string) => {
    if (window.confirm('Are you sure you want to delete this boost token?')) {
      deleteTokenMutation.mutate(symbol)
    }
  }

  const tokens = tokensData?.data || []
  const stats = statsData?.data || []

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Boost Tokens Management
            </h1>
            <p className="text-gray-400">
              Configure which tokens can be used for investment boosts
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="btn-gold inline-flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Plus className="h-5 w-5" />
            Add Boost Token
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat: any) => (
            <div key={stat.tokenSymbol} className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-gold-500" />
                  <h3 className="text-lg font-semibold text-white">{stat.tokenName}</h3>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  stat.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {stat.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Active Boosts:</span>
                  <span className="text-white font-medium">{stat.activeBoosts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Locked:</span>
                  <span className="text-white font-medium">{stat.totalLocked.toLocaleString()} {stat.tokenSymbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Boost:</span>
                  <span className="text-white font-medium">{stat.maxBoostPercent}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tokens Table */}
        <div className="bg-background-card rounded-xl border border-green-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Mint Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Max Boost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/20">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      No boost tokens configured
                    </td>
                  </tr>
                ) : (
                  tokens.map((token: BoostToken) => (
                    <tr key={token.id} className="hover:bg-background-elevated transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{token.tokenName}</div>
                          <div className="text-xs text-gray-400">{token.tokenSymbol}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-400 font-mono text-xs">
                          {token.tokenMint.slice(0, 8)}...{token.tokenMint.slice(-6)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleEnabled(token)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            token.isEnabled
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          }`}
                        >
                          {token.isEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {token.isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">{token.maxBoostPercent}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">{token.displayOrder}</span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(token)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(token.tokenSymbol)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-card rounded-xl max-w-md w-full p-6 border border-green-900/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Create Boost Token</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
                  <input
                    type="text"
                    value={formData.tokenSymbol}
                    onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    placeholder="e.g., LAIKA"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token Name</label>
                  <input
                    type="text"
                    value={formData.tokenName}
                    onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    placeholder="e.g., LAIKA The Cosmodog"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token Mint Address</label>
                  <input
                    type="text"
                    value={formData.tokenMint}
                    onChange={(e) => setFormData({ ...formData, tokenMint: e.target.value })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-gold-500"
                    placeholder="Solana token mint address"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Boost Percent</label>
                  <input
                    type="number"
                    value={formData.maxBoostPercent}
                    onChange={(e) => setFormData({ ...formData, maxBoostPercent: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-400">Enable immediately</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createTokenMutation.isPending}
                  className="flex-1 btn-gold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {createTokenMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedToken && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-card rounded-xl max-w-md w-full p-6 border border-green-900/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Edit Boost Token</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
                  <input
                    type="text"
                    value={formData.tokenSymbol}
                    disabled
                    className="w-full px-4 py-2 bg-background-elevated/50 border border-green-900/20 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Boost Percent</label>
                  <input
                    type="number"
                    value={formData.maxBoostPercent}
                    onChange={(e) => setFormData({ ...formData, maxBoostPercent: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-400">Token enabled</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updateTokenMutation.isPending}
                  className="flex-1 btn-gold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {updateTokenMutation.isPending ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
