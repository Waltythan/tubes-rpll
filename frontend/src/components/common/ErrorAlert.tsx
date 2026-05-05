interface ErrorAlertProps {
  error: string | Error | null
  onDismiss?: () => void
}

export default function ErrorAlert({ error, onDismiss }: ErrorAlertProps): JSX.Element | null {
  if (!error) return null

  const errorMessage = error instanceof Error ? error.message : String(error)

  // Detect network errors
  const isNetworkError =
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ERR_')

  const displayMessage = isNetworkError
    ? `Network error: ${errorMessage}. Please check your connection and try again.`
    : errorMessage

  return (
    <div
      className="alert alert-error"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}
      role="alert"
    >
      <div>
        {isNetworkError && <strong>Connection Issue: </strong>}
        {displayMessage}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: 'inherit',
            padding: '0 0.5rem',
          }}
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  )
}
