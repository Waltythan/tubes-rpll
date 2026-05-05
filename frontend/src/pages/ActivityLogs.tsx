import { useEffect, useState } from 'react'
import Card from '../components/Card'
import ErrorAlert from '../components/common/ErrorAlert'
import EmptyState from '../components/common/EmptyState'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useLoading } from '../hooks/useLoading'
import { hrService, type ActivityLog } from '../services/hrService'

const PAGE_SIZE = 50

interface ActivityLogRow extends ActivityLog {
  user_name?: string
}

export default function ActivityLogs(): JSX.Element {
  const [logs, setLogs] = useState<ActivityLogRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const { loading } = useLoading()

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        setError(null)
        const data = await hrService.activityLogs(PAGE_SIZE, page * PAGE_SIZE)
        if (active) {
          setLogs(data.rows || [])
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load activity logs')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [page])

  async function loadMore(): Promise<void> {
    try {
      setIsLoadingMore(true)
      setError(null)
      const data = await hrService.activityLogs(PAGE_SIZE, (page + 1) * PAGE_SIZE)
      if ((data.rows || []).length > 0) {
        setLogs((prev) => [...prev, ...(data.rows || [])])
        setPage((p) => p + 1)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load more logs')
    } finally {
      setIsLoadingMore(false)
    }
  }

  function formatDateTime(isoString: string | undefined): string {
    if (!isoString) return '—'
    try {
      return new Date(isoString).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  function getActionLabel(action: string | undefined): string {
    if (!action) return '—'
    const actionMap: Record<string, string> = {
      login_success: '✓ Login',
      login_failed: '✗ Login Failed',
      logout: 'Logout',
      attendance_check_in: 'Check In',
      attendance_check_out: 'Check Out',
      profile_update: 'Profile Update',
      leave_request_create: 'Leave Request',
      leave_request_approve: 'Leave Approve',
      leave_request_reject: 'Leave Reject',
      reimbursement_submit: 'Reimbursement',
      reimbursement_approve: 'Reimburse Approve',
      reimbursement_reject: 'Reimburse Reject',
    }
    return actionMap[action] || action
  }

  function getEntityLabel(table: string | undefined, id: string | undefined): string {
    if (!table) return '—'
    const label = table.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    if (id) return `${label} #${id}`
    return label
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Activity logs</h2>
        </div>
      </div>

      {error && (
        <ErrorAlert message={error} onDismiss={() => setError(null)} />
      )}

      {logs.length === 0 ? (
        <Card>
          <EmptyState title="No activity logs" subtitle="Activity logs will appear here" />
        </Card>
      ) : (
        <>
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--color-border, #e0e0e0)',
                      backgroundColor: 'var(--color-background-hover, #f9f9f9)',
                    }}
                  >
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-muted, #666)',
                      }}
                    >
                      User ID
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-muted, #666)',
                      }}
                    >
                      Action
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-muted, #666)',
                      }}
                    >
                      Entity
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-muted, #666)',
                      }}
                    >
                      IP Address
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-muted, #666)',
                      }}
                    >
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--color-border, #e0e0e0)',
                        ':hover': {
                          backgroundColor: 'var(--color-background-hover, #f9f9f9)',
                        },
                      }}
                    >
                      <td
                        style={{
                          padding: '1rem',
                          color: 'var(--color-text, #333)',
                        }}
                      >
                        <code style={{ fontSize: '0.85em' }}>{log.user_id || '—'}</code>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          color: 'var(--color-text, #333)',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            backgroundColor: log.action?.includes('failed')
                              ? 'rgba(220, 53, 69, 0.1)'
                              : log.action?.includes('reject')
                              ? 'rgba(220, 53, 69, 0.1)'
                              : 'rgba(40, 167, 69, 0.1)',
                            color: log.action?.includes('failed')
                              ? 'var(--color-danger, #dc3545)'
                              : log.action?.includes('reject')
                              ? 'var(--color-danger, #dc3545)'
                              : 'var(--color-success, #28a745)',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                          }}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          color: 'var(--color-muted, #666)',
                          fontSize: '0.9rem',
                        }}
                      >
                        {getEntityLabel(log.target_table, log.target_id)}
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          color: 'var(--color-muted, #666)',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        <code>{log.ip_address || '—'}</code>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          color: 'var(--color-muted, #666)',
                          fontSize: '0.9rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {logs.length >= PAGE_SIZE && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginTop: '2rem',
              }}
            >
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.95rem',
                }}
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
