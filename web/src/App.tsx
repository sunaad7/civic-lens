import { Link, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router'
import { BrandMark } from './components/BrandMark'
import { RequireAuth } from './components/RequireAuth'
import { useAuth } from './lib/useAuth'
import { AdminDetailPage } from './pages/admin/AdminDetailPage'
import { AdminQueuePage } from './pages/admin/AdminQueuePage'
import { ComplaintDetailPage } from './pages/citizen/ComplaintDetailPage'
import { DashboardPage } from './pages/citizen/DashboardPage'
import { MyComplaintsPage } from './pages/citizen/MyComplaintsPage'
import { ReportPage } from './pages/citizen/ReportPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'

function initials(name?: string): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
}

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-logo">
            <BrandMark className="h-5 w-5" />
          </span>
          CivicLens
        </Link>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/report">Report</NavLink>
          <NavLink to="/my">My complaints</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="topbar-user">
          <Link to="/profile" className="user-chip" title="Profile settings">
            <span className="avatar" aria-hidden="true">
              {initials(user?.name)}
            </span>
            <span className="user-name">{user?.name}</span>
          </Link>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/my" element={<MyComplaintsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Route>
        <Route element={<RequireAuth role="admin" />}>
          <Route path="/admin" element={<AdminQueuePage />} />
          <Route path="/admin/:id" element={<AdminDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
