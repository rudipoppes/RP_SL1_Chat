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

interface DeviceResolutionResult {
  success: boolean
  data?: any[] | {
    data?: any[]
    result?: any
    [key: string]: unknown
  }
  [key: string]: unknown
}

export class ChatService {
  private async resolveDeviceIdentifiers(message: string): Promise<{ matchedDevices: any[], deviceContext: string }> {
    try {
      // Extract potential device identifiers from the message
      const ipAddresses = this.extractIPAddresses(message)
      const deviceNames = this.extractDeviceNames(message)
      const keywords = this.extractKeywords(message)
      
      logger.info('Extracted device identifiers', {
        ipAddresses,
        deviceNames,
        keywords,
        message
      })
      
      // Skip resolution if no identifiers found
      if (ipAddresses.length === 0 && deviceNames.length === 0 && keywords.length === 0) {
        return { matchedDevices: [], deviceContext: '' }
      }
      
      // Get all devices to have a complete list
      const devicesResult = await mcpService.executeTool({
        id: 'list-devices-resolution',
        type: 'function',
        function: {
          name: 'list_devices',
          arguments: '{}'
        }
      }) as DeviceResolutionResult
      
      if (!devicesResult.success || !devicesResult.data) {
        logger.warn('Device resolution failed - no data returned')
        return { matchedDevices: [], deviceContext: '' }
      }
      
      // Handle different response structures
      let allDevices: any[] = []
      const dataResponse = devicesResult.data
      
      // Log the actual structure for debugging
      logger.info('Device resolution - raw data structure', {
        devicesResultType: typeof devicesResult,
        dataResponseType: typeof dataResponse,
        dataResponseKeys: dataResponse && typeof dataResponse === 'object' ? Object.keys(dataResponse) : 'N/A',
        dataResponseIsArray: Array.isArray(dataResponse),
        dataResponseLength: Array.isArray(dataResponse) ? dataResponse.length : 'N/A',
        ipAddresses,
        message
      })
      
      if (dataResponse && typeof dataResponse === 'object' && 'data' in dataResponse && dataResponse.data && Array.isArray((dataResponse as any).data.data)) {
        allDevices = (dataResponse as any).data.data
        logger.info('Device resolution - using data.data.data structure', { count: allDevices.length })
      } else if (Array.isArray(dataResponse)) {
        allDevices = dataResponse
        logger.info('Device resolution - using direct array structure', { count: allDevices.length })
      } else if (dataResponse && typeof dataResponse === 'object') {
        // Handle nested data structure
        if (dataResponse.data && Array.isArray(dataResponse.data)) {
          allDevices = dataResponse.data
          logger.info('Device resolution - using data array structure', { count: allDevices.length })
        } else if (dataResponse.result && Array.isArray(dataResponse.result)) {
          allDevices = dataResponse.result
          logger.info('Device resolution - using result array structure', { count: allDevices.length })
        } else {
          logger.warn('Device resolution failed - unexpected object structure', { 
            structure: typeof dataResponse, 
            keys: Object.keys(dataResponse),
            hasData: !!dataResponse.data,
            hasResult: !!dataResponse.result,
            dataType: typeof dataResponse.data
          })
          return { matchedDevices: [], deviceContext: '' }
        }
      } else {
        logger.warn('Device resolution failed - unexpected data structure', { 
          structure: typeof dataResponse,
          isArray: Array.isArray(dataResponse),
          isNull: dataResponse === null,
          isUndefined: dataResponse === undefined
        })
        return { matchedDevices: [], deviceContext: '' }
      }
      
      if (!Array.isArray(allDevices)) {
        logger.warn('Device resolution failed - devices is not an array')
        return { matchedDevices: [], deviceContext: '' }
      }
      
      logger.info('Device resolution - analyzing devices', {
        totalDevices: allDevices.length,
        message
      })
      
      logger.info('Device resolution - analyzing devices', {
        totalDevices: allDevices.length,
        message
      })
      
      const matchedDevices: any[] = []
      
      // Match by IP addresses (exact match)
      for (const ip of ipAddresses) {
        const matches = allDevices.filter((device: any) => {
          const deviceIP = device.Address || ''
          const exactMatch = deviceIP === ip
          const containsMatch = deviceIP.includes(ip) || ip.includes(deviceIP)
          
          if (exactMatch || containsMatch) {
            logger.info('Found IP match', { ip, deviceIP, deviceName: device.Name, matchType: exactMatch ? 'exact' : 'contains' })
            return true
          }
          return false
        })
        matchedDevices.push(...matches)
      }
      
      // Match by device names (exact or partial)
      for (const name of deviceNames) {
        const matches = allDevices.filter((device: any) => {
          const deviceName = device.Name || ''
          const deviceNameLower = deviceName.toLowerCase()
          const nameLower = name.toLowerCase()
          
          if (deviceNameLower.includes(nameLower) || nameLower.includes(deviceNameLower)) {
            logger.info('Found name match', { name, deviceName })
            return true
          }
          return false
        })
        matchedDevices.push(...matches)
      }
      
      // Match by keywords (manufacturer, device type, etc.)
      for (const keyword of keywords) {
        const matches = allDevices.filter((device: any) => {
          const pluginName = device.PluginName || ''
          const pluginNameLower = pluginName.toLowerCase()
          const keywordLower = keyword.toLowerCase()
          
          if (pluginNameLower.includes(keywordLower)) {
            logger.info('Found keyword match', { keyword, pluginName })
            return true
          }
          
          // Check asset fields
          const assetFields = device.AssetFields || []
          const hasAssetMatch = assetFields.some((field: any) => {
            const fieldValue = field.Value || ''
            return fieldValue.toLowerCase().includes(keywordLower)
          })
          
          if (hasAssetMatch) {
            logger.info('Found asset keyword match', { keyword, deviceName: device.Name })
            return true
          }
          
          return false
        })
        matchedDevices.push(...matches)
      }
      
      // Remove duplicates
      const uniqueDevices = matchedDevices.filter((device: any, index, self) =>
        index === self.findIndex((d: any) => d.ID === device.ID)
      )
      
      logger.info('Device resolution completed', {
        matchedCount: uniqueDevices.length,
        matchedDevices: uniqueDevices.map(d => ({ id: d.ID, name: d.Name, ip: d.Address }))
      })
      
      // Create device context for AI
      let deviceContext = ''
      if (uniqueDevices.length > 0) {
        deviceContext = `\n\n## Device Matches Found:\n`
        uniqueDevices.forEach(device => {
          deviceContext += `- ${device.Name} (ID: ${device.ID}, IP: ${device.Address}, Type: ${device.PluginName})\n`
        })
        deviceContext += `\nUse these device IDs for any operations: ${uniqueDevices.map(d => d.ID).join(', ')}\n`
      }
      
      return { matchedDevices: uniqueDevices, deviceContext }
      
    } catch (error: any) {
      logger.error('Error resolving device identifiers', { error: error.message, stack: error.stack })
      return { matchedDevices: [], deviceContext: '' }
    }
  }
  
