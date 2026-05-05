import { useMemo, useState, type FormEvent } from 'react'
import Button from '../components/common/Button'
import Card from '../components/Card'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { useAuth } from '../hooks/useAuth'
import { hrService } from '../services/hrService'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await hrService.generatePayroll(month, parsedYear)
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
          <p className="eyebrow">Admin Tools</p>
          <h2>Payroll Generation</h2>
          <p className="muted">Generate payroll for a specific month and year directly from the frontend.</p>
        </div>
        <Card className="approval-summary">
          <p className="card-label">Target period</p>
          <p className="card-stat">{month}/{year}</p>
          <p className="muted">Ready to generate</p>
        </Card>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!isAdmin ? (
        <Card>
          <p className="muted">You do not have permission to access this page.</p>
        </Card>
      ) : (
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
      )}
    </div>
  )
}
