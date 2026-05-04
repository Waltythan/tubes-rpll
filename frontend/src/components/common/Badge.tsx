interface BadgeProps {
  children: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary'
}

export default function Badge({ children, tone = 'neutral' }: BadgeProps): JSX.Element {
  return <span className={['badge', `badge-${tone}`].join(' ')}>{children}</span>
}