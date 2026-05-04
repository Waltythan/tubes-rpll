import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FullPageLoader from './common/FullPageLoader'

interface ProtectedRouteProps {
  children: JSX.Element
}

export default function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <FullPageLoader show message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
