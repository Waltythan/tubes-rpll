import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/common/Button'
import { useLoading } from '../hooks/useLoading'
import { requestPasswordReset } from '../services/authService'

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
      await withLoading(() => requestPasswordReset(normalizedEmail))
      setSuccessMessage('Your request has been submitted. Please wait for admin approval.')
      window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 900)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to submit reset request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heading="Request Password Reset"
      description="Submit a request and admin will reset your password."
    >
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

        <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={submitting}>
          Submit Request
        </Button>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </AuthLayout>
  )
}