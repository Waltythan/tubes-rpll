import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useLoading } from '../hooks/useLoading'
import { forgotPassword } from '../services/authService'

export default function ForgotPassword(): JSX.Element {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { withLoading } = useLoading()

  function validateEmail(value: string): string | null {
    if (!value.trim()) return 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(value.trim())) return 'Enter a valid email address'
    return null
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const err = validateEmail(email)
    setEmailError(err)
    setApiError(null)
    setSuccessMessage(null)
    if (err) return

    setSubmitting(true)
    try {
      const result = await withLoading(() => forgotPassword(email.trim().toLowerCase()))
      setSuccessMessage('If the email exists, a reset link has been sent.')
      const token = result.resetToken
      if (token) {
        window.setTimeout(() => {
          navigate(`/reset-password?token=${encodeURIComponent(token)}`, { replace: true })
        }, 700)
      }
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Failed to send reset link')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero card-surface">
          <p className="eyebrow">Mini HRIS</p>
          <h1>Reset access</h1>
          <p className="muted">Request a password reset link without revealing whether the email is registered.</p>
        </div>

        <Card className="auth-card">
          <div className="page-heading compact">
            <div>
              <p className="eyebrow">Account recovery</p>
              <h2>Forgot password</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <Input
              label="Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              helperText={emailError || 'We will not reveal if the email exists'}
            />

            {apiError && <div className="alert alert-error">{apiError}</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Sending...' : 'Send reset link'}
            </Button>

            <div className="auth-links">
              <Link to="/login">Back to login</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}