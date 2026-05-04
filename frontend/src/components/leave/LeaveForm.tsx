import { useState, type FormEvent } from 'react'
import Button from '../common/Button'
import { useLoading } from '../../hooks/useLoading'
import { hrService, type LeaveItem } from '../../services/hrService'

interface LeaveFormProps {
  onSubmitted: (leave: LeaveItem) => Promise<void> | void
  onClose?: () => void
}

interface LeaveFormErrors {
  startDate?: string
  endDate?: string
  reason?: string
}

interface LeaveFormValues {
  startDate: string
  endDate: string
  reason: string
}

const initialValues: LeaveFormValues = {
  startDate: '',
  endDate: '',
  reason: '',
}

export default function LeaveForm({ onSubmitted, onClose }: LeaveFormProps): JSX.Element {
  const { withLoading } = useLoading()
  const [values, setValues] = useState<LeaveFormValues>(initialValues)
  const [errors, setErrors] = useState<LeaveFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(currentValues: LeaveFormValues): LeaveFormErrors {
    const nextErrors: LeaveFormErrors = {}

    if (!currentValues.startDate) {
      nextErrors.startDate = 'Start date is required'
    }

    if (!currentValues.endDate) {
      nextErrors.endDate = 'End date is required'
    }

    if (!currentValues.reason.trim()) {
      nextErrors.reason = 'Reason is required'
    }

    if (currentValues.startDate && currentValues.endDate && currentValues.startDate > currentValues.endDate) {
      nextErrors.endDate = 'End date must be on or after start date'
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
      const createdLeave = await withLoading(() => hrService.createLeave({
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason.trim(),
      }))

      setValues(initialValues)
      setErrors({})
      setSuccessMessage('Leave request submitted successfully.')
      await onSubmitted(createdLeave)
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  function updateField<K extends keyof LeaveFormValues>(field: K, value: LeaveFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
    setSuccessMessage(null)
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="section-header page-heading compact">
        <div>
          <p className="eyebrow">Request leave</p>
          <h3>New leave request</h3>
        </div>
        {onClose && <Button type="button" variant="ghost" onClick={onClose}>Close</Button>}
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="grid grid-2">
        <label className="field">
          <span className="field-label">Start date</span>
          <input
            className={['input', errors.startDate ? 'input-error' : ''].join(' ').trim()}
            type="date"
            value={values.startDate}
            onChange={(event) => updateField('startDate', event.target.value)}
            disabled={submitting}
          />
          {errors.startDate && <span className="field-error">{errors.startDate}</span>}
        </label>

        <label className="field">
          <span className="field-label">End date</span>
          <input
            className={['input', errors.endDate ? 'input-error' : ''].join(' ').trim()}
            type="date"
            value={values.endDate}
            onChange={(event) => updateField('endDate', event.target.value)}
            disabled={submitting}
          />
          {errors.endDate && <span className="field-error">{errors.endDate}</span>}
        </label>
      </div>

      <label className="field">
        <span className="field-label">Reason</span>
        <textarea
          className={['input', 'textarea', errors.reason ? 'input-error' : ''].join(' ').trim()}
          rows={4}
          value={values.reason}
          onChange={(event) => updateField('reason', event.target.value)}
          disabled={submitting}
          placeholder="Briefly explain why you need leave"
        />
        {errors.reason && <span className="field-error">{errors.reason}</span>}
      </label>

      <div className="form-actions">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit leave request'}
        </Button>
      </div>
    </form>
  )
}