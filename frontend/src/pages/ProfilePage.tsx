import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, User, Mail, Bell, Save, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'

export default function ProfilePage() {
  const { connected, publicKey } = useWallet()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [copied, setCopied] = useState(false)

  // Update profile mutation (placeholder - backend endpoint may need to be created)
  const updateProfile = useMutation({
    mutationFn: async (_data: { username?: string; email?: string }) => {
      // This endpoint might need to be implemented in backend
      return { success: true, message: 'Profile updated successfully' }
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    },
  })

  const handleSave = () => {
    updateProfile.mutate({ username, email })
  }

  const copyWalletAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58())
      setCopied(true)
      toast.success('Wallet address copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Wallet className="h-16 w-16 text-gray-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view your profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Info Card */}
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <h3 className="text-lg font-semibold text-white mb-4">Wallet Info</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-2">Connected Wallet</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background-elevated rounded-lg p-3 font-mono text-sm text-white break-all">
                      {publicKey?.toBase58()}
                    </div>
                    <button
                      onClick={copyWalletAddress}
                      className="p-3 bg-background-elevated hover:bg-green-900/20 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <Copy className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {user && (
                  <>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Member Since</div>
                      <div className="text-white font-medium">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-1">Last Login</div>
                      <div className="text-white font-medium">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats Card */}
            {user && (
              <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Invested</span>
                    <span className="text-white font-semibold">
                      ${user.totalInvested.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Earned USDT</span>
                    <span className="text-gold-500 font-semibold">
                      ${user.totalEarnedUSDT.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Mined TAKARA</span>
                    <span className="text-green-400 font-semibold">
                      {user.totalMinedTAKARA.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-gold-500" />
                Personal Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full pl-11 pr-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Used for notifications and updates
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="btn-gold px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-background-card rounded-xl p-6 border border-green-900/20">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Bell className="h-5 w-5 text-gold-500" />
                Notification Preferences
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background-elevated rounded-lg">
                  <div>
                    <div className="text-white font-medium">Investment Updates</div>
                    <div className="text-sm text-gray-400">
                      Get notified when investments activate or mature
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-background-elevated rounded-lg">
                  <div>
                    <div className="text-white font-medium">Claim Reminders</div>
                    <div className="text-sm text-gray-400">
                      Remind me when I have pending claims
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-background-elevated rounded-lg">
                  <div>
                    <div className="text-white font-medium">Marketplace Activity</div>
                    <div className="text-sm text-gray-400">
                      Notify about NFT sales and offers
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-background-elevated rounded-lg">
                  <div>
                    <div className="text-white font-medium">Platform Updates</div>
                    <div className="text-sm text-gray-400">
                      News, features, and announcements
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