  private extractIPAddresses(message: string): string[] {
    // Match IPv4 addresses (simple regex)
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g
    const matches = message.match(ipRegex) || []
    return [...new Set(matches)] // Remove duplicates
  }
  
  private extractDeviceNames(message: string): string[] {
    // Extract quoted device names first
    const quotedNames = message.match(/"([^"]+)"/g) || []
    const names = quotedNames.map(name => name.replace(/"/g, ''))
    
    // Also look for common device name patterns
    const commonPatterns = [
      /\b[A-Z]+-\d+[A-Z]*\b/g, // Like "SI-1238VA" or "PEYU-GD0887"
      /\b[a-zA-Z]+-[a-zA-Z0-9-]+\b/g // General name patterns
    ]
    
    commonPatterns.forEach(pattern => {
      const matches = message.match(pattern) || []
      names.push(...matches)
    })
    
    return [...new Set(names)] // Remove duplicates
  }
  
  private extractKeywords(message: string): string[] {
    // Common network device keywords
    const keywords = [
      'cisco', 'palo alto', 'juniper', 'aruba', 'fortinet',
      'router', 'switch', 'firewall', 'controller',
      'ios', 'junos', 'catos', 'palo'
    ]
    
    const messageLower = message.toLowerCase()
    const foundKeywords = keywords.filter(keyword => 
      messageLower.includes(keyword.toLowerCase())
    )
    
    return foundKeywords
  }

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

      // Resolve device identifiers from user message
      const { matchedDevices, deviceContext } = await this.resolveDeviceIdentifiers(request.message)
      
      logger.info('Device resolution completed', {
        sessionId: request.sessionId,
        devicesFound: matchedDevices.length,
        deviceNames: matchedDevices.map(d => d.Name),
        deviceIds: matchedDevices.map(d => d.ID)
      })

      // Enhance user message with device context for AI
      let enhancedMessage = request.message
      if (deviceContext) {
        enhancedMessage += deviceContext
      }

      // Get AI response with potential tool calls
      const aiResponse = await zaiService.sendMessage(
        enhancedMessage,
        request.conversationHistory || []
      )

      const toolsUsed: string[] = []
      const executionResults: any[] = []
      let finalResponse = aiResponse.content
      let executionRound = 1  // Move declaration outside the if block

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

        // Multi-round tool execution loop - continue while AI generates tool calls
        let nextAiResponse: any
        
        do {
          logger.info('Tool execution round completed', {
            executionRound,
            sessionId: request.sessionId,
            toolsUsedThisRound: toolsUsed.length
          })

          // Ask AI to process tool results and possibly generate more tool calls
          nextAiResponse = await zaiService.sendMessage(
            'Based on the tool results, continue executing any necessary tools. If all required work is done, provide a summary.',
            updatedHistory
          )

          // Add AI response to history
          updatedHistory.push({
            role: 'assistant' as const,
            content: nextAiResponse.content,
            tool_calls: nextAiResponse.tool_calls
          })

          // Execute new tool calls if any
          if (nextAiResponse.tool_calls && nextAiResponse.tool_calls.length > 0) {
            logger.info('Processing additional tool calls', {
              executionRound,
              toolCount: nextAiResponse.tool_calls.length,
              tools: nextAiResponse.tool_calls.map((t: any) => t.function.name)
            })

            for (const toolCall of nextAiResponse.tool_calls) {
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
                  executionRound,
                  toolName: toolCall.function.name,
                  resultSize: JSON.stringify(result).length
                })

              } catch (error: any) {
                logger.error('Tool execution failed', {
                  executionRound,
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

            executionRound++
          }

        } while (nextAiResponse.tool_calls && nextAiResponse.tool_calls.length > 0)

        finalResponse = nextAiResponse.content || finalResponse
      } else {
        // No tool calls were made, so executionRound remains 1
        executionRound = 1
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
        executionRounds: executionRound,
        totalToolsUsed: toolsUsed.length,
        toolsUsed: toolsUsed,
        responseLength: finalResponse.length,
        hasUsage: !!(aiResponse.usage),
        executionResultsCount: executionResults.length
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