import { useState } from 'react'
import { ChevronDown, ChevronUp, Wallet, Coins, TrendingUp, Calendar, Shield } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string | JSX.Element
  category: string
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      question: 'What is Takara 宝?',
      answer: (
        <div className="space-y-2">
          <p>Takara 宝 is a premium DeFi platform on Solana that offers three ways to earn:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Base APY:</strong> 4-8% on USDT deposits</li>
            <li><strong>LAIKA Boost:</strong> Up to +12% additional APY</li>
            <li><strong>TAKARA Mining:</strong> Daily token rewards based on vault mining power</li>
          </ul>
        </div>
      )
    },
    {
      category: 'Getting Started',
      question: 'What wallets do I need?',
      answer: (
        <div className="space-y-2">
          <p>You need TWO wallets for stacking on Takara:</p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="font-semibold text-blue-400 mb-1">1. MetaMask (Ethereum)</p>
            <p className="text-sm">For USDT payment on Ethereum mainnet</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="font-semibold text-purple-400 mb-1">2. Phantom (Solana)</p>
            <p className="text-sm">For TAKARA tokens and LAIKA boost on Solana mainnet</p>
          </div>
        </div>
      )
    },
    {
      category: 'Stacking Process',
      question: 'How do I start stacking?',
      answer: (
        <div className="space-y-3">
          <p className="font-semibold text-gold-500">Step-by-step guide:</p>

          <div className="space-y-3">
            <div className="bg-background-elevated rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-semibold text-white mb-1">Connect Both Wallets</p>
                  <p className="text-sm text-gray-400">Connect MetaMask and Phantom on the platform</p>
                </div>
              </div>
            </div>

            <div className="bg-background-elevated rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-semibold text-white mb-1">Choose Your Vault</p>
                  <p className="text-sm text-gray-400">Browse 9 vaults across 3 tiers (Starter, Pro, Elite)</p>
                  <p className="text-sm text-gray-400 mt-1">Select based on your amount and duration (12M, 30M, or 36M)</p>
                </div>
              </div>
            </div>

            <div className="bg-background-elevated rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-semibold text-white mb-1">Enter USDT Amount</p>
                  <p className="text-sm text-gray-400">Minimum: $100 (Starter) to $5,000 (Elite)</p>
                </div>
              </div>
            </div>

            <div className="bg-background-elevated rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-laika-purple text-black rounded-full flex items-center justify-center font-bold">4</div>
                <div>
                  <p className="font-semibold text-white mb-1">Optional: Add LAIKA Boost</p>
                  <p className="text-sm text-gray-400">Use slider to add LAIKA tokens for extra APY</p>
                  <p className="text-sm text-green-400 mt-1">🎁 Get 10% discount on LAIKA value!</p>
                </div>
              </div>
            </div>

            <div className="bg-background-elevated rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center font-bold">5</div>
                <div>
                  <p className="font-semibold text-white mb-1">Complete 2-Step Payment</p>
                  <p className="text-sm text-gray-400">→ Pay USDT via MetaMask (Ethereum)</p>
                  <p className="text-sm text-gray-400">→ Pay TAKARA + LAIKA via Phantom (Solana)</p>
                </div>
              </div>
            </div>

            <div className="bg-background-elevated rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-black rounded-full flex items-center justify-center font-bold">6</div>
                <div>
                  <p className="font-semibold text-white mb-1">Receive Your Wexel</p>
                  <p className="text-sm text-gray-400">Your stacking position is represented as a Wexel NFT</p>
                  <p className="text-sm text-gray-400 mt-1">View it in Portfolio or trade on Marketplace</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      category: 'Stacking Process',
      question: 'What is the 2-step payment process?',
      answer: (
        <div className="space-y-3">
          <p>Takara uses a unique 2-step payment system for security and efficiency:</p>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="font-semibold text-blue-400 mb-2">Step 1: USDT Payment (MetaMask)</p>
            <p className="text-sm text-gray-300">Pay your USDT on <strong>Ethereum Mainnet</strong></p>
            <p className="text-sm text-gray-400 mt-1">This is your main stacking deposit</p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="font-semibold text-purple-400 mb-2">Step 2: TAKARA + LAIKA (Phantom)</p>
            <p className="text-sm text-gray-300">Pay required TAKARA tokens on <strong>Solana Mainnet</strong></p>
            <p className="text-sm text-gray-300 mt-1">If you chose boost: pay LAIKA tokens</p>
            <p className="text-sm text-gray-400 mt-2">💡 Pro/Elite tiers require TAKARA (30-50 per 100 USDT)</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-yellow-400">
              ⚠️ <strong>Important:</strong> You must complete both steps. If you only pay USDT without completing the Phantom step, your stacking will be rejected.
            </p>
          </div>
        </div>
      )
    },
    {
      category: 'Vault Tiers',
      question: 'What are the differences between vault tiers?',
      answer: (
        <div className="space-y-3">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="font-semibold text-blue-400 mb-2">STARTER ($100 - $50,000)</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 4-6% Base APY</li>
              <li>• Up to 8% Max APY with boost</li>
              <li>• 50-150 Mining Power</li>
              <li>• No TAKARA tokens required</li>
              <li>• 3 vaults: 12M, 30M, 36M</li>
            </ul>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="font-semibold text-purple-400 mb-2">PRO ($1,000 - $100,000)</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 4.5-7% Base APY</li>
              <li>• Up to 10% Max APY with boost</li>
              <li>• 120-200 Mining Power</li>
              <li>• Requires 30 TAKARA per 100 USDT</li>
              <li>• 3 vaults: 12M, 30M, 36M</li>
            </ul>
          </div>

          <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
            <p className="font-semibold text-gold-400 mb-2">ELITE ($5,000 - $1,000,000)</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 5-8% Base APY</li>
              <li>• Up to 12% Max APY with boost</li>
              <li>• 250-350 Mining Power</li>
              <li>• Requires 50 TAKARA per 100 USDT</li>
              <li>• 3 vaults: 12M, 30M, 36M</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      category: 'LAIKA Boost',
      question: 'How does LAIKA boost work?',
      answer: (
        <div className="space-y-3">
          <p>LAIKA boost is an optional feature that increases your APY:</p>

          <div className="bg-laika-purple/10 border border-laika-purple/30 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-laika-purple">🎁 Special Offer: 10% Discount</p>
            <p className="text-sm text-gray-300">When you use LAIKA for boost, we value it at <strong>10% less than market price</strong></p>
            <p className="text-sm text-gray-400">Example: If LAIKA is $1.00, we count it as $0.90 for boost calculation</p>
          </div>

          <div className="bg-background-elevated rounded-lg p-4">
            <p className="font-semibold text-white mb-2">How it works:</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• You can deposit up to 90% of your USDT value in LAIKA</li>
              <li>• Each LAIKA token adds extra APY to your vault</li>
              <li>• Your LAIKA is returned at the end of the term</li>
              <li>• During the term, you earn the boosted APY on your USDT</li>
            </ul>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm text-green-400">
              💡 <strong>Pro Tip:</strong> Use the slider in the stacking modal to see real-time calculation of your boost and extra APY!
            </p>
          </div>
        </div>
      )
    },
    {
      category: 'LAIKA Boost',
      question: 'When do I get my LAIKA back?',
      answer: (
        <div className="space-y-2">
          <p>Your LAIKA tokens are returned to you at the <strong>end of your vault term</strong>.</p>
          <p className="text-gray-400">For example:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-300">
            <li>12-month vault: LAIKA returned after 12 months</li>
            <li>30-month vault: LAIKA returned after 30 months</li>
            <li>36-month vault: LAIKA returned after 36 months</li>
          </ul>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-blue-400">
              📌 During the term, you keep earning the boosted APY on your USDT deposit!
            </p>
          </div>
        </div>
      )
    },
    {
      category: 'TAKARA Mining',
      question: 'How does TAKARA mining work?',
      answer: (
        <div className="space-y-3">
          <p>Every vault has a mining power that determines how many TAKARA tokens you mine daily:</p>

          <div className="bg-background-elevated rounded-lg p-4 space-y-2">
            <p className="font-semibold text-white">Mining Power by Tier:</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <span className="text-blue-400">Starter:</span> 50-150 mining power</li>
              <li>• <span className="text-purple-400">Pro:</span> 120-200 mining power</li>
              <li>• <span className="text-gold-400">Elite:</span> 250-350 mining power</li>
            </ul>
          </div>

          <p className="text-sm text-gray-400">Mining difficulty adjusts dynamically based on total network mining power. The more mining power you have, the more TAKARA you mine daily.</p>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm text-green-400">
              💎 <strong>Bonus:</strong> Longer duration vaults have higher mining power!
            </p>
          </div>
        </div>
      )
    },
    {
      category: 'Vault Activation',
      question: 'When does my vault start earning?',
      answer: (
        <div className="space-y-3">
          <p>Vaults follow a 2-phase activation process:</p>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="font-semibold text-yellow-400 mb-2">Phase 1: Pending (Filling Up)</p>
            <p className="text-sm text-gray-300">Vault needs to collect minimum <strong>$100,000 USDT</strong> total</p>
            <p className="text-sm text-gray-400 mt-1">During this time, you cannot withdraw</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="font-semibold text-blue-400 mb-2">Phase 2: Countdown (72 hours)</p>
            <p className="text-sm text-gray-300">After reaching $100k, a 72-hour countdown begins</p>
            <p className="text-sm text-gray-400 mt-1">New stackers can still join during countdown</p>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="font-semibold text-green-400 mb-2">Phase 3: Active! 🎉</p>
            <p className="text-sm text-gray-300">Vault activates and earnings start accruing</p>
            <p className="text-sm text-gray-300 mt-1">USDT APY begins, TAKARA mining starts</p>
          </div>
        </div>
      )
    },
    {
      category: 'Earnings & Withdrawals',
      question: 'When can I withdraw my earnings?',
      answer: (
        <div className="space-y-3">
          <p>Withdrawal schedule depends on your vault's payout schedule:</p>

          <div className="bg-background-elevated rounded-lg p-4 space-y-3">
            <div>
              <p className="font-semibold text-gold-400 mb-1">Monthly Payouts (12M vaults)</p>
              <p className="text-sm text-gray-300">Claim USDT earnings every month</p>
              <p className="text-sm text-gray-400">TAKARA: claim anytime</p>
            </div>

            <div>
              <p className="font-semibold text-purple-400 mb-1">Quarterly Payouts (30M vaults)</p>
              <p className="text-sm text-gray-300">Claim USDT earnings every 3 months</p>
              <p className="text-sm text-gray-400">TAKARA: claim anytime</p>
            </div>

            <div>
              <p className="font-semibold text-blue-400 mb-1">End of Term (36M vaults)</p>
              <p className="text-sm text-gray-300">Claim all USDT at vault maturity</p>
              <p className="text-sm text-gray-400">TAKARA: claim anytime</p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm text-green-400">
              ⭐ Your initial USDT deposit is returned at the end of the term
            </p>
          </div>
        </div>
      )
    },
    {
      category: 'Wexel & Marketplace',
      question: 'What is a Wexel?',
      answer: (
        <div className="space-y-3">
          <p>A <strong>Wexel</strong> is your stacking position represented as an NFT on Solana.</p>

          <div className="bg-background-elevated rounded-lg p-4 space-y-2">
            <p className="font-semibold text-white">Wexel contains:</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Your USDT deposit amount</li>
              <li>• Vault tier and duration</li>
              <li>• APY (base + LAIKA boost)</li>
              <li>• Mining power</li>
              <li>• All accrued earnings (USDT + TAKARA)</li>
              <li>• LAIKA boost details (if any)</li>
            </ul>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="font-semibold text-purple-400 mb-2">Trade on Marketplace</p>
            <p className="text-sm text-gray-300">You can sell your Wexel before vault maturity</p>
            <p className="text-sm text-gray-400 mt-1">Buyer takes over your position with all earnings and obligations</p>
            <p className="text-sm text-gray-400 mt-1">Platform fee: 3%</p>
          </div>
        </div>
      )
    },
    {
      category: 'Security & Safety',
      question: 'Is my money safe?',
      answer: (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="font-semibold text-green-400 mb-2">✓ Blockchain Security</p>
            <p className="text-sm text-gray-300">All transactions on Solana & Ethereum blockchains</p>
            <p className="text-sm text-gray-400">Immutable and transparent</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="font-semibold text-blue-400 mb-2">✓ Non-Custodial</p>
            <p className="text-sm text-gray-300">You control your wallets</p>
            <p className="text-sm text-gray-400">Takara never holds your private keys</p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="font-semibold text-purple-400 mb-2">✓ Smart Contract Based</p>
            <p className="text-sm text-gray-300">Automated earnings distribution</p>
            <p className="text-sm text-gray-400">No manual intervention needed</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-yellow-400">
              ⚠️ <strong>Always verify:</strong> Check transaction details in MetaMask and Phantom before confirming
            </p>
          </div>
        </div>
      )
    }
  ]

  const categories = Array.from(new Set(faqs.map(faq => faq.category)))

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about stacking on Takara <span className="text-gold-500">宝</span>
          </p>
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/30 rounded-xl p-6 mb-12">
          <p className="text-sm text-gold-500 font-semibold mb-3">Quick Navigation</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  const index = faqs.findIndex(faq => faq.category === category)
                  setOpenIndex(index)
                  document.getElementById(`faq-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="px-4 py-2 bg-background-elevated hover:bg-gold-500/20 border border-gold-500/30 rounded-lg text-sm text-gray-300 hover:text-gold-400 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            const isFirstInCategory = index === 0 || faqs[index - 1].category !== faq.category

            return (
              <div key={index} id={`faq-${index}`}>
                {isFirstInCategory && (
                  <h2 className="text-2xl font-bold text-gold-500 mt-8 mb-4 flex items-center gap-2">
                    {faq.category === 'Getting Started' && <Wallet className="h-6 w-6" />}
                    {faq.category === 'Stacking Process' && <Coins className="h-6 w-6" />}
                    {faq.category === 'Vault Tiers' && <TrendingUp className="h-6 w-6" />}
                    {faq.category === 'LAIKA Boost' && <span className="text-2xl">🚀</span>}
                    {faq.category === 'TAKARA Mining' && <span className="text-2xl">⛏️</span>}
                    {faq.category === 'Vault Activation' && <Calendar className="h-6 w-6" />}
                    {faq.category === 'Earnings & Withdrawals' && <span className="text-2xl">💰</span>}
                    {faq.category === 'Wexel & Marketplace' && <span className="text-2xl">🎫</span>}
                    {faq.category === 'Security & Safety' && <Shield className="h-6 w-6" />}
                    {faq.category}
                  </h2>
                )}

                <div className="bg-background-card rounded-xl border border-green-900/20 overflow-hidden hover:border-gold-500/30 transition-colors">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left"
                  >
                    <span className="font-semibold text-white pr-4">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-gold-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-4 text-gray-300">
                      {typeof faq.answer === 'string' ? (
                        <p>{faq.answer}</p>
                      ) : (
                        faq.answer
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 bg-gradient-to-br from-green-900/20 to-transparent rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
          <p className="text-gray-400 mb-6">
            Join our community or contact support for personalized assistance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold"
            >
              Join Community
            </a>
            <a
              href="/vaults"
              className="btn-outline-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold"
            >
              Start Stacking
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
