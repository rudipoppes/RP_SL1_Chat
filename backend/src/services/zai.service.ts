import axios from 'axios'
import config from '../utils/config'
import logger from '../utils/logger'
import { RESTOREPOINT_SYSTEM_PROMPT } from '../utils/prompts'
import { toolDiscoveryService } from './tool-discovery.service'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: any[]
  tool_call_id?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ChatResponse {
  content: string
  tool_calls?: ToolCall[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class ZAIService {
  private readonly apiKey: string
  private readonly baseURL = 'https://api.z.ai/api/coding/paas/v4'
  private isInitialized = false

  constructor() {
    this.apiKey = config.ZAI_API_KEY
    if (!this.apiKey) {
      throw new Error('ZAI_API_KEY is required. Please configure the API key in your environment variables.')
    }
  }

  async sendMessage(
    message: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      // Initialize service if needed
      if (!this.isInitialized) {
        await this.initialize()
      }

      logger.info('Processing message', { 
        messageLength: message.length,
        historyLength: conversationHistory.length 
      })

      // API key is required - no fallback to mock responses
      if (!this.apiKey) {
        throw new Error('ZAI_API_KEY not configured')
      }

      // Get dynamic tools from discovery service
      const dynamicTools = await toolDiscoveryService.getToolsForAI()

      const messages = [
        { role: 'system', content: RESTOREPOINT_SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user', content: message }
      ]

      logger.info('Using dynamic tools for AI request', {
        toolCount: dynamicTools.length,
        toolNames: dynamicTools.map(t => t.function.name),
        service: 'ZAIService'
      })

      // Use GLM-4.6 model from z.ai with correct endpoint
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'glm-4.6',
        messages,
        tools: dynamicTools,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 1000,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const data = response.data
      const choice = data.choices[0]
      if (!choice?.message) {
        throw new Error('No response from z.ai API')
      }

      const chatResponse: ChatResponse = {
        content: choice.message.content || '',
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens, 
          total_tokens: data.usage.total_tokens
        } : undefined
      }

      if (choice.message.tool_calls) {
        chatResponse.tool_calls = choice.message.tool_calls.map((call: any) => ({
          id: call.id,
          type: 'function',
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }))
      }

      logger.info('Received response from z.ai', {
        hasContent: !!chatResponse.content,
        hasToolCalls: !!(chatResponse.tool_calls?.length),
        toolCallsCount: chatResponse.tool_calls?.length || 0,
        usage: chatResponse.usage
      })

      return chatResponse

    } catch (error: any) {
      logger.error('z.ai service error:', {
        error: error.message,
        stack: error.stack,
        status: error.response?.status,
        code: error.code
      })

      if (error.response?.status === 401) {
        throw new Error('Invalid z.ai API key')
      } else if (error.response?.status === 429) {
        throw new Error('z.ai API rate limit exceeded')
      } else if (error.response?.status === 500) {
        throw new Error('z.ai API server error')
      }

      throw new Error(`z.ai service failed: ${error.message}`)
    }
  }

  /**
   * Initialize ZAI service and tool discovery
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('ZAIService already initialized', { service: 'ZAIService' })
      return
    }

    try {
      logger.info('Initializing ZAIService', { service: 'ZAIService' })

      // Initialize tool discovery service
      await toolDiscoveryService.initialize()

      this.isInitialized = true

      logger.info('ZAIService initialized successfully', { service: 'ZAIService' })

    } catch (error: any) {
      logger.error('Failed to initialize ZAIService', {
        error: error.message,
        stack: error.stack,
        service: 'ZAIService'
      })

      // Still mark as initialized to prevent retry loops
      this.isInitialized = true
      throw new Error(`ZAIService initialization failed: ${error.message}`)
    }
  }

  /**
   * Get service status for monitoring
   */
  getServiceStatus(): {
    initialized: boolean
    toolDiscoveryStatus: any
  } {
    return {
      initialized: this.isInitialized,
      toolDiscoveryStatus: toolDiscoveryService.getServiceStatus()
    }
  }

  async executeToolCall(toolCall: ToolCall): Promise<any> {
    logger.info('Executing tool call', {
      toolName: toolCall.function.name,
      arguments: toolCall.function.arguments
    })

    // This will be handled by the MCP service
    // The MCP service will translate tool calls to actual MCP protocol calls
    throw new Error('Tool execution should be handled by MCP service')
  }

  validateTopic(message: string): { isValid: boolean; reason?: string } {
    const restorepointKeywords = [
      'device', 'backup', 'command', 'network', 'restorepoint',
      'list', 'show', 'run', 'execute', 'status', 'create',
      'update', 'delete', 'monitor', 'check', 'start', 'stop',
      'configure', 'configuration', 'settings', 'manage', 'management'
    ]

    const hasValidKeyword = restorepointKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    )

    if (!hasValidKeyword) {
      return {
        isValid: false,
        reason: 'I can only help with Restorepoint network management topics. Please ask about devices, backups, commands, or network status.'
      }
    }

    return { isValid: true }
  }
}

export const zaiService = new ZAIService()