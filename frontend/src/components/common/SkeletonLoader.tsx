interface SkeletonLoaderProps {
  lines?: number
  height?: number
  className?: string
}

export default function SkeletonLoader({ lines = 3, height = 16, className = '' }: SkeletonLoaderProps): JSX.Element {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            height: `${height}px`,
            marginBottom: i < lines - 1 ? '0.75rem' : '0',
            backgroundColor: 'var(--color-skeleton, #e0e0e0)',
            borderRadius: '4px',
            animation: 'skeleton-loading 1s infinite',
          }}
        />
      ))}
    </div>
  )
}
