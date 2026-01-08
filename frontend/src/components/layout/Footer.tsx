import { Github, Twitter } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-green-900/20 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div>
              <img
                src="/images/brand/logo-takara.png"
                alt="Takara"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-gray-400">
              Premium stacking vaults on Solana with TAKARA mining rewards.
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-gold-500 mb-3">Products</h3>
            <ul className="space-y-2">
              <li>
                <a href="/vaults" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  Investment Vaults
                </a>
              </li>
              <li>
                <a href="/marketplace" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  Wexel Marketplace
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  Dashboard
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gold-500 mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="/faq" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-gold-500 mb-3">Community</h3>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-gold-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-gold-400 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-green-900/20">
          <p className="text-center text-sm text-gray-500">
            © {currentYear} Takara. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
