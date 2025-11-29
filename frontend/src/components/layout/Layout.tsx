import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { SolanaWalletSync } from '../wallet/SolanaWalletSync'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background-primary">
      {/* Automatically sync Solana wallet to backend */}
      <SolanaWalletSync />

      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
