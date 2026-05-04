import type { AttendanceItem } from '../../services/hrService'
import StatusBadge from '../common/StatusBadge'

interface AttendanceTableProps {
  items: AttendanceItem[]
  loading: boolean
}

function formatTime(isoString: string | undefined): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return isoString.split('T')[1] || '—'
  }
}

function formatDate(isoString: string | undefined): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoString.split('T')[0] || '—'
  }
}

export default function AttendanceTable({ items, loading }: AttendanceTableProps): JSX.Element {
  if (loading) {
    return (
      <div className="table-container">
        <div className="table-skeleton" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="table-skeleton-row" key={index}>
              <span className="skeleton skeleton-date" />
              <span className="skeleton skeleton-time" />
              <span className="skeleton skeleton-time" />
              <span className="skeleton skeleton-badge" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="table-container">
        <div className="table-empty">No attendance yet.</div>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead className="table-head">
          <tr>
            <th className="table-header">Date</th>
            <th className="table-header">Clock In</th>
            <th className="table-header">Clock Out</th>
            <th className="table-header">Status</th>
          </tr>
        </thead>
        <tbody className="table-body">
          {items.map((item, index) => (
            <tr key={item.id || index} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
              <td className="table-cell">
                <strong>{formatDate(item.date || item.clock_in || item.createdAt)}</strong>
              </td>
              <td className="table-cell">{formatTime(item.clock_in)}</td>
              <td className="table-cell">{formatTime(item.clock_out)}</td>
              <td className="table-cell">
                <StatusBadge status={item.status || 'unknown'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
