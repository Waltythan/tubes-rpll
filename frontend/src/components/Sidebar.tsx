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
  const isAdmin = (user?.role || user?.roles) === 'admin'

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
        {/* Common menu for all roles */}
        <NavLink to="/dashboard" className={navLinkClass}><span className="nav-icon">D</span><span className="nav-label">Dashboard</span></NavLink>
        <NavLink to="/profile" className={navLinkClass}><span className="nav-icon">P</span><span className="nav-label">Profile</span></NavLink>
        
        {/* Staff features */}
        <NavLink to="/attendance" className={navLinkClass}><span className="nav-icon">A</span><span className="nav-label">Attendance</span></NavLink>
        <NavLink to="/leave" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">Leave</span></NavLink>
        <NavLink to="/reimbursement" className={navLinkClass}><span className="nav-icon">R</span><span className="nav-label">Reimbursement</span></NavLink>

        {/* Admin-only features */}
        {isAdmin && (
          <>
            <div className="sidebar-divider" style={{ margin: '0.5rem 0', borderTop: '1px solid var(--color-border, #e0e0e0)' }}></div>
            <div className="sidebar-section-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-muted, #666)', padding: '0.5rem 0.75rem', fontWeight: '600' }}>
              Admin
            </div>
            <NavLink to="/payroll" className={navLinkClass}><span className="nav-icon">$</span><span className="nav-label">Payroll</span></NavLink>
            <NavLink to="/users" className={navLinkClass}><span className="nav-icon">U</span><span className="nav-label">Users</span></NavLink>
            <NavLink to="/activity-logs" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">Activity Logs</span></NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-label">Signed in as</span>
        <strong>{user?.name || user?.fullName || user?.full_name || user?.email || 'Unknown user'}</strong>
        <span className="sidebar-role" style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7, textTransform: 'capitalize' }}>
          {isAdmin ? 'Administrator' : 'Staff'}
        </span>
      </div>
    </aside>
  )
}