import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Menu, X, User } from 'lucide-react'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Vaults', href: '/vaults' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'Marketplace', href: '/marketplace' },
]

export default function Header() {
  const location = useLocation()
  const { connected } = useWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-green-900/20 bg-background-primary/95 backdrop-blur supports-[backdrop-filter]:bg-background-primary/80">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center">
                <span className="text-xl font-bold text-background-primary">T</span>
              </div>
              <span className="text-xl font-bold text-gradient-gold">
                Takara Gold
              </span>
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
            {connected && (
              <Link
                to="/profile"
                className={`p-2.5 rounded-lg transition-colors ${
                  location.pathname === '/profile'
                    ? 'bg-green-900/20 text-gold-500'
                    : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                }`}
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            <WalletMultiButton className="!bg-gradient-gold !text-background-primary !rounded-lg !px-6 !py-2.5 !font-semibold hover:!opacity-90 !transition-opacity" />
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
            {connected && (
              <Link
                to="/profile"
                className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                  location.pathname === '/profile'
                    ? 'bg-green-900/20 text-gold-500'
                    : 'text-gray-300 hover:bg-green-900/10 hover:text-gold-400'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
            )}
            <div className="pt-2">
              <WalletMultiButton className="!w-full !bg-gradient-gold !text-background-primary !rounded-lg !px-6 !py-2.5 !font-semibold hover:!opacity-90 !transition-opacity" />
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
