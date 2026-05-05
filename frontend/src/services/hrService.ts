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
  user_id?: number
  approved_by?: number | null
  type?: string
  status?: string
  start_date?: string
  end_date?: string
  attachment_url?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateLeaveRequestInput {
  startDate: string
  endDate: string
  reason: string
}

export interface ReimbursementItem {
  id: number
  user_id?: number
  approved_by?: number | null
  payroll_id?: number | null
  title?: string
  description?: string
  amount?: number | string
  status?: string
  attachment_url?: string
  request_date?: string
  updatedAt?: string
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

async function patchData<T>(path: string, data?: Record<string, unknown>): Promise<T> {
  const response = await api.patch<BackendResponse<T>>(path, data || {})
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
  teamLeaves: () => getData<LeaveItem[]>('/leaves/team'),
  createLeave: (data: CreateLeaveRequestInput) => postData<LeaveItem>('/leaves', data),
  decideLeave: (leaveId: number, decision: 'approved' | 'declined') => patchData<LeaveItem>(`/leaves/${leaveId}/decision`, { decision }),
  reimbursements: () => getData<ReimbursementItem[]>('/reimbursements/me'),
  teamReimbursements: () => getData<ReimbursementItem[]>('/reimbursements/team'),
  createReimbursement: (data: CreateReimbursementInput) => postData<ReimbursementItem>('/reimbursements', data),
  decideReimbursement: (reimbursementId: number, decision: 'approved' | 'rejected') => patchData<ReimbursementItem>(`/reimbursements/${reimbursementId}/decision`, { decision }),
  payroll: () => getData<PayrollItem[]>('/payroll/me'),

  // Admin user management
  getUsers: () => getData<any[]>('/users'),
  createUser: (data: Record<string, unknown>) => postData<any>('/users', data),
  updateUser: (userId: number, data: Record<string, unknown>) => patchData<any>(`/users/${userId}`, data),
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/users/${userId}`)
    return response.data.data
  },
  
  // Attendance actions
  getQrToken: () => getData<QrTokenResponse>('/attendance/qr'),
  checkIn: (qrToken: string) => postData<CheckInResponse>('/attendance/check-in', { qrToken }),
  checkOut: () => postData<CheckInResponse>('/attendance/check-out', {}),
}