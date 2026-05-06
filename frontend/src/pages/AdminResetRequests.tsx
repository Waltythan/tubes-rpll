import { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import {
    approveResetRequest,
    getPendingResetRequests,
    rejectResetRequest,
    type ResetRequestItem,
} from '../services/authService'

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export default function AdminResetRequests(): JSX.Element {
  const [items, setItems] = useState<ResetRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  async function loadData(): Promise<void> {
    try {
      setLoading(true)
      const rows = await getPendingResetRequests()
      setItems(rows)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reset requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleApprove(item: ResetRequestItem): Promise<void> {
    const ok = window.confirm(`Approve reset request for ${item.email}? Password will be set to password123.`)
    if (!ok) return

    try {
      setProcessingId(item.id)
      await approveResetRequest(item.id)
      showToast('Reset request approved. Password has been reset.', 'success')
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve reset request'
      setError(message)
      showToast(message, 'error')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(item: ResetRequestItem): Promise<void> {
    const ok = window.confirm(`Reject reset request for ${item.email}?`)
    if (!ok) return

    try {
      setProcessingId(item.id)
      await rejectResetRequest(item.id)
      showToast('Reset request rejected.', 'success')
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject reset request'
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
          <p className="eyebrow">Admin</p>
          <h2>Password reset requests</h2>
          <p className="muted">Review pending reset requests and approve or reject each request.</p>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <Card>
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header">User</th>
                <th className="table-header">Email</th>
                <th className="table-header">Requested At</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="table-cell" colSpan={4}>Loading reset requests...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="table-cell" colSpan={4}>No pending reset requests</td>
                </tr>
              ) : (
                items.map((item) => {
                  const disabled = processingId === item.id
                  return (
                    <tr key={item.id}>
                      <td className="table-cell">{item.user_name || `User #${item.user_id}`}</td>
                      <td className="table-cell">{item.email}</td>
                      <td className="table-cell">{formatDateTime(item.created_at)}</td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button type="button" variant="secondary" disabled={disabled} loading={disabled} onClick={() => handleReject(item)}>
                            Reject
                          </Button>
                          <Button type="button" disabled={disabled} loading={disabled} onClick={() => handleApprove(item)}>
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
