/**
 * useTronLink Hook
 * Re-exports the TronLink context for backwards compatibility
 */

import { useTronLinkContext } from '../context/TronLinkContext'

export function useTronLink() {
  return useTronLinkContext()
}

export default useTronLink
