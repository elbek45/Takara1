/**
 * Powered By Slider Component
 * Auto-scrolling partner/technology logos slider
 */

import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'

// Gold color constant
const GOLD = '#FFD700'

interface Partner {
  id: string
  name: string
  logoUrl: string
  websiteUrl?: string
  displayOrder: number
  isActive?: boolean
}

// Default partners removed - only show partners from database
// If you want default partners, add them via Admin Panel
const defaultPartners: Partner[] = []

export function PoweredBySlider() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch partners from API
  const { data: partners } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      try {
        const response = await api.getPartners()
        return response.data as Partner[]
      } catch {
        return defaultPartners
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const displayPartners = partners && partners.length > 0 ? partners : defaultPartners

  // Don't render if no partners
  if (!displayPartners || displayPartners.length === 0) {
    return null
  }

  // Auto-scroll animation
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || isPaused) return

    let animationId: number
    let scrollPosition = 0
    const scrollSpeed = 0.5

    const animate = () => {
      scrollPosition += scrollSpeed
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0
      }
      scrollContainer.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [isPaused, displayPartners])

  // Duplicate partners for seamless loop
  const duplicatedPartners = [...displayPartners, ...displayPartners, ...displayPartners]

  return (
    <section className="py-16 bg-navy-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}></div>
      </div>
      <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>
      <div className="absolute bottom-0 right-1/4 w-32 h-32 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}></div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Powered By
          </h2>
          <p className="text-gray-400">
            Trusted technologies and partners
          </p>
        </div>

        {/* Gradient fade edges */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-navy-900 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-navy-900 to-transparent z-10 pointer-events-none"></div>

          <div
            ref={scrollRef}
            className="overflow-hidden py-4"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="flex items-center gap-16 w-max">
              {duplicatedPartners.map((partner, index) => (
                <a
                  key={`${partner.id}-${index}`}
                  href={partner.websiteUrl || '#'}
                  target={partner.websiteUrl ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center justify-center h-24 px-8 rounded-xl border border-gold-300/10 bg-navy-800/50 hover:border-gold-300/30 hover:bg-navy-800 transition-all duration-300 group"
                  title={partner.name}
                >
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="max-h-14 max-w-[200px] object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      // Show partner name as fallback (XSS-safe)
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        // Use textContent instead of innerHTML to prevent XSS
                        const span = document.createElement('span')
                        span.textContent = partner.name
                        span.style.color = GOLD
                        span.style.fontWeight = '600'
                        span.style.fontSize = '1.125rem'
                        parent.appendChild(span)
                      }
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="mt-8 flex justify-center">
          <div className="w-32 h-1 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}></div>
        </div>
      </div>
    </section>
  )
}

export default PoweredBySlider
