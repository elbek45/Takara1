import { Routes, Route } from 'react-router-dom'
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

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'

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
        </Route>

        {/* Admin Routes (No Layout) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
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
