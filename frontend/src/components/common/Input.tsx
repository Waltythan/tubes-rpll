import React, { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, helperText, className = '', ...props }, ref) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <input ref={ref} className={["input", className].join(' ').trim()} {...props} />
      {helperText && <span className="field-helper">{helperText}</span>}
    </label>
  )
})

export default Input