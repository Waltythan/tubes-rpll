import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: ReactNode
}

export default function Input({ label, helperText, className = '', ...props }: InputProps): JSX.Element {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <input className={['input', className].join(' ').trim()} {...props} />
      {helperText && <span className="field-helper">{helperText}</span>}
    </label>
  )
}