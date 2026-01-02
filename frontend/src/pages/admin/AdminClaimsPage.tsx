import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Check, X, ExternalLink, ChevronLeft, ChevronRight, Clock, DollarSign, Coins } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { toast } from 'sonner'

export default function AdminClaimsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [typeFilter, setTypeFilter] = useState<'USDT' | 'TAKARA' | ''>('')
  const [selectedClaim, setSelectedClaim] = useState<any>(null)
  const [txSignature, setTxSignature] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const limit = 20

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['adminClaims', page, statusFilter, typeFilter],
    queryFn: () => adminApiService.getClaimRequests({
      page,
      limit,
      status: statusFilter as any,
      claimType: typeFilter || undefined
    }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['adminClaimsStats'],
    queryFn: () => adminApiService.getClaimStats(),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApiService.approveClaim(id),
    onSuccess: () => {
      toast.success('Claim approved successfully')
      queryClient.invalidateQueries({ queryKey: ['adminClaims'] })
      queryClient.invalidateQueries({ queryKey: ['adminClaimsStats'] })
      setSelectedClaim(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve claim')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApiService.rejectClaim(id, reason),
    onSuccess: () => {
      toast.success('Claim rejected. Pending amount restored.')
      queryClient.invalidateQueries({ queryKey: ['adminClaims'] })
      queryClient.invalidateQueries({ queryKey: ['adminClaimsStats'] })
      setSelectedClaim(null)
      setRejectionReason('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject claim')
    },
  })

  const processMutation = useMutation({
    mutationFn: ({ id, txSignature }: { id: string; txSignature: string }) =>
      adminApiService.processClaim(id, txSignature),
    onSuccess: () => {
      toast.success('Claim processed and completed')
      queryClient.invalidateQueries({ queryKey: ['adminClaims'] })
      queryClient.invalidateQueries({ queryKey: ['adminClaimsStats'] })
      setSelectedClaim(null)
      setTxSignature('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process claim')
    },
  })

  const handleApprove = (claim: any) => {
    approveMutation.mutate(claim.id)
  }

  const handleReject = (claim: any) => {
    if (!rejectionReason) {
      toast.error('Please enter rejection reason')
      return
    }
    rejectMutation.mutate({ id: claim.id, reason: rejectionReason })
  }

  const handleProcess = (claim: any) => {
    if (!txSignature) {
      toast.error('Please enter transaction signature')
      return
    }
    processMutation.mutate({ id: claim.id, txSignature })
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

  const claims = claimsData?.data || []
  const pagination = claimsData?.pagination
  const stats = statsData?.data

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Claims Management</h2>
          <p className="text-gray-400">Approve or reject user claim requests</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-background-card rounded-xl p-4 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">PENDING</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.counts?.pending || 0}</div>
            </div>
            <div className="bg-background-card rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Check className="h-4 w-4" />
                <span className="text-xs font-medium">APPROVED</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.counts?.approved || 0}</div>
            </div>
            <div className="bg-background-card rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">COMPLETED</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.counts?.completed || 0}</div>
            </div>
            <div className="bg-background-card rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <X className="h-4 w-4" />
                <span className="text-xs font-medium">REJECTED</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.counts?.rejected || 0}</div>
            </div>
            <div className="bg-background-card rounded-xl p-4 border border-gold-500/20">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <Coins className="h-4 w-4" />
                <span className="text-xs font-medium">TOTAL</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.counts?.total || 0}</div>
            </div>
          </div>
        )}

        {/* Pending by Type */}
        {stats?.pendingByType && stats.pendingByType.length > 0 && (
          <div className="bg-background-card rounded-xl p-4 border border-green-900/20 mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Pending Claims Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.pendingByType.map((item: any) => (
                <div key={item.claimType} className="flex items-center justify-between bg-background-elevated rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.claimType === 'USDT'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gold-500/20 text-gold-400'
                    }`}>
                      {item.claimType}
                    </span>
                    <span className="text-gray-400 text-sm">{item.count} requests</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{item.totalAfterTax.toLocaleString()} {item.claimType}</div>
                    {item.claimType === 'TAKARA' && item.totalAmount !== item.totalAfterTax && (
                      <div className="text-xs text-gray-500">
                        (Before tax: {item.totalAmount.toLocaleString()})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            {['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-500 text-background-primary'
                    : 'bg-background-card border border-green-900/30 text-gray-300 hover:border-gold-500'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setTypeFilter(''); setPage(1) }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === ''
                  ? 'bg-blue-500 text-white'
                  : 'bg-background-card border border-green-900/30 text-gray-300 hover:border-blue-500'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => { setTypeFilter('USDT'); setPage(1) }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === 'USDT'
                  ? 'bg-green-500 text-white'
                  : 'bg-background-card border border-green-900/30 text-gray-300 hover:border-green-500'
              }`}
            >
              USDT
            </button>
            <button
              onClick={() => { setTypeFilter('TAKARA'); setPage(1) }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === 'TAKARA'
                  ? 'bg-gold-500 text-background-primary'
                  : 'bg-background-card border border-green-900/30 text-gray-300 hover:border-gold-500'
              }`}
            >
              TAKARA
            </button>
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-background-card rounded-xl border border-green-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-green-900/20 bg-green-900/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">After Tax</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vault</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/20">
                {claims.map((claim: any) => (
                  <tr key={claim.id} className="hover:bg-green-900/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{claim.user?.username || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{claim.user?.email || claim.user?.walletAddress?.slice(0, 8) + '...'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        claim.claimType === 'USDT'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gold-500/20 text-gold-400'
                      }`}>
                        {claim.claimType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">{claim.amount.toLocaleString()}</div>
                      {claim.taxAmount > 0 && (
                        <div className="text-xs text-red-400">-{claim.taxAmount.toLocaleString()} tax</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-green-400">{claim.amountAfterTax.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{claim.investment?.vaultName || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{claim.investment?.vaultTier}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-400 max-w-[150px] truncate" title={claim.destinationWallet}>
                        {claim.destinationWallet}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          claim.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400'
                            : claim.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : claim.status === 'APPROVED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {claim.status === 'PENDING' && (
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="px-3 py-1 bg-gold-500/20 border border-gold-500/30 rounded text-gold-400 text-xs hover:bg-gold-500/30"
                        >
                          Review
                        </button>
                      )}
                      {claim.status === 'APPROVED' && (
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs hover:bg-green-500/30"
                        >
                          Process
                        </button>
                      )}
                      {claim.status === 'COMPLETED' && claim.txSignature && (
                        <a
                          href={claim.claimType === 'USDT'
                            ? `https://tronscan.org/#/transaction/${claim.txSignature}`
                            : `https://solscan.io/tx/${claim.txSignature}?cluster=devnet`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          View TX <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {claim.status === 'REJECTED' && (
                        <div className="text-xs text-red-400" title={claim.rejectionReason}>
                          {claim.rejectionReason?.slice(0, 20)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!claims.length && (
            <div className="text-center py-12">
              <p className="text-gray-500">No claim requests found</p>
            </div>
          )}
        </div>

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

      {/* Review/Process Claim Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background-card rounded-xl max-w-lg w-full border border-green-900/20 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedClaim.status === 'PENDING' ? 'Review Claim Request' : 'Process Approved Claim'}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="bg-background-elevated rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">User</div>
                    <div className="text-white font-medium">{selectedClaim.user?.username || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Type</div>
                    <div className={`font-medium ${selectedClaim.claimType === 'USDT' ? 'text-green-400' : 'text-gold-400'}`}>
                      {selectedClaim.claimType}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Amount</div>
                    <div className="text-white font-medium">{selectedClaim.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">After Tax</div>
                    <div className="text-green-400 font-medium">{selectedClaim.amountAfterTax.toLocaleString()}</div>
                  </div>
                  {selectedClaim.taxAmount > 0 && (
                    <div className="col-span-2">
                      <div className="text-gray-400">Tax (5%)</div>
                      <div className="text-red-400">{selectedClaim.taxAmount.toLocaleString()} {selectedClaim.claimType}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <div className="text-gray-400">Destination Wallet</div>
                    <div className="text-white font-mono text-xs break-all">{selectedClaim.destinationWallet}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-400">Vault</div>
                    <div className="text-white">{selectedClaim.investment?.vaultName} ({selectedClaim.investment?.vaultTier})</div>
                  </div>
                </div>
              </div>

              {selectedClaim.status === 'PENDING' && (
                <>
                  {/* Approve Section */}
                  <div className="border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-3">Approve Claim</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Approving will mark this claim as ready for processing. You'll need to transfer funds manually and then process with TX signature.
                    </p>
                    <button
                      onClick={() => handleApprove(selectedClaim)}
                      disabled={approveMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Approve Claim
                    </button>
                  </div>

                  {/* Reject Section */}
                  <div className="border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-400 mb-3">Reject Claim</h4>
                    <p className="text-xs text-gray-400 mb-2">
                      Rejecting will restore the pending amount back to the user's investment.
                    </p>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason"
                      className="w-full px-3 py-2 bg-background-elevated border border-green-900/30 rounded text-white placeholder-gray-500 text-sm"
                      rows={3}
                    />
                    <button
                      onClick={() => handleReject(selectedClaim)}
                      disabled={rejectMutation.isPending}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject Claim
                    </button>
                  </div>
                </>
              )}

              {selectedClaim.status === 'APPROVED' && (
                <div className="border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-400 mb-3">Process Claim</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Transfer <span className="text-green-400 font-medium">{selectedClaim.amountAfterTax.toLocaleString()} {selectedClaim.claimType}</span> to:
                  </p>
                  <div className="bg-background-primary rounded p-2 mb-3">
                    <code className="text-xs text-gold-400 break-all">{selectedClaim.destinationWallet}</code>
                  </div>
                  <input
                    type="text"
                    value={txSignature}
                    onChange={(e) => setTxSignature(e.target.value)}
                    placeholder="Enter transaction signature after transfer"
                    className="w-full px-3 py-2 bg-background-elevated border border-green-900/30 rounded text-white placeholder-gray-500 text-sm"
                  />
                  <button
                    onClick={() => handleProcess(selectedClaim)}
                    disabled={processMutation.isPending}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Mark as Completed
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedClaim(null)
                setTxSignature('')
                setRejectionReason('')
              }}
              className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded text-gray-300 hover:bg-green-900/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
