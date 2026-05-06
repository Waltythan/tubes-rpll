import { useEffect, useMemo, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import StatusBadge from '../components/common/StatusBadge'
import { showToast } from '../components/common/ToastContainer'
import { useAuth } from '../hooks/useAuth'
import { hrService, type LeaveItem } from '../services/hrService'

function formatDate(value?: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export default function LeaveApprovals(): JSX.Element {
  const { user } = useAuth()
  const role = String(user?.role || user?.roles || 'staff').toLowerCase()
  const approverDepartmentId = Number(user?.departmentId || user?.department_id || 0) || null
  const isApprover = role === 'manager' || role === 'admin'

  const [items, setItems] = useState<LeaveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const pendingItems = useMemo(() => {
    return items.filter((item) => {
      if (String(item.status || 'pending').toLowerCase() !== 'pending') {
        return false
      }

      if (approverDepartmentId != null) {
        return item.department_id === approverDepartmentId
      }

      return true
    })
  }, [approverDepartmentId, items])

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        setLoading(true)
        const data = await hrService.teamLeaves()
        if (!active) return

        setItems(data)
        setError(null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load leave approvals')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (isApprover) {
      void load()
    } else {
      setLoading(false)
    }

    return () => {
      active = false
    }
  }, [isApprover])

  async function refresh(): Promise<void> {
    const data = await hrService.teamLeaves()
    setItems(data)
  }

  async function handleDecision(id: number, decision: 'approved' | 'declined'): Promise<void> {
    setProcessingId(id)
    setError(null)

    try {
      await hrService.decideLeave(id, decision)
      showToast(`Leave request ${decision === 'approved' ? 'approved' : 'rejected'}.`, 'success')
      await refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update leave request'
      setError(message)
      showToast(message, 'error')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Leave approvals</h2>
          <p className="muted">Review pending leave requests from your team and update the queue after each decision.</p>
        </div>
        <Card className="approval-summary">
          <p className="card-label">Pending requests</p>
          <p className="card-stat">{pendingItems.length}</p>
          <p className="muted">Ready for review</p>
        </Card>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!isApprover ? (
        <Card>
          <p className="muted">You do not have permission to access this page.</p>
        </Card>
      ) : loading ? (
        <Card>
          <div className="approval-loading">
            <p className="card-title">Loading team requests...</p>
            <p className="muted">Fetching the current approval queue.</p>
          </div>
        </Card>
      ) : pendingItems.length === 0 ? (
        <Card>
          <EmptyState
            title="No pending leave requests"
            description="All leave requests from your team have already been processed."
          />
        </Card>
      ) : (
        <div className="grid grid-2">
          {pendingItems.map((item) => (
            <Card key={item.id}>
              <div className="section-header">
                <div className="approval-card-header">
                  <div>
                    <p className="card-title" title={item.user?.email}>{item.user?.name || 'Unknown User'}</p>
                    <h3>{item.type || 'Leave'} request #{item.id}</h3>
                  </div>
                  <StatusBadge status={item.status || 'pending'} />
                </div>
              </div>

              <div className="approval-meta-grid">
                <div>
                  <span className="field-helper">Period</span>
                  <strong>{formatDate(item.start_date)} - {formatDate(item.end_date)}</strong>
                </div>
                <div>
                  <span className="field-helper">Attachment</span>
                  <strong>{item.attachment_url ? 'Attached' : 'None'}</strong>
                </div>
              </div>

              <div className="approval-actions">
                <Button
                  type="button"
                  variant="secondary"
                  loading={processingId === item.id}
                  onClick={() => handleDecision(item.id, 'declined')}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  loading={processingId === item.id}
                  onClick={() => handleDecision(item.id, 'approved')}
                >
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
