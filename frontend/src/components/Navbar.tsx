import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from './Button'

interface NavbarProps {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
}

export default function Navbar({ onToggleSidebar, sidebarCollapsed }: NavbarProps): JSX.Element {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = (user?.role || user?.roles) === 'admin'

  function handleLogout(): void {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar card-surface">
      <div className="topbar-left">
        <Button type="button" variant="ghost" onClick={onToggleSidebar} className="sidebar-toggle">
          {sidebarCollapsed ? 'Expand' : 'Collapse'}
        </Button>
        <div>
          <p className="topbar-kicker">Mini HRIS</p>
          <h1 className="topbar-title">{isAdmin ? 'Admin Dashboard' : 'Workforce Dashboard'}</h1>
        </div>
      </div>

      <div className="topbar-user">
        <div className="topbar-user-meta">
          <span className="topbar-user-email">{user?.name || user?.fullName || user?.full_name || user?.email || 'Signed in'}</span>
          <span className={['badge', isAdmin ? 'badge-success' : 'badge-neutral'].join(' ')}>
            {isAdmin ? 'Admin' : 'Staff'}
          </span>
        </div>
        <Button type="button" variant="ghost" onClick={handleLogout}>Logout</Button>
      </div>
    </header>
  )
}