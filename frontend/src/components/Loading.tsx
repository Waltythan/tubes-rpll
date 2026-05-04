interface LoadingProps {
  fullPage?: boolean
  message?: string
}

export default function Loading({ fullPage = false, message = 'Loading...' }: LoadingProps): JSX.Element {
  const content = (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="spinner" />
      <p className="loading-text">{message}</p>
    </div>
  )

  if (fullPage) {
    return <div className="loading-page">{content}</div>
  }

  return <div className="loading-inline">{content}</div>
}