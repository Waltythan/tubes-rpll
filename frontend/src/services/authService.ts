import api from './api'

export interface AuthUser {
  id: number
  email: string
  managerId?: number | null
  departmentId?: number | null
  department_id?: number | null
  name?: string | null
  fullName?: string | null
  full_name?: string | null
  role?: string | null
  roles?: string | null
  [key: string]: unknown
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

export interface AuthError extends Error {
  status?: number
  retryAfterSeconds?: number
}

export interface ForgotPasswordResult {
  resetToken?: string
}

interface BackendResponse<T> {
  status: string
  message: string
  data: T
}

function normalizeAuthError(error: unknown): AuthError {
  const fallback = new Error('Something went wrong. Please try again.') as AuthError

  if (error instanceof Error) {
    const typedError = error as AuthError
    const status = typedError.status

    if (status === 401) {
      return Object.assign(new Error('Invalid email or password'), { status: 401 }) as AuthError
    }

    if (status === 429) {
      return Object.assign(new Error('Too many login attempts. Please wait a few minutes.'), {
        status: 429,
        retryAfterSeconds: typedError.retryAfterSeconds,
      }) as AuthError
    }

    return fallback
  }

  return fallback
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post<BackendResponse<null>>('/auth/forgot', { email })
}

export async function getDevResetToken(email: string): Promise<ForgotPasswordResult> {
  const response = await api.get<BackendResponse<ForgotPasswordResult>>('/auth/dev/reset-token', {
    params: { email },
  })
  return response.data.data || {}
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset', { token, newPassword })
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  try {
    const response = await api.post<BackendResponse<LoginResult>>('/auth/login', payload)
    return response.data.data
  } catch (error: unknown) {
    throw normalizeAuthError(error)
  }
}

export function logout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
