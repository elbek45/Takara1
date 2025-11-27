import { useState } from 'react'
import { X, Tag, Loader2, CheckCircle } from 'lucide-react'
import { useListNFT } from '../../hooks/useMarketplace'
import type { Investment } from '../../types'

interface ListNFTModalProps {
  isOpen: boolean
  onClose: () => void
  investment: Investment
}

export default function ListNFTModal({ isOpen, onClose, investment }: ListNFTModalProps) {
  const listNFT = useListNFT()
  const [priceUSDT, setPriceUSDT] = useState<string>('')
  const [isSuccess, setIsSuccess] = useState(false)

  const suggestedPrice = investment.usdtAmount * 1.05 // 5% markup as suggestion
  const platformFee = parseFloat(priceUSDT || '0') * 0.03 // 3% platform fee
  const youReceive = parseFloat(priceUSDT || '0') - platformFee

  const handleList = async () => {
    if (!priceUSDT || parseFloat(priceUSDT) <= 0) {
      return
    }

    try {
      await listNFT.mutateAsync({
        investmentId: investment.id,
        priceUSDT: parseFloat(priceUSDT),
      })
      setIsSuccess(true)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleClose = () => {
    if (!listNFT.isPending) {
      setIsSuccess(false)
      setPriceUSDT('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background-card rounded-xl max-w-lg w-full border border-green-900/20">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-green-900/20">
          <h2 className="text-2xl font-bold text-white">
            {isSuccess ? 'Listed Successfully!' : 'List NFT for Sale'}
          </h2>
          {!listNFT.isPending && (
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
          {isSuccess ? (
            <div className="text-center py-8 space-y-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">NFT Listed!</h3>
                <p className="text-gray-400 mb-4">
                  Your investment NFT is now available on the marketplace.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    window.location.href = '/marketplace'
                  }}
                  className="btn-gold flex-1 py-3 rounded-lg font-semibold"
                >
                  View Marketplace
                </button>
                <button
                  onClick={handleClose}
                  className="btn-outline-gold flex-1 py-3 rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          ) : listNFT.isPending ? (
            <div className="text-center py-12 space-y-6">
              <Loader2 className="h-16 w-16 text-gold-500 animate-spin mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Creating Listing</h3>
                <p className="text-gray-400">Please wait...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Investment Info */}
              <div className="bg-background-elevated rounded-lg p-4">
                <div className={`tier-${investment.vaultTier.toLowerCase()} inline-block mb-3`}>
                  {investment.vaultTier}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {investment.vaultName}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Original Investment</div>
                    <div className="text-white font-medium">
                      ${investment.usdtAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">APY</div>
                    <div className="text-gold-500 font-semibold">{investment.finalAPY}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total Earned</div>
                    <div className="text-green-400 font-semibold">
                      ${investment.totalEarnedUSDT.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">TAKARA Mined</div>
                    <div className="text-green-400 font-semibold">
                      {investment.totalMinedTAKARA.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Listing Price (USDT)
                </label>
                <input
                  type="number"
                  value={priceUSDT}
                  onChange={(e) => setPriceUSDT(e.target.value)}
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-background-elevated border border-green-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                />
                <div className="mt-2 text-sm text-gray-400">
                  Suggested: ${suggestedPrice.toFixed(2)} (5% markup)
                  <button
                    onClick={() => setPriceUSDT(suggestedPrice.toFixed(2))}
                    className="ml-2 text-gold-500 hover:text-gold-400"
                  >
                    Use
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              {priceUSDT && parseFloat(priceUSDT) > 0 && (
                <div className="bg-background-elevated rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Listing Price</span>
                    <span className="text-white">${parseFloat(priceUSDT).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Platform Fee (3%)</span>
                    <span className="text-gray-400">-${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-green-900/30 pt-2 flex justify-between">
                    <span className="text-white font-medium">You Receive</span>
                    <span className="text-gold-500 font-bold">
                      ${youReceive.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* LAIKA Boost Info */}
              {investment.laikaBoost && (
                <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-4">
                  <div className="text-sm text-laika-purple font-medium mb-2">
                    ℹ️ LAIKA Boost Included
                  </div>
                  <div className="text-sm text-gray-300">
                    This investment has an active LAIKA boost (+
                    {investment.laikaBoost.additionalAPY}% APY) which will transfer to the
                    buyer.
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-yellow-400">
                  ⚠️ Once listed, the NFT will be available for purchase immediately. You can
                  cancel the listing at any time before it's sold.
                </div>
              </div>

              {/* List Button */}
              <button
                onClick={handleList}
                disabled={!priceUSDT || parseFloat(priceUSDT) <= 0 || listNFT.isPending}
                className="btn-gold w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Tag className="h-5 w-5" />
                List for Sale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
