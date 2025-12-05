/**
 * Admin API Service
 * All admin-related API calls
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance with interceptors
const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const adminApiService = {
  /**
   * Admin Login
   */
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API_URL}/admin/auth/login`, {
      username,
      password,
    })
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('admin_token', response.data.data.token)
    }
    return response.data
  },

  /**
   * Admin Logout
   */
  logout: () => {
    localStorage.removeItem('admin_token')
  },

  /**
   * Check if admin is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('admin_token')
  },

  /**
   * Get Dashboard Stats
   */
  getDashboardStats: async () => {
    const response = await adminApi.get('/admin/dashboard')
    return response.data
  },

  /**
   * Get Users
   */
  getUsers: async (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const response = await adminApi.get('/admin/users', { params })
    return response.data
  },

  /**
   * Get Investments
   */
  getInvestments: async (params?: { page?: number; limit?: number; status?: string; vaultId?: string }) => {
    const response = await adminApi.get('/admin/investments', { params })
    return response.data
  },

  /**
   * Get Withdrawals
   */
  getWithdrawals: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await adminApi.get('/admin/withdrawals', { params })
    return response.data
  },

  /**
   * Process Withdrawal
   */
  processWithdrawal: async (id: string, action: 'approve' | 'reject', data: { txSignature?: string; rejectionReason?: string }) => {
    const response = await adminApi.put(`/admin/withdrawals/${id}/process`, {
      action,
      ...data,
    })
    return response.data
  },

  /**
   * Toggle Vault Status
   */
  toggleVaultStatus: async (id: string, isActive: boolean) => {
    const response = await adminApi.put(`/admin/vaults/${id}/toggle`, { isActive })
    return response.data
  },

  /**
   * Get All Vaults (Admin View)
   */
  getVaults: async () => {
    const response = await adminApi.get('/admin/vaults')
    return response.data
  },

  /**
   * Create New Vault
   */
  createVault: async (data: {
    name: string
    tier: 'STARTER' | 'PRO' | 'ELITE'
    duration: number
    payoutSchedule: 'MONTHLY' | 'QUARTERLY' | 'END_OF_TERM'
    minInvestment: number
    maxInvestment: number
    baseAPY: number
    maxAPY: number
    takaraAPY: number // v2.2: renamed from miningPower
    requireTAKARA: boolean
    takaraRatio?: number
    totalCapacity?: number
    isActive: boolean
  }) => {
    const response = await adminApi.post('/admin/vaults', data)
    return response.data
  },

  /**
   * Update Vault
   */
  updateVault: async (id: string, data: {
    name?: string
    minInvestment?: number
    maxInvestment?: number
    baseAPY?: number
    maxAPY?: number
    takaraAPY?: number // v2.2: renamed from miningPower
    requireTAKARA?: boolean
    takaraRatio?: number
    totalCapacity?: number
    isActive?: boolean
  }) => {
    const response = await adminApi.put(`/admin/vaults/${id}`, data)
    return response.data
  },

  /**
   * Delete Vault (Deactivate)
   */
  deleteVault: async (id: string) => {
    const response = await adminApi.delete(`/admin/vaults/${id}`)
    return response.data
  },

  /**
   * Get Vault Statistics
   */
  getVaultStats: async (id: string) => {
    const response = await adminApi.get(`/admin/vaults/${id}/stats`)
    return response.data
  },

  /**
   * Get Mining Stats
   */
  getMiningStats: async () => {
    const response = await adminApi.get('/admin/stats/mining')
    return response.data
  },

  /**
   * Get Deployment Status
   */
  getDeploymentStatus: async () => {
    const response = await adminApi.get('/admin/deployment/status')
    return response.data
  },

  /**
   * Deploy TAKARA Token
   */
  deployTakara: async () => {
    const response = await adminApi.post('/admin/deployment/deploy-takara', {
      confirm: true
    })
    return response.data
  },

  /**
   * Update Environment Variables
   */
  updateEnvironment: async (data: {
    takaraTokenMint?: string
    infuraApiKey?: string
    solanaRpcUrl?: string
  }) => {
    const response = await adminApi.post('/admin/deployment/update-env', data)
    return response.data
  },

  /**
   * Verify TAKARA Token
   */
  verifyTakara: async () => {
    const response = await adminApi.post('/admin/deployment/verify-takara')
    return response.data
  },

  /**
   * Create WEXEL NFT Collection
   */
  createWexelCollection: async () => {
    const response = await adminApi.post('/admin/deployment/create-wexel-collection', {
      confirm: true
    })
    return response.data
  },

  // ==================== NETWORK CONFIGURATION ====================

  /**
   * Get Network Configuration
   */
  getNetworkConfig: async () => {
    const response = await adminApi.get('/admin/network')
    return response.data
  },

  /**
   * Update Network Configuration
   */
  updateNetworkConfig: async (data: {
    solana?: {
      network: 'testnet' | 'devnet' | 'mainnet-beta'
      rpcUrl: string
      platformWallet?: string
      platformWalletPrivateKey?: string
      takaraTokenMint?: string
      laikaTokenMint?: string
      usdtTokenMint?: string
    }
    ethereum?: {
      network: 'sepolia' | 'mainnet'
      rpcUrl: string
      platformAddress?: string
      platformPrivateKey?: string
      usdtContractAddress?: string
    }
  }) => {
    const response = await adminApi.put('/admin/network', data)
    return response.data
  },
}

export default adminApiService
