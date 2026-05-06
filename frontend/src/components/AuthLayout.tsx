import type { ReactNode } from 'react'
import Card from './Card'

interface AuthLayoutProps {
  heading: string
  description: ReactNode
  children: ReactNode
}

export default function AuthLayout({ heading, description, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero card-surface">
          <p className="eyebrow">Mini HRIS</p>
          <h1>{heading}</h1>
          <p className="muted">{description}</p>
        </div>

        <Card className="auth-card">{children}</Card>
      </div>
    </div>
  )
}