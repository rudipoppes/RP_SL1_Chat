export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

export interface SendMessageRequest {
  message: string
  conversationId?: string
}

export interface SendMessageResponse {
  id: string
  response: string
  status: 'success' | 'error'
  error?: string
}

export interface SuggestedQuestion {
  id: string
  text: string
  category: 'device' | 'backup' | 'command' | 'status'
}