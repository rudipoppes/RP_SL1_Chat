import { useState, useCallback, useRef } from 'react'
import { Message, SendMessageRequest, ChatState } from '../types/chat'
import { api } from '../services/api'
import { RESTOREPOINT_KEYWORDS } from '../utils/constants'

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const validateInput = useCallback((input: string): string | null => {
    if (!input.trim()) {
      return "Please enter a message"
    }

    if (input.length > 500) {
      return "Message is too long (max 500 characters)"
    }

    const hasValidKeyword = RESTOREPOINT_KEYWORDS.some(keyword =>
      input.toLowerCase().includes(keyword)
    )

    if (!hasValidKeyword) {
      return "I can only help with Restorepoint network management topics. Please ask about devices, backups, commands, or network status."
    }

    return null
  }, [])

  const sendMessage = useCallback(async (request: SendMessageRequest) => {
    const validationError = validateInput(request.message)
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }))
      return
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }))

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: request.message,
      timestamp: new Date(),
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }))

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      const response = await api.sendMessage(request.message, {
        signal: abortControllerRef.current.signal,
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || '',
        timestamp: new Date(),
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }))

    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred'

      if (error.name === 'AbortError') {
        errorMessage = 'Request was cancelled'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [validateInput])

  const clearMessages = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    })
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  return {
    state,
    sendMessage,
    clearMessages,
    cancelRequest,
    validateInput,
  }
}