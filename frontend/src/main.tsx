import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { Buffer } from 'buffer'

// Polyfill Buffer for browser
window.Buffer = Buffer

// Fix for Solana wallet adapter localStorage issue
// The wallet name might be stored as plain string instead of JSON
try {
  const walletName = localStorage.getItem('walletName')
  if (walletName && !walletName.startsWith('"')) {
    // It's a plain string, convert to JSON format
    localStorage.setItem('walletName', JSON.stringify(walletName))
  }
} catch (e) {
  // If there's any issue, just remove the corrupted value
  localStorage.removeItem('walletName')
}

// Solana wallet imports
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { clusterApiUrl } from '@solana/web3.js'

// TronLink provider
import { TronLinkProvider } from './context/TronLinkContext'

// Import Solana wallet styles
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

// Solana network
const network = (import.meta.env.VITE_SOLANA_NETWORK || 'devnet') as WalletAdapterNetwork
const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(network)

// Supported wallets
const wallets = [
  new PhantomWalletAdapter(),
]

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          <TronLinkProvider>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </TronLinkProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>,
)
