import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import Sidebar from '../Sidebar'

export default function MainLayout(): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={['app-shell', collapsed ? 'sidebar-collapsed' : ''].join(' ').trim()}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <div className="app-main">
        <Navbar onToggleSidebar={() => setCollapsed((value) => !value)} sidebarCollapsed={collapsed} />
        <main className="page-stage">
          <Outlet />
        </main>
      </div>
    </div>
  )
}