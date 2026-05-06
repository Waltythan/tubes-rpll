import { useEffect, useRef, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import StatusBadge from '../components/common/StatusBadge'
import LeaveForm from '../components/leave/LeaveForm'
import { useLoading } from '../hooks/useLoading'
import { hrService, type LeaveItem } from '../services/hrService'

export default function Leave(): JSX.Element {
  const [items, setItems] = useState<LeaveItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { withLoading } = useLoading()
  const isMountedRef = useRef(true)
  const prevStatusRef = useRef<Record<number, string>>({})

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  async function refreshLeaves(): Promise<void> {
    try {
      setLoading(true)
      const data = await withLoading(() => hrService.leaves())
      if (!isMountedRef.current) return

      // sort: pending first, then by updatedAt (or createdAt) desc
      const sorted = [...data].sort((a, b) => {
        const aStatus = String(a.status || 'pending').toLowerCase()
        const bStatus = String(b.status || 'pending').toLowerCase()
        if (aStatus === 'pending' && bStatus !== 'pending') return -1
        if (aStatus !== 'pending' && bStatus === 'pending') return 1
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
        return bTime - aTime
      })

      // compare previous statuses and show toasts for changes
      for (const item of sorted) {
        const prev = prevStatusRef.current[item.id]
        const curr = String(item.status || 'pending').toLowerCase()
        if (prev && prev !== curr) {
          if (curr === 'approved') showToast(`Your leave request #${item.id} was approved.`, 'success')
          else if (curr === 'rejected' || curr === 'declined') showToast(`Your leave request #${item.id} was rejected.`, 'error')
          else showToast(`Your leave request #${item.id} status changed to ${curr}.`, 'info')
        }
        prevStatusRef.current[item.id] = curr
      }

      setItems(sorted)
      setError(null)
    } catch (err: unknown) {
      if (!isMountedRef.current) return

      const errorMsg = err instanceof Error ? err.message : 'Failed to load leave requests'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshLeaves()

    function onVisibility() {
      if (document.visibilityState === 'visible') void refreshLeaves()
    }
    function onFocus() { void refreshLeaves() }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  async function handleLeaveCreated(createdLeave: LeaveItem): Promise<void> {
    setItems((current) => [createdLeave, ...current.filter((item) => item.id !== createdLeave.id)])
    showToast('Leave request created successfully!', 'success')
    // update prevStatus for created item
    prevStatusRef.current[createdLeave.id] = String(createdLeave.status || 'pending').toLowerCase()
    await refreshLeaves()
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Time Off</p>
          <h2>My Leave Requests</h2>
          <p className="muted">Track and manage your vacation and sick leave applications.</p>
        </div>
        <Button type="button" variant={isFormOpen ? 'secondary' : 'primary'} onClick={() => setIsFormOpen((current) => !current)} loading={loading}>
          {isFormOpen ? 'Hide request form' : 'New Leave Request'}
        </Button>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {isFormOpen && (
        <Card>
          <div className="section-header" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">Application</p>
              <h3 style={{ margin: 0 }}>Request New Leave</h3>
            </div>
          </div>
          <LeaveForm onSubmitted={handleLeaveCreated} onClose={() => setIsFormOpen(false)} />
        </Card>
      )}

      <div className="grid grid-3">
        {items.length > 0 ? items.map((item) => (
          <Card key={item.id} className="request-card">
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <div>
                <p className="eyebrow" style={{ color: item.type === 'unpaid' ? '#b45309' : 'var(--primary)' }}>
                  {item.type === 'unpaid' ? '⚠ Unpaid Leave' : '✦ Annual Leave'}
                </p>
                <h3 style={{ margin: '4px 0', fontSize: '1.1rem' }}>{item.reason || 'No reason provided'}</h3>
                <p className="muted small">ID: #{item.id}</p>
              </div>
              <StatusBadge status={item.status || 'pending'} />
            </div>

            <div className="card-details-grid">
              <div className="detail-item">
                <span className="label">Starts</span>
                <span className="value">{formatDate(item.start_date)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Ends</span>
                <span className="value">{formatDate(item.end_date)}</span>
              </div>
            </div>

            {item.approvedBy && (
              <div className="approver-info">
                <span className="label">Approved by</span>
                <span className="value">{item.approvedBy.name}</span>
              </div>
            )}
            
            <div className="card-footer-timestamp">
              Updated: {new Date(item.updatedAt || item.createdAt || 0).toLocaleString()}
            </div>
          </Card>
        )) : (
          <div className="grid-full">
            <EmptyState 
              title="No leave requests yet"
              description="Your leave history will appear here once you submit a request."
            />
          </div>
        )}
      </div>
    </div>
  )
}