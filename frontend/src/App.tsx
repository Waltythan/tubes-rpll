import { Navigate, Route, Routes } from 'react-router-dom'
import ToastContainer from './components/common/ToastContainer'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import Attendance from './pages/Attendance'
import ActivityLogs from './pages/ActivityLogs'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import Leave from './pages/Leave'
import LeaveApprovals from './pages/LeaveApprovals'
import Login from './pages/Login'
import Payroll from './pages/Payroll'
import Profile from './pages/Profile'
import Reimbursement from './pages/Reimbursement'
import ReimbursementApprovals from './pages/ReimbursementApprovals'
import ResetPassword from './pages/ResetPassword'

export default function App(): JSX.Element {
  const { isAuthenticated } = useAuth()

  return (
    <>
      <ToastContainer position="top-right" />
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
          <Route path="/approvals/leaves" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><LeaveApprovals /></ProtectedRoute>} />
          <Route path="/approvals/reimbursements" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><ReimbursementApprovals /></ProtectedRoute>} />
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
          <Route path="/activity-logs" element={<ActivityLogs />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}