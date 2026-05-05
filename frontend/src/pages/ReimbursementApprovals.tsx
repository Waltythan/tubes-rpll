import { useEffect, useMemo, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import StatusBadge from '../components/common/StatusBadge'
import { showToast } from '../components/common/ToastContainer'
import { useAuth } from '../hooks/useAuth'
import { hrService, type ReimbursementItem } from '../services/hrService'

function formatCurrency(value?: number | string): string {
  if (value === undefined || value === null || value === '') return '—'
  const amount = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(amount)) return String(value)

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

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

export default function ReimbursementApprovals(): JSX.Element {
  const { user } = useAuth()
  const [items, setItems] = useState<ReimbursementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const pendingItems = useMemo(
    () => {
      const role = String(user?.role || user?.roles || 'staff').toLowerCase()
      const approverDepartmentId = Number(user?.departmentId || user?.department_id || 0) || null

      return items.filter((item) => {
        if (String(item.status || 'pending').toLowerCase() !== 'pending') {
          return false
        }

        if ((role === 'manager' || role === 'admin') && approverDepartmentId != null) {
          return item.department_id === approverDepartmentId
        }

        return true
      })
    },
    [items, user?.departmentId, user?.department_id, user?.role, user?.roles]
  )

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        setLoading(true)
        const data = await hrService.teamReimbursements()
        if (!active) return

        setItems(data)
        setError(null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load reimbursement approvals')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  async function refresh(): Promise<void> {
    const data = await hrService.teamReimbursements()
    setItems(data)
  }

  async function handleDecision(id: number, decision: 'approved' | 'rejected'): Promise<void> {
    setProcessingId(id)
    setError(null)

    try {
      await hrService.decideReimbursement(id, decision)
      showToast(`Reimbursement request ${decision === 'approved' ? 'approved' : 'rejected'}.`, 'success')
      await refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update reimbursement request'
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
          <h2>Reimbursement approvals</h2>
          <p className="muted">Handle expense claims from your team without leaving the dashboard.</p>
        </div>
        <Card className="approval-summary">
          <p className="card-label">Pending requests</p>
          <p className="card-stat">{pendingItems.length}</p>
          <p className="muted">Ready for review</p>
        </Card>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!['manager', 'admin'].includes(String(user?.role || user?.roles || 'staff').toLowerCase()) ? (
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
            title="No pending reimbursements"
            description="All reimbursement requests from your team have already been processed."
          />
        </Card>
      ) : (
        <div className="grid grid-2">
          {pendingItems.map((item) => (
            <Card key={item.id}>
              <div className="section-header">
                <div className="approval-card-header">
                  <div>
                    <p className="card-title">User #{item.user_id ?? '—'}</p>
                    <h3>{item.title || 'Reimbursement request'} #{item.id}</h3>
                  </div>
                  <StatusBadge status={item.status || 'pending'} />
                </div>
              </div>

              <div className="approval-meta-grid">
                <div>
                  <span className="field-helper">Amount</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                </div>
                <div>
                  <span className="field-helper">Request date</span>
                  <strong>{formatDate(item.request_date)}</strong>
                </div>
              </div>

              {item.description && <p className="muted approval-description">{item.description}</p>}
              {item.attachment_url && (
                <a className="approval-link" href={item.attachment_url} target="_blank" rel="noreferrer">
                  View attachment
                </a>
              )}

              <div className="approval-actions">
                <Button
                  type="button"
                  variant="secondary"
                  loading={processingId === item.id}
                  onClick={() => handleDecision(item.id, 'rejected')}
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