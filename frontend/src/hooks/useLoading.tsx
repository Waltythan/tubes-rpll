import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface LoadingContextValue {
  loadingCount: number
  startLoading: () => void
  stopLoading: () => void
  withLoading: <T>(task: () => Promise<T>) => Promise<T>
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }): JSX.Element {
  const [loadingCount, setLoadingCount] = useState(0)

  const startLoading = (): void => {
    setLoadingCount((count) => count + 1)
  }

  const stopLoading = (): void => {
    setLoadingCount((count) => Math.max(0, count - 1))
  }

  async function withLoading<T>(task: () => Promise<T>): Promise<T> {
    startLoading()
    try {
      return await task()
    } finally {
      stopLoading()
    }
  }

  const value = useMemo<LoadingContextValue>(() => ({
    loadingCount,
    startLoading,
    stopLoading,
    withLoading,
  }), [loadingCount])

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext)

  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }

  return context
}