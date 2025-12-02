/**
 * API Client Service
 * Handles all HTTP requests to the backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  ApiResponse,
  Vault,
  Investment,
  InvestmentCalculation,
  MarketplaceListing,
  User,
  LoginResponse,
  NonceResponse,
  CalculateInvestmentInput,
  CreateInvestmentInput,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Don't redirect if it's a login/register request (expected 401 for wrong credentials)
          const isAuthRequest = error.config?.url?.includes('/auth/login') ||
                                error.config?.url?.includes('/auth/register')

          if (!isAuthRequest) {
            // Clear token and redirect to home only for protected endpoints
            localStorage.removeItem('auth_token')
            window.location.href = '/'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  // ==================== AUTH ====================

  async getNonce(walletAddress: string): Promise<NonceResponse> {
    const { data } = await this.client.get<NonceResponse>('/auth/nonce', {
      params: { walletAddress },
    })
    return data
  }

  async login(walletAddress: string, signature: string): Promise<LoginResponse> {
    const { data } = await this.client.post<LoginResponse>('/auth/login', {
      walletAddress,
      signature,
    })

    if (data.token) {
      localStorage.setItem('auth_token', data.token)
    }

    return data
  }

  async register(username: string, password: string, email?: string): Promise<LoginResponse> {
    const { data } = await this.client.post<LoginResponse>('/auth/register', {
      username,
      password,
      email,
    })

    if (data.token) {
      localStorage.setItem('auth_token', data.token)
    }

    return data
  }

  async loginWithPassword(username: string, password: string): Promise<LoginResponse> {
    const { data } = await this.client.post<LoginResponse>('/auth/login-password', {
      username,
      password,
    })

    if (data.token) {
      localStorage.setItem('auth_token', data.token)
    }

    return data
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const { data } = await this.client.get<ApiResponse<User>>('/auth/me')
    return data
  }

  logout(): void {
    localStorage.removeItem('auth_token')
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token')
  }

  async connectEthereum(ethereumAddress: string): Promise<ApiResponse> {
    const { data } = await this.client.post<ApiResponse>('/auth/connect-ethereum', {
      ethereumAddress,
    })
    return data
  }

  async connectSolana(walletAddress: string): Promise<ApiResponse> {
    const { data } = await this.client.post<ApiResponse>('/auth/connect-solana', {
      walletAddress,
    })
    return data
  }

  // ==================== VAULTS ====================

  async getVaults(params?: {
    tier?: string
    duration?: number
    isActive?: boolean
  }): Promise<ApiResponse<Vault[]>> {
    const { data } = await this.client.get<ApiResponse<Vault[]>>('/vaults', { params })
    return data
  }

  async getVaultById(id: string): Promise<ApiResponse<any>> {
    const { data } = await this.client.get<ApiResponse<any>>(`/vaults/${id}`)
    return data
  }

  async calculateInvestment(
    vaultId: string,
    input: CalculateInvestmentInput
  ): Promise<ApiResponse<InvestmentCalculation>> {
    const { data } = await this.client.post<ApiResponse<InvestmentCalculation>>(
      `/vaults/${vaultId}/calculate`,
      input
    )
    return data
  }

  // ==================== INVESTMENTS ====================

  async createInvestment(input: CreateInvestmentInput): Promise<ApiResponse> {
    const { data} = await this.client.post<ApiResponse>('/investments', input)
    return data
  }

  async getMyInvestments(status?: string): Promise<ApiResponse<Investment[]>> {
    const { data } = await this.client.get<ApiResponse<Investment[]>>('/investments/my', {
      params: { status },
    })
    return data
  }

  async getInvestmentById(id: string): Promise<ApiResponse<any>> {
    const { data } = await this.client.get<ApiResponse<any>>(`/investments/${id}`)
    return data
  }

  async claimYield(investmentId: string): Promise<ApiResponse> {
    const { data } = await this.client.post<ApiResponse>(
      `/investments/${investmentId}/claim-yield`
    )
    return data
  }

  async claimTakara(investmentId: string): Promise<ApiResponse> {
    const { data } = await this.client.post<ApiResponse>(
      `/investments/${investmentId}/claim-takara`
    )
    return data
  }

  // ==================== MARKETPLACE ====================

  async getMarketplaceListings(params?: {
    status?: string
    sortBy?: string
    sortOrder?: string
    minPrice?: number
    maxPrice?: number
  }): Promise<ApiResponse<MarketplaceListing[]>> {
    const { data } = await this.client.get<ApiResponse<MarketplaceListing[]>>(
      '/marketplace',
      { params }
    )
    return data
  }

  async getMarketplaceStats(): Promise<ApiResponse> {
    const { data } = await this.client.get<ApiResponse>('/marketplace/stats')
    return data
  }

  async listNFT(investmentId: string, priceUSDT: number): Promise<ApiResponse> {
    const { data } = await this.client.post<ApiResponse>('/marketplace/list', {
      investmentId,
      priceUSDT,
    })
    return data
  }

  async purchaseNFT(listingId: string, txSignature: string): Promise<ApiResponse> {
    const { data } = await this.client.post<ApiResponse>(`/marketplace/${listingId}/buy`, {
      txSignature,
    })
    return data
  }

  async cancelListing(listingId: string): Promise<ApiResponse> {
    const { data } = await this.client.delete<ApiResponse>(`/marketplace/${listingId}`)
    return data
  }

  async getMyListings(): Promise<ApiResponse<any[]>> {
    const { data } = await this.client.get<ApiResponse<any[]>>('/marketplace/my-listings')
    return data
  }
}

// Export singleton instance
export const api = new ApiClient()
export default api
