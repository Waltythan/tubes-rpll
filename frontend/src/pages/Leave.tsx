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

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Leave</p>
          <h2>Leave requests</h2>
        </div>
        <Button type="button" onClick={() => setIsFormOpen((current) => !current)} loading={loading}>
          {isFormOpen ? 'Hide request form' : 'Request Leave'}
        </Button>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {isFormOpen && (
        <Card>
          <LeaveForm onSubmitted={handleLeaveCreated} onClose={() => setIsFormOpen(false)} />
        </Card>
      )}

      <div className="grid grid-3">
        {items.length > 0 ? items.map((item) => (
          <Card key={item.id}>
            <div className="section-header">
              <div className="leave-card-header">
                <div>
                  <p className="card-title">{item.type || 'Leave'} #{item.id}</p>
                  <p className="muted">{item.start_date || '-'} to {item.end_date || '-'}</p>
                </div>
                <div className="prominent-status">
                  <StatusBadge status={item.status || 'pending'} />
                  {item.approvedBy ? (
                    <div className="muted" style={{ fontSize: '0.78rem', marginTop: 6 }} title={item.approvedBy.email}>
                      Approved by: {item.approvedBy.name}
                    </div>
                  ) : item.approved_by ? (
                    <div className="muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>
                      Approved by: Unknown Approver
                    </div>
                  ) : null}
                  {item.updatedAt && (
                    <div className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )) : (
          <Card>
            <EmptyState />
          </Card>
        )}
      </div>
    </div>
  )
}