import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { useLoading } from '../hooks/useLoading'
import { hrService, type PayrollGenerationResult, type PayrollItem } from '../services/hrService'

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatPeriod(start: string, end: string): string {
  return `${start} to ${end}`
}

function formatValue(value?: number | string): string {
  if (value === undefined || value === null || value === '') {
    return '—'
  }

  const amount = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(amount)) {
    return String(value)
  }

  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDateRange(item: PayrollItem): string {
  const start = item.period_start ? new Date(item.period_start).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
  const end = item.period_end ? new Date(item.period_end).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
  return `${start} to ${end}`
}

export default function AdminPayroll(): JSX.Element {
  const navigate = useNavigate()
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
        const data = await hrService.payrollAll()
        if (!active) return

        setPayrolls(data || [])
      } catch (err: unknown) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load payroll records')
      } finally {
        if (active) {
          setLoadingPayrolls(false)
        }
      }
    }

    void loadPayrolls()

    return () => {
      active = false
    }
  }, [])

  async function refreshPayrolls(): Promise<void> {
    const data = await hrService.payrollAll()
    setPayrolls(data || [])
  }

  async function handleGenerate(): Promise<void> {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      setError('Please select a valid month')
      return
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError('Please enter a valid year')
      return
    }

    const confirmed = window.confirm(`Generate payroll for ${monthOptions[month - 1].label} ${year}?`)
    if (!confirmed) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)
      const response = await withLoading(() => hrService.generatePayroll({ month, year }))
      setResult(response)
      setSuccessMessage(`Payroll generated for ${response.payrollCount} users.`)
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

  function getSummary(item: PayrollItem): string {
    const allowance = formatValue(item.total_allowance)
    const deduction = formatValue(item.total_deduction)
    const net = formatValue(item.net_salary)
    return `Allowance ${allowance} · Deduction ${deduction} · Net ${net}`
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Payroll Management</h2>
          <p className="muted">Generate payroll batches and review recent payroll summaries in one place.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void refreshPayrolls()} disabled={loading || loadingPayrolls}>
          Refresh records
        </Button>
      </div>

      <Card>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            void handleGenerate()
          }}
        >
          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <div className="grid grid-2">
            <label className="field">
              <span className="field-label">Month</span>
              <select
                className="input"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                disabled={loading}
              >
                {monthOptions.map((option) => (
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
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                disabled={loading}
              />
            </label>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={loading} disabled={loading || loadingPayrolls}>
              {loading ? 'Generating...' : 'Generate Payroll'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="page-heading" style={{ marginBottom: '16px' }}>
          <div>
            <p className="eyebrow">Recent records</p>
            <h3 style={{ margin: 0 }}>Payroll history</h3>
          </div>
          {(loading || loadingPayrolls) && <Badge tone="warning">Loading</Badge>}
        </div>

        {loadingPayrolls ? (
          <div className="stacked-cards">
            <Card>
              <p className="card-title">Loading payroll records...</p>
              <p className="muted">Fetching the latest payroll summary.</p>
            </Card>
          </div>
        ) : payrolls.length === 0 && !result ? (
          <EmptyState
            title="No payroll generated yet"
            description="Use the form above to generate the first payroll batch."
          />
        ) : (
          <div className="stacked-cards">
            {result && (
              <Card>
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Latest generated batch</p>
                    <h3>Batch summary</h3>
                  </div>
                  <Badge tone="success">Generated</Badge>
                </div>

                <div className="grid grid-3">
                  <Card>
                    <p className="card-label">Period</p>
                    <p className="card-value" style={{ fontSize: '1rem' }}>{formatPeriod(result.periodStart, result.periodEnd)}</p>
                  </Card>
                  <Card>
                    <p className="card-label">Payroll count</p>
                    <p className="card-value" style={{ fontSize: '1rem' }}>{result.payrollCount}</p>
                  </Card>
                  <Card>
                    <p className="card-label">Status</p>
                    <p className="card-value" style={{ fontSize: '1rem' }}>Generated</p>
                  </Card>
                </div>
              </Card>
            )}

            {payrolls.length > 0 && (
              <div className="grid grid-2">
                {payrolls.map((item) => (
                  <Card key={item.id}>
                    <div className="section-header">
                      <div>
                        <p className="card-title">Payroll #{item.id}</p>
                        <h3>{formatDateRange(item)}</h3>
                      </div>
                      <Badge tone={String(item.status || '').toLowerCase() === 'generated' ? 'success' : 'warning'}>{item.status || 'generated'}</Badge>
                    </div>

                    <div className="stacked-cards">
                      <div className="status-row">
                        <span>Total allowance</span>
                        <strong>{formatValue(item.total_allowance)}</strong>
                      </div>
                      <div className="status-row">
                        <span>Total deduction</span>
                        <strong>{formatValue(item.total_deduction)}</strong>
                      </div>
                      <div className="status-row">
                        <span>Net salary</span>
                        <strong>{formatValue(item.net_salary)}</strong>
                      </div>
                      <p className="muted" style={{ margin: 0 }}>{getSummary(item)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}