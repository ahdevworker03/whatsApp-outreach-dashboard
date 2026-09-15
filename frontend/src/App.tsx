import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import CampaignPage from './pages/CampaignPage'
import InboxPage from './pages/InboxPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

function Sidebar() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="sidebar">
      <nav>
        <ul className="nav-list">
          <li className="nav-item">
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/leads"
              className={`nav-link ${isActive('/leads') ? 'active' : ''}`}
            >
              Leads
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/campaign"
              className={`nav-link ${isActive('/campaign') ? 'active' : ''}`}
            >
              Campaign
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/inbox"
              className={`nav-link ${isActive('/inbox') ? 'active' : ''}`}
            >
              Inbox
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/settings"
              className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
            >
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

function AppLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
