import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { useLoading } from '../hooks/useLoading'

export default function Login(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { withLoading } = useLoading()

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await withLoading(() => login({ email, password }))
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero card-surface">
          <p className="eyebrow">Mini HRIS</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage attendance, leave, reimbursements, and payroll from one dashboard.</p>
        </div>

        <Card className="auth-card">
          <div className="page-heading compact">
            <div>
              <p className="eyebrow">Secure access</p>
              <h2>Login</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <Input label="Email" type="email" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} />
            <Input label="Password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} />

            {error && <div className="alert alert-error">{error}</div>}

            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}