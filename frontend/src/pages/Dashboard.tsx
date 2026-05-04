import { useEffect, useState } from 'react'
import Card from '../components/Card'
import Badge from '../components/common/Badge'
import { useAuth } from '../hooks/useAuth'
import { hrService, type LeaveItem, type ReimbursementItem } from '../services/hrService'

interface MetricCardProps {
  icon: string
  iconClass: string
  title: string
  value: string | number
  description: string
  loading: boolean
}

const leaveAllowance = Number(import.meta.env.VITE_LEAVE_ALLOWANCE_DAYS || 12)

function isSameMonth(value: string | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function getDateRangeDays(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0
  }
  const diff = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000))
  return diff + 1
}

function MetricCard({ icon, iconClass, title, value, description, loading }: MetricCardProps): JSX.Element {
  return (
    <Card>
      <div className={`metric-icon ${iconClass}`}>{icon}</div>
      <p className="card-label">{title}</p>
      <p className="card-stat">{loading ? '…' : value}</p>
      <p className="muted">{loading ? 'Loading data…' : description}</p>
    </Card>
  )
}

export default function Dashboard(): JSX.Element {
  const { user, loading: authLoading } = useAuth()
  const [attendanceThisMonth, setAttendanceThisMonth] = useState<number | null>(null)
  const [lateCount, setLateCount] = useState<number | null>(null)
  const [leaveRemaining, setLeaveRemaining] = useState<number | null>(null)
  const [reimbursePending, setReimbursePending] = useState<number | null>(null)
  const [latestLeave, setLatestLeave] = useState<LeaveItem | null>(null)
  const [latestReimbursement, setLatestReimbursement] = useState<ReimbursementItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadAttendance(): Promise<void> {
      try {
        const items = await hrService.attendance()
        if (!active) return

        setAttendanceThisMonth(items.filter((item) => isSameMonth(item.date || item.clock_in || item.createdAt)).length)
        setLateCount(items.filter((item) => isSameMonth(item.date || item.clock_in || item.createdAt) && String(item.status || '').toLowerCase() === 'late').length)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load attendance data')
        }
      }
    }

    async function loadLeaves(): Promise<void> {
      try {
        const items = await hrService.leaves()
        if (!active) return

        const approvedLeaveDays = items
          .filter((item) => String(item.status || '').toLowerCase() === 'approved')
          .reduce((total, item) => total + getDateRangeDays(item.start_date || '', item.end_date || ''), 0)

        setLeaveRemaining(Math.max(0, leaveAllowance - approvedLeaveDays))
        setLatestLeave(items[0] || null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load leave data')
        }
      }
    }

    async function loadReimbursements(): Promise<void> {
      try {
        const items = await hrService.reimbursements()
        if (!active) return

        setReimbursePending(items.filter((item) => String(item.status || '').toLowerCase() === 'pending').length)
        setLatestReimbursement(items[0] || null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load reimbursement data')
        }
      }
    }

    void loadAttendance()
    void loadLeaves()
    void loadReimbursements()

    return () => {
      active = false
    }
  }, [])

  if (authLoading) {
    return <></>
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Welcome back, {user?.name || user?.fullName || user?.email || 'User'}</h2>
          <p className="muted">A clean snapshot of your HR activities and account status.</p>
        </div>
        <Badge tone="primary">{user?.role || user?.roles || 'staff'}</Badge>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="grid grid-4">
        <MetricCard icon="⏱" iconClass="metric-icon-blue" title="Total attendance" value={attendanceThisMonth ?? 0} description="Attendance check-ins this month." loading={attendanceThisMonth === null} />
        <MetricCard icon="⚠" iconClass="metric-icon-amber" title="Late count" value={lateCount ?? 0} description="Late check-ins this month." loading={lateCount === null} />
        <MetricCard icon="🌴" iconClass="metric-icon-green" title="Leave remaining" value={leaveRemaining ?? leaveAllowance} description="Configured annual allowance minus approved leave days." loading={leaveRemaining === null} />
        <MetricCard icon="💸" iconClass="metric-icon-violet" title="Reimburse pending" value={reimbursePending ?? 0} description="Expenses waiting for approval." loading={reimbursePending === null} />
      </section>

      <section className="grid grid-2">
        <Card>
          <div className="section-header">
            <div>
              <p className="eyebrow">Profile</p>
              <h3>Account details</h3>
            </div>
          </div>
          <dl className="info-list">
            <div>
              <dt>Name</dt>
              <dd>{user?.name || user?.fullName || user?.email || '-'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email || '-'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user?.role || user?.roles || 'staff'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="section-header">
            <div>
              <p className="eyebrow">Recent status</p>
              <h3>Latest activity</h3>
            </div>
          </div>
          <div className="stacked-cards">
            <div className="status-row">
              <span>Latest leave</span>
              <strong>{latestLeave ? latestLeave.type || 'Request' : 'No recent leave'}</strong>
              <Badge tone={String(latestLeave?.status || '').toLowerCase() === 'approved' ? 'success' : 'warning'}>{latestLeave?.status || 'loading'}</Badge>
            </div>
            <div className="status-row">
              <span>Latest reimbursement</span>
              <strong>{latestReimbursement ? latestReimbursement.title || 'Expense' : 'No recent claims'}</strong>
              <Badge tone={String(latestReimbursement?.status || '').toLowerCase() === 'approved' ? 'success' : 'warning'}>{latestReimbursement?.status || 'loading'}</Badge>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}