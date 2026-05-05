import { useEffect, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import Input from '../components/common/Input'
import StatusBadge from '../components/common/StatusBadge'
import { showToast } from '../components/common/ToastContainer'
import { useAuth } from '../hooks/useAuth'
import { hrService, type AttendanceItem } from '../services/hrService'

function formatDate(value?: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

function formatTime(value?: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function toDatetimeLocal(isoString?: string): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

interface TeamAttendanceRecord extends AttendanceItem {
  employee_name?: string
  full_name?: string
  employee_id?: number
  user_id?: number
}

interface EditFormState {
  clockIn: string
  clockOut: string
  status: string
}

export default function AdminAttendance(): JSX.Element {
  const { user } = useAuth()
  const role = String(user?.role || user?.roles || 'staff').toLowerCase()
  const isAdmin = role === 'admin'

  const [items, setItems] = useState<TeamAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  

  const [editForm, setEditForm] = useState<EditFormState>({
    clockIn: '',
    clockOut: '',
    status: '',
  })

  // Load attendance data
  useEffect(() => {
    let active = true

    async function loadAttendance(): Promise<void> {
      try {
        setLoading(true)
        const data = await hrService.getTeamAttendance()
        if (!active) return

        setItems(data)
        setError(null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load attendance records')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (isAdmin) {
      void loadAttendance()
    }

    return () => {
      active = false
    }
  }, [isAdmin])

  function handleEditClick(item: TeamAttendanceRecord): void {
    setEditingId(item.id)
    setEditForm({
      clockIn: toDatetimeLocal(item.clock_in),
      clockOut: toDatetimeLocal(item.clock_out),
      status: item.status || 'present',
    })
  }

  function handleCloseEdit(): void {
    setEditingId(null)
    setEditForm({ clockIn: '', clockOut: '', status: '' })
    setError(null)
  }

  async function handleSubmitEdit(e?: React.FormEvent): Promise<void> {
    e?.preventDefault()
    if (editingId === null) return

    setSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        clock_in: editForm.clockIn ? new Date(editForm.clockIn).toISOString() : undefined,
        clock_out: editForm.clockOut ? new Date(editForm.clockOut).toISOString() : undefined,
        status: editForm.status || 'present',
      }

      // Remove undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key]
        }
      })

      await hrService.updateAttendance(editingId, payload)
      showToast('Attendance record updated successfully.', 'success')
      
      // Refresh the data
      const data = await hrService.getTeamAttendance()
      setItems(data)
      handleCloseEdit()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update attendance record'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const editingItem = items.find((item) => item.id === editingId)

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin Tools</p>
          <h2>Attendance Management</h2>
          <p className="muted">Edit attendance records (clock in/out time, status) for any employee.</p>
        </div>
        <Card className="approval-summary">
          <p className="card-label">Total records</p>
          <p className="card-stat">{items.length}</p>
          <p className="muted">In system</p>
        </Card>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!isAdmin ? (
        <Card>
          <p className="muted">You do not have permission to access this page.</p>
        </Card>
      ) : loading ? (
        <Card>
          <div className="approval-loading">
            <p className="card-title">Loading attendance records...</p>
            <p className="muted">Fetching records for editing.</p>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No attendance records found"
            description="There are no attendance records to edit yet."
          />
        </Card>
      ) : (
        <>
          {editingId !== null && editingItem ? (
            <Card className="edit-modal-card">
              <div className="edit-modal-overlay" onClick={handleCloseEdit} />
              <div className="edit-modal">
                <div className="modal-header">
                  <h3 className="modal-title">
                    Edit Attendance - {editingItem.employee_name || editingItem.full_name || `User #${editingItem.user_id}`}
                  </h3>
                  <button
                    className="modal-close"
                    onClick={handleCloseEdit}
                    type="button"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitEdit} className="edit-form">
                  <div className="form-group">
                    <Input
                      type="datetime-local"
                      label="Clock In"
                      value={editForm.clockIn}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, clockIn: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <Input
                      type="datetime-local"
                      label="Clock Out"
                      value={editForm.clockOut}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, clockOut: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="field">
                      <span className="field-label">Status</span>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                        className="input"
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                      </select>
                    </label>
                  </div>

                  <div className="modal-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCloseEdit}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={submitting}
                      disabled={submitting}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          ) : null}

          <Card className="table-card">
            <div className="table-responsive">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.id}-${item.clock_in}`}>
                      <td>
                        <span className="employee-name">
                          {item.employee_name || item.full_name || `User #${item.user_id || item.id}`}
                        </span>
                      </td>
                      <td>{formatDate(item.date || item.clock_in || item.createdAt)}</td>
                      <td className="time-cell">{formatTime(item.clock_in)}</td>
                      <td className="time-cell">{formatTime(item.clock_out)}</td>
                      <td>
                        <StatusBadge status={item.status || 'unknown'} />
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleEditClick(item)}
                          disabled={editingId !== null}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
