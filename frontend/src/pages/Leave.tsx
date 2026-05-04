import { useEffect, useRef, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import StatusBadge from '../components/common/StatusBadge'
import LeaveForm from '../components/leave/LeaveForm'
import { useLoading } from '../hooks/useLoading'
import { hrService, type LeaveItem } from '../services/hrService'

export default function Leave(): JSX.Element {
  const [items, setItems] = useState<LeaveItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { withLoading } = useLoading()
  const isMountedRef = useRef(true)

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  async function refreshLeaves(): Promise<void> {
    try {
      const data = await withLoading(() => hrService.leaves())
      if (!isMountedRef.current) return

      setItems(data)
      setError(null)
    } catch (err: unknown) {
      if (!isMountedRef.current) return

      setError(err instanceof Error ? err.message : 'Failed to load leave requests')
    }
  }

  useEffect(() => {
    void refreshLeaves()
  }, [])

  async function handleLeaveCreated(createdLeave: LeaveItem): Promise<void> {
    setItems((current) => [createdLeave, ...current.filter((item) => item.id !== createdLeave.id)])
    await refreshLeaves()
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Leave</p>
          <h2>Leave requests</h2>
        </div>
        <Button type="button" onClick={() => setIsFormOpen((current) => !current)}>
          {isFormOpen ? 'Hide request form' : 'Request Leave'}
        </Button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
                <StatusBadge status={item.status || 'pending'} />
              </div>
            </div>
          </Card>
        )) : (
          <Card>
            <p className="empty-state">No leave requests yet.</p>
          </Card>
        )}
      </div>
    </div>
  )
}