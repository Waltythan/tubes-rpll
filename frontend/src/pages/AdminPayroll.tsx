import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { useLoading } from '../hooks/useLoading'
import { hrService, type PayrollGenerationResult, type PayrollItem } from '../services/hrService'
import PayrollCard from '../components/PayrollCard'

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const

function formatPeriod(start: string, end: string): string {
  return `${start} to ${end}`
}

export default function AdminPayroll(): JSX.Element {
  const { withLoading } = useLoading()
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())
  const [result, setResult] = useState<PayrollGenerationResult | null>(null)
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([])
  const [loadingPayrolls, setLoadingPayrolls] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadPayrolls(): Promise<void> {
      try {
        setLoadingPayrolls(true)
        const data = await hrService.getAllPayrolls()
        const data = await hrService.payrollAll()
        if (!active) return
        setPayrolls(data || [])
      } catch (err: unknown) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load payroll records')
      } finally {
        if (active) setLoadingPayrolls(false)
      }
    }
    void loadPayrolls()
    return () => { active = false }
  }, [])

  async function refreshPayrolls(): Promise<void> {
    const data = await hrService.getAllPayrolls()
    const data = await hrService.payrollAll()
    setPayrolls(data || [])
  }

  async function handleGenerate(): Promise<void> {
    if (!Number.isInteger(month) || month < 1 || month > 12) { setError('Please select a valid month'); return }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) { setError('Please enter a valid year'); return }
    const confirmed = window.confirm(`Generate payroll for ${monthOptions[month - 1].label} ${year}?`)
    if (!confirmed) return
    try {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)
      const response = await withLoading(() => hrService.generatePayroll({ month, year }))
      setResult(response)
      setSuccessMessage(`Payroll generated for ${response.payrollCount} employees.`)
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
          <p className="eyebrow">Admin</p>
          <h2>Payroll Management</h2>
          <p className="muted">Generate monthly payroll batches and review all employee salary records.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void refreshPayrolls()} disabled={loading || loadingPayrolls}>
          Refresh
        </Button>
      </div>

      {/* Generate Form */}
      <Card>
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void handleGenerate() }}>
          <div>
            <p className="eyebrow">Batch operation</p>
            <h3 style={{ margin: '4px 0 4px' }}>Generate Monthly Payroll</h3>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
              Calculates salary for all active staff and managers for the selected period.
            </p>
          </div>

          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <div className="grid grid-2">
            <label className="field">
              <span className="field-label">Month</span>
              <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))} disabled={loading}>
                {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Year</span>
              <input className="input" type="number" min={2000} max={2100} value={year}
                onChange={(e) => setYear(Number(e.target.value))} disabled={loading} />
            </label>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={loading} disabled={loading || loadingPayrolls}>
              {loading ? 'Generating...' : 'Generate Payroll'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Payroll Records */}
      <Card>
        <div className="page-heading" style={{ marginBottom: '24px' }}>
          <div>
            <p className="eyebrow">Records</p>
            <h3 style={{ margin: 0 }}>Employee Salary Breakdown</h3>
          </div>
          {(loading || loadingPayrolls) && <Badge tone="warning">Updating</Badge>}
        </div>

        {loadingPayrolls ? (
          <div className="loading-state" style={{ padding: '40px', textAlign: 'center' }}>
            <p className="muted">Loading payroll records...</p>
          </div>
        ) : payrolls.length === 0 && !result ? (
          <EmptyState
            title="No payroll records yet"
            description="Generate a monthly payroll batch, or use 'Payroll Adjustments' to create one automatically."
          />
        ) : (
          <div className="stacked-cards">
            {result && (
              <Card style={{ borderLeft: '4px solid var(--success)', background: '#f0fdf4' }}>
                <div className="section-header">
                  <div>
                    <p className="eyebrow" style={{ color: '#15803d' }}>Latest Action</p>
                    <h3 style={{ margin: 0 }}>Batch Generated Successfully</h3>
                  </div>
                  <Badge tone="success">Success</Badge>
                </div>
                <div className="grid grid-3" style={{ marginTop: '16px' }}>
                  <div>
                    <p className="muted small uppercase" style={{ fontWeight: 700, fontSize: '0.65rem' }}>Period</p>
                    <p style={{ fontWeight: 600 }}>{formatPeriod(result.periodStart, result.periodEnd)}</p>
                  </div>
                  <div>
                    <p className="muted small uppercase" style={{ fontWeight: 700, fontSize: '0.65rem' }}>Employees</p>
                    <p style={{ fontWeight: 600 }}>{result.payrollCount}</p>
                  </div>
                </div>
              </Card>
            )}

            {payrolls.length > 0 && (
              <div className="grid grid-2">
                {payrolls.map((item) => (
                  <PayrollCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}