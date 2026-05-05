interface EmptyStateProps {
  title?: string
  description?: string
}

export default function EmptyState({
  title = 'No data yet',
  description = 'This section will populate once records are available.',
}: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state-shell" role="status" aria-live="polite">
      <div className="empty-state-illustration" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M14 21.5C14 18.4624 16.4624 16 19.5 16H44.5C47.5376 16 50 18.4624 50 21.5V42.5C50 45.5376 47.5376 48 44.5 48H19.5C16.4624 48 14 45.5376 14 42.5V21.5Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M22 26H42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 33H35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 40H30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-copy">{description}</p>
    </div>
  )
}