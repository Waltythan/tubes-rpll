import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

export type UnauthorizedHandler = (() => void) | null

let unauthorizedHandler: UnauthorizedHandler = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

function parseRetryAfterSeconds(error: AxiosError): number | undefined {
  const headers = error.response?.headers
  if (!headers) return undefined

  const retryAfterRaw = headers['retry-after']
  const rateLimitResetRaw = headers['ratelimit-reset'] || headers['x-ratelimit-reset']

  const retryAfter = Number(Array.isArray(retryAfterRaw) ? retryAfterRaw[0] : retryAfterRaw)
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.ceil(retryAfter)
  }

  const rateLimitReset = Number(Array.isArray(rateLimitResetRaw) ? rateLimitResetRaw[0] : rateLimitResetRaw)
  if (Number.isFinite(rateLimitReset) && rateLimitReset > 0) {
    return Math.ceil(rateLimitReset)
  }

  return undefined
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      unauthorizedHandler?.()

      if (!unauthorizedHandler && typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
    }

    const message = error.response?.data?.message || error.message || 'Request failed'
    const normalizedError = new Error(message) as Error & { status?: number; retryAfterSeconds?: number }
    normalizedError.status = error.response?.status
    normalizedError.retryAfterSeconds = parseRetryAfterSeconds(error)
    return Promise.reject(normalizedError)
  }
)

export default api