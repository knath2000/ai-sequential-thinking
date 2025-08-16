export type DashboardMetrics = {
  timestamp: string
  requests_per_minute: number
  average_response_time: number
  success_rate: number
  active_sessions: number
  total_cost_today: number
  top_errors: string[]
}

export type SessionResponse = {
  id: number
  session_id: string
  user_agent?: string
  ip_address?: string
  meta?: Record<string, any>
  created_at: string
  updated_at?: string
  ended_at?: string
  total_requests: number
  total_errors: number
  total_processing_time_ms: number
}

export type UsageEventResponse = {
  id: number
  timestamp: string
  session_id?: string
  event_type: string
  tool_name?: string
  response_time_ms?: number
  success: boolean
  error_message?: string
  meta?: Record<string, any>
}

export type PerformanceMetricResponse = {
  id: number
  timestamp: string
  metric_name: string
  metric_value: number
  metric_unit?: string
  tags?: Record<string, any>
}

export type ErrorLogResponse = {
  id: number
  timestamp: string
  session_id?: string
  error_type: string
  error_message: string
  stack_trace?: string
  request_path?: string
  request_method?: string
}

export type SessionDetailResponse = {
  session: SessionResponse
  events: UsageEventResponse[]
  metrics: PerformanceMetricResponse[]
  logs: ErrorLogResponse[]
}


