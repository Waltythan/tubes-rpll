import { useEffect, useRef, useState } from 'react'
import AttendanceCard from '../components/attendance/AttendanceCard'
import AttendanceTable from '../components/attendance/AttendanceTable'
import Card from '../components/Card'
import Button from '../components/common/Button'
import { useLoading } from '../hooks/useLoading'
import { hrService, type AttendanceItem, type QrTokenResponse } from '../services/hrService'

interface TodayAttendance {
  checkedIn: boolean
  checkedOut: boolean
  checkInTime: string | null
  checkOutTime: string | null
  status: string | null
}

export default function Attendance(): JSX.Element {
  const { withLoading } = useLoading()
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([])
  const [todayStatus, setTodayStatus] = useState<TodayAttendance>({
    checkedIn: false,
    checkedOut: false,
    checkInTime: null,
    checkOutTime: null,
    status: null,
  })
  const [qrToken, setQrToken] = useState<QrTokenResponse | null>(null)
  const [qrInput, setQrInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Load initial data
  useEffect(() => {
    let active = true

    async function loadData(): Promise<void> {
      try {
        setError(null)
        const data = await hrService.attendance()

        if (!active) return

        setAttendanceList(data)

        // Get today's status from the first record (most recent)
        if (data.length > 0) {
          const today = data[0]
          const dateKey = new Date().toISOString().slice(0, 10)
          const todayKey = today.date ? today.date.slice(0, 10) : ''

          if (todayKey === dateKey) {
            setTodayStatus({
              checkedIn: !!today.clock_in,
              checkedOut: !!today.clock_out,
              checkInTime: today.clock_in ? new Date(today.clock_in).toLocaleTimeString() : null,
              checkOutTime: today.clock_out ? new Date(today.clock_out).toLocaleTimeString() : null,
              status: today.status || null,
            })
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load attendance data')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [])

  // Generate QR token when component mounts
  useEffect(() => {
    let active = true

    async function generateQr(): Promise<void> {
      try {
        const token = await hrService.getQrToken()
        if (active) {
          setQrToken(token)
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to generate QR token')
        }
      }
    }

    void generateQr()
    return () => {
      active = false
    }
  }, [])

  const handleCheckIn = async (): Promise<void> => {
    if (!qrToken?.qrToken) {
      setError('QR token not available. Please refresh the page.')
      return
    }

    if (todayStatus.checkedIn && !todayStatus.checkedOut) {
      setError('You have already checked in. Use Check Out instead.')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      setSuccessMessage(null)

      await withLoading(() => hrService.checkIn(qrToken.qrToken))

      setSuccessMessage('✓ Check-in successful!')
      setTodayStatus((prev) => ({
        ...prev,
        checkedIn: true,
        checkInTime: new Date().toLocaleTimeString(),
        status: 'present',
      }))

      // Refresh the attendance list
      const updated = await hrService.attendance()
      setAttendanceList(updated)

      // Clear QR input and regenerate token
      setQrInput('')
      const newToken = await hrService.getQrToken()
      setQrToken(newToken)

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async (): Promise<void> => {
    if (!todayStatus.checkedIn) {
      setError('You must check in first before checking out.')
      return
    }

    if (todayStatus.checkedOut) {
      setError('You have already checked out today.')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      setSuccessMessage(null)

      await withLoading(() => hrService.checkOut())

      setSuccessMessage('✓ Check-out successful!')
      setTodayStatus((prev) => ({
        ...prev,
        checkedOut: true,
        checkOutTime: new Date().toLocaleTimeString(),
      }))

      // Refresh the attendance list
      const updated = await hrService.attendance()
      setAttendanceList(updated)

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Check-out failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleScanQr = async (): Promise<void> => {
    if (!qrInput.trim()) {
      setError('Please enter or scan a QR code.')
      return
    }

    if (qrInput.trim() === qrToken?.qrToken) {
      await handleCheckIn()
    } else {
      setError('Invalid QR token. Please scan again.')
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Attendance</p>
          <h2>Check-in & History</h2>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Today's Status Card */}
      <div className="grid grid-2">
        <AttendanceCard
          checkedIn={todayStatus.checkedIn}
          checkedOut={todayStatus.checkedOut}
          checkInTime={todayStatus.checkInTime}
          checkOutTime={todayStatus.checkOutTime}
          status={todayStatus.status}
          loading={loading}
        />

        {/* QR Token Display Card */}
        <Card>
          <p className="card-label">QR Token</p>
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all', minHeight: '60px', display: 'flex', alignItems: 'center' }}>
            {loading ? 'Loading token…' : qrToken?.qrToken || 'No token available'}
          </div>
          {qrToken && (
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
              Expires in {qrToken.expiresIn} seconds
            </p>
          )}
        </Card>
      </div>

      {/* Check-in/Check-out Actions */}
      <Card>
        <p className="card-label">Actions</p>

        {/* QR Scan Input */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', fontWeight: 500 }}>
            Scan QR Code or Enter Token:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
            <input
              ref={qrInputRef}
              type="text"
              placeholder="Scan QR code here"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleScanQr()
                }
              }}
              disabled={actionLoading}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'monospace',
              }}
            />
            <Button
              variant="primary"
              onClick={handleScanQr}
              disabled={actionLoading || !qrInput.trim()}
              style={{ minWidth: '100px' }}
            >
              {actionLoading ? 'Processing…' : 'Verify'}
            </Button>
          </div>
        </div>

        {/* Check-in/Check-out Buttons */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Button
            variant="primary"
            onClick={handleCheckIn}
            disabled={actionLoading || todayStatus.checkedIn || loading}
            style={{
              background: !todayStatus.checkedIn ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(0,0,0,0.1)',
            }}
          >
            {actionLoading ? 'Processing…' : 'Check In'}
          </Button>

          <Button
            variant="primary"
            onClick={handleCheckOut}
            disabled={actionLoading || !todayStatus.checkedIn || todayStatus.checkedOut || loading}
            style={{
              background: todayStatus.checkedIn && !todayStatus.checkedOut ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(0,0,0,0.1)',
            }}
          >
            {actionLoading ? 'Processing…' : 'Check Out'}
          </Button>
        </div>
      </Card>

      {/* Attendance History */}
      <div>
        <div className="page-heading" style={{ marginBottom: '12px' }}>
          <div>
            <p className="eyebrow">History</p>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Attendance Records</h3>
          </div>
        </div>
        <Card>
          <AttendanceTable items={attendanceList} loading={loading} />
        </Card>
      </div>
    </div>
  )
}