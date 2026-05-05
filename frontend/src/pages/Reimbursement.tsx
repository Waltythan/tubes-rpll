import { useEffect, useRef, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import StatusBadge from '../components/common/StatusBadge'
import ReimbursementForm from '../components/reimbursement/ReimbursementForm'
import { useLoading } from '../hooks/useLoading'
import { hrService, type ReimbursementItem } from '../services/hrService'

export default function Reimbursement(): JSX.Element {
  const [items, setItems] = useState<ReimbursementItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { withLoading } = useLoading()
  const isMountedRef = useRef(true)

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  async function refreshReimbursements(): Promise<void> {
    try {
      const data = await withLoading(() => hrService.reimbursements())
      if (!isMountedRef.current) return

      setItems(data)
      setError(null)
    } catch (err: unknown) {
      if (!isMountedRef.current) return

      setError(err instanceof Error ? err.message : 'Failed to load reimbursements')
    }
  }

  useEffect(() => {
      setLoading(true)
    void refreshReimbursements()
  }, [])

  async function handleReimbursementCreated(createdReimbursement: ReimbursementItem): Promise<void> {
    setItems((current) => [createdReimbursement, ...current.filter((item) => item.id !== createdReimbursement.id)])
    await refreshReimbursements()
  }

      const errorMsg = err instanceof Error ? err.message : 'Failed to load reimbursements'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setLoading(false)
    if (value === undefined || value === null || value === '') {
      return '-'
    }

    const amount = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(amount)) {
      return String(value)
    }

    showToast('Reimbursement request created successfully!', 'success')
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <Button type="button" onClick={() => setIsFormOpen((current) => !current)} loading={loading}>
          <p className="eyebrow">Reimbursement</p>
          <h2>Expense claims</h2>
        </div>
        <Button type="button" onClick={() => setIsFormOpen((current) => !current)}>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
        </Button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isFormOpen && (
        <Card>
          <ReimbursementForm onSubmitted={handleReimbursementCreated} onClose={() => setIsFormOpen(false)} />
        </Card>
      )}

      <div className="grid grid-3">
        {items.length > 0 ? items.map((item) => (
          <Card key={item.id}>
            <div className="section-header">
              <div className="leave-card-header">
                <div>
                  <p className="card-title">{item.title || 'Expense'} #{item.id}</p>
                  <p className="muted">{item.description || 'No description provided'}</p>
                  <p className="card-value">{formatAmount(item.amount)}</p>
                </div>
                <StatusBadge status={item.status || 'pending'} />
              </div>
            </div>
          </Card>
        )) : (
          <Card>
            <p className="empty-state">No reimbursement requests yet.</p>
          </Card>
        )}
      </div>
    </div>
  )
}