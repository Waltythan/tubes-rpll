import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  ['sidebar-link', isActive ? 'active' : ''].join(' ')

export default function Sidebar({ collapsed, onToggle }: SidebarProps): JSX.Element {
  const { user } = useAuth()
  const role = (user?.role || user?.roles || 'staff') as 'admin' | 'manager' | 'staff'
  const isAdmin = role === 'admin'
  const canApproveRequests = role === 'manager' || role === 'admin'
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'manager' ? 'Manager' : 'Staff'

  return (
    <aside className={['sidebar card-surface', collapsed ? 'is-collapsed' : ''].join(' ').trim()}>
      <div className="sidebar-brand">
        <div className="brand-mark">HR</div>
        <div className="sidebar-brand-copy">
          <p className="sidebar-brand-name">Mini HRIS</p>
          <p className="sidebar-brand-subtitle">Operations console</p>
        </div>
        <button type="button" className="sidebar-collapse-btn" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={navLinkClass}><span className="nav-icon">D</span><span className="nav-label">Dashboard</span></NavLink>
        <NavLink to="/profile" className={navLinkClass}><span className="nav-icon">P</span><span className="nav-label">Profile</span></NavLink>
        <NavLink to="/attendance" className={navLinkClass}><span className="nav-icon">A</span><span className="nav-label">Attendance</span></NavLink>
        <NavLink to="/leave" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">Leave</span></NavLink>
        <NavLink to="/reimbursement" className={navLinkClass}><span className="nav-icon">R</span><span className="nav-label">Reimbursement</span></NavLink>

        {canApproveRequests && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">
              Approvals
            </div>
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
            <NavLink to="/payroll" className={navLinkClass}><span className="nav-icon">$</span><span className="nav-label">Payroll</span></NavLink>
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