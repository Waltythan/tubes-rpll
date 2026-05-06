import { useEffect, useMemo, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
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

function getDateKey(date?: string): string {
  if (!date) return ''
  return date.slice(0, 10)
}

interface TeamAttendanceRecord extends AttendanceItem {
  employee_name?: string
  full_name?: string
  employee_id?: number
  user_id?: number
}

interface FilterState {
  startDate: string
  endDate: string
  employeeName: string
}

export default function TeamAttendance(): JSX.Element {
  const { user } = useAuth()
  const role = String(user?.role || user?.roles || 'staff').toLowerCase()
  const isManager = role === 'manager' || role === 'admin'

  const [items, setItems] = useState<TeamAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    employeeName: '',
  })

  // Get today and set default end date
  const today = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])

  // Set default start date to 30 days ago
  const defaultStartDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }, [])

  // Initialize filters with defaults
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      startDate: prev.startDate || defaultStartDate,
      endDate: prev.endDate || today,
    }))
  }, [defaultStartDate, today])

  // Load attendance data
  useEffect(() => {
    let active = true

    async function loadAttendance(): Promise<void> {
      try {
        setLoading(true)
        const params = {
          start_date: filters.startDate || defaultStartDate,
          end_date: filters.endDate || today,
          employee_name: filters.employeeName || undefined,
        }
        const data = await hrService.getTeamAttendance(params)
        if (!active) return

        setItems(data)
        setError(null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load team attendance')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (isManager && filters.startDate && filters.endDate) {
      void loadAttendance()
    }

    return () => {
      active = false
    }
  }, [isManager, filters, defaultStartDate, today])

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const employeeName = (item.employee_name || item.full_name || '').toLowerCase()
      const filterName = filters.employeeName.toLowerCase()

      if (filterName && !employeeName.includes(filterName)) {
        return false
      }

      return true
    })
  }, [items, filters.employeeName])

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: filteredItems.length,
      present: filteredItems.filter((item) => String(item.status || '').toLowerCase() === 'present').length,
      late: filteredItems.filter((item) => String(item.status || '').toLowerCase() === 'late').length,
      absent: filteredItems.filter((item) => String(item.status || '').toLowerCase() === 'absent').length,
    }
  }, [filteredItems])

  const handleFilterChange = (key: keyof FilterState, value: string): void => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleReset = (): void => {
    setFilters({
      startDate: defaultStartDate,
      endDate: today,
      employeeName: '',
    })
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Team Management</p>
          <h2>Team attendance</h2>
          <p className="muted">Monitor your team's attendance records with date range filtering and employee search.</p>
        </div>
        <Card className="approval-summary">
          <p className="card-label">Total records</p>
          <p className="card-stat">{filteredItems.length}</p>
          <p className="muted">In selected range</p>
        </Card>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!isManager ? (
        <Card>
          <p className="muted">You do not have permission to access this page.</p>
        </Card>
      ) : (
        <>
          {/* Filters Section */}
          <Card>
            <div className="filter-section">
              <h3 className="card-title">Filters</h3>
              <div className="filter-grid">
                <div className="filter-group">
                  <label className="field-label">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="filter-input"
                  />
                </div>
                <div className="filter-group">
                  <label className="field-label">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="filter-input"
                  />
                </div>
                <div className="filter-group">
                  <label className="field-label">Employee Name</label>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={filters.employeeName}
                    onChange={(e) => handleFilterChange('employeeName', e.target.value)}
                    className="filter-input"
                  />
                </div>
              </div>
              <div className="filter-actions">
                <Button variant="secondary" onClick={handleReset}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Statistics Section */}
          {!loading && (
            <div className="stats-grid">
              <Card className="stat-card stat-card-total">
                <div className="stat-icon">📊</div>
                <p className="card-label">Total Records</p>
                <p className="card-stat">{stats.total}</p>
              </Card>
              <Card className="stat-card stat-card-present">
                <div className="stat-icon">✓</div>
                <p className="card-label">Present</p>
                <p className="card-stat">{stats.present}</p>
              </Card>
              <Card className="stat-card stat-card-late">
                <div className="stat-icon">⏱</div>
                <p className="card-label">Late</p>
                <p className="card-stat">{stats.late}</p>
              </Card>
              <Card className="stat-card stat-card-absent">
                <div className="stat-icon">✗</div>
                <p className="card-label">Absent</p>
                <p className="card-stat">{stats.absent}</p>
              </Card>
            </div>
          )}

          {/* Main Content Section */}
          {loading ? (
            <Card>
              <div className="approval-loading">
                <p className="card-title">Loading attendance records...</p>
                <p className="muted">Fetching your team's attendance data.</p>
              </div>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card>
              <EmptyState
                title="No attendance records found"
                description="No attendance records match the selected filters. Try adjusting the date range or search criteria."
              />
            </Card>
          ) : (
            <Card className="table-card">
              <div className="table-responsive">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={`${item.id}-${item.clock_in}`}>
                        <td>
                          <span className="employee-name" title={item.user?.email}>
                            {item.user?.name || item.employee_name || item.full_name || 'Unknown User'}
                          </span>
                        </td>
                        <td>{formatDate(item.date || item.clock_in || item.createdAt)}</td>
                        <td className="time-cell">{formatTime(item.clock_in)}</td>
                        <td className="time-cell">{formatTime(item.clock_out)}</td>
                        <td>
                          <StatusBadge status={item.status || 'unknown'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
