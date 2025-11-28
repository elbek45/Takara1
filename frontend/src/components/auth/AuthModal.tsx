import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Loader2, User, Lock } from 'lucide-react'
import { api } from '../../services/api'
import { toast } from 'sonner'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type AuthMode = 'login' | 'register'

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')

  const loginMutation = useMutation({
    mutationFn: async () => {
      return await api.loginWithPassword(username, password)
    },
    onSuccess: () => {
      toast.success('Login successful!')
      setUsername('')
      setPassword('')
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed')
      console.error('Login error:', error)
    },
  })

  const registerMutation = useMutation({
    mutationFn: async () => {
      return await api.register(username, password, email || undefined)
    },
    onSuccess: () => {
      toast.success('Registration successful!')
      setUsername('')
      setPassword('')
      setEmail('')
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed')
      console.error('Registration error:', error)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      toast.error('Username and password are required')
      return
    }

    if (mode === 'login') {
      await loginMutation.mutateAsync()
    } else {
      await registerMutation.mutateAsync()
    }
  }

  const handleClose = () => {
    if (!loginMutation.isPending && !registerMutation.isPending) {
      setUsername('')
      setPassword('')
      setEmail('')
      setMode('login')
      onClose()
    }
  }

  if (!isOpen) return null

  const isPending = loginMutation.isPending || registerMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background-card rounded-xl max-w-md w-full border border-green-900/20">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-green-900/20">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Login' : 'Create Account'}
          </h2>
          {!isPending && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="Enter your username"
                  disabled={isPending}
                  required
                />
              </div>
              {mode === 'register' && (
                <p className="mt-1 text-xs text-gray-500">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              )}
            </div>

            {/* Email (only for register) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="your@email.com"
                  disabled={isPending}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="Enter your password"
                  disabled={isPending}
                  required
                />
              </div>
              {mode === 'register' && (
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full btn-gold py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                <>{mode === 'login' ? 'Login' : 'Create Account'}</>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              disabled={isPending}
              className="text-sm text-gray-400 hover:text-gold-500 transition-colors disabled:opacity-50"
            >
              {mode === 'login' ? (
                <>
                  Don't have an account? <span className="text-gold-500 font-semibold">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="text-gold-500 font-semibold">Login</span>
                </>
              )}
            </button>
          </div>

          {/* Wallet Login Alternative */}
          <div className="mt-4 pt-4 border-t border-green-900/20">
            <p className="text-xs text-center text-gray-500">
              You can also connect with your crypto wallet for instant access
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
