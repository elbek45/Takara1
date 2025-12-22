/**
 * Admin Network Configuration Page
 * Manage testnet/mainnet settings and blockchain configuration
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Network, RefreshCw, Save, AlertCircle, CheckCircle2, Copy } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { adminApiService } from '../../services/admin.api'

type NetworkType = 'testnet' | 'devnet' | 'mainnet-beta'
type EthereumNetworkType = 'sepolia' | 'mainnet'

interface NetworkConfig {
  solana: {
    network: NetworkType
    rpcUrl: string
    platformWallet: string
    takaraTokenMint: string
    laikaTokenMint: string
    usdtTokenMint: string
  }
  ethereum: {
    network: EthereumNetworkType
    rpcUrl: string
    platformAddress: string
    usdtContractAddress: string
  }
  nodeEnv: string
  appVersion: string
}

export default function AdminNetworkPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'solana' | 'ethereum'>('solana')
  const [formData, setFormData] = useState<NetworkConfig | null>(null)

  // Fetch current network configuration
  const { data: networkData, isLoading, refetch } = useQuery({
    queryKey: ['adminNetworkConfig'],
    queryFn: async () => {
      const response = await adminApiService.getNetworkConfig()
      const config = response.data
      setFormData(config)
      return config as NetworkConfig
    },
  })

  // Update network configuration
  const updateMutation = useMutation({
    mutationFn: (data: any) => adminApiService.updateNetworkConfig(data),
    onSuccess: () => {
      toast.success('Network configuration updated successfully')
      queryClient.invalidateQueries({ queryKey: ['adminNetworkConfig'] })
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update configuration')
    },
  })

  const handleSolanaChange = (field: string, value: string) => {
    if (!formData) return
    setFormData({
      ...formData,
      solana: {
        ...formData.solana,
        [field]: value,
      },
    })
  }

  const handleEthereumChange = (field: string, value: string) => {
    if (!formData) return
    setFormData({
      ...formData,
      ethereum: {
        ...formData.ethereum,
        [field]: value,
      },
    })
  }

  const handleSaveChanges = () => {
    if (!formData) return

    const updateData = {
      solana: activeTab === 'solana' ? {
        network: formData.solana.network,
        rpcUrl: formData.solana.rpcUrl,
        platformWallet: formData.solana.platformWallet,
        takaraTokenMint: formData.solana.takaraTokenMint,
        laikaTokenMint: formData.solana.laikaTokenMint,
        usdtTokenMint: formData.solana.usdtTokenMint,
      } : undefined,
      ethereum: activeTab === 'ethereum' ? {
        network: formData.ethereum.network,
        rpcUrl: formData.ethereum.rpcUrl,
        platformAddress: formData.ethereum.platformAddress,
        usdtContractAddress: formData.ethereum.usdtContractAddress,
      } : undefined,
    }

    updateMutation.mutate(updateData)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (isLoading || !formData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gold-500" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Network className="h-8 w-8 text-gold-500" />
              Network Configuration
            </h1>
            <p className="text-gray-400 mt-2">
              Manage blockchain network settings and switch between testnet/mainnet
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-lg text-white transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background-card border border-green-900/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Environment</p>
                <p className="text-xl font-bold text-white mt-1">{networkData.nodeEnv}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-background-card border border-green-900/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Solana Network</p>
                <p className="text-xl font-bold text-white mt-1 capitalize">
                  {networkData.solana.network}
                </p>
              </div>
              <Network className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-background-card border border-green-900/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">App Version</p>
                <p className="text-xl font-bold text-white mt-1">{networkData.appVersion}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gold-500" />
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold">Important Notice</h3>
            <p className="text-gray-300 text-sm mt-1">
              Configuration changes require manual update to .env.production file on the server and a backend restart to take effect.
              Use this interface to view current settings and prepare configuration changes.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-green-900/20">
          <button
            onClick={() => setActiveTab('solana')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'solana'
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Solana Configuration
          </button>
          <button
            onClick={() => setActiveTab('ethereum')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'ethereum'
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ethereum Configuration
          </button>
        </div>

        {/* Solana Configuration */}
        {activeTab === 'solana' && (
          <div className="bg-background-card border border-green-900/20 rounded-xl p-6 space-y-6">
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Network
              </label>
              <select
                value={formData.solana.network}
                onChange={(e) => handleSolanaChange('network', e.target.value)}
                className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="devnet">Devnet</option>
                <option value="testnet">Testnet</option>
                <option value="mainnet-beta">Mainnet Beta</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the Solana network environment
              </p>
            </div>

            {/* RPC URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RPC URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.solana.rpcUrl}
                  onChange={(e) => handleSolanaChange('rpcUrl', e.target.value)}
                  className="flex-1 px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="https://api.mainnet-beta.solana.com"
                />
                <button
                  onClick={() => copyToClipboard(formData.solana.rpcUrl)}
                  className="px-4 py-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-lg text-white transition-colors"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Solana RPC endpoint URL
              </p>
            </div>

            {/* Platform Wallet */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Wallet Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.solana.platformWallet}
                  onChange={(e) => handleSolanaChange('platformWallet', e.target.value)}
                  className="flex-1 px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="Platform wallet public key"
                />
                <button
                  onClick={() => copyToClipboard(formData.solana.platformWallet)}
                  className="px-4 py-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-lg text-white transition-colors"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Main platform wallet for transactions
              </p>
            </div>

            {/* Token Mints */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  TAKARA Token Mint
                </label>
                <input
                  type="text"
                  value={formData.solana.takaraTokenMint}
                  onChange={(e) => handleSolanaChange('takaraTokenMint', e.target.value)}
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="TAKARA mint address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  LAIKA Token Mint
                </label>
                <input
                  type="text"
                  value={formData.solana.laikaTokenMint}
                  onChange={(e) => handleSolanaChange('laikaTokenMint', e.target.value)}
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="LAIKA mint address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  USDT Token Mint
                </label>
                <input
                  type="text"
                  value={formData.solana.usdtTokenMint}
                  onChange={(e) => handleSolanaChange('usdtTokenMint', e.target.value)}
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="USDT mint address"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ethereum Configuration */}
        {activeTab === 'ethereum' && (
          <div className="bg-background-card border border-green-900/20 rounded-xl p-6 space-y-6">
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Network
              </label>
              <select
                value={formData.ethereum.network}
                onChange={(e) => handleEthereumChange('network', e.target.value)}
                className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="sepolia">Sepolia (Testnet)</option>
                <option value="mainnet">Mainnet</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the Ethereum network environment
              </p>
            </div>

            {/* RPC URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RPC URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.ethereum.rpcUrl}
                  onChange={(e) => handleEthereumChange('rpcUrl', e.target.value)}
                  className="flex-1 px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="https://mainnet.infura.io/v3/YOUR_API_KEY"
                />
                <button
                  onClick={() => copyToClipboard(formData.ethereum.rpcUrl)}
                  className="px-4 py-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-lg text-white transition-colors"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ethereum RPC endpoint URL (e.g., Infura)
              </p>
            </div>

            {/* Platform Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.ethereum.platformAddress}
                  onChange={(e) => handleEthereumChange('platformAddress', e.target.value)}
                  className="flex-1 px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="0x..."
                />
                <button
                  onClick={() => copyToClipboard(formData.ethereum.platformAddress)}
                  className="px-4 py-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-lg text-white transition-colors"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Main platform Ethereum address
              </p>
            </div>

            {/* USDT Contract */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                USDT Contract Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.ethereum.usdtContractAddress}
                  onChange={(e) => handleEthereumChange('usdtContractAddress', e.target.value)}
                  className="flex-1 px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="0x..."
                />
                <button
                  onClick={() => copyToClipboard(formData.ethereum.usdtContractAddress)}
                  className="px-4 py-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/30 rounded-lg text-white transition-colors"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                USDT token contract address
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSaveChanges}
            disabled={updateMutation.isPending}
            className="px-6 py-3 btn-gold rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
