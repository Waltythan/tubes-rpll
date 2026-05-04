import Card from '../Card'
import Badge from '../common/Badge'

interface TodayAttendanceCardProps {
  checkedIn: boolean
  checkedOut: boolean
  checkInTime: string | null
  checkOutTime: string | null
  status: string | null
  loading: boolean
}

export default function AttendanceCard({
  checkedIn,
  checkedOut,
  checkInTime,
  checkOutTime,
  status,
  loading,
}: TodayAttendanceCardProps): JSX.Element {
  const getStatusDisplay = (): string => {
    if (!checkedIn) return 'Not checked in'
    if (checkedOut) return 'Checked out'
    return 'Checked in'
  }

  const getStatusTone = (): 'success' | 'warning' | 'neutral' => {
    if (!checkedIn) return 'neutral'
    if (checkedOut) return 'success'
    return 'warning'
  }

  return (
    <Card>
      <p className="card-label">Today's Status</p>
      <div style={{ marginTop: '12px', marginBottom: '12px' }}>
        <Badge tone={getStatusTone()}>{loading ? 'Loading…' : getStatusDisplay()}</Badge>
      </div>
      {status && (
        <p className="card-value" style={{ fontSize: '1rem', margin: '8px 0 4px' }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
      )}
      <div style={{ marginTop: '12px' }}>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Check-in: {loading ? 'Loading…' : checkInTime || 'Not yet'}
        </p>
        <p className="muted" style={{ fontSize: '0.9rem', marginTop: '6px' }}>
          Check-out: {loading ? 'Loading…' : checkOutTime || 'Not yet'}
        </p>
      </div>
    </Card>
  )
}
