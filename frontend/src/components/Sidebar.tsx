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
        <NavLink to="/dashboard" className={navLinkClass}><span className="nav-icon">D</span><span className="nav-label">Dashboard</span></NavLink>
        <NavLink to="/profile" className={navLinkClass}><span className="nav-icon">P</span><span className="nav-label">Profile</span></NavLink>
        <NavLink to="/attendance" className={navLinkClass}><span className="nav-icon">A</span><span className="nav-label">Attendance</span></NavLink>
        <NavLink to="/leave" className={navLinkClass}><span className="nav-icon">L</span><span className="nav-label">Leave</span></NavLink>
        <NavLink to="/reimbursement" className={navLinkClass}><span className="nav-icon">R</span><span className="nav-label">Reimbursement</span></NavLink>
        {isAdmin && <NavLink to="/payroll" className={navLinkClass}><span className="nav-icon">$</span><span className="nav-label">Payroll</span></NavLink>}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-label">Signed in as</span>
        <strong>{user?.name || user?.fullName || user?.full_name || user?.email || 'Unknown user'}</strong>
      </div>
    </aside>
  )
}