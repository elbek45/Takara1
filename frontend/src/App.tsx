import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'

// Layout
import Layout from './components/layout/Layout'

// Pages
import LandingPage from './pages/LandingPage'
import VaultsPage from './pages/VaultsPage'
import VaultDetailPage from './pages/VaultDetailPage'
import DashboardPage from './pages/DashboardPage'
import PortfolioPage from './pages/PortfolioPage'
import MarketplacePage from './pages/MarketplacePage'
import ProfilePage from './pages/ProfilePage'
import FAQPage from './pages/FAQPage'

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage'
import AdminVaultsPage from './pages/admin/AdminVaultsPage'
import AdminMiningStatsPage from './pages/admin/AdminMiningStatsPage'
import AdminDeploymentPage from './pages/admin/AdminDeploymentPage'
import AdminNetworkPage from './pages/admin/AdminNetworkPage'
import AdminBoostTokensPage from './pages/admin/AdminBoostTokensPage'
import AdminTreasuryPage from './pages/admin/AdminTreasuryPage'
import AdminTakaraPricingPage from './pages/admin/AdminTakaraPricingPage'

function App() {
  return (
    <>
      <Routes>
        {/* Main App Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="vaults" element={<VaultsPage />} />
          <Route path="vaults/:id" element={<VaultDetailPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="faq" element={<FAQPage />} />
        </Route>

        {/* Admin Routes (No Layout) */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="/admin/vaults" element={<AdminVaultsPage />} />
        <Route path="/admin/mining" element={<AdminMiningStatsPage />} />
        <Route path="/admin/deployment" element={<AdminDeploymentPage />} />
        <Route path="/admin/network" element={<AdminNetworkPage />} />
        <Route path="/admin/boost-tokens" element={<AdminBoostTokensPage />} />
        <Route path="/admin/treasury" element={<AdminTreasuryPage />} />
        <Route path="/admin/pricing" element={<AdminTakaraPricingPage />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a2420',
            color: '#fafafa',
            border: '1px solid #064e3b',
          },
        }}
      />
    </>
  )
}

export default App
