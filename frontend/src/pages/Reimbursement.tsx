import { useEffect, useRef, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import SkeletonLoader from '../components/common/SkeletonLoader'
import { showToast } from '../components/common/ToastContainer'
import StatusBadge from '../components/common/StatusBadge'
import ReimbursementForm from '../components/reimbursement/ReimbursementForm'
import { hrService, type ReimbursementItem } from '../services/hrService'

export default function Reimbursement(): JSX.Element {
  const [items, setItems] = useState<ReimbursementItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  async function refreshReimbursements(): Promise<void> {
    try {
      setLoading(true)
      const data = await hrService.reimbursements()
      if (!isMountedRef.current) return

      setItems(data)
      setError(null)
    } catch (err: unknown) {
      if (!isMountedRef.current) return

      const errorMsg = err instanceof Error ? err.message : 'Failed to load reimbursement requests.'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void refreshReimbursements()
  }, [])

  async function handleReimbursementCreated(createdReimbursement: ReimbursementItem): Promise<void> {
    setSubmitting(true)
    try {
      setItems((current) => [createdReimbursement, ...current.filter((item) => item.id !== createdReimbursement.id)])
      showToast('Reimbursement request created successfully!', 'success')
      setIsFormOpen(false)
      await refreshReimbursements()
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false)
      }
    }
  }

  function formatAmount(value: number | string | undefined): string {
    if (value === undefined || value === null || value === '') {
      return '-'
    }

    const amount = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(amount)) {
      return String(value)
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Reimbursement</p>
          <h2>Expense claims</h2>
        </div>
        <Button type="button" onClick={() => setIsFormOpen((current) => !current)} loading={submitting}>
          {isFormOpen ? 'Hide request form' : 'Request Reimbursement'}
        </Button>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {isFormOpen && (
        <Card>
          <ReimbursementForm onSubmitted={handleReimbursementCreated} onClose={() => setIsFormOpen(false)} />
        </Card>
      )}

      {loading ? (
        <Card>
          <SkeletonLoader lines={4} height={18} />
        </Card>
      ) : (
        <div className="grid grid-3">
          {items.length > 0 ? (
            items.map((item) => (
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
            ))
          ) : (
            <Card>
              <EmptyState />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
