import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import Attendance from './pages/Attendance'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import Leave from './pages/Leave'
import Login from './pages/Login'
import Payroll from './pages/Payroll'
import Profile from './pages/Profile'
import Reimbursement from './pages/Reimbursement'
import ResetPassword from './pages/ResetPassword'

export default function App(): JSX.Element {
  const { isAuthenticated } = useAuth()

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes - all users */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/reimbursement" element={<Reimbursement />} />
        </Route>

        {/* Protected routes - admin only */}
        <Route
          element={
            <ProtectedRoute requiredRole="admin">
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/payroll" element={<Payroll />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}