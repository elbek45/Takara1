import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 20

  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: () => adminApiService.getUsers({ page, limit, search: search || undefined }),
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

  const users = usersData?.data || []
  const pagination = usersData?.pagination

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Users Management</h2>
          <p className="text-gray-400">Total: {pagination?.total || 0} users</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-3 bg-background-card border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
              placeholder="Search by wallet, username, or email..."
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-background-card rounded-xl border border-green-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-green-900/20 bg-green-900/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Invested
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Earned
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Investments
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/20">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-green-900/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.username || 'No username'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : 'No wallet'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">${user.totalInvested.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-green-400">${user.totalEarnedUSDT.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">{user.investmentCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!users.length && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
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
    </AdminLayout>
  )
}
