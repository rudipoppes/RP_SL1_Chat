export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ChatMessageRequest {
  message: string
  session_id?: string
}

export interface ChatMessageResponse {
  id: string
  response: string
  session_id: string
  status: 'success' | 'error' | 'streaming'
  tools_used?: string[]
}

export interface ValidationError {
  field: string
  message: string
  constraint: string
}