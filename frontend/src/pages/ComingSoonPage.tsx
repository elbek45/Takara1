import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Lock } from 'lucide-react'

export default function ComingSoonPage() {
  const navigate = useNavigate()
  const [showAccess, setShowAccess] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')

  const handleAccess = () => {
    if (accessCode === 'takara2026') {
      localStorage.setItem('takara_access', 'granted')
      navigate('/app')
    } else {
      setError('Invalid access code')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Japanese pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 text-center px-4 max-w-2xl">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-2">
            Takara <span className="text-gold-500">宝</span>
          </h1>
          <p className="text-gray-400 text-lg">Premium Investment Platform</p>
        </div>

        {/* Coming Soon */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500/20 border border-gold-500/30 rounded-full mb-6">
            <Sparkles className="h-5 w-5 text-gold-400" />
            <span className="text-gold-400 font-semibold">Coming Soon</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Something Amazing is Brewing
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            We're building the future of decentralized investments.
            Earn up to 20% APY and mine TAKARA tokens on the Solana blockchain.
          </p>
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-background-card/50 backdrop-blur-sm rounded-xl p-4 border border-green-900/20">
            <div className="text-2xl font-bold text-gold-400 mb-1">20%</div>
            <div className="text-xs text-gray-500">Max APY</div>
          </div>
          <div className="bg-background-card/50 backdrop-blur-sm rounded-xl p-4 border border-green-900/20">
            <div className="text-2xl font-bold text-green-400 mb-1">TAKARA</div>
            <div className="text-xs text-gray-500">Mining</div>
          </div>
          <div className="bg-background-card/50 backdrop-blur-sm rounded-xl p-4 border border-green-900/20">
            <div className="text-2xl font-bold text-blue-400 mb-1">NFT</div>
            <div className="text-xs text-gray-500">Wexels</div>
          </div>
        </div>

        {/* Access button */}
        {!showAccess ? (
          <button
            onClick={() => setShowAccess(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-400 transition-colors text-sm"
          >
            <Lock className="h-4 w-4" />
            Team Access
          </button>
        ) : (
          <div className="bg-background-card/80 backdrop-blur-sm rounded-xl p-6 border border-green-900/20 max-w-sm mx-auto">
            <h3 className="text-white font-semibold mb-4">Team Access</h3>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
              placeholder="Enter access code"
              className="w-full px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-gold-500"
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAccess(false)}
                className="flex-1 px-4 py-2 bg-background-elevated border border-green-900/30 rounded-lg text-gray-400 hover:bg-green-900/10"
              >
                Cancel
              </button>
              <button
                onClick={handleAccess}
                className="flex-1 px-4 py-2 bg-gold-500 text-background-primary font-semibold rounded-lg hover:bg-gold-400"
              >
                Enter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-gray-600 text-sm">
        <p>&copy; 2026 Takara Gold. All rights reserved.</p>
      </div>
    </div>
  )
}
