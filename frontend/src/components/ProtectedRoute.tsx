import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FullPageLoader from './common/FullPageLoader'

interface ProtectedRouteProps {
  children: JSX.Element
  requiredRole?: 'admin' | 'staff' | 'manager'
  allowedRoles?: Array<'admin' | 'staff' | 'manager'>
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullPageLoader show message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const userRole = (user?.role || user?.roles || 'staff') as 'admin' | 'staff' | 'manager'
  const roleMatches = (roles: Array<'admin' | 'staff' | 'manager'>): boolean => roles.includes(userRole)
  const pathname = location.pathname || ''
  const isBlockedEmployeeSelfServicePath =
    pathname === '/attendance' ||
    pathname.startsWith('/attendance/') ||
    pathname === '/leave' ||
    pathname.startsWith('/leave/') ||
    pathname === '/reimbursement' ||
    pathname.startsWith('/reimbursement/')

  if (userRole === 'admin' && isBlockedEmployeeSelfServicePath) {
    return <Navigate to="/dashboard" replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !roleMatches(allowedRoles)) {
    return <Navigate to="/dashboard" replace />
  }

  // Check role-based access
  if (requiredRole) {
    const hasRequiredRole = userRole === requiredRole

    if (!hasRequiredRole) {
      // Redirect non-admin users trying to access restricted routes
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
