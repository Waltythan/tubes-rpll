import type { ButtonHTMLAttributes, ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
  loading?: boolean
}

export default function Button({ children, variant = 'primary', fullWidth = false, loading = false, disabled = false, className = '', ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={[
        'btn',
        variant === 'primary' ? 'btn-primary' : '',
        variant === 'secondary' ? 'btn-secondary' : '',
        variant === 'ghost' ? 'btn-ghost' : '',
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