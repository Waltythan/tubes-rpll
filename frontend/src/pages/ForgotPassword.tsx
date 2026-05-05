import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useLoading } from '../hooks/useLoading'
import { forgotPassword, getDevResetToken } from '../services/authService'

export default function ForgotPassword(): JSX.Element {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { withLoading } = useLoading()

  function validateEmail(value: string): string | null {
    if (!value.trim()) {
      return 'Email is required'
    }

    if (!/^\S+@\S+\.\S+$/.test(value.trim())) {
      return 'Enter a valid email address'
    }

    return null
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const emailError = validateEmail(email)
    setEmailError(emailError)
    setApiError(null)
    setSuccessMessage(null)

    if (emailError) {
      return
    }

    setSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      await withLoading(() => forgotPassword(normalizedEmail))
      setSuccessMessage('If email exists, reset instructions have been sent')

      if (import.meta.env.DEV) {
        const result = await withLoading(() => getDevResetToken(normalizedEmail))
        if (result.resetToken) {
          window.setTimeout(() => {
            navigate(`/reset-password?token=${encodeURIComponent(result.resetToken || '')}`, { replace: true })
          }, 700)
        }
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to send reset link')
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

          <div className="alert alert-info">
            Step 1: enter your email. Step 2: in development, you will be redirected with a reset token. Step 3: set a new password.
          </div>

          <form className="form-grid" onSubmit={submit}>
            <Input
              label="Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              helperText={emailError || 'Use your company email address'}
            />

            {apiError && <div className="alert alert-error">{apiError}</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
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