import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiService } from '../../services/admin.api'
import { Rocket, CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, Settings, ExternalLink } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { toast } from 'sonner'

export default function AdminDeploymentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [takaraMint, setTakaraMint] = useState('')
  const [infuraKey, setInfuraKey] = useState('')
  const [solanaRpc, setSolanaRpc] = useState('')

  // Check authentication
  useEffect(() => {
    if (!adminApiService.isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [navigate])

  // Fetch deployment status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['deploymentStatus'],
    queryFn: () => adminApiService.getDeploymentStatus(),
    refetchInterval: (data) => {
      // Poll every 2 seconds if deployment in progress
      return data?.data?.deployment?.inProgress ? 2000 : false
    }
  })

  const status = statusData?.data

  // Deploy TAKARA mutation
  const deployTakaraMutation = useMutation({
    mutationFn: () => adminApiService.deployTakara(),
    onSuccess: () => {
      toast.success('TAKARA deployment started!')
      queryClient.invalidateQueries({ queryKey: ['deploymentStatus'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Deployment failed')
    }
  })

  // Update environment mutation
  const updateEnvMutation = useMutation({
    mutationFn: (data: { takaraTokenMint?: string; infuraApiKey?: string; solanaRpcUrl?: string }) =>
      adminApiService.updateEnvironment(data),
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries({ queryKey: ['deploymentStatus'] })
      setTakaraMint('')
      setInfuraKey('')
      setSolanaRpc('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update environment')
    }
  })

  const handleDeployTakara = () => {
    if (!confirm('Are you sure you want to deploy TAKARA token? This will cost ~1 SOL (~$200).')) {
      return
    }
    deployTakaraMutation.mutate()
  }

  const handleUpdateEnv = () => {
    const updates: any = {}
    if (takaraMint) updates.takaraTokenMint = takaraMint
    if (infuraKey) updates.infuraApiKey = infuraKey
    if (solanaRpc) updates.solanaRpcUrl = solanaRpc

    if (Object.keys(updates).length === 0) {
      toast.error('Please enter at least one value to update')
      return
    }

    updateEnvMutation.mutate(updates)
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      </AdminLayout>
    )
  }

  const deployment = status?.deployment
  const config = status?.config
  const deploymentStatus = status?.status

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Token Deployment</h1>
            <p className="text-gray-400 mt-1">Deploy TAKARA token and manage API configurations</p>
          </div>
          <button
            onClick={() => refetch()}
            className="btn-outline-gold px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TAKARA Status */}
          <div className={`bg-background-card rounded-xl border p-6 ${
            deploymentStatus?.takaraDeployed ? 'border-green-900/20' : 'border-yellow-900/20'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {deploymentStatus?.takaraDeployed ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-400" />
              )}
              <span className="text-sm font-medium text-gray-300">TAKARA Token</span>
            </div>
            <div className={`text-2xl font-bold ${
              deploymentStatus?.takaraDeployed ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {deploymentStatus?.takaraDeployed ? 'Deployed' : 'Not Deployed'}
            </div>
            {config?.takaraTokenMint && config.takaraTokenMint !== 'TO_BE_DEPLOYED' && (
              <a
                href={`https://solscan.io/token/${config.takaraTokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1"
              >
                View on Solscan
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* LAIKA Status */}
          <div className={`bg-background-card rounded-xl border border-green-900/20 p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span className="text-sm font-medium text-gray-300">LAIKA Token</span>
            </div>
            <div className="text-2xl font-bold text-green-400">Configured</div>
            {config?.laikaTokenMint && (
              <a
                href={`https://solscan.io/token/${config.laikaTokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1"
              >
                View on Solscan
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Infura Status */}
          <div className={`bg-background-card rounded-xl border p-6 ${
            deploymentStatus?.infuraConfigured ? 'border-green-900/20' : 'border-yellow-900/20'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {deploymentStatus?.infuraConfigured ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-400" />
              )}
              <span className="text-sm font-medium text-gray-300">Infura API</span>
            </div>
            <div className={`text-2xl font-bold ${
              deploymentStatus?.infuraConfigured ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {deploymentStatus?.infuraConfigured ? 'Configured' : 'Not Set'}
            </div>
          </div>

          {/* Wallets Status */}
          <div className={`bg-background-card rounded-xl border p-6 ${
            deploymentStatus?.walletsGenerated ? 'border-green-900/20' : 'border-red-900/20'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {deploymentStatus?.walletsGenerated ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
              <span className="text-sm font-medium text-gray-300">Wallets</span>
            </div>
            <div className={`text-2xl font-bold ${
              deploymentStatus?.walletsGenerated ? 'text-green-400' : 'text-red-400'
            }`}>
              {deploymentStatus?.walletsGenerated ? 'Generated' : 'Missing'}
            </div>
          </div>
        </div>

        {/* Deployment In Progress */}
        {deployment?.inProgress && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
              <div>
                <h3 className="text-lg font-semibold text-white">Deployment In Progress</h3>
                <p className="text-sm text-gray-400">{deployment.currentStep}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>{deployment.progress}%</span>
              </div>
              <div className="w-full bg-background-elevated rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${deployment.progress}%` }}
                />
              </div>
            </div>

            {/* Logs */}
            <div className="bg-background-elevated rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="font-mono text-xs text-gray-300 space-y-1">
                {deployment.logs?.map((log: string, i: number) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deployment Result */}
        {deployment?.result && !deployment?.inProgress && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Deployment Successful!</h3>
                <p className="text-sm text-gray-400">TAKARA token deployed to Solana mainnet</p>
              </div>
            </div>

            <div className="bg-background-elevated rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Token:</span>
                  <span className="text-white ml-2">{deployment.result.symbol}</span>
                </div>
                <div>
                  <span className="text-gray-400">Decimals:</span>
                  <span className="text-white ml-2">{deployment.result.decimals}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Mint Address:</span>
                  <div className="text-white font-mono text-xs mt-1 break-all">
                    {deployment.result.mintAddress}
                  </div>
                </div>
                <div className="col-span-2">
                  <a
                    href={deployment.result.solscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  >
                    View on Solscan
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-sm text-yellow-200">
                <strong>⚠️ NEXT STEP:</strong> Copy the mint address above and paste it in the "Update Configuration" section below,
                then click "Update Environment" to apply changes.
              </div>
            </div>
          </div>
        )}

        {/* Deploy TAKARA Section */}
        {!deploymentStatus?.takaraDeployed && (
          <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Rocket className="h-6 w-6 text-gold-500" />
              <div>
                <h2 className="text-xl font-semibold text-white">Deploy TAKARA Token</h2>
                <p className="text-sm text-gray-400">Deploy TAKARA token to Solana mainnet</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Deployment Details</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Token: Takara Gold (TAKARA)</li>
                  <li>• Decimals: 9</li>
                  <li>• Initial Mint: 60,000,000 TAKARA (10% of total supply)</li>
                  <li>• Cost: ~1 SOL (~$200)</li>
                  <li>• Network: Solana Mainnet</li>
                </ul>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">⚠️ Prerequisites</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Wallets must be generated ({deploymentStatus?.walletsGenerated ? '✅' : '❌'})</li>
                  <li>• Solana wallet must have at least 1 SOL</li>
                  <li>• Cannot be undone</li>
                </ul>
              </div>

              <button
                onClick={handleDeployTakara}
                disabled={!deploymentStatus?.walletsGenerated || deployment?.inProgress || deployTakaraMutation.isPending}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                  !deploymentStatus?.walletsGenerated || deployment?.inProgress || deployTakaraMutation.isPending
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'btn-gold'
                }`}
              >
                {deployTakaraMutation.isPending || deployment?.inProgress ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5" />
                    Deploy TAKARA Token
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Update Configuration Section */}
        <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Update Configuration</h2>
              <p className="text-sm text-gray-400">Configure API keys and token addresses</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                TAKARA Token Mint Address
              </label>
              <input
                type="text"
                value={takaraMint}
                onChange={(e) => setTakaraMint(e.target.value)}
                placeholder="Enter TAKARA mint address"
                className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: {config?.takaraTokenMint || 'Not set'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Infura API Key
              </label>
              <input
                type="text"
                value={infuraKey}
                onChange={(e) => setInfuraKey(e.target.value)}
                placeholder="Enter Infura project ID"
                className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be used as: https://mainnet.infura.io/v3/YOUR_KEY
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Solana RPC URL (Optional)
              </label>
              <input
                type="url"
                value={solanaRpc}
                onChange={(e) => setSolanaRpc(e.target.value)}
                placeholder="https://api.mainnet-beta.solana.com"
                className="w-full px-4 py-2 bg-background-elevated border border-green-900/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: {config?.solanaRpcUrl || 'Not set'}
              </p>
            </div>

            <button
              onClick={handleUpdateEnv}
              disabled={updateEnvMutation.isPending}
              className="w-full btn-outline-gold py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {updateEnvMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Settings className="h-5 w-5" />
                  Update Environment
                </>
              )}
            </button>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-200">
                <strong>Note:</strong> After updating, you must restart the backend server to apply changes permanently.
                Use: <code className="bg-black/30 px-2 py-1 rounded">pm2 restart takara-backend</code>
              </p>
            </div>
          </div>
        </div>

        {/* Current Configuration */}
        <div className="bg-background-card rounded-xl border border-green-900/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Current Configuration</h2>
          <div className="bg-background-elevated rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Solana Network:</span>
                <span className="text-white ml-2">{config?.solanaNetwork || 'Not set'}</span>
              </div>
              <div>
                <span className="text-gray-400">Platform Wallet:</span>
                <div className="text-white font-mono text-xs mt-1 break-all">
                  {config?.platformWallet || 'Not set'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">ETH Address:</span>
                <div className="text-white font-mono text-xs mt-1 break-all">
                  {config?.platformEthAddress || 'Not set'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">LAIKA Mint:</span>
                <div className="text-white font-mono text-xs mt-1 break-all">
                  {config?.laikaTokenMint || 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
