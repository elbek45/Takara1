import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { toast } from 'sonner'

export function useClaimUSDT() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (investmentId: string) => {
      return api.claimYield(investmentId)
    },
    onSuccess: (_, investmentId) => {
      toast.success('USDT claimed successfully!')
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
      queryClient.invalidateQueries({ queryKey: ['investment', investmentId] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to claim USDT')
    },
  })
}

export function useClaimTAKARA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (investmentId: string) => {
      return api.claimTakara(investmentId)
    },
    onSuccess: (_, investmentId) => {
      toast.success('TAKARA claimed successfully!')
      queryClient.invalidateQueries({ queryKey: ['myInvestments'] })
      queryClient.invalidateQueries({ queryKey: ['investment', investmentId] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to claim TAKARA')
    },
  })
}

export function useClaimAll() {
  const claimUSDT = useClaimUSDT()
  const claimTAKARA = useClaimTAKARA()

  const claimAllUSDT = async (investmentIds: string[]) => {
    const promises = investmentIds.map((id) => claimUSDT.mutateAsync(id))
    await Promise.all(promises)
  }

  const claimAllTAKARA = async (investmentIds: string[]) => {
    const promises = investmentIds.map((id) => claimTAKARA.mutateAsync(id))
    await Promise.all(promises)
  }

  return {
    claimAllUSDT,
    claimAllTAKARA,
    isLoading: claimUSDT.isPending || claimTAKARA.isPending,
  }
}
