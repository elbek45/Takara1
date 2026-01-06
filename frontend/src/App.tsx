import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'

// Layout
import Layout from './components/layout/Layout'

// Pages
import ComingSoonPage from './pages/ComingSoonPage'
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
import AdminVaultsPage from './pages/admin/AdminVaultsPage'
import AdminBoostTokensPage from './pages/admin/AdminBoostTokensPage'
import AdminTreasuryPage from './pages/admin/AdminTreasuryPage'
import AdminTakaraStatsPage from './pages/admin/AdminTakaraStatsPage'
import AdminPartnersPage from './pages/admin/AdminPartnersPage'
import AdminClaimsPage from './pages/admin/AdminClaimsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

// Protected route wrapper for /app
function ProtectedApp({ children }: { children: React.ReactNode }) {
  const hasAccess = localStorage.getItem('takara_access') === 'granted'
  if (!hasAccess) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// Redirect legacy vault detail URLs to /app/vaults/:id
function VaultRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/app/vaults/${id}`} replace />
}

function App() {
  return (
    <>
      <Routes>
        {/* Coming Soon Landing */}
        <Route path="/" element={<ComingSoonPage />} />

        {/* Protected Main App Routes (for testing) */}
        <Route path="/app" element={<ProtectedApp><Layout /></ProtectedApp>}>
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
        <Route path="/admin/claims" element={<AdminClaimsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/vaults" element={<AdminVaultsPage />} />
        <Route path="/admin/takara-stats" element={<AdminTakaraStatsPage />} />
        <Route path="/admin/boost-tokens" element={<AdminBoostTokensPage />} />
        <Route path="/admin/treasury" element={<AdminTreasuryPage />} />
        <Route path="/admin/partners" element={<AdminPartnersPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />

        {/* Legacy routes redirect to /app */}
        <Route path="/vaults" element={<Navigate to="/app/vaults" replace />} />
        <Route path="/vaults/:id" element={<VaultRedirect />} />
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/portfolio" element={<Navigate to="/app/portfolio" replace />} />
        <Route path="/marketplace" element={<Navigate to="/app/marketplace" replace />} />
        <Route path="/faq" element={<Navigate to="/app/faq" replace />} />

        {/* Catch-all: redirect to Coming Soon */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
