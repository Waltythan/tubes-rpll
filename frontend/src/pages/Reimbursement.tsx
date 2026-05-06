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
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; title: string } | null>(null)
  const isMountedRef = useRef(true)
  const prevStatusRef = useRef<Record<number, string>>({})

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

      // sort: pending first, then by updatedAt (or request_date) desc
      const sorted = [...data].sort((a, b) => {
        const aStatus = String(a.status || 'pending').toLowerCase()
        const bStatus = String(b.status || 'pending').toLowerCase()
        if (aStatus === 'pending' && bStatus !== 'pending') return -1
        if (aStatus !== 'pending' && bStatus === 'pending') return 1
        const aTime = new Date(a.updatedAt || a.request_date || 0).getTime()
        const bTime = new Date(b.updatedAt || b.request_date || 0).getTime()
        return bTime - aTime
      })

      for (const item of sorted) {
        const prev = prevStatusRef.current[item.id]
        const curr = String(item.status || 'pending').toLowerCase()
        if (prev && prev !== curr) {
          if (curr === 'approved') showToast(`Your reimbursement #${item.id} was approved.`, 'success')
          else if (curr === 'rejected') showToast(`Your reimbursement #${item.id} was rejected.`, 'error')
          else showToast(`Your reimbursement #${item.id} status changed to ${curr}.`, 'info')
        }
        prevStatusRef.current[item.id] = curr
      }

      setItems(sorted)
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

    function onVisibility() {
      if (document.visibilityState === 'visible') void refreshReimbursements()
    }
    function onFocus() { void refreshReimbursements() }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => {
    if (!attachmentPreview) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [attachmentPreview])

  async function handleReimbursementCreated(createdReimbursement: ReimbursementItem): Promise<void> {
    setSubmitting(true)
    try {
      setItems((current) => [createdReimbursement, ...current.filter((item) => item.id !== createdReimbursement.id)])
      showToast('Reimbursement request created successfully!', 'success')
      setIsFormOpen(false)
      prevStatusRef.current[createdReimbursement.id] = String(createdReimbursement.status || 'pending').toLowerCase()
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

  function openAttachment(url: string, title: string): void {
    setAttachmentPreview({ url, title })
  }

  function closeAttachmentPreview(): void {
    setAttachmentPreview(null)
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Finance</p>
          <h2>My Expense Claims</h2>
          <p className="muted">Submit receipts and track your reimbursement requests.</p>
        </div>
        <Button type="button" variant={isFormOpen ? 'secondary' : 'primary'} onClick={() => setIsFormOpen((current) => !current)} loading={submitting}>
          {isFormOpen ? 'Hide request form' : 'New Reimbursement'}
        </Button>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {isFormOpen && (
        <Card>
          <div className="section-header" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">Submission</p>
              <h3 style={{ margin: 0 }}>Create Expense Claim</h3>
            </div>
          </div>
          <ReimbursementForm onSubmitted={handleReimbursementCreated} onClose={() => setIsFormOpen(false)} />
        </Card>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p className="muted">Loading your claims...</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {items.length > 0 ? (
            items.map((item) => (
              <Card key={item.id} className="request-card">
                <div className="section-header" style={{ marginBottom: '16px' }}>
                  <div>
                    <p className="eyebrow" style={{ color: 'var(--primary)' }}>Receipt #{item.id}</p>
                    <h3 style={{ margin: '4px 0', fontSize: '1.1rem' }}>{item.title || 'Untitled Expense'}</h3>
                    <p className="muted small" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {item.description || 'No description'}
                    </p>
                  </div>
                  <StatusBadge status={item.status || 'pending'} />
                </div>

                <div className="reimbursement-amount">
                  {formatAmount(item.amount)}
                </div>

                <div className="card-details-grid" style={{ marginBottom: '12px' }}>
                  <div className="detail-item">
                    <span className="label">Date</span>
                    <span className="value">{item.request_date ? new Date(item.request_date).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Attachment</span>
                    <span className="value">
                      {item.attachment_url ? (
                        <button 
                          className="link-btn" 
                          style={{ fontSize: '0.8rem', padding: 0, border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => openAttachment(item.attachment_url!, `${item.title} #${item.id}`)}
                        >
                          View Receipt
                        </button>
                      ) : 'None'}
                    </span>
                  </div>
                </div>

                {item.approvedBy && (
                  <div className="approver-info">
                    <span className="label">Processed by</span>
                    <span className="value">{item.approvedBy.name}</span>
                  </div>
                )}
                
                <div className="card-footer-timestamp">
                  Updated: {new Date(item.updatedAt || item.request_date || 0).toLocaleString()}
                </div>
              </Card>
            ))
          ) : (
            <div className="grid-full">
              <EmptyState 
                title="No expense claims yet"
                description="Your reimbursement history will appear here once you submit a claim."
              />
            </div>
          )}
        </div>
      )}

      {attachmentPreview && (
        <div className="attachment-preview-modal" role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title">
          <div className="attachment-preview-backdrop" onClick={closeAttachmentPreview} />
          <div className="attachment-preview-panel" onClick={(event) => event.stopPropagation()}>
            <div className="attachment-preview-header">
              <div>
                <p className="eyebrow">Receipt preview</p>
                <h3 id="attachment-preview-title">{attachmentPreview.title}</h3>
              </div>
              <Button type="button" variant="ghost" size="small" onClick={closeAttachmentPreview}>
                Close
              </Button>
            </div>

            <div className="attachment-preview-body">
              <img className="attachment-preview-image" src={attachmentPreview.url} alt={attachmentPreview.title} />
            </div>

            <div className="attachment-preview-footer">
              <a className="attachment-preview-link" href={attachmentPreview.url} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
