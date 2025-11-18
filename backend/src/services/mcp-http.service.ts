/**
 * HTTP MCP Client Service
 * Connects to remote MCP server via HTTP API
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
import config from '../utils/config'
import logger from '../utils/logger'
import type { ZAIService, ToolCall } from './zai.service'

interface MCPToolCall {
  tool: string
  arguments?: Record<string, unknown>
}

interface MCPToolResponse {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    executionTime: number
    timestamp: string
    toolName: string
  }
}

interface MCPHealthResponse {
  status: string
  timestamp: string
  uptime: number
  server: string
  version: string
  tools?: number
  memory?: {
    used: number
    total: number
  }
}

interface MCPInfoResponse {
  server: string
  version: string
  endpoints: {
    health: string
    info: string
    tools: string
    execute: string
  }
  tools: Array<{
    name: string
    description: string
    parameters: unknown
  }>
}

/**
 * HTTP MCP Client for connecting to remote MCP server
 */
export class MCPHttpService {
  private readonly client: AxiosInstance
  private readonly baseURL: string
  private isInitialized = false
  private healthStatus: {
    lastCheck: Date | null
    status: string
    responseTime?: number
    tools?: number
  } = {
    lastCheck: null,
    status: 'uninitialized'
  }

  constructor() {
    this.baseURL = `http://${config.MCP_SERVER_HOST}:${config.MCP_SERVER_PORT}`
    
    // Create axios client with proper configuration
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'rp-sl1-chat-backend/2.0.0'
      }
    })

      }

  /**
   * Initialize the HTTP MCP client
   */
  async initialize(): Promise<void> {
    try {
      // Test connection with health check
      const health = await this.healthCheck()
      
      if (health.status !== 'healthy') {
        throw new Error(`MCP server is not healthy: ${health.status}`)
      }

      this.isInitialized = true
      this.healthStatus = {
        lastCheck: new Date(),
        status: 'connected',
        tools: health.tools
      }

    } catch (error: any) {
      logger.error('Failed to initialize MCP HTTP client', {
        baseURL: this.baseURL,
        error: error.message,
        stack: error.stack,
        service: 'MCPHttpService'
      })
      this.isInitialized = true // Mark as initialized to prevent retry loops
      throw new Error(`Failed to connect to MCP server: ${error.message}`)
    }
  }

  /**
   * Check MCP server health
   */
  async healthCheck(): Promise<MCPHealthResponse> {
    try {
      const startTime = Date.now()
      const response: AxiosResponse<any> = await this.client.get('/health')
      const responseTime = Date.now() - startTime

      // Handle wrapped response structure from real MCP server
      const responseData = response.data
      const healthData = responseData.success && responseData.data ? responseData.data : responseData

      this.healthStatus = {
        lastCheck: new Date(),
        status: healthData.status,
        responseTime,
        tools: healthData.tools
      }

      
      return healthData

    } catch (error: any) {
      const errorMessage = this.handleAxiosError(error, 'health check')
      this.healthStatus = {
        lastCheck: new Date(),
        status: 'error'
      }
      throw new Error(errorMessage)
    }
  }

  /**
   * Get MCP server information
   */
  async getServerInfo(): Promise<MCPInfoResponse> {
    try {
      const response: AxiosResponse<MCPInfoResponse> = await this.client.get('/info')

      return response.data

    } catch (error: any) {
      const errorMessage = this.handleAxiosError(error, 'get server info')
      throw new Error(errorMessage)
    }
  }

  /**
   * Execute a tool via HTTP API
   */
  async executeTool(toolCall: ToolCall): Promise<MCPToolResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('MCP HTTP client not initialized')
      }

      const mcpToolCall: MCPToolCall = {
        tool: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments)
      }

      const response: AxiosResponse<MCPToolResponse> = await this.client.post('/tools/execute', mcpToolCall)
      const result = response.data

      if (result.error) {
        logger.error('MCP tool execution returned error', {
          tool: mcpToolCall.tool,
          error: result.error,
          service: 'MCPHttpService'
        })
      }

      return result

    } catch (error: any) {
      logger.error('Failed to execute MCP tool', {
        tool: toolCall.function.name,
        arguments: toolCall.function.arguments,
        error: error.message,
        service: 'MCPHttpService'
      })

      // Return a structured error response instead of throwing
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to execute tool',
          details: this.handleAxiosError(error, 'tool execution')
        },
        metadata: {
          executionTime: 0,
          timestamp: new Date().toISOString(),
          toolName: toolCall.function.name
        }
      }
    }
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeTools(toolCalls: ToolCall[]): Promise<MCPToolResponse[]> {
    if (!toolCalls || toolCalls.length === 0) {
      return []
    }

    try {
      const promises = toolCalls.map(toolCall => this.executeTool(toolCall))
      const results = await Promise.all(promises)

      return results

    } catch (error: any) {
      logger.error('Failed to execute multiple MCP tools', {
        toolCount: toolCalls.length,
        error: error.message,
        service: 'MCPHttpService'
      })

      // Return error responses for all tools
      return toolCalls.map(toolCall => ({
        success: false,
        error: {
          code: 'BATCH_EXECUTION_ERROR',
          message: error.message || 'Failed to execute tools in batch'
        },
        metadata: {
          executionTime: 0,
          timestamp: new Date().toISOString(),
          toolName: toolCall.function.name
        }
      }))
    }
  }

  /**
   * Get available tools from MCP server
   */
  async getAvailableTools(): Promise<Array<{ name: string; description: string; parameters: unknown }>> {
    try {
      const response: AxiosResponse<any> = await this.client.get('/tools')
      
      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data
      } else {
        // Fallback to info endpoint
        const info = await this.getServerInfo()
        return info.tools
      }

    } catch (error: any) {
      logger.error('Failed to get available tools', {
        error: error.message,
        service: 'MCPHttpService'
      })
      throw new Error(this.handleAxiosError(error, 'get available tools'))
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    initialized: boolean
    baseURL: string
    health: {
      lastCheck: Date | null
      status: string
      responseTime?: number
      tools?: number
    }
  } {
    return {
      initialized: this.isInitialized,
      baseURL: this.baseURL,
      health: this.healthStatus
    }
  }

  /**
   * Disconnect from MCP server (HTTP client cleanup)
   */
  async disconnect(): Promise<void> {
    try {
      // For HTTP client, we just mark as disconnected
      this.isInitialized = false
      this.healthStatus = {
        lastCheck: new Date(),
        status: 'disconnected'
      }

    } catch (error: any) {
      logger.error('Error during MCP HTTP disconnection', {
        baseURL: this.baseURL,
        error: error.message,
        service: 'MCPHttpService'
      })
    }
  }

  /**
   * Handle Axios errors consistently
   */
  private handleAxiosError(error: any, operation: string): string {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const data = error.response.data

      if (status === 401) {
        return `Authentication failed during ${operation}`
      } else if (status === 403) {
        return `Access forbidden during ${operation}`
      } else if (status === 404) {
        return `Endpoint not found during ${operation}`
      } else if (status === 429) {
        return `Rate limit exceeded during ${operation}`
      } else if (status >= 500) {
        return `MCP server error during ${operation}: ${status}`
      }

      return `HTTP ${status} error during ${operation}: ${data?.error?.message || data?.message || error.message}`

    } else if (error.request) {
      // No response received
      if (error.code === 'ECONNREFUSED') {
        return `MCP server not reachable at ${this.baseURL}`
      } else if (error.code === 'ETIMEDOUT') {
        return `Timeout during ${operation}`
      } else if (error.code === 'ENOTFOUND') {
        return `MCP server host not found: ${config.MCP_SERVER_HOST}`
      }

      return `Network error during ${operation}: ${error.code}`

    } else {
      // Other error (e.g., config error)
      return `Configuration error during ${operation}: ${error.message}`
    }
  }
}

// Export singleton instance
export const mcpHttpService = new MCPHttpService()