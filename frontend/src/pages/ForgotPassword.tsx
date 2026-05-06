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
      </form>
    </AuthLayout>
  )
}