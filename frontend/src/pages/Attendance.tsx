import { useEffect, useMemo, useRef, useState } from 'react'
import AttendanceTable from '../components/attendance/AttendanceTable'
import Card from '../components/Card'
import ErrorAlert from '../components/common/ErrorAlert'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import FullPageLoader from '../components/common/FullPageLoader'
import { showToast } from '../components/common/ToastContainer'
import { useLoading } from '../hooks/useLoading'
import { hrService, type AttendanceItem, type QrTokenResponse } from '../services/hrService'
import { QRCodeSVG } from 'qrcode.react'

interface TodayAttendance {
  checkedIn: boolean
  checkedOut: boolean
  checkInTime: string | null
  checkOutTime: string | null
  status: string | null
  dateLabel: string | null
}

interface BannerState {
  tone: 'success' | 'danger' | 'primary' | 'warning'
  message: string
}

const QR_TTL_SECONDS = 30

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleDateString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoString
  }
}

function getDateKey(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
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
    dateLabel: null,
  })
  const [qrToken, setQrToken] = useState<QrTokenResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [historyLoading, setHistoryLoading] = useState<boolean>(false)
  const [qrLoading, setQrLoading] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const countdownRef = useRef<number | null>(null)
  const successTimeoutRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const todayRecord = useMemo(() => {
    return attendanceList.find((item) => getDateKey(item.date || item.clock_in || item.createdAt) === todayKey) || null
  }, [attendanceList, todayKey])

  const qrExpired = qrToken ? countdown <= 0 : true

  function clearBannerSoon(message: BannerState): void {
    setBanner(message)
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current)
    }
    successTimeoutRef.current = window.setTimeout(() => {
      setBanner(null)
    }, 3200)
  }

  function syncTodayStatus(records: AttendanceItem[]): void {
    const record = records.find((item) => getDateKey(item.date || item.clock_in || item.createdAt) === todayKey) || null

    setTodayStatus({
      checkedIn: Boolean(record?.clock_in),
      checkedOut: Boolean(record?.clock_out),
      checkInTime: record?.clock_in ? formatTime(record.clock_in) : null,
      checkOutTime: record?.clock_out ? formatTime(record.clock_out) : null,
      status: record?.status || null,
      dateLabel: record?.date ? formatDate(record.date) : formatDate(todayKey),
    })
  }

  async function refreshAttendance(silent = false): Promise<void> {
    if (!silent) {
      setHistoryLoading(true)
    }

    try {
      const data = await hrService.attendanceHistory()
      if (!isMountedRef.current) return

      setAttendanceList(data)
      syncTodayStatus(data)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      setBanner({ tone: 'danger', message: err instanceof Error ? err.message : 'Failed to load attendance data' })
    } finally {
      if (isMountedRef.current && !silent) {
        setHistoryLoading(false)
      }
    }
  }

  async function generateQr(): Promise<void> {
    try {
      setQrLoading(true)
      setBanner(null)
      const token = await hrService.getQrToken()
      if (!isMountedRef.current) return

      setQrToken(token)
      setCountdown(token.expiresIn || QR_TTL_SECONDS)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      setBanner({ tone: 'danger', message: err instanceof Error ? err.message : 'Failed to generate QR token' })
    } finally {
      if (isMountedRef.current) {
        setQrLoading(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    void withLoading(async () => {
      setLoading(true)
      await refreshAttendance(true)
      setLoading(false)
    })

    return () => {
      isMountedRef.current = false
      if (countdownRef.current !== null) {
        window.clearInterval(countdownRef.current)
      }
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!qrToken?.expiresAt) {
      setCountdown(0)
      return undefined
    }

    const tick = (): void => {
      const remaining = Math.max(0, Math.ceil((new Date(qrToken.expiresAt).getTime() - Date.now()) / 1000))
      setCountdown(remaining)

      if (remaining <= 0) {
        setBanner({ tone: 'warning', message: 'QR expired. Generate a new one to continue.' })
        setQrToken(null)
      }
    }

    tick()
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current)
    }

    countdownRef.current = window.setInterval(tick, 1000)

    return () => {
      if (countdownRef.current !== null) {
        window.clearInterval(countdownRef.current)
      }
    }
  }, [qrToken?.expiresAt])

  const handleCheckIn = async (): Promise<void> => {
    if (!qrToken?.qrToken) {
      setBanner({ tone: 'danger', message: 'Generate a QR code first.' })
      return
    }

    if (qrExpired) {
      setBanner({ tone: 'warning', message: 'QR token expired. Generate a new QR code.' })
      return
    }

    try {
      setActionLoading(true)
      setBanner(null)

      await hrService.checkIn(qrToken.qrToken)

      clearBannerSoon({ tone: 'success', message: 'Check-in successful.' })
      showToast('Check-in successful!', 'success')
      setQrToken(null)
      setCountdown(0)
      await refreshAttendance(true)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Check-in failed'
      showToast(errorMsg, 'error')
      setBanner({ tone: 'danger', message: errorMsg })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async (): Promise<void> => {
    if (!todayStatus.checkedIn) {
      setBanner({ tone: 'warning', message: 'You must check in first before checking out.' })
      return
    }

    if (todayStatus.checkedOut) {
      setBanner({ tone: 'warning', message: 'You have already checked out today.' })
      return
    }

    try {
      setActionLoading(true)
      setBanner(null)

      await hrService.checkOut()

      clearBannerSoon({ tone: 'success', message: 'Check-out successful.' })
      showToast('Check-out successful!', 'success')
      await refreshAttendance(true)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Check-out failed'
      showToast(errorMsg, 'error')
      setBanner({ tone: 'danger', message: errorMsg })
    } finally {
      setActionLoading(false)
    }
  }

  const handleScanQr = async (): Promise<void> => {
    await handleCheckIn()
  }

  const todayBadgeTone = !todayStatus.checkedIn ? 'danger' : todayStatus.checkedOut ? 'primary' : 'success'
  const latenessTone = todayStatus.status?.toLowerCase() === 'late' ? 'warning' : 'success'

  return (
    <div className="page-stack">
      <FullPageLoader show={loading} message="Loading attendance..." />
      <div className="page-heading">
        <div>
          <p className="eyebrow">Attendance</p>
          <h2>Attendance dashboard</h2>
          <p className="muted">Generate a QR, confirm attendance, and review your latest activity in one place.</p>
        </div>
      </div>

      {banner && banner.tone === 'danger' && <ErrorAlert error={banner.message} onDismiss={() => setBanner(null)} />}
      {banner && <div className={`alert alert-${banner.tone}`}>{banner.message}</div>}

      <section className="grid grid-2 attendance-top-grid">
        <Card className={`attendance-status-card attendance-status-${todayBadgeTone}`}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Today status</p>
              <h3>{todayStatus.dateLabel || formatDate(todayKey)}</h3>
            </div>
            <div className="attendance-badge-row">
              <Badge tone={todayBadgeTone}>{!todayStatus.checkedIn ? 'Not Checked In' : todayStatus.checkedOut ? 'Checked Out' : 'Checked In'}</Badge>
              <Badge tone={latenessTone}>{todayStatus.status?.toLowerCase() === 'late' ? 'Late' : 'On Time'}</Badge>
            </div>
          </div>

          <div className="attendance-status-grid">
            <div>
              <span className="attendance-stat-label">Clock In</span>
              <strong className="attendance-stat-value">{todayStatus.checkInTime || '—'}</strong>
            </div>
            <div>
              <span className="attendance-stat-label">Clock Out</span>
              <strong className="attendance-stat-value">{todayStatus.checkOutTime || '—'}</strong>
            </div>
            <div>
              <span className="attendance-stat-label">Status</span>
              <strong className="attendance-stat-value">{!todayStatus.checkedIn ? 'Not Checked In' : todayStatus.checkedOut ? 'Checked Out' : 'Checked In'}</strong>
            </div>
          </div>
        </Card>

        <Card className="attendance-qr-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">QR attendance</p>
              <h3>Generate and confirm check-in</h3>
            </div>
            <Button type="button" variant="ghost" onClick={() => void generateQr()} disabled={qrLoading || actionLoading}>
              {qrLoading ? 'Generating...' : qrToken ? 'Regenerate QR' : 'Generate QR'}
            </Button>
          </div>

          <div className="attendance-qr-stage">
            {qrToken ? (
              <div className="attendance-qr-fade">
                <div className="attendance-qr-shell">
                  <QRCodeSVG value={qrToken.qrToken} size={168} level="M" includeMargin className="attendance-qr-code" />
                </div>
                <p className="attendance-countdown">Expires in {countdown}s</p>
                <p className="muted attendance-qr-helper">Use the QR above, then confirm to check in.</p>
              </div>
            ) : (
              <div className="attendance-empty-qr">
                <p className="empty-state">Generate a QR code to start your attendance check-in.</p>
              </div>
            )}
          </div>

          <div className="attendance-action-row">
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleScanQr()}
              disabled={actionLoading || qrLoading || !qrToken || qrExpired || todayStatus.checkedOut}
              fullWidth
            >
              {actionLoading ? 'Confirming...' : 'Scan / Confirm Check-in'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void generateQr()}
              disabled={qrLoading || actionLoading}
              fullWidth
            >
              {qrToken ? 'Refresh QR' : 'Generate QR'}
            </Button>
          </div>

          <div className="attendance-action-row attendance-followup-row">
            {todayStatus.checkedIn && !todayStatus.checkedOut ? (
              <Button type="button" variant="primary" onClick={() => void handleCheckOut()} disabled={actionLoading || loading} fullWidth>
                {actionLoading ? 'Processing...' : 'Check Out'}
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => void generateQr()} disabled={qrLoading || actionLoading || loading} fullWidth>
                {todayStatus.checkedOut ? 'Attendance completed' : 'Check In'}
              </Button>
            )}
          </div>
        </Card>
      </section>

      <Card>
        <div className="section-header">
          <div>
            <p className="eyebrow">Attendance history</p>
            <h3>Attendance records</h3>
          </div>
        </div>
        <AttendanceTable items={attendanceList} loading={historyLoading} />
      </Card>
    </div>
  )
}