import api from './api'

interface BackendResponse<T> {
  status: string
  message: string
  data: T
}

export interface AttendanceItem {
  id: number
  status?: string
  clock_in?: string
  clock_out?: string
  date?: string
  createdAt?: string
}

export interface LeaveItem {
  id: number
  type?: string
  status?: string
  start_date?: string
  end_date?: string
  createdAt?: string
}

export interface CreateLeaveRequestInput {
  startDate: string
  endDate: string
  reason: string
}

export interface ReimbursementItem {
  id: number
  title?: string
  description?: string
  amount?: number | string
  status?: string
  request_date?: string
}

export interface CreateReimbursementInput {
  amount: number
  description: string
}

export interface PayrollItem {
  id: number
  period_start?: string
  period_end?: string
  net_salary?: number | string
  status?: string
}

async function getData<T>(path: string): Promise<T> {
  const response = await api.get<BackendResponse<T>>(path)
  return response.data.data
}

async function postData<T>(path: string, data?: Record<string, unknown>): Promise<T> {
  const response = await api.post<BackendResponse<T>>(path, data || {})
  return response.data.data
}

export interface QrTokenResponse {
  qrToken: string
  expiresIn: number
  expiresAt: string
}

export interface CheckInResponse {
  id: number
  user_id?: number
  date?: string
  clock_in?: string
  status?: string
}

export const hrService = {
  attendance: () => getData<AttendanceItem[]>('/attendance/history'),
  attendanceHistory: () => getData<AttendanceItem[]>('/attendance/history'),
  leaves: () => getData<LeaveItem[]>('/leaves/me'),
  createLeave: (data: CreateLeaveRequestInput) => postData<LeaveItem>('/leaves', data),
  reimbursements: () => getData<ReimbursementItem[]>('/reimbursements/me'),
  createReimbursement: (data: CreateReimbursementInput) => postData<ReimbursementItem>('/reimbursements', data),
  payroll: () => getData<PayrollItem[]>('/payroll/me'),
  
  // Attendance actions
  getQrToken: () => getData<QrTokenResponse>('/attendance/qr'),
  checkIn: (qrToken: string) => postData<CheckInResponse>('/attendance/check-in', { qrToken }),
  checkOut: () => postData<CheckInResponse>('/attendance/check-out', {}),
}