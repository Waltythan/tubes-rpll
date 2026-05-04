import api from './api'

export interface LeaveRequestSummary {
  id: number
  type?: string
  status?: string
  start_date?: string
  end_date?: string
  createdAt?: string
}

export interface ReimbursementSummary {
  id: number
  title?: string
  amount?: number | string
  status?: string
  request_date?: string
}

export interface DashboardSummary {
  leaveRequests: LeaveRequestSummary[]
  reimbursements: ReimbursementSummary[]
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [leaveResponse, reimbursementResponse] = await Promise.all([
    api.get('/leaves/me'),
    api.get('/reimbursements/me'),
  ])

  return {
    leaveRequests: Array.isArray(leaveResponse.data?.data) ? leaveResponse.data.data : [],
    reimbursements: Array.isArray(reimbursementResponse.data?.data) ? reimbursementResponse.data.data : [],
  }
}