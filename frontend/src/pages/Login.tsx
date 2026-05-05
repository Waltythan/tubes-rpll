import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'
import type { AuthError } from '../services/authService'

export default function Login(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownSeconds])

  function clearMessages(): void {
    setError(null)
  }

  function handleEmailChange(value: string): void {
    setEmail(value)
    clearMessages()
  }

  function handlePasswordChange(value: string): void {
    setPassword(value)
    clearMessages()
  }

  function mapAuthError(err: unknown): string {
    const authError = err as Partial<AuthError>

    if (authError.status === 401) {
      return 'Invalid email or password'
    }

    if (authError.status === 429) {
      if (typeof authError.retryAfterSeconds === 'number' && authError.retryAfterSeconds > 0) {
        const minutes = Math.ceil(authError.retryAfterSeconds / 60)
        return `Too many login attempts. Please wait about ${minutes} minute${minutes > 1 ? 's' : ''}.`
      }
      return 'Too many login attempts. Please wait a few minutes.'
    }

    return 'Something went wrong. Please try again.'
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err: unknown) {
      const authError = err as Partial<AuthError>
      const nextError = mapAuthError(err)
      setError(nextError)

      if (authError.status === 401) {
        setAttempts((current) => current + 1)
      }

      if (authError.status === 429) {
        const retryAfterSeconds = typeof authError.retryAfterSeconds === 'number' && authError.retryAfterSeconds > 0
          ? authError.retryAfterSeconds
          : 60
        setCooldownSeconds(retryAfterSeconds)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loginDisabled = isLoading || cooldownSeconds > 0

  return (
    <AuthLayout
      heading="Welcome back"
      description="Sign in to manage attendance, leave, reimbursements, and payroll from one dashboard."
    >
      <form className="form-grid" onSubmit={submit}>
        <Input label="Email" type="email" placeholder="name@company.com" value={email} onChange={(event) => handleEmailChange(event.target.value)} disabled={loginDisabled} />
        <Input label="Password" type="password" placeholder="Enter your password" value={password} onChange={(event) => handlePasswordChange(event.target.value)} disabled={loginDisabled} />

        <div className="auth-links">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {attempts >= 3 && !error && <div className="alert alert-warning">Multiple failed attempts detected. Please double-check your credentials.</div>}
        {cooldownSeconds > 0 && <div className="alert alert-warning">Too many attempts. Try again in {cooldownSeconds}s.</div>}

        <Button type="submit" variant="primary" fullWidth loading={isLoading} disabled={loginDisabled}>
          {isLoading ? 'Logging in...' : cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : 'Login'}
        </Button>
      </form>
    </AuthLayout>
  )
}