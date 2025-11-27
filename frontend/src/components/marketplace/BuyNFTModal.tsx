import { useState } from 'react'
import { X, ShoppingCart, Loader2, CheckCircle } from 'lucide-react'
import { useBuyNFT } from '../../hooks/useMarketplace'
import type { MarketplaceListing } from '../../types'

interface BuyNFTModalProps {
  isOpen: boolean
  onClose: () => void
  listing: MarketplaceListing
}

export default function BuyNFTModal({ isOpen, onClose, listing }: BuyNFTModalProps) {
  const buyNFT = useBuyNFT()
  const [isSuccess, setIsSuccess] = useState(false)

  const platformFee = listing.priceUSDT * (listing.platformFee / 100)
  const totalCost = listing.priceUSDT + platformFee

  const handleBuy = async () => {
    try {
      await buyNFT.mutateAsync({
        listingId: listing.id,
        price: totalCost,
      })
      setIsSuccess(true)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleClose = () => {
    if (!buyNFT.isPending) {
      setIsSuccess(false)
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
            {isSuccess ? 'Purchase Successful!' : 'Purchase NFT'}
          </h2>
          {!buyNFT.isPending && (
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
                <h3 className="text-xl font-bold text-white mb-2">NFT Purchased!</h3>
                <p className="text-gray-400 mb-4">
                  The investment NFT has been transferred to your wallet.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    window.location.href = '/portfolio'
                  }}
                  className="btn-gold flex-1 py-3 rounded-lg font-semibold"
                >
                  View Portfolio
                </button>
                <button
                  onClick={handleClose}
                  className="btn-outline-gold flex-1 py-3 rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          ) : buyNFT.isPending ? (
            <div className="text-center py-12 space-y-6">
              <Loader2 className="h-16 w-16 text-gold-500 animate-spin mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Processing Purchase</h3>
                <p className="text-gray-400">
                  Please confirm the transaction in your wallet...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Listing Info */}
              <div className="bg-background-elevated rounded-lg p-4">
                <div className={`tier-${listing.vault.tier.toLowerCase()} inline-block mb-3`}>
                  {listing.vault.tier}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{listing.vault.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Duration</div>
                    <div className="text-white font-medium">
                      {listing.vault.duration} months
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Remaining</div>
                    <div className="text-white font-medium">{listing.remainingMonths} months</div>
                  </div>
                  <div>
                    <div className="text-gray-400">APY</div>
                    <div className="text-gold-500 font-semibold">{listing.finalAPY}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Earned USDT</div>
                    <div className="text-green-400 font-semibold">
                      ${listing.totalEarnedUSDT.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-300">NFT Price</span>
                  <span className="text-white font-semibold">
                    ${listing.priceUSDT.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform Fee ({listing.platformFee}%)</span>
                  <span className="text-gray-300">${platformFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-green-900/30 pt-3 flex justify-between text-xl">
                  <span className="text-white font-semibold">Total Cost</span>
                  <span className="text-gold-500 font-bold">
                    ${totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* LAIKA Boost Info */}
              {listing.laikaBoost && (
                <div className="bg-gradient-laika/10 border border-laika-purple/30 rounded-lg p-4">
                  <div className="text-sm text-laika-purple font-medium mb-2">
                    🚀 LAIKA Boost Included
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">LAIKA Amount</div>
                      <div className="text-white font-semibold">
                        ${listing.laikaBoost.laikaAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Boost APY</div>
                      <div className="text-laika-green font-semibold">
                        +{listing.laikaBoost.additionalAPY}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-yellow-400">
                  ⚠️ By purchasing this NFT, you will assume ownership of the investment and all
                  associated rewards.
                </div>
              </div>

              {/* Buy Button */}
              <button
                onClick={handleBuy}
                disabled={buyNFT.isPending}
                className="btn-gold w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                Confirm Purchase
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
