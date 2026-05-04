interface StatusBadgeProps {
  status: string
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

export default function StatusBadge({ status, variant = 'neutral' }: StatusBadgeProps): JSX.Element {
  const displayStatus = (status || 'unknown').toLowerCase()
  
  let displayVariant = variant
  if (!variant || variant === 'neutral') {
    if (displayStatus === 'present' || displayStatus === 'approved') {
      displayVariant = 'success'
    } else if (displayStatus === 'late' || displayStatus === 'pending') {
      displayVariant = 'warning'
    } else if (displayStatus === 'absent' || displayStatus === 'rejected') {
      displayVariant = 'danger'
    }
  }

  const classMap: Record<string, string> = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
  }

  return (
    <span className={`badge ${classMap[displayVariant] || classMap.neutral}`}>
      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
    </span>
  )
}
