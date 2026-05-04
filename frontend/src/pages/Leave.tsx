import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { useLoading } from '../hooks/useLoading'
import { hrService, type LeaveItem } from '../services/hrService'

export default function Leave(): JSX.Element {
  const [items, setItems] = useState<LeaveItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const { withLoading } = useLoading()

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        const data = await withLoading(() => hrService.leaves())
        if (active) setItems(data)
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load leave requests')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Leave</p>
          <h2>Leave requests</h2>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-3">
        {items.length > 0 ? items.map((item) => (
          <Card key={item.id}>
            <p className="card-title">{item.type || 'Leave'} #{item.id}</p>
            <p className="card-value">{item.status || 'pending'}</p>
            <p className="muted">{item.start_date || '-'} to {item.end_date || '-'}</p>
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