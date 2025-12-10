import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Plus, Edit, Trash2, TrendingUp, Users, DollarSign, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { toast } from 'sonner'

interface VaultFormData {
  name: string
  tier: 'STARTER' | 'PRO' | 'ELITE'
  duration: number
  payoutSchedule: 'MONTHLY' | 'QUARTERLY' | 'END_OF_TERM'
  minInvestment: number
  maxInvestment: number
  baseAPY: number
  maxAPY: number
  takaraAPY: number
  requireTAKARA: boolean
  takaraRatio: number
  totalCapacity: number
  isActive: boolean
}

const initialFormData: VaultFormData = {
  name: '',
  tier: 'STARTER',
  duration: 12,
  payoutSchedule: 'MONTHLY',
  minInvestment: 100,
  maxInvestment: 999999999,
  baseAPY: 4,
  maxAPY: 6,
  takaraAPY: 50,
  requireTAKARA: false,
  takaraRatio: 0,
  totalCapacity: 10000000,
  isActive: true
}

export default function AdminVaultsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedVault, setSelectedVault] = useState<any>(null)
  const [formData, setFormData] = useState<VaultFormData>(initialFormData)

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: vaultsData, isLoading } = useQuery({
    queryKey: ['adminVaultsManagement'],
    queryFn: () => adminApiService.getVaults(),
  })

  const createVaultMutation = useMutation({
    mutationFn: (data: VaultFormData) => adminApiService.createVault(data),
    onSuccess: () => {
      toast.success('Vault created successfully')
      queryClient.invalidateQueries({ queryKey: ['adminVaultsManagement'] })
      setShowCreateModal(false)
      setFormData(initialFormData)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create vault')
    },
  })

  const updateVaultMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VaultFormData> }) =>
      adminApiService.updateVault(id, data),
    onSuccess: () => {
      toast.success('Vault updated successfully')
      queryClient.invalidateQueries({ queryKey: ['adminVaultsManagement'] })
      setShowEditModal(false)
      setSelectedVault(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vault')
    },
  })

  const deleteVaultMutation = useMutation({
    mutationFn: (id: string) => adminApiService.deleteVault(id),
    onSuccess: () => {
      toast.success('Vault deactivated successfully')
      queryClient.invalidateQueries({ queryKey: ['adminVaultsManagement'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate vault')
    },
  })

  const handleOpenCreateModal = () => {
    setFormData(initialFormData)
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (vault: any) => {
    setSelectedVault(vault)
    setFormData({
      name: vault.name,
      tier: vault.tier,
      duration: vault.duration,
      payoutSchedule: vault.payoutSchedule,
      minInvestment: Number(vault.minInvestment),
      maxInvestment: Number(vault.maxInvestment),
      baseAPY: Number(vault.baseAPY),
      maxAPY: Number(vault.maxAPY),
      takaraAPY: Number(vault.takaraAPY),
      requireTAKARA: vault.requireTAKARA,
      takaraRatio: Number(vault.takaraRatio || 0),
      totalCapacity: Number(vault.totalCapacity || 10000000),
      isActive: vault.isActive
    })
    setShowEditModal(true)
  }

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault()
    createVaultMutation.mutate(formData)
  }

  const handleUpdateVault = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedVault) {
      updateVaultMutation.mutate({
        id: selectedVault.id,
        data: formData
      })
    }
  }

  const handleDeleteVault = (vault: any) => {
    if (window.confirm(`Are you sure you want to deactivate "${vault.name}"?`)) {
      deleteVaultMutation.mutate(vault.id)
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

  return (
    <AdminLayout>
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Vault Management</h2>
            <p className="text-gray-400">Total: {vaults.length} vaults</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold"
          >
            <Plus className="h-5 w-5" />
            Create New Vault
          </button>
        </div>

        {/* Vaults Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {vaults.map((vault: any) => (
            <div
              key={vault.id}
              className={`bg-background-card rounded-xl border p-6 ${
                vault.isActive ? 'border-green-900/20' : 'border-red-900/30'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{vault.name}</h3>
                  <div className="flex gap-2">
                    <span className={`tier-${vault.tier.toLowerCase()} text-xs px-2 py-1`}>
                      {vault.tier}
                    </span>
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
                </div>
              </div>

              {/* Vault Details */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white font-medium">{vault.duration} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Base APY:</span>
                  <span className="text-gold-500 font-medium">{vault.baseAPY}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max APY:</span>
                  <span className="text-gold-500 font-medium">{vault.maxAPY}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Takara APY:</span>
                  <span className="text-green-400 font-medium">{vault.takaraAPY}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Min Investment:</span>
                  <span className="text-white">${Number(vault.minInvestment).toLocaleString()}</span>
                </div>
                {vault.requireTAKARA && (
                  <div className="flex justify-between text-purple-400">
                    <span className="text-gray-400">TAKARA Ratio:</span>
                    <span className="font-medium">{vault.takaraRatio}/100 USDT</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              {vault.statistics && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-background-elevated rounded p-2 text-center">
                    <div className="text-xs text-gray-400">Investments</div>
                    <div className="text-sm font-bold text-white">
                      {vault.statistics.totalInvestments}
                    </div>
                  </div>
                  <div className="bg-background-elevated rounded p-2 text-center">
                    <div className="text-xs text-gray-400">Active</div>
                    <div className="text-sm font-bold text-green-400">
                      {vault.statistics.activeInvestments}
                    </div>
                  </div>
                  <div className="bg-background-elevated rounded p-2 text-center">
                    <div className="text-xs text-gray-400">Total USDT</div>
                    <div className="text-sm font-bold text-gold-500">
                      ${(vault.statistics.totalUSDT / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEditModal(vault)}
                  className="flex-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVault(vault)}
                  disabled={!vault.isActive}
                  className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>

        {!vaults.length && (
          <div className="bg-background-card rounded-xl border border-green-900/20 p-12 text-center">
            <p className="text-gray-500">No vaults found. Create your first vault!</p>
          </div>
        )}
      </div>

      {/* Create Vault Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Create New Vault</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateVault} className="space-y-4">
              <VaultForm formData={formData} setFormData={setFormData} />

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVaultMutation.isPending}
                  className="flex-1 px-4 py-3 bg-gold-500 text-black rounded-lg font-bold hover:bg-gold-400 disabled:opacity-50"
                >
                  {createVaultMutation.isPending ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vault Modal */}
      {showEditModal && selectedVault && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Edit Vault: {selectedVault.name}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateVault} className="space-y-4">
              <VaultForm formData={formData} setFormData={setFormData} isEdit />

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateVaultMutation.isPending}
                  className="flex-1 px-4 py-3 bg-gold-500 text-black rounded-lg font-bold hover:bg-gold-400 disabled:opacity-50"
                >
                  {updateVaultMutation.isPending ? 'Updating...' : 'Update Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// Vault Form Component
function VaultForm({
  formData,
  setFormData,
  isEdit = false
}: {
  formData: VaultFormData
  setFormData: (data: VaultFormData) => void
  isEdit?: boolean
}) {
  const handleChange = (field: keyof VaultFormData, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Vault Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
            disabled={isEdit}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tier</label>
          <select
            value={formData.tier}
            onChange={(e) => handleChange('tier', e.target.value)}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            disabled={isEdit}
          >
            <option value="STARTER">STARTER</option>
            <option value="PRO">PRO</option>
            <option value="ELITE">ELITE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Duration (months)</label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => handleChange('duration', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
            disabled={isEdit}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Payout Schedule</label>
          <select
            value={formData.payoutSchedule}
            onChange={(e) => handleChange('payoutSchedule', e.target.value)}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            disabled={isEdit}
          >
            <option value="MONTHLY">MONTHLY</option>
            <option value="QUARTERLY">QUARTERLY</option>
            <option value="END_OF_TERM">END_OF_TERM</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Min Investment (USDT)</label>
          <input
            type="number"
            value={formData.minInvestment}
            onChange={(e) => handleChange('minInvestment', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Max Investment (USDT)</label>
          <input
            type="number"
            value={formData.maxInvestment}
            onChange={(e) => handleChange('maxInvestment', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Base APY (%)</label>
          <input
            type="number"
            step="0.1"
            value={formData.baseAPY}
            onChange={(e) => handleChange('baseAPY', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Max APY (%)</label>
          <input
            type="number"
            step="0.1"
            value={formData.maxAPY}
            onChange={(e) => handleChange('maxAPY', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Takara APY</label>
          <input
            type="number"
            value={formData.takaraAPY}
            onChange={(e) => handleChange('takaraAPY', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Total Capacity (USDT)</label>
          <input
            type="number"
            value={formData.totalCapacity}
            onChange={(e) => handleChange('totalCapacity', Number(e.target.value))}
            className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
          />
        </div>

        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireTAKARA}
              onChange={(e) => handleChange('requireTAKARA', e.target.checked)}
              className="w-5 h-5 bg-background-elevated border border-green-900/30 rounded text-gold-500 focus:ring-gold-500"
            />
            <span className="text-sm font-medium text-gray-300">Require TAKARA</span>
          </label>
        </div>

        {formData.requireTAKARA && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              TAKARA Ratio (per 100 USDT)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.takaraRatio}
              onChange={(e) => handleChange('takaraRatio', Number(e.target.value))}
              className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:border-gold-500"
              required={formData.requireTAKARA}
            />
          </div>
        )}

        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-5 h-5 bg-background-elevated border border-green-900/30 rounded text-gold-500 focus:ring-gold-500"
            />
            <span className="text-sm font-medium text-gray-300">Active</span>
          </label>
        </div>
      </div>
    </>
  )
}
