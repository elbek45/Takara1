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
      toast.success('NFT listed successfully!')
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['myListings'] })
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to list NFT')
    },
  })
}

export function useBuyNFT() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async ({ listingId, price }: { listingId: string; price: number }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      // Transfer USDT to platform
      toast.info('Transferring USDT...')
      const platformWallet = solanaService.getPlatformWalletAddress()

      const txSignature = await solanaService.transferUSDT(
        publicKey,
        platformWallet,
        price,
        signTransaction
      )

      toast.success('USDT transferred successfully!')

      // Complete purchase on backend
      return api.purchaseNFT(listingId, txSignature)
    },
    onSuccess: () => {
      toast.success('NFT purchased successfully!')
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to purchase NFT')
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
