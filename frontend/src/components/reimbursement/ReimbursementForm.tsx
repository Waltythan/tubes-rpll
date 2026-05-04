import { useState, type FormEvent } from 'react'
import Button from '../common/Button'
import { useLoading } from '../../hooks/useLoading'
import { hrService, type ReimbursementItem } from '../../services/hrService'

interface ReimbursementFormProps {
  onSubmitted: (reimbursement: ReimbursementItem) => Promise<void> | void
  onClose?: () => void
}

interface ReimbursementFormErrors {
  amount?: string
  description?: string
}

interface ReimbursementFormValues {
  amount: string
  description: string
}

const initialValues: ReimbursementFormValues = {
  amount: '',
  description: '',
}

export default function ReimbursementForm({ onSubmitted, onClose }: ReimbursementFormProps): JSX.Element {
  const { withLoading } = useLoading()
  const [values, setValues] = useState<ReimbursementFormValues>(initialValues)
  const [errors, setErrors] = useState<ReimbursementFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(currentValues: ReimbursementFormValues): ReimbursementFormErrors {
    const nextErrors: ReimbursementFormErrors = {}
    const amountValue = Number(currentValues.amount)

    if (!currentValues.amount.trim()) {
      nextErrors.amount = 'Amount is required'
    } else if (Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Amount must be greater than 0'
    }

    if (!currentValues.description.trim()) {
      nextErrors.description = 'Description is required'
    }

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSubmitError(null)
    setSuccessMessage(null)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      const createdReimbursement = await withLoading(() => hrService.createReimbursement({
        amount: Number(values.amount),
        description: values.description.trim(),
      }))

      setValues(initialValues)
      setErrors({})
      setSuccessMessage('Reimbursement request submitted successfully.')
      await onSubmitted(createdReimbursement)
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit reimbursement request')
    } finally {
      setSubmitting(false)
    }
  }

  function updateField<K extends keyof ReimbursementFormValues>(field: K, value: ReimbursementFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
    setSuccessMessage(null)
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="section-header page-heading compact">
        <div>
          <p className="eyebrow">Request reimbursement</p>
          <h3>New reimbursement request</h3>
        </div>
        {onClose && <Button type="button" variant="ghost" onClick={onClose}>Close</Button>}
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <label className="field">
        <span className="field-label">Amount</span>
        <input
          className={['input', errors.amount ? 'input-error' : ''].join(' ').trim()}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={values.amount}
          onChange={(event) => updateField('amount', event.target.value)}
          disabled={submitting}
          placeholder="0.00"
        />
        {errors.amount && <span className="field-error">{errors.amount}</span>}
      </label>

      <label className="field">
        <span className="field-label">Description</span>
        <textarea
          className={['input', 'textarea', errors.description ? 'input-error' : ''].join(' ').trim()}
          rows={4}
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          disabled={submitting}
          placeholder="Briefly explain this expense"
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>

      <div className="form-actions">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit reimbursement request'}
        </Button>
      </div>
    </form>
  )
}