import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/common/Button'
import Card from '../components/Card'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { hrService } from '../services/hrService'

function normalizeConfirmError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('office wifi') || normalized.includes('office network')) {
    return 'Connect to office WiFi'
  }

  if (normalized.includes('already checked in today')) {
    return 'Already checked in today'
  }

  if (normalized.includes('qr already used')) {
    return 'QR already used'
  }

  if (normalized.includes('qr expired or invalid') || normalized.includes('expired') || normalized.includes('invalid')) {
    return 'QR expired or invalid'
  }

  return message
}

export default function AttendanceConfirm(): JSX.Element {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(token ? null : 'QR expired or invalid')

  async function handleConfirm(): Promise<void> {
    if (!token) {
      setErrorMessage('QR expired or invalid')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      await hrService.confirmAttendance(token)

      const message = 'Attendance recorded successfully'
      setSuccessMessage(message)
      showToast(message, 'success')
    } catch (error: unknown) {
      const message = normalizeConfirmError(error instanceof Error ? error.message : 'QR expired or invalid')
      setErrorMessage(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="attendance-confirm-page">
      <Card className="attendance-confirm-card">
        <p className="eyebrow">Mobile attendance</p>
        <h2>Confirm Attendance</h2>
        <p className="muted">
          Open this page from the QR code, then confirm to record attendance from your phone.
        </p>

        <ErrorAlert error={errorMessage} onDismiss={() => setErrorMessage(null)} />

        {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

        <div className="attendance-confirm-meta">
          <div>
            <span className="attendance-stat-label">QR token</span>
            <strong className="attendance-stat-value">{token ? `${token.slice(0, 8)}…` : 'Missing'}</strong>
          </div>
        </div>

        <div className="attendance-action-row attendance-confirm-actions">
          <Button type="button" variant="primary" onClick={() => void handleConfirm()} disabled={loading || !token} fullWidth>
            {loading ? 'Processing attendance...' : 'Confirm Attendance'}
          </Button>
          <Link to="/attendance" className="btn btn-secondary btn-full attendance-confirm-link">
            Back to Attendance
          </Link>
        </div>
      </Card>
    </div>
  )
}