import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { useAuth } from '../hooks/useAuth'
import { hrService, type PayrollAdjustmentItem, type PayrollItem } from '../services/hrService'

type AdjustmentFormType = 'bonus' | 'deduction'

interface PayrollViewItem extends PayrollItem {
  items?: PayrollAdjustmentItem[]
}

interface AdjustmentFormState {
  type: AdjustmentFormType
  amount: string
  description: string
  reference: string
}

function getMonthOptions(): Array<{ value: number; label: string }> {
  return [
    { value: 1, label: '1 - January' },
    { value: 2, label: '2 - February' },
    { value: 3, label: '3 - March' },
    { value: 4, label: '4 - April' },
    { value: 5, label: '5 - May' },
    { value: 6, label: '6 - June' },
    { value: 7, label: '7 - July' },
    { value: 8, label: '8 - August' },
    { value: 9, label: '9 - September' },
    { value: 10, label: '10 - October' },
    { value: 11, label: '11 - November' },
    { value: 12, label: '12 - December' },
  ]
}

export default function PayrollAdmin(): JSX.Element {
  const { user } = useAuth()
  const role = String(user?.role || user?.roles || 'staff').toLowerCase()
  const isAdmin = role === 'admin'

  const currentDate = useMemo(() => new Date(), [])
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1)
  const [year, setYear] = useState<string>(String(currentDate.getFullYear()))
  const [payrolls, setPayrolls] = useState<PayrollViewItem[]>([])
  const [payrollLoading, setPayrollLoading] = useState(true)
  const [payrollError, setPayrollError] = useState<string | null>(null)
  const [activePayroll, setActivePayroll] = useState<PayrollViewItem | null>(null)
  const [savingAdjustment, setSavingAdjustment] = useState(false)
  const [adjustmentsByPayroll, setAdjustmentsByPayroll] = useState<Record<number, PayrollAdjustmentItem[]>>({})
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>({
    type: 'bonus',
    amount: '',
    description: '',
    reference: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPayrolls(): Promise<void> {
      try {
        setPayrollLoading(true)
        const data = await hrService.payroll()
        if (!active) return

        setPayrolls((data || []) as PayrollViewItem[])
        setPayrollError(null)
      } catch (err: unknown) {
        if (active) {
          setPayrollError(err instanceof Error ? err.message : 'Failed to load payroll data')
        }
      } finally {
        if (active) {
          setPayrollLoading(false)
        }
      }
    }

    if (isAdmin) {
      void loadPayrolls()
    } else {
      setPayrollLoading(false)
    }

    return () => {
      active = false
    }
  }, [isAdmin])

  async function refreshPayrolls(): Promise<void> {
    const data = await hrService.payroll()
    setPayrolls((data || []) as PayrollViewItem[])
  }

  function openAdjustmentModal(payroll: PayrollViewItem): void {
    setActivePayroll(payroll)
    setAdjustmentForm({
      type: 'bonus',
      amount: '',
      description: '',
      reference: '',
    })
    setError(null)
  }

  function closeAdjustmentModal(): void {
    setActivePayroll(null)
    setAdjustmentForm({
      type: 'bonus',
      amount: '',
      description: '',
      reference: '',
    })
  }

  function getPayrollItems(payroll: PayrollViewItem): PayrollAdjustmentItem[] {
    return [...(payroll.items || []), ...(adjustmentsByPayroll[payroll.id] || [])]
  }

  function getDisplayType(type?: string): string {
    return type === 'deduction' ? 'Deduction' : 'Bonus'
  }

  function getBadgeTone(type?: string): 'success' | 'danger' {
    return type === 'deduction' ? 'danger' : 'success'
  }

  async function handleSubmitAdjustment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!activePayroll) {
      setError('Select a payroll first.')
      return
    }

    const amountValue = Number(adjustmentForm.amount)
    if (!adjustmentForm.type) {
      setError('Please select an adjustment type.')
      return
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Amount must be greater than 0.')
      return
    }
    if (!adjustmentForm.description.trim()) {
      setError('Description is required.')
      return
    }

    const payrollId = activePayroll.id
    setSavingAdjustment(true)
    setError(null)

    try {
      const created = await hrService.addPayrollItem(payrollId, {
        type: adjustmentForm.type === 'bonus' ? 'allowance' : 'deduction',
        amount: amountValue,
        description: adjustmentForm.description.trim(),
        reference: adjustmentForm.reference.trim() || undefined,
      })

      setAdjustmentsByPayroll((current) => {
        const currentItems = current[payrollId] || []
        return {
          ...current,
          [payrollId]: [...currentItems, created],
        }
      })

      await refreshPayrolls()
      showToast('Adjustment added successfully', 'success')
      closeAdjustmentModal()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add payroll adjustment'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSavingAdjustment(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const parsedYear = Number(year)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      setError('Please choose a valid month.')
      return
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      setError('Please enter a valid year.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await hrService.generatePayroll({ month, year: parsedYear })
      showToast('Payroll generated successfully', 'success')
      await refreshPayrolls()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate payroll'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin Tools</p>
          <h2>Payroll Management</h2>
          <p className="muted">Generate payroll and manage bonus or deduction adjustments from the frontend.</p>
        </div>
        <Card className="approval-summary">
          <p className="card-label">Target period</p>
          <p className="card-stat">{month}/{year}</p>
          <p className="muted">Ready to generate</p>
        </Card>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <ErrorAlert error={payrollError} onDismiss={() => setPayrollError(null)} />

      {!isAdmin ? (
        <Card>
          <p className="muted">You do not have permission to access this page.</p>
        </Card>
      ) : (
        <>
          <Card>
            <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: '520px' }}>
              <label className="field">
                <span className="field-label">Month</span>
                <select
                  className="input"
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                >
                  {getMonthOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Year</span>
                <input
                  className="input"
                  type="number"
                  min={2000}
                  max={2100}
                  step={1}
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  placeholder="2026"
                />
              </label>

              <Button type="submit" loading={loading} disabled={loading}>
                Generate Payroll
              </Button>
            </form>
          </Card>

          {payrollLoading ? (
            <Card>
              <p className="card-title">Loading payroll records...</p>
              <p className="muted">Fetching payroll data for adjustment management.</p>
            </Card>
          ) : payrolls.length === 0 ? (
            <Card>
              <EmptyState title="No payroll records found" description="Generate payroll first to manage adjustments." />
            </Card>
          ) : (
            <div className="grid grid-2">
              {payrolls.map((payroll) => {
                const payrollItems = getPayrollItems(payroll)
                const totalAllowance = Number(payroll.total_allowance || 0)
                const totalDeduction = Number(payroll.total_deduction || 0)

                return (
                  <Card key={payroll.id}>
                    <div className="approval-card-header">
                      <div>
                        <p className="card-title">Payroll #{payroll.id}</p>
                        <h3>{payroll.status || 'generated'}</h3>
                      </div>
                      <div className="prominent-status">
                        <span className="badge badge-primary">{payroll.period_start || '-'} to {payroll.period_end || '-'}</span>
                      </div>
                    </div>

                    <div className="approval-meta-grid">
                      <div>
                        <span className="attendance-stat-label">Bonus / allowance</span>
                        <strong>{totalAllowance}</strong>
                      </div>
                      <div>
                        <span className="attendance-stat-label">Deduction</span>
                        <strong>{totalDeduction}</strong>
                      </div>
                      <div>
                        <span className="attendance-stat-label">Net salary</span>
                        <strong>{payroll.net_salary ?? '-'}</strong>
                      </div>
                      <div>
                        <span className="attendance-stat-label">Adjustments</span>
                        <strong>{payrollItems.length}</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <p className="card-label">Payroll items</p>
                      {payrollItems.length === 0 ? (
                        <p className="muted">No adjustments yet.</p>
                      ) : (
                        <div className="stacked-cards" style={{ gap: '10px' }}>
                          {payrollItems.map((item, index) => {
                            const rawType = String(item.type || 'allowance').toLowerCase()
                            const displayType = getDisplayType(rawType)
                            const tone = getBadgeTone(rawType)

                            return (
                              <div key={item.id || `${payroll.id}-${index}`} className="status-row">
                                <div>
                                  <strong>{displayType}</strong>
                                  <div className="muted" style={{ marginTop: '4px' }}>
                                    {item.description || 'No description'}
                                  </div>
                                  {item.reference_id ? (
                                    <div className="muted" style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                                      Ref: {item.reference_id}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="prominent-status">
                                  <span className={`badge badge-${tone}`}>{displayType}</span>
                                  <strong>{item.amount ?? '-'}</strong>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="approval-actions" style={{ justifyContent: 'space-between', marginTop: '18px' }}>
                      <Button variant="secondary" onClick={() => openAdjustmentModal(payroll)}>
                        Add Adjustment
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {activePayroll ? (
            <div className="edit-modal-card">
              <div className="edit-modal-overlay" onClick={closeAdjustmentModal} />
              <div className="edit-modal">
                <div className="modal-header">
                  <h3 className="modal-title">Add Adjustment for Payroll #{activePayroll.id}</h3>
                  <button className="modal-close" onClick={closeAdjustmentModal} type="button" aria-label="Close">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitAdjustment} className="edit-form">
                  <label className="field">
                    <span className="field-label">Type</span>
                    <select
                      className="input"
                      value={adjustmentForm.type}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, type: event.target.value as AdjustmentFormType }))}
                    >
                      <option value="bonus">Bonus</option>
                      <option value="deduction">Deduction</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="field-label">Amount</span>
                    <input
                      className="input"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={adjustmentForm.amount}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, amount: event.target.value }))}
                      placeholder="100000"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Description</span>
                    <textarea
                      className="input textarea"
                      value={adjustmentForm.description}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Performance bonus / late deduction"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Reference</span>
                    <input
                      className="input"
                      value={adjustmentForm.reference}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, reference: event.target.value }))}
                      placeholder="Optional reference"
                    />
                  </label>

                  <div className="modal-actions">
                    <Button type="button" variant="secondary" onClick={closeAdjustmentModal} disabled={savingAdjustment}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={savingAdjustment} disabled={savingAdjustment}>
                      Save Adjustment
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
