import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Check, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { toast } from 'sonner'

export default function AdminWithdrawalsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null)
  const [txSignature, setTxSignature] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const limit = 20

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: withdrawalsData, isLoading } = useQuery({
    queryKey: ['adminWithdrawals', page, statusFilter],
    queryFn: () => adminApiService.getWithdrawals({ page, limit, status: statusFilter }),
  })

  const processWithdrawalMutation = useMutation({
    mutationFn: (data: { id: string; action: 'approve' | 'reject'; txSignature?: string; rejectionReason?: string }) =>
      adminApiService.processWithdrawal(data.id, data.action, {
        txSignature: data.txSignature,
        rejectionReason: data.rejectionReason,
      }),
    onSuccess: () => {
      toast.success('Withdrawal processed successfully')
      queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setSelectedWithdrawal(null)
      setTxSignature('')
      setRejectionReason('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process withdrawal')
    },
  })

  const handleApprove = (withdrawal: any) => {
    if (!txSignature) {
      toast.error('Please enter transaction signature')
      return
    }
    processWithdrawalMutation.mutate({
      id: withdrawal.id,
      action: 'approve',
      txSignature,
    })
  }

  const handleReject = (withdrawal: any) => {
    if (!rejectionReason) {
      toast.error('Please enter rejection reason')
      return
    }
    processWithdrawalMutation.mutate({
      id: withdrawal.id,
      action: 'reject',
      rejectionReason,
    })
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

  const withdrawals = withdrawalsData?.data || []
  const pagination = withdrawalsData?.pagination

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Withdrawals Management</h2>
          <p className="text-gray-400">Total: {pagination?.total || 0} withdrawals</p>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex gap-2">
          {['PENDING', 'COMPLETED', 'REJECTED'].map((status) => (
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

        {/* Withdrawals Table */}
        <div className="bg-background-card rounded-xl border border-green-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-green-900/20 bg-green-900/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Token</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/20">
                {withdrawals.map((withdrawal: any) => (
                  <tr key={withdrawal.id} className="hover:bg-green-900/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{withdrawal.user}</div>
                      <div className="text-xs text-gray-500">{withdrawal.userWallet.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">
                        {withdrawal.tokenType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">{withdrawal.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-400 max-w-xs truncate">{withdrawal.destinationWallet}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          withdrawal.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400'
                            : withdrawal.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {withdrawal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {withdrawal.status === 'PENDING' ? (
                        <button
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                          className="px-3 py-1 bg-gold-500/20 border border-gold-500/30 rounded text-gold-400 text-xs hover:bg-gold-500/30"
                        >
                          Process
                        </button>
                      ) : withdrawal.txSignature ? (
                        <a
                          href={`https://solscan.io/tx/${withdrawal.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          View TX <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : withdrawal.rejectionReason ? (
                        <div className="text-xs text-red-400" title={withdrawal.rejectionReason}>
                          Rejected
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!withdrawals.length && (
            <div className="text-center py-12">
              <p className="text-gray-500">No withdrawals found</p>
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

      {/* Process Withdrawal Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background-card rounded-xl max-w-lg w-full border border-green-900/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Process Withdrawal</h3>

            <div className="space-y-4 mb-6">
              <div className="bg-background-elevated rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">User</div>
                    <div className="text-white font-medium">{selectedWithdrawal.user}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Amount</div>
                    <div className="text-white font-medium">
                      {selectedWithdrawal.amount} {selectedWithdrawal.tokenType}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-400">Destination</div>
                    <div className="text-white font-mono text-xs break-all">{selectedWithdrawal.destinationWallet}</div>
                  </div>
                </div>
              </div>

              {/* Approve Section */}
              <div className="border border-green-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-400 mb-3">Approve Withdrawal</h4>
                <input
                  type="text"
                  value={txSignature}
                  onChange={(e) => setTxSignature(e.target.value)}
                  placeholder="Enter transaction signature"
                  className="w-full px-3 py-2 bg-background-elevated border border-green-900/30 rounded text-white placeholder-gray-500 text-sm"
                />
                <button
                  onClick={() => handleApprove(selectedWithdrawal)}
                  disabled={processWithdrawalMutation.isPending}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
              </div>

              {/* Reject Section */}
              <div className="border border-red-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-3">Reject Withdrawal</h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason"
                  className="w-full px-3 py-2 bg-background-elevated border border-green-900/30 rounded text-white placeholder-gray-500 text-sm"
                  rows={3}
                />
                <button
                  onClick={() => handleReject(selectedWithdrawal)}
                  disabled={processWithdrawalMutation.isPending}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedWithdrawal(null)}
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
