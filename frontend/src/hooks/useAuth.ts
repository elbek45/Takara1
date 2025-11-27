import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { toast } from 'sonner'
import bs58 from 'bs58'

export function useAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const queryClient = useQueryClient()

  const walletAddress = publicKey?.toBase58()

  // Query current user
  const { data: userResponse, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUser(),
    enabled: connected && api.isAuthenticated(),
    retry: false,
  })

  const user = userResponse?.data

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!publicKey || !signMessage) {
        throw new Error('Wallet not connected')
      }

      const walletAddr = publicKey.toBase58()

      // Step 1: Get nonce
      const nonceResponse = await api.getNonce(walletAddr)
      const { message } = nonceResponse.data

      // Step 2: Sign message
      const messageBytes = new TextEncoder().encode(message)
      const signatureBytes = await signMessage(messageBytes)
      const signature = bs58.encode(signatureBytes)

      // Step 3: Login
      const loginResponse = await api.login(walletAddr, signature)

      return loginResponse
    },
    onSuccess: () => {
      toast.success('Successfully authenticated!')
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Authentication failed')
      console.error('Login error:', error)
    },
  })

  // Logout function
  const logout = async () => {
    api.logout()
    queryClient.clear()
    if (connected) {
      await disconnect()
    }
    toast.success('Logged out successfully')
  }

  // Auto-authenticate when wallet connects
  useEffect(() => {
    const autoAuth = async () => {
      if (connected && walletAddress && !api.isAuthenticated() && !isAuthenticating) {
        setIsAuthenticating(true)
        try {
          await loginMutation.mutateAsync()
        } catch (error) {
          console.error('Auto-auth error:', error)
        } finally {
          setIsAuthenticating(false)
        }
      }
    }

    autoAuth()
  }, [connected, walletAddress])

  return {
    user,
    isAuthenticated: api.isAuthenticated() && connected,
    isLoading: isLoadingUser || loginMutation.isPending || isAuthenticating,
    login: loginMutation.mutate,
    logout,
    walletAddress,
  }
}
