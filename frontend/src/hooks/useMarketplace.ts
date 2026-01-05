import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../services/api'
import { solanaService } from '../services/solana.service'
import { toast } from 'sonner'

export function useListNFT() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ investmentId, priceUSDT }: { investmentId: string; priceUSDT: number }) => {
      return api.listNFT(investmentId, priceUSDT)
    },
    onSuccess: () => {
      toast.success('Wexel listed successfully!')
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['myListings'] })
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to list Wexel')
    },
  })
}

export function useBuyNFT() {
  const queryClient = useQueryClient()
  const { publicKey, sendTransaction } = useWallet()

  return useMutation({
    mutationFn: async ({
      listingId,
      price,
      paymentType = 'USDT',
      takaraAmount
    }: {
      listingId: string
      price: number
      paymentType?: 'USDT' | 'TAKARA'
      takaraAmount?: number
    }) => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      const platformWallet = solanaService.getPlatformWalletAddress()
      let txSignature: string

      if (paymentType === 'TAKARA' && takaraAmount) {
        // Transfer TAKARA to platform
        toast.info('Transferring TAKARA...')
        txSignature = await solanaService.transferTAKARA(
          publicKey,
          platformWallet,
          takaraAmount,
          sendTransaction
        )
        toast.success('TAKARA transferred successfully!')
      } else {
        // Transfer USDT to platform
        toast.info('Transferring USDT...')
        txSignature = await solanaService.transferUSDT(
          publicKey,
          platformWallet,
          price,
          sendTransaction
        )
        toast.success('USDT transferred successfully!')
      }

      // Complete purchase on backend
      return api.purchaseNFT(listingId, txSignature, paymentType)
    },
    onSuccess: () => {
      toast.success('Wexel purchased successfully!')
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to purchase Wexel')
    },
  })
}

export function useCancelListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (listingId: string) => {
      return api.cancelListing(listingId)
    },
    onSuccess: () => {
      toast.success('Listing cancelled successfully!')
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['myListings'] })
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel listing')
    },
  })
}
