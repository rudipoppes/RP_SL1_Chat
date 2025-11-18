import { zaiService, ToolCall } from './zai.service'
import { mcpService } from './mcp.service'
import logger from '../utils/logger'

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

interface ChatRequest {
  message: string
  sessionId: string
  conversationHistory?: ConversationMessage[]
}

interface ChatResult {
  response: string
  sessionId: string
  toolsUsed: string[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  executionResults?: any[]
}

export class ChatService {
  async processMessage(request: ChatRequest): Promise<ChatResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Processing chat message', {
        sessionId: request.sessionId,
        messageLength: request.message.length,
        hasHistory: !!(request.conversationHistory?.length)
      })

      // Validate topic first
      const topicValidation = zaiService.validateTopic(request.message)
      if (!topicValidation.isValid) {
        return {
          response: topicValidation.reason || 'I can only help with Restorepoint network management topics. Please ask about devices, backups, commands, or network status.',
          sessionId: request.sessionId,
          toolsUsed: []
        }
      }

      // Get AI response with potential tool calls
      const aiResponse = await zaiService.sendMessage(
        request.message,
        request.conversationHistory || []
      )

      const toolsUsed: string[] = []
      const executionResults: any[] = []
      let finalResponse = aiResponse.content

      // Execute tool calls if any
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        logger.info('Processing tool calls', {
          toolCount: aiResponse.tool_calls.length,
          tools: aiResponse.tool_calls.map(t => t.function.name)
        })

        const updatedHistory = [
          ...(request.conversationHistory || []),
          { role: 'user' as const, content: request.message },
          { role: 'assistant' as const, content: aiResponse.content, tool_calls: aiResponse.tool_calls }
        ]

        // Execute each tool call
        for (const toolCall of aiResponse.tool_calls) {
          try {
            toolsUsed.push(toolCall.function.name)
            
            const result = await mcpService.executeTool(toolCall)
            executionResults.push({
              toolName: toolCall.function.name,
              success: true,
              result
            })

            // Add tool result to conversation history
            updatedHistory.push({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            })

            logger.info('Tool execution successful', {
              toolName: toolCall.function.name,
              resultSize: JSON.stringify(result).length
            })

          } catch (error: any) {
            logger.error('Tool execution failed', {
              toolName: toolCall.function.name,
              error: error.message
            })

            executionResults.push({
              toolName: toolCall.function.name,
              success: false,
              error: error.message
            })

            // Add error result to conversation history
            updatedHistory.push({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message })
            })
          }
        }

        // Get final AI response after tool execution
        const finalAiResponse = await zaiService.sendMessage(
          'Based on the tool results, please provide a summary of what was accomplished.',
          updatedHistory
        )

        finalResponse = finalAiResponse.content || finalResponse
      }

      const processingTime = Date.now() - startTime
      
      const result: ChatResult = {
        response: finalResponse,
        sessionId: request.sessionId,
        toolsUsed,
        usage: aiResponse.usage,
        executionResults
      }

      logger.info('Chat message processed successfully', {
        sessionId: request.sessionId,
        processingTimeMs: processingTime,
        toolsUsedCount: toolsUsed.length,
        toolsUsed: toolsUsed,
        responseLength: finalResponse.length,
        hasUsage: !!(aiResponse.usage)
      })

      return result

    } catch (error: any) {
      const processingTime = Date.now() - startTime
      
      logger.error('Chat message processing failed', {
        sessionId: request.sessionId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime
      })

      throw new Error(`Chat processing failed: ${error.message}`)
    }
  }

  async getSessionHistory(_sessionId: string): Promise<ConversationMessage[]> {
    // In a real implementation, this would fetch from a database
    // For now, return empty history
    return []
  }

  async validateSession(_sessionId: string): Promise<boolean> {
    // In a real implementation, this would validate the session
    return true
  }

  async healthCheck(): Promise<{ status: string; services: any }> {
    try {
      const mcpHealth = await mcpService.healthCheck()
      
      return {
        status: 'healthy',
        services: {
          zai_service: 'connected',
          mcp_service: mcpHealth.status,
          mcp_connected: mcpHealth.mcp_connected
        }
      }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        services: {
          zai_service: 'error',
          mcp_service: 'error',
          error: error.message
        }
      }
    }
  }
}

export const chatService = new ChatService()