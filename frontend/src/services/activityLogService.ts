import api from './api'
import { UserReference } from './hrService'

interface BackendResponse<T> {
  status: string
  message: string
  data: T
}

export interface ActivityLogItem {
  user_id: number
  action: string
  target_table?: string | null
  target_id?: string | null
  ip_address?: string | null
  created_at?: string
  user?: UserReference
}

export interface ActivityLogPage {
  rows: ActivityLogItem[]
}

export async function fetchActivityLogs(limit: number, offset: number): Promise<ActivityLogItem[]> {
  const response = await api.get<BackendResponse<ActivityLogPage>>('/activity-logs', {
    params: { limit, offset },
  })

  return Array.isArray(response.data?.data?.rows) ? response.data.data.rows : []
}