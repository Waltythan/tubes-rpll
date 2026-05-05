import { useEffect, useMemo, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { fetchActivityLogs, type ActivityLogItem } from '../services/activityLogService'

const PAGE_SIZE = 10

function formatTimestamp(value?: string): string {
  if (!value) return '—'
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

function formatEntity(item: ActivityLogItem): string {
  const table = item.target_table || 'unknown'
  return item.target_id ? `${table} #${item.target_id}` : table
}

function formatUser(item: ActivityLogItem): string {
  return `User #${item.user_id}`
}

export default function ActivityLogs(): JSX.Element {
  const [items, setItems] = useState<ActivityLogItem[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const offset = useMemo(() => page * PAGE_SIZE, [page])

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        setLoading(true)
        const data = await fetchActivityLogs(PAGE_SIZE, offset)
        if (!active) return

        setItems(data)
        setHasMore(data.length === PAGE_SIZE)
        setError(null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load activity logs')
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
  }, [offset])

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Activity logs</h2>
          <p className="muted">Review recent system events with pagination and backend audit data.</p>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <Card>
        {loading ? (
          <div className="approval-loading">
            <p className="card-title">Loading logs...</p>
            <p className="muted">Fetching the current page of audit records.</p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No activity logs"
            description="Audit records will appear here once users start using the system."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Entity</th>
                  <th className="table-header">Timestamp</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {items.map((item, index) => (
                  <tr key={`${item.user_id}-${item.action}-${item.created_at}-${index}`} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                    <td className="table-cell">{formatUser(item)}</td>
                    <td className="table-cell">{item.action}</td>
                    <td className="table-cell">{formatEntity(item)}</td>
                    <td className="table-cell">{formatTimestamp(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-bar">
          <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={loading || page === 0}>
            Previous
          </Button>
          <div className="pagination-meta">
            <span className="muted">Page {page + 1}</span>
            <span className="muted">{items.length} records</span>
          </div>
          <Button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || !hasMore}>
            Next
          </Button>
        </div>
      </Card>
    </div>
  )
}