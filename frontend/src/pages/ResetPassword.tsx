import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useLoading } from '../hooks/useLoading'
import { resetPassword } from '../services/authService'

export default function ResetPassword(): JSX.Element {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { withLoading } = useLoading()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const redirectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const nextToken = searchParams.get('token') || ''
    if (nextToken) {
      setToken(nextToken)
    }
  }, [searchParams])

  useEffect(() => () => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current)
    }
  }, [])

  function validate(): boolean {
    let hasError = false

    if (!token.trim()) {
      setTokenError('Reset token is missing')
      hasError = true
    } else {
      setTokenError(null)
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      hasError = true
    } else {
      setPasswordError(null)
    }

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      hasError = true
    } else {
      setConfirmError(null)
    }

    return hasError
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const hasValidationError = validate()
    setApiError(null)
    setSuccessMessage(null)

    if (hasValidationError) {
      return
    }

    setSubmitting(true)

    try {
      await withLoading(() => resetPassword(token.trim(), newPassword))
      setSuccessMessage('Password reset successfully')
      setNewPassword('')
      setConfirmPassword('')
      redirectTimerRef.current = window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 900)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero card-surface">
          <p className="eyebrow">Mini HRIS</p>
          <h1>Set a new password</h1>
          <p className="muted">Use the token from your reset link to update your password securely.</p>
        </div>

        <Card className="auth-card">
          <div className="page-heading compact">
            <div>
              <p className="eyebrow">Account recovery</p>
              <h2>Reset password</h2>
            </div>
          </div>

          <div className="recovery-grid">
            <div className="recovery-desc">
              <p className="eyebrow">Account recovery</p>
              <h3>Reset password</h3>
              <p className="muted">Use the token from your reset link (auto-loaded in development) and set a secure new password.</p>

              <ul className="step-list">
                <li className="step-item"><div className="step-bullet">1</div><div className="step-copy">Load or paste your reset token</div></li>
                <li className="step-item"><div className="step-bullet">2</div><div className="step-copy">Choose a strong password (min 8 chars)</div></li>
                <li className="step-item"><div className="step-bullet">3</div><div className="step-copy">Sign in with your new credentials</div></li>
              </ul>
            </div>

            <div className="recovery-form">
              <form className="form-grid" onSubmit={submit}>
                {!searchParams.get('token') && (
                  <Input
                    label="Reset token"
                    type="text"
                    placeholder="Paste token from reset link"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    disabled={submitting}
                    helperText={tokenError || 'Token from the reset link'}
                  />
                )}
                {searchParams.get('token') && (
                  <div className="alert alert-success">
                    Reset token loaded from the recovery link.
                  </div>
                )}
                <Input
                  label="New password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={submitting}
                  helperText={passwordError || 'Use a strong password with at least 8 characters'}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={submitting}
                  helperText={confirmError || 'Must match the new password'}
                />

                {apiError && <div className="alert alert-error">{apiError}</div>}
                {successMessage && <div className="alert alert-success">{successMessage}</div>}

                <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                  {submitting ? 'Resetting...' : 'Reset Password'}
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