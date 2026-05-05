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
      const result = await withLoading(() => forgotPassword(email.trim().toLowerCase()))
      setSuccessMessage('Reset token generated. Redirecting to password reset...')

      if (result.resetToken) {
        window.setTimeout(() => {
          navigate(`/reset-password?token=${encodeURIComponent(result.resetToken || '')}`, { replace: true })
        }, 700)
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

          <div className="recovery-grid">
            <div className="recovery-desc">
              <p className="eyebrow">Account recovery</p>
              <h3>Forgot password</h3>
              <p className="muted">Enter your email and we'll send a reset token. In development you'll be redirected automatically to the reset page.</p>

              <ul className="step-list">
                <li className="step-item"><div className="step-bullet">1</div><div className="step-copy">Enter your company email</div></li>
                <li className="step-item"><div className="step-bullet">2</div><div className="step-copy">Receive reset token (dev) or email link</div></li>
                <li className="step-item"><div className="step-bullet">3</div><div className="step-copy">Set a new password and sign in</div></li>
              </ul>
            </div>

            <div className="recovery-form">
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
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}