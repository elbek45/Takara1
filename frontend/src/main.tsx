import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { Buffer } from 'buffer'

// Initialize Sentry FIRST (before anything else)
import { initSentry, Sentry } from './config/sentry'
initSentry()

// Polyfill Buffer for browser
window.Buffer = Buffer

// Solana wallet adapter
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { clusterApiUrl } from '@solana/web3.js'

import '@solana/wallet-adapter-react-ui/styles.css'

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Solana RPC endpoint
const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet')

// Configure Phantom wallet adapter
const wallets = [new PhantomWalletAdapter()]

// Fallback component for critical errors
const ErrorFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
      <p className="text-gray-400 mb-4">We've been notified and are working on a fix.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-gold-500 text-black rounded-lg font-semibold hover:bg-gold-400"
      >
        Reload Page
      </button>
    </div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
