import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FullPageLoader from './common/FullPageLoader'

interface ProtectedRouteProps {
  children: JSX.Element
  requiredRole?: 'admin' | 'staff' | 'manager'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <FullPageLoader show message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access
  if (requiredRole) {
    const userRole = (user?.role || user?.roles || 'staff') as string
    const hasRequiredRole = userRole === requiredRole

    if (!hasRequiredRole) {
      // Redirect non-admin users trying to access admin-only routes
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
