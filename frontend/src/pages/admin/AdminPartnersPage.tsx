/**
 * Admin Partners Page
 * Manage partners for the "Powered By" slider on landing page
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, ExternalLink, GripVertical, Eye, EyeOff, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import AdminLayout from '../../components/admin/AdminLayout'
import { api } from '../../services/api'

interface Partner {
  id: string
  name: string
  logoUrl: string
  websiteUrl?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
}

export default function AdminPartnersPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    websiteUrl: '',
  })
  const [uploading, setUploading] = useState(false)

  // Fetch partners
  const { data: partners, isLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: async () => {
      const response = await api.adminGetPartners()
      return response.data as Partner[]
    },
  })

  // Create partner mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; logoUrl: string; websiteUrl?: string }) => {
      return api.adminCreatePartner(data)
    },
    onSuccess: () => {
      toast.success('Partner created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create partner')
    },
  })

  // Update partner mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Partner> }) => {
      return api.adminUpdatePartner(id, data)
    },
    onSuccess: () => {
      toast.success('Partner updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update partner')
    },
  })

  // Delete partner mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.adminDeletePartner(id)
    },
    onSuccess: () => {
      toast.success('Partner deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete partner')
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const response = await api.adminUploadPartnerLogo(file)
      if (response.data?.url) {
        setFormData({ ...formData, logoUrl: response.data.url })
        toast.success('Logo uploaded successfully')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const openAddModal = () => {
    setEditingPartner(null)
    setFormData({ name: '', logoUrl: '', websiteUrl: '' })
    setShowModal(true)
  }

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner)
    setFormData({
      name: partner.name,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPartner(null)
    setFormData({ name: '', logoUrl: '', websiteUrl: '' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.logoUrl) {
      toast.error('Name and logo URL are required')
      return
    }

    if (editingPartner) {
      updateMutation.mutate({
        id: editingPartner.id,
        data: formData,
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  const toggleActive = (partner: Partner) => {
    updateMutation.mutate({
      id: partner.id,
      data: { isActive: !partner.isActive },
    })
  }

  const handleDelete = (partner: Partner) => {
    if (window.confirm(`Are you sure you want to delete "${partner.name}"?`)) {
      deleteMutation.mutate(partner.id)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Partners</h2>
            <p className="text-gray-400">
              Manage partners displayed in the "Powered By" slider on the landing page
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-900 rounded-lg hover:bg-gold-400 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Partner
          </button>
        </div>

        {/* Partners List */}
        <div className="bg-navy-800 rounded-xl border border-gold-300/20">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading partners...</div>
          ) : partners && partners.length > 0 ? (
            <div className="divide-y divide-gold-300/10">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className={`flex items-center gap-4 p-4 ${!partner.isActive ? 'opacity-50' : ''}`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab text-gray-500 hover:text-gray-300">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Logo */}
                  <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{partner.name}</h3>
                    {partner.websiteUrl && (
                      <a
                        href={partner.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-gold-300 hover:text-gold-200"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {partner.websiteUrl}
                      </a>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Order: {partner.displayOrder}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(partner)}
                      className={`p-2 rounded-lg transition-colors ${
                        partner.isActive
                          ? 'text-green-400 hover:bg-green-500/10'
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      title={partner.isActive ? 'Hide partner' : 'Show partner'}
                    >
                      {partner.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEditModal(partner)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit partner"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(partner)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete partner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              No partners yet. Click "Add Partner" to create one.
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-navy-800 rounded-xl border border-gold-300/20 w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gold-300/10">
                <h3 className="text-lg font-semibold text-white">
                  {editingPartner ? 'Edit Partner' : 'Add Partner'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 text-gray-400 hover:text-white rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-900 border border-gold-300/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-300/50"
                    placeholder="e.g., Solana"
                    required
                  />
                </div>

                {/* Logo URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Logo URL *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="flex-1 px-3 py-2 bg-navy-900 border border-gold-300/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-300/50"
                      placeholder="/images/partners/logo.png"
                      required
                    />
                    <label className="cursor-pointer px-3 py-2 bg-gold-500/20 text-gold-300 rounded-lg hover:bg-gold-500/30 transition-colors flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {uploading ? '...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {formData.logoUrl && (
                    <div className="mt-2 p-2 bg-white/5 rounded-lg">
                      <img
                        src={formData.logoUrl}
                        alt="Preview"
                        className="max-h-20 object-contain mx-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Website URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-900 border border-gold-300/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-300/50"
                    placeholder="https://solana.com"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg hover:bg-gold-400 transition-colors font-medium disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingPartner
                      ? 'Save Changes'
                      : 'Create Partner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
