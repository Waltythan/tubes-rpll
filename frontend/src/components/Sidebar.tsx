import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface SidebarProps {}

const navLinkClass = ({ isActive }: { isActive: boolean }): string => ['sidebar-link', isActive ? 'active' : ''].join(' ')

export default function Sidebar(_: SidebarProps): JSX.Element {
  const { user } = useAuth()
  const role = (user?.role || user?.roles || 'staff') as 'admin' | 'manager' | 'staff'
  const isAdmin = role === 'admin'
  const canApproveRequests = role === 'manager' || role === 'admin'
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'manager' ? 'Manager' : 'Staff'

  return (
    <aside className="sidebar card-surface">
      <div className="sidebar-brand">
        <div className="brand-mark">HR</div>
        <div className="sidebar-brand-copy">
          <p className="sidebar-brand-name">Mini HRIS</p>
          <p className="sidebar-brand-subtitle">Operations console</p>
        </div>
        {/* collapse control removed - sidebar is always expanded */}
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={navLinkClass}><span className="nav-icon">D</span><span className="nav-label">Dashboard</span></NavLink>
        <NavLink to="/profile" className={navLinkClass}><span className="nav-icon">P</span><span className="nav-label">Profile</span></NavLink>
        {role !== 'admin' && (
          <>
            <NavLink to="/attendance" className={navLinkClass}><span className="nav-icon">A</span><span className="nav-label">Attendance</span></NavLink>
            <NavLink to="/leave" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">My Leave</span></NavLink>
            <NavLink to="/reimbursement" className={navLinkClass}><span className="nav-icon">R</span><span className="nav-label">My Reimbursements</span></NavLink>
            <NavLink to="/payroll" className={navLinkClass}><span className="nav-icon">$</span><span className="nav-label">My Payroll</span></NavLink>
          </>
        )}

        {canApproveRequests && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">
              Approvals
            </div>
            <NavLink to="/org-chart" className={navLinkClass}><span className="nav-icon">T</span><span className="nav-label">Management Tree</span></NavLink>
            <NavLink to="/team-attendance" className={navLinkClass}><span className="nav-icon">A</span><span className="nav-label">Team Attendance</span></NavLink>
            <NavLink to="/approvals/leaves" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">Leave Approvals</span></NavLink>
            <NavLink to="/approvals/reimbursements" className={navLinkClass}><span className="nav-icon">E</span><span className="nav-label">Reimbursement Approvals</span></NavLink>
          </>
        )}

        {isAdmin && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">
              Admin
            </div>
            <NavLink to="/admin/payroll" className={navLinkClass}><span className="nav-icon">$</span><span className="nav-label">Payroll Management</span></NavLink>
            <NavLink to="/admin/penalty" className={navLinkClass}><span className="nav-icon">±</span><span className="nav-label">Adjustments</span></NavLink>
            <NavLink to="/users" className={navLinkClass}><span className="nav-icon">U</span><span className="nav-label">Users</span></NavLink>
            <NavLink to="/admin/reset-requests" className={navLinkClass}><span className="nav-icon">R</span><span className="nav-label">Reset Requests</span></NavLink>
            <NavLink to="/admin/attendance" className={navLinkClass}><span className="nav-icon">📝</span><span className="nav-label">Attendance</span></NavLink>
            <NavLink to="/activity-logs" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">Activity Logs</span></NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-label">Signed in as</span>
        <strong>{user?.name || user?.fullName || user?.full_name || user?.email || 'Unknown user'}</strong>
        <span className="sidebar-role">
          {roleLabel}
        </span>
      </div>
    </aside>
  )
}