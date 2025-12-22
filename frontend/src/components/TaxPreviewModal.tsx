import { X, AlertCircle } from 'lucide-react'

interface TaxPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  amount: number
  tokenSymbol: string
  isPending: boolean
}

const TAX_RATE = 0.05 // 5% tax

export default function TaxPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  tokenSymbol,
  isPending,
}: TaxPreviewModalProps) {
  if (!isOpen) return null

  const taxAmount = amount * TAX_RATE
  const netAmount = amount - taxAmount

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-background-card rounded-xl p-6 max-w-md w-full border border-green-900/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Claim {tokenSymbol}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tax Warning */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-yellow-400 mb-1">
                5% Treasury Tax Applied
              </div>
              <div className="text-xs text-gray-300">
                A 5% tax is collected to support the Takara treasury and platform operations.
              </div>
            </div>
          </div>
        </div>

        {/* Amount Breakdown */}
        <div className="bg-background-elevated rounded-lg p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Claim Amount</span>
            <span className="text-lg font-semibold text-white">
              {amount.toFixed(4)} {tokenSymbol}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Treasury Tax (5%)</span>
            <span className="text-lg font-semibold text-red-400">
              -{taxAmount.toFixed(4)} {tokenSymbol}
            </span>
          </div>

          <div className="border-t border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">You will receive</span>
              <span className="text-xl font-bold text-green-400">
                {netAmount.toFixed(4)} {tokenSymbol}
              </span>
            </div>
          </div>
        </div>

        {/* Tax Info */}
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 mb-6">
          <div className="text-xs text-blue-300">
            💡 <strong>Tax Purpose:</strong> Treasury taxes fund platform development, liquidity pools, and community rewards.
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 btn-gold px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Processing...' : `Claim ${netAmount.toFixed(2)} ${tokenSymbol}`}
          </button>
        </div>
      </div>
    </div>
  )
}
