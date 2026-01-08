import { Link, useLocation } from 'react-router-dom'
import { Menu, X, User, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../../services/api'
import AuthModal from '../auth/AuthModal'
import { PhantomButton, PhantomButtonCompact } from '../wallet'

const navigation = [
  { name: 'Home', href: '/app' },
  { name: 'Vaults', href: '/app/vaults' },
  { name: 'Dashboard', href: '/app/dashboard' },
  { name: 'Portfolio', href: '/app/portfolio' },
  { name: 'Marketplace', href: '/app/marketplace' },
]

export default function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { disconnect: disconnectPhantom } = useWallet()

  // Check if user is logged in (via password auth)
  const isAuthenticated = api.isAuthenticated()
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
    enabled: isAuthenticated,
    retry: false,
  })

  const handleLogout = async () => {
    // Logout from backend (clear JWT token)
    api.logout()

    // Disconnect Phantom wallet via adapter
    try {
      await disconnectPhantom()
    } catch (error) {
      console.log('Phantom already disconnected')
    }

    // Clear all cached data
    queryClient.clear()

    // Redirect to home
    window.location.href = '/app'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-green-900/20 bg-background-primary/95 backdrop-blur supports-[backdrop-filter]:bg-background-primary/80">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/app" className="flex items-center">
              <img
                src="/images/brand/logo-takara.png"
                alt="Takara"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-900/20 text-gold-500'
                      : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Wallet Button & Profile */}
          <div className="hidden md:flex md:items-center md:gap-3">
            {/* Password Auth - Login/Logout Button */}
            {isAuthenticated && currentUser?.data ? (
              <>
                <Link
                  to="/app/profile"
                  className={`p-2.5 rounded-lg transition-colors ${
                    location.pathname === '/app/profile'
                      ? 'bg-green-900/20 text-gold-500'
                      : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                  }`}
                  title={`Logged in as ${currentUser.data.username || 'User'}`}
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-lg font-semibold bg-gray-700 text-gray-300 hover:opacity-90 transition-opacity"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold bg-green-600 text-white hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden lg:inline">Login</span>
              </button>
            )}

            {/* Wallet Button - Only show if authenticated */}
            {isAuthenticated && (
              <PhantomButton />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-green-900/10 hover:text-gold-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-green-900/20 text-gold-500'
                      : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            })}
            {isAuthenticated && (
              <Link
                to="/app/profile"
                className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                  location.pathname === '/app/profile'
                    ? 'bg-green-900/20 text-gold-500'
                    : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
            )}

            {/* Login Button for mobile */}
            {!isAuthenticated && (
              <button
                onClick={() => {
                  setAuthModalOpen(true)
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold bg-green-600 text-white hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </button>
            )}

            {/* Wallet Button - Only show if authenticated */}
            {isAuthenticated && (
              <div className="pt-2 space-y-2">
                <PhantomButtonCompact className="w-full" />

                {/* Logout Button for mobile */}
                {currentUser?.data && (
                  <button
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2.5 rounded-lg font-semibold bg-gray-700 text-gray-300 hover:opacity-90 transition-opacity"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        }}
      />
    </header>
  )
}
