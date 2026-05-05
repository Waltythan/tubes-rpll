import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import Sidebar from '../Sidebar'

export default function MainLayout(): JSX.Element {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <main className="page-stage">
          <Outlet />
        </main>
      </div>
    </div>
  )
}