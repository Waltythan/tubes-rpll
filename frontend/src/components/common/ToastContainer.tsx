import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastId = 0
const toastListeners = new Set<(toast: Toast) => void>()
const removeListeners = new Set<(id: string) => void>()

export const showToast = (message: string, type: ToastType = 'info', duration = 3000): void => {
  const id = `toast-${++toastId}`
  const toast: Toast = { id, message, type }

  toastListeners.forEach((listener) => listener(toast))

  if (duration > 0) {
    setTimeout(() => {
      removeListeners.forEach((listener) => listener(id))
    }, duration)
  }
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export default function ToastContainer({ position = 'top-right' }: ToastContainerProps): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const addToast = (toast: Toast): void => {
      setToasts((current) => [...current, toast])
    }

    const removeToast = (id: string): void => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }

    toastListeners.add(addToast)
    removeListeners.add(removeToast)

    return () => {
      toastListeners.delete(addToast)
      removeListeners.delete(removeToast)
    }
  }, [])

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        [position.includes('right') ? 'right' : 'left']: '1rem',
        [position.includes('top') ? 'top' : 'bottom']: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '360px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{
            padding: '1rem',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            backgroundColor:
              toast.type === 'success'
                ? '#d4edda'
                : toast.type === 'error'
                  ? '#f8d7da'
                  : toast.type === 'warning'
                    ? '#fff3cd'
                    : '#d1ecf1',
            color:
              toast.type === 'success'
                ? '#155724'
                : toast.type === 'error'
                  ? '#721c24'
                  : toast.type === 'warning'
                    ? '#856404'
                    : '#0c5460',
            border:
              toast.type === 'success'
                ? '1px solid #c3e6cb'
                : toast.type === 'error'
                  ? '1px solid #f5c6cb'
                  : toast.type === 'warning'
                    ? '1px solid #ffeeba'
                    : '1px solid #bee5eb',
            animation: 'slideIn 0.3s ease-in-out',
          }}
          role="alert"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
