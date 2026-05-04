import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
}

export default function Button({ children, variant = 'primary', fullWidth = false, className = '', ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={[
        'btn',
        variant === 'primary' ? 'btn-primary' : '',
        variant === 'secondary' ? 'btn-secondary' : '',
        variant === 'ghost' ? 'btn-ghost' : '',
        fullWidth ? 'btn-full' : '',
        className,
      ].join(' ').trim()}
      {...props}
    >
      {children}
    </button>
  )
}