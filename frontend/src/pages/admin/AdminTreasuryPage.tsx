import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Filter,
  ArrowDownCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import adminApiService from '../../services/admin.api'

interface TreasurySummary {
  totalValueUSD: number
  totalTaxCollectedUSD: number
  totalWithdrawalsUSD: number
  balances: {
    tokenSymbol: string
    balance: number
    valueUSD: number
  }[]
}

interface TreasuryBalance {
  tokenSymbol: string
  tokenName: string
  balance: number
  valueUSD: number
  lastUpdated: string
}

interface TaxStatistics {
  totalTaxAmount: number
  totalTaxValueUSD: number
  byToken: {
    tokenSymbol: string
    totalAmount: number
    totalValueUSD: number
    recordCount: number
  }[]
  bySource: {
    sourceType: 'TAKARA_CLAIM' | 'WEXEL_SALE'
    totalAmount: number
    totalValueUSD: number
    recordCount: number
  }[]
}

interface TaxRecord {
  id: string
  tokenSymbol: string
  taxAmount: number
  taxValueUSD: number
  sourceType: 'TAKARA_CLAIM' | 'WEXEL_SALE'
  sourceReferenceId: string
  userId: string
  userWallet: string
  txSignature?: string
  createdAt: string
}

interface WithdrawFormData {
  tokenSymbol: string
  amount: string
  destinationWallet: string
  reason: string
  txSignature: string
}

const initialWithdrawForm: WithdrawFormData = {
  tokenSymbol: '',
  amount: '',
  destinationWallet: '',
  reason: '',
  txSignature: '',
}

