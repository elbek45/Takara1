import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, DollarSign, Package, TrendingUp, LogOut, Rocket, Network, Coins, Wallet, BarChart3, Handshake, FileCheck, Pickaxe } from 'lucide-react'
import { adminApiService } from '../../services/admin.api'
import { toast } from 'sonner'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Claims', href: '/admin/claims', icon: FileCheck },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: DollarSign },
  { name: 'Vaults', href: '/admin/vaults', icon: Package },
  { name: 'Mining Vaults', href: '/admin/mining-vaults', icon: Pickaxe },
  { name: 'Mining Stats', href: '/admin/mining', icon: TrendingUp },
  { name: 'Boost Tokens', href: '/admin/boost-tokens', icon: Coins },
  { name: 'Treasury', href: '/admin/treasury', icon: Wallet },
  { name: 'TAKARA Stats', href: '/admin/takara-stats', icon: BarChart3 },
  { name: 'Partners', href: '/admin/partners', icon: Handshake },
  { name: 'Deployment', href: '/admin/deployment', icon: Rocket },
  { name: 'Network', href: '/admin/network', icon: Network },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    adminApiService.logout()
    toast.success('Logged out successfully')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="bg-background-card border-b border-green-900/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-gray-400">Takara <span className="text-gold-500">宝</span> v2.2 - LAIKA Boost</p>
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 py-6">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-green-900/20 text-gold-500 border border-green-900/30'
                        : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
