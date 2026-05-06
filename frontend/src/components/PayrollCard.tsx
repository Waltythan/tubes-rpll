import { useEffect, useState } from 'react'
import Card from './Card'
import Badge from './common/Badge'
import { hrService, type PayrollItem } from '../services/hrService'

interface AdjustmentItem {
  amount: number
  description: string
  date?: string
}

interface PayrollBreakdown {
  baseSalary: number
  incentives: AdjustmentItem[]
  penalties: AdjustmentItem[]
  summary: { totalIncentives: number; totalPenalties: number }
  totalSalary: number
}

function formatValue(value?: number | string): string {
  if (value === undefined || value === null || value === '') return '—'
  const amount = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function PayrollCard({ item }: { item: PayrollItem }) {
  const [breakdown, setBreakdown] = useState<PayrollBreakdown | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchBreakdown() {
      try {
        setLoading(true)
        const data = await hrService.getBreakdown(item.id)
        if (active) setBreakdown(data)
      } catch (err) {
        console.error('Failed to fetch breakdown', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchBreakdown()
    return () => { active = false }
  }, [item.id])

  const dateRange = item.period_start && item.period_end
    ? `${new Date(item.period_start).toLocaleDateString([], { month: 'short', day: 'numeric' })} — ${new Date(item.period_end).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '—'

  return (
    <Card className="payroll-detail-card">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--primary)' }}>Employee</p>
          <h3 style={{ margin: 0 }}>{item.user?.name || item.user?.email || `User #${item.user_id}`}</h3>
          <p className="muted" style={{ fontSize: '0.85rem' }}>{dateRange}</p>
        </div>
        <Badge tone={String(item.status || '').toLowerCase() === 'generated' ? 'success' : 'warning'}>
          {item.status || 'generated'}
        </Badge>
      </div>

      <div className="payroll-base-salary">
        <span style={{ color: '#64748b', fontWeight: 500 }}>💰 Base Salary</span>
        <strong style={{ color: '#1e293b' }}>{formatValue(item.base_salary || breakdown?.baseSalary)}</strong>
      </div>

      <div className="payroll-breakdown-sections">
        {/* Incentives */}
        <div className="breakdown-section">
          <p className="section-label allowance">➕ Allowances</p>
          {loading ? (
            <p className="muted" style={{ fontSize: '0.8rem', padding: '10px 0' }}>Loading details...</p>
          ) : breakdown?.incentives && breakdown.incentives.length > 0 ? (
            <div className="adjustment-list">
              {breakdown.incentives.map((adj, i) => (
                <div key={i} className="adjustment-item incentive">
                  <div className="adj-info">
                    <span className="adj-desc">{adj.description}</span>
                    {adj.date && <span className="adj-date">{formatDate(adj.date)}</span>}
                  </div>
                  <span className="adj-amount">{formatValue(adj.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '0.8rem', padding: '10px 0' }}>No allowances</p>
          )}
        </div>

        {/* Penalties */}
        <div className="breakdown-section">
          <p className="section-label penalty">➖ Penalties</p>
          {loading ? (
            <p className="muted" style={{ fontSize: '0.8rem', padding: '10px 0' }}>Loading details...</p>
          ) : breakdown?.penalties && breakdown.penalties.length > 0 ? (
            <div className="adjustment-list">
              {breakdown.penalties.map((adj, i) => (
                <div key={i} className="adjustment-item deduction">
                  <div className="adj-info">
                    <span className="adj-desc">{adj.description}</span>
                    {adj.date && <span className="adj-date">{formatDate(adj.date)}</span>}
                  </div>
                  <span className="adj-amount">-{formatValue(adj.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '0.8rem', padding: '10px 0' }}>No penalties</p>
          )}
        </div>
      </div>

      <div className="payroll-totals">
        <div className="total-row">
          <span className="muted">Total Allowance</span>
          <span style={{ color: '#059669', fontWeight: 600 }}>{formatValue(item.total_allowance)}</span>
        </div>
        <div className="total-row">
          <span className="muted">Total Deduction</span>
          <span style={{ color: '#dc2626', fontWeight: 600 }}>-{formatValue(item.total_deduction)}</span>
        </div>
        <div className="net-salary-row">
          <span>NET SALARY</span>
          <span className="net-amount">{formatValue(item.net_salary)}</span>
        </div>
      </div>
    </Card>
  )
}
