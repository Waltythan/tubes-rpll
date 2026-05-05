import type { ButtonHTMLAttributes, ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

export default function Button({ children, variant = 'primary', size = 'medium', fullWidth = false, loading = false, disabled = false, className = '', ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={[
        'btn',
        variant === 'primary' ? 'btn-primary' : '',
        variant === 'secondary' ? 'btn-secondary' : '',
        variant === 'ghost' ? 'btn-ghost' : '',
        size === 'small' ? 'btn-small' : '',
        size === 'large' ? 'btn-large' : '',
        fullWidth ? 'btn-full' : '',
        loading ? 'btn-loading' : '',
        className,
      ].join(' ').trim()}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  )
}