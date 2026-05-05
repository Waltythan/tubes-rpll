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

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset', { token, newPassword })
}

interface BackendResponse<T> {
  status: string
  message: string
  data: T
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const response = await api.post<BackendResponse<LoginResult>>('/auth/login', payload)
  return response.data.data
}

export function logout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
