import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { useLoading } from '../hooks/useLoading'
import { hrService, type PayrollGenerationResult } from '../services/hrService'

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

export default function AdminPayroll(): JSX.Element {
  const navigate = useNavigate()
  const { withLoading } = useLoading()
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())
  const [result, setResult] = useState<PayrollGenerationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(): Promise<void> {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      setError('Please select a valid month')
      return
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError('Please enter a valid year')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await withLoading(() => hrService.generatePayroll(month, year))
      setResult(response)
      showToast('Payroll generated successfully', 'success')
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
          <h2>Payroll generation</h2>
          <p className="muted">Generate payroll for all eligible users in one click.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/payroll')}>
          View payroll list
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
            <Button type="submit" variant="primary" loading={loading}>
              Generate Payroll
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="page-heading" style={{ marginBottom: '16px' }}>
          <div>
            <p className="eyebrow">Latest result</p>
            <h3 style={{ margin: 0 }}>Generated payroll batch</h3>
          </div>
          {result && <Badge tone="success">Generated</Badge>}
        </div>

        {result ? (
          <div className="stacked-cards">
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

            <div className="table-container">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header">User ID</th>
                    <th className="table-header">Payroll ID</th>
                    <th className="table-header">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {result.generatedPayrolls.map((row) => (
                    <tr key={row.payrollId}>
                      <td className="table-cell">{row.userId}</td>
                      <td className="table-cell">{row.payrollId}</td>
                      <td className="table-cell">{formatCurrency(row.netSalary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No payroll generated yet"
            description="Select a month and year, then generate payroll for the batch."
          />
        )}
      </Card>
    </div>
  )
}