import { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { hrService, type UserItem } from '../services/hrService'

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

function getUserId(user: UserItem): number | null {
  const raw = user.user_id ?? user.id
  return typeof raw === 'number' ? raw : null
}

function getUserLabel(user: UserItem): string {
  return user.name || user.full_name || user.fullName || user.email || 'Unknown User'
}

type AdjustmentType = 'deduction' | 'allowance'

interface FormState {
  type: AdjustmentType
  userId: string
  month: number
  year: number
  amount: string
  description: string
  submitting: boolean
  error: string | null
  success: string | null
}

export default function AdminPenalty(): JSX.Element {
  const now = new Date()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [form, setForm] = useState<FormState>({
    type: 'deduction',
    userId: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    amount: '',
    description: '',
    submitting: false,
    error: null,
    success: null,
  })

  useEffect(() => {
    let active = true
    async function loadUsers(): Promise<void> {
      try {
        const data = await hrService.getUsers()
        if (!active) return
        setUsers(data || [])
      } catch (err: unknown) {
        if (!active) return
        setForm((p) => ({ ...p, error: err instanceof Error ? err.message : 'Failed to load users' }))
      } finally {
        if (active) setLoadingUsers(false)
      }
    }
    void loadUsers()
    return () => { active = false }
  }, [])

  const eligibleUsers = users.filter((u) => {
    const role = String(u.role || u.roles || '').toLowerCase()
    return role === 'staff' || role === 'manager'
  })

  function setType(type: AdjustmentType): void {
    setForm((p) => ({ ...p, type, error: null, success: null }))
  }

  function resetForm(): void {
    setForm((p) => ({ ...p, userId: '', amount: '', description: '', error: null, success: null }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const userId = Number(form.userId)
    const amount = Number(form.amount)

    if (!userId || userId <= 0) { setForm((p) => ({ ...p, error: 'Please select an employee.' })); return }
    if (!amount || amount <= 0) { setForm((p) => ({ ...p, error: 'Amount must be greater than 0.' })); return }
    if (!form.description.trim()) { setForm((p) => ({ ...p, error: 'Description is required.' })); return }

    setForm((p) => ({ ...p, submitting: true, error: null, success: null }))
    try {
      await hrService.addManualAdjustment({
        userId,
        month: form.month,
        year: form.year,
        amount,
        type: form.type,
        description: form.description.trim(),
      })

      const selectedUser = eligibleUsers.find((u) => getUserId(u) === userId)
      const userName = selectedUser ? getUserLabel(selectedUser) : `User #${userId}`
      const periodLabel = `${monthOptions[form.month - 1].label} ${form.year}`
      const typeLabel = form.type === 'allowance' ? 'Allowance' : 'Penalty'
      const successMsg = `${typeLabel} of Rp ${amount.toLocaleString('id-ID')} applied to ${userName} for ${periodLabel}.`

      showToast(`${typeLabel} applied successfully.`, 'success')
      setForm((p) => ({ ...p, submitting: false, success: successMsg, amount: '', description: '', userId: '' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add adjustment'
      setForm((p) => ({ ...p, submitting: false, error: msg }))
      showToast(msg, 'error')
    }
  }

  const isAllowance = form.type === 'allowance'

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin · Payroll</p>
          <h2>Payroll Adjustments</h2>
          <p className="muted">
            Manually add an allowance (bonus, transport, etc.) or a penalty (damage, misconduct, etc.)
            for any employee. A payroll record is created automatically if one doesn't exist yet.
          </p>
        </div>
      </div>

      <Card>
        {/* Type toggle */}
        <div className="adjustment-type-toggle">
          <button
            type="button"
            className={`adjustment-type-btn ${!isAllowance ? 'active-deduction' : ''}`}
            onClick={() => setType('deduction')}
          >
            ⚠ Penalty (Deduction)
          </button>
          <button
            type="button"
            className={`adjustment-type-btn ${isAllowance ? 'active-allowance' : ''}`}
            onClick={() => setType('allowance')}
          >
            ✦ Allowance (Addition)
          </button>
        </div>

        {/* Context hint */}
        <p className="muted" style={{ margin: '0 0 16px', fontSize: '0.85rem' }}>
          {isAllowance
            ? 'An allowance will increase the employee\'s net salary for the selected period (e.g. transport, meal, or performance bonus).'
            : 'A penalty will reduce the employee\'s net salary for the selected period (e.g. equipment damage, misconduct, or tardiness).'}
        </p>

        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          <ErrorAlert error={form.error} onDismiss={() => setForm((p) => ({ ...p, error: null }))} />

          {form.success && (
            <div className="alert alert-success">
              ✓ {form.success}
              <button
                type="button"
                onClick={resetForm}
                style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
              >
                Add another
              </button>
            </div>
          )}

          {/* Employee */}
          <label className="field">
            <span className="field-label">Employee</span>
            {loadingUsers ? (
              <p className="muted">Loading employees...</p>
            ) : (
              <select
                className="input"
                value={form.userId}
                onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
                disabled={form.submitting}
              >
                <option value="">— Select employee —</option>
                {eligibleUsers.map((u) => {
                  const id = getUserId(u)
                  return id != null ? (
                    <option key={id} value={id}>
                      {getUserLabel(u)}
                    </option>
                  ) : null
                })}
              </select>
            )}
          </label>

          {/* Period */}
          <div className="grid grid-2">
            <label className="field">
              <span className="field-label">Month</span>
              <select
                className="input"
                value={form.month}
                onChange={(e) => setForm((p) => ({ ...p, month: Number(e.target.value) }))}
                disabled={form.submitting}
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
                disabled={form.submitting}
              />
            </label>
          </div>

          {/* Amount */}
          <label className="field">
            <span className="field-label">Amount (IDR)</span>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="e.g. 200000"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              disabled={form.submitting}
            />
          </label>

          {/* Description */}
          <label className="field">
            <span className="field-label">Description</span>
            <input
              className="input"
              type="text"
              placeholder={isAllowance ? 'e.g. Transport allowance, Performance bonus' : 'e.g. Damaged equipment, Misconduct'}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              disabled={form.submitting}
            />
          </label>

          <div className="form-actions">
            <Button
              type="submit"
              variant={isAllowance ? 'primary' : 'danger'}
              loading={form.submitting}
              disabled={form.submitting || loadingUsers}
            >
              {form.submitting
                ? 'Applying...'
                : isAllowance
                ? 'Add Allowance'
                : 'Apply Penalty'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
