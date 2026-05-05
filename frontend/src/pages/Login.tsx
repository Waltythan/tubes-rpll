import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/common/Button'
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
    <AuthLayout
      heading="Welcome back"
      description="Sign in to manage attendance, leave, reimbursements, and payroll from one dashboard."
    >
      <form className="form-grid" onSubmit={submit}>
        <Input label="Email" type="email" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} />
        <Input label="Password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} />

        <div className="auth-links">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <Button type="submit" variant="primary" fullWidth loading={isLoading} disabled={isLoading}>
          Login
        </Button>
      </form>
    </AuthLayout>
  )
}