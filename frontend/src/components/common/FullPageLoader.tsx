import { useLoading } from '../../hooks/useLoading'
import LoadingSpinner from './LoadingSpinner'

interface FullPageLoaderProps {
  message?: string
  show?: boolean
}

export default function FullPageLoader({ message = 'Loading...', show }: FullPageLoaderProps): JSX.Element | null {
  const { loadingCount } = useLoading()
  const shouldShow = typeof show === 'boolean' ? show : loadingCount > 0

  if (!shouldShow) {
    return null
  }

  return (
    <div className="full-page-loader" role="status" aria-live="polite">
      <div className="full-page-loader-card card-surface">
        <LoadingSpinner />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  )
}