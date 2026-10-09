import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../lib/useAuth'
import type { Role } from '../lib/types'

export function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/report" replace />
  return <Outlet />
}
