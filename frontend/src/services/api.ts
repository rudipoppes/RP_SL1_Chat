import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ChatMessageRequest, ChatMessageResponse, ValidationError } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:4001/api'

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    this.instance.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        if (error.response?.status === 429) {
          error.message = 'Too many requests. Please wait a moment.'
        } else if (error.response?.status === 422) {
          error.message = 'Invalid input. Please check your message.'
        } else if (error.code === 'ECONNABORTED') {
          error.message = 'Request timeout. Please try again.'
        }
        
        return Promise.reject(error)
      }
    )
  }

  async sendMessage(message: string, options?: AxiosRequestConfig): Promise<ChatMessageResponse> {
    const request: ChatMessageRequest = {
      message,
    }

    const response = await this.instance.post<ChatMessageResponse>('/chat', request, options)
    return response.data
  }

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await this.instance.get('/health')
    return response.data
  }

  async validateMessage(message: string): Promise<{ valid: boolean; errors?: ValidationError[] }> {
    const response = await this.instance.post('/validate', { message })
    return response.data
  }
}

export const api = new ApiClient()