export default function AdminTreasuryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState<WithdrawFormData>(initialWithdrawForm)

  // Filters
  const [tokenFilter, setTokenFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<'TAKARA_CLAIM' | 'WEXEL_SALE' | ''>('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 20

  // Queries
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['adminTreasurySummary'],
    queryFn: () => adminApiService.getTreasurySummary(),
  })

  const { data: balancesData, isLoading: loadingBalances } = useQuery({
    queryKey: ['adminTreasuryBalances'],
    queryFn: () => adminApiService.getTreasuryBalances(),
  })

  const { data: statsData } = useQuery({
    queryKey: ['adminTaxStatistics', sourceFilter, dateRange],
    queryFn: () => adminApiService.getTaxStatistics({
      sourceType: sourceFilter || undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
  })

  const { data: recordsData, isLoading: loadingRecords } = useQuery({
    queryKey: ['adminTaxRecords', currentPage, tokenFilter, sourceFilter, dateRange],
    queryFn: () => adminApiService.getTaxRecords({
      page: currentPage,
      limit: recordsPerPage,
      tokenSymbol: tokenFilter || undefined,
      sourceType: sourceFilter || undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
  })

  // Mutations
  const withdrawMutation = useMutation({
    mutationFn: (data: WithdrawFormData) =>
      adminApiService.withdrawFromTreasury({
        tokenSymbol: data.tokenSymbol,
        amount: parseFloat(data.amount),
        destinationWallet: data.destinationWallet,
        reason: data.reason,
        txSignature: data.txSignature || undefined,
      }),
    onSuccess: () => {
      toast.success('Treasury withdrawal processed successfully')
      queryClient.invalidateQueries({ queryKey: ['adminTreasurySummary'] })
      queryClient.invalidateQueries({ queryKey: ['adminTreasuryBalances'] })
      setShowWithdrawModal(false)
      setWithdrawForm(initialWithdrawForm)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process withdrawal')
    },
  })

  const summary = summaryData?.data as TreasurySummary | undefined
  const balances = balancesData?.data as TreasuryBalance[] | undefined
  const stats = statsData?.data as TaxStatistics | undefined
  const records = recordsData?.data?.records as TaxRecord[] | undefined
  const totalPages = recordsData?.data?.totalPages || 1

  const handleWithdraw = () => {
    if (!withdrawForm.tokenSymbol || !withdrawForm.amount || !withdrawForm.destinationWallet || !withdrawForm.reason) {
      toast.error('Please fill in all required fields')
      return
    }

    if (parseFloat(withdrawForm.amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    withdrawMutation.mutate(withdrawForm)
  }

  const handleResetFilters = () => {
    setTokenFilter('')
    setSourceFilter('')
    setDateRange({ start: '', end: '' })
    setCurrentPage(1)
  }

  const formatNumber = (num: number | undefined, decimals = 2) => {
    if (num === undefined) return '0'
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Treasury Management</h1>
              <p className="text-gray-400">
                Monitor treasury balances, tax collection, and manage withdrawals
              </p>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold"
            >
              <ArrowDownCircle className="h-5 w-5" />
              Withdraw Funds
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {loadingSummary ? (
          <div className="text-center py-8 text-gray-400">Loading summary...</div>
        ) : summary ? (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Total Value */}
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-gold-500/20 rounded-lg flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-gold-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${formatNumber(summary.totalValueUSD)}
              </div>
              <div className="text-sm text-gray-400">Total Treasury Value</div>
            </div>

            {/* Total Tax Collected */}
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${formatNumber(summary.totalTaxCollectedUSD)}
              </div>
              <div className="text-sm text-gray-400">Total Tax Collected</div>
            </div>

            {/* Total Withdrawals */}
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${formatNumber(summary.totalWithdrawalsUSD)}
              </div>
              <div className="text-sm text-gray-400">Total Withdrawals</div>
            </div>
          </div>
        ) : null}

        {/* Token Balances */}
        {loadingBalances ? (
          <div className="text-center py-8 text-gray-400">Loading balances...</div>
        ) : balances && balances.length > 0 ? (
          <div className="bg-background-card rounded-xl p-6 border border-green-900/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Token Balances</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {balances.map((balance) => (
                <div
                  key={balance.tokenSymbol}
                  className="bg-background-elevated rounded-lg p-4 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-white">{balance.tokenSymbol}</span>
                    <span className="text-xs text-gray-400">{balance.tokenName}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        {formatNumber(balance.balance, 4)}
                      </div>
                      <div className="text-sm text-gray-400">Available Balance</div>
                    </div>
                    <div className="pt-2 border-t border-gray-700/50">
                      <div className="text-lg font-semibold text-white">
                        ${formatNumber(balance.valueUSD)}
                      </div>
                      <div className="text-xs text-gray-400">USD Value</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className="text-xs text-gray-500">
                      Updated: {formatDate(balance.lastUpdated)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Tax Statistics */}
        {stats ? (
          <div className="bg-background-card rounded-xl p-6 border border-green-900/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Tax Collection Statistics</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* By Token */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">By Token</h3>
                <div className="space-y-3">
                  {stats.byToken.map((item) => (
                    <div
                      key={item.tokenSymbol}
                      className="bg-background-elevated rounded-lg p-4 border border-gray-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{item.tokenSymbol}</span>
                        <span className="text-sm text-gray-400">{item.recordCount} records</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-400">{formatNumber(item.totalAmount, 4)}</span>
                        <span className="text-white">${formatNumber(item.totalValueUSD)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Source */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">By Source</h3>
                <div className="space-y-3">
                  {stats.bySource.map((item) => (
                    <div
                      key={item.sourceType}
                      className="bg-background-elevated rounded-lg p-4 border border-gray-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">
                          {item.sourceType === 'TAKARA_CLAIM' ? 'TAKARA Claims' : 'WEXEL Sales'}
                        </span>
                        <span className="text-sm text-gray-400">{item.recordCount} records</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-400">{formatNumber(item.totalAmount, 4)}</span>
                        <span className="text-white">${formatNumber(item.totalValueUSD)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tax Records */}
        <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-white">Tax Records</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={tokenFilter}
                onChange={(e) => {
                  setTokenFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-background-elevated border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">All Tokens</option>
                <option value="TAKARA">TAKARA</option>
                <option value="USDT">USDT</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as any)
                  setCurrentPage(1)
                }}
                className="bg-background-elevated border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">All Sources</option>
                <option value="TAKARA_CLAIM">TAKARA Claims</option>
                <option value="WEXEL_SALE">WEXEL Sales</option>
              </select>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {loadingRecords ? (
            <div className="text-center py-8 text-gray-400">Loading records...</div>
          ) : records && records.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Token</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">USD Value</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Source</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b border-gray-800 hover:bg-background-elevated transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gold-500/20 text-gold-500 rounded text-xs font-semibold">
                            {record.tokenSymbol}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-400">
                          {formatNumber(record.taxAmount, 4)}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          ${formatNumber(record.taxValueUSD)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            record.sourceType === 'TAKARA_CLAIM'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {record.sourceType === 'TAKARA_CLAIM' ? 'TAKARA Claim' : 'WEXEL Sale'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                          {record.userWallet.slice(0, 4)}...{record.userWallet.slice(-4)}
                        </td>
                        <td className="px-4 py-3">
                          {record.txSignature ? (
                            <a
                              href={`https://solscan.io/tx/${record.txSignature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold-500 hover:text-gold-400 text-sm"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-600 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-background-elevated border border-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-background-elevated border border-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">No tax records found</div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-background-card rounded-xl p-6 max-w-md w-full border border-green-900/20">
            <h2 className="text-2xl font-bold text-white mb-6">Withdraw from Treasury</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Token Symbol *
                </label>
                <select
                  value={withdrawForm.tokenSymbol}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, tokenSymbol: e.target.value })}
                  className="w-full bg-background-elevated border border-gray-700 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="">Select Token</option>
                  {balances?.map((balance) => (
                    <option key={balance.tokenSymbol} value={balance.tokenSymbol}>
                      {balance.tokenSymbol} (Available: {formatNumber(balance.balance, 4)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full bg-background-elevated border border-gray-700 rounded-lg px-4 py-2 text-white"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Destination Wallet *
                </label>
                <input
                  type="text"
                  value={withdrawForm.destinationWallet}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, destinationWallet: e.target.value })}
                  className="w-full bg-background-elevated border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
                  placeholder="Solana wallet address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Reason *
                </label>
                <textarea
                  value={withdrawForm.reason}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, reason: e.target.value })}
                  className="w-full bg-background-elevated border border-gray-700 rounded-lg px-4 py-2 text-white"
                  rows={3}
                  placeholder="Enter reason for withdrawal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Transaction Signature (optional)
                </label>
                <input
                  type="text"
                  value={withdrawForm.txSignature}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, txSignature: e.target.value })}
                  className="w-full bg-background-elevated border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
                  placeholder="Solana transaction signature"
                />
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-400 text-sm">
                ⚠️ Warning: This action will withdraw funds from the treasury. Please ensure all details are correct.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setWithdrawForm(initialWithdrawForm)
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending}
                className="flex-1 btn-gold px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
