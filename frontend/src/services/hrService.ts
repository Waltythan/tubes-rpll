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
  department_id?: number | null
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
  department_id?: number | null
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

export interface PayrollAdjustmentItem {
  id?: number
  payroll_id?: number
  type?: 'allowance' | 'deduction'
  amount?: number | string
  description?: string | null
  reference_id?: string | null
}

export interface PayrollItem {
  id: number
  period_start?: string
  period_end?: string
  net_salary?: number | string
  total_allowance?: number | string
  total_deduction?: number | string
  status?: string
  generated_at?: string
  items?: PayrollAdjustmentItem[]
}

export interface GeneratePayrollInput {
  month: number
  year: number
}

export interface AddPayrollItemInput {
  type: 'allowance' | 'deduction'
  amount: number
  description?: string
  reference?: string
}

export interface UserItem {
  id?: number
  user_id?: number
  email?: string
  role?: string
  roles?: string
  department_id?: number | null
  department_name?: string | null
  manager_id?: number | null
  managerId?: number | null
  name?: string | null
  full_name?: string | null
  fullName?: string | null
}

export interface DepartmentItem {
  dep_id: number
  name: string
  code: string
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
  generatePayroll: ({ month, year }: GeneratePayrollInput) => postData<PayrollItem>('/payroll/generate', { month, year }),
  addPayrollItem: (payrollId: number, data: AddPayrollItemInput) => postData<PayrollAdjustmentItem>(`/payroll/${payrollId}/items`, {
    type: data.type,
    amount: data.amount,
    description: data.description,
    referenceId: data.reference,
  }),

  // Admin user management
  getUsers: () => getData<UserItem[]>('/users'),
  getManagers: () => getData<UserItem[]>('/users/managers'),
  getDepartments: () => getData<DepartmentItem[]>('/users/departments'),
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

  // Team attendance (for managers)
  getTeamAttendance: (params?: { start_date?: string; end_date?: string; employee_name?: string }): Promise<AttendanceItem[]> => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.employee_name) queryParams.append('employee_name', params.employee_name)
    const query = queryParams.toString()
    const path = query ? `/attendance/team?${query}` : '/attendance/team'
    return getData<AttendanceItem[]>(path)
  },

  // Admin: Update attendance record
  updateAttendance: (attendanceId: number, data: Record<string, unknown>) => patchData<AttendanceItem>(`/attendance/${attendanceId}`, data),
}