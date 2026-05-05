import { useEffect, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import { useLoading } from '../hooks/useLoading'
import { hrService, type PayrollItem } from '../services/hrService'

export default function Payroll(): JSX.Element {
  const [items, setItems] = useState<PayrollItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const { withLoading } = useLoading()

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        const data = await withLoading(() => hrService.payroll())
        if (active) setItems(data)
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load payroll')
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
          <p className="eyebrow">Payroll</p>
          <h2>Monthly payroll</h2>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-3">
        {items.length > 0 ? items.map((item) => (
          <Card key={item.id}>
            <p className="card-title">Payroll #{item.id}</p>
            <p className="card-value">{item.status || 'generated'}</p>
            <p className="muted">Period: {item.period_start || '-'} to {item.period_end || '-'}</p>
            <p className="muted">Net salary: {item.net_salary ?? '-'}</p>
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