/**
 * MCP Service Implementation
 * Connects to remote MCP server via HTTP API
 * Handles tool execution for Restorepoint operations
 */

import { mcpHttpService } from './mcp-http.service'
import config from '../utils/config'
import logger from '../utils/logger'
import type { ZAIService, ToolCall } from './zai.service'

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface McpResult<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
    timestamp?: string
  }
  metadata?: Record<string, unknown>
}

/**
 * MCP Service - connects to remote HTTP MCP server
 * Handles tool execution via HTTP API calls
 */
export class MCPService {
  private isInitialized = false
  private availableTools: MCPTool[] = []

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('MCP service already initialized', { service: 'MCPService' })
      return
    }

    try {
      logger.info('Initializing MCP service', {
        serverHost: config.MCP_SERVER_HOST,
        serverPort: config.MCP_SERVER_PORT,
        baseURL: `http://${config.MCP_SERVER_HOST}:${config.MCP_SERVER_PORT}`,
        service: 'MCPService'
      })

      // Initialize the HTTP client
      await mcpHttpService.initialize()

      // Get available tools from the server
      await this.loadAvailableTools()

      this.isInitialized = true

      logger.info('MCP service initialized successfully', {
        serverHost: config.MCP_SERVER_HOST,
        serverPort: config.MCP_SERVER_PORT,
        toolCount: this.availableTools.length,
        tools: this.availableTools.map(t => t.name),
        service: 'MCPService'
      })

    } catch (error: any) {
      logger.error('Failed to initialize MCP service', {
        serverHost: config.MCP_SERVER_HOST,
        serverPort: config.MCP_SERVER_PORT,
        error: error.message,
        stack: error.stack,
        service: 'MCPService'
      })
      
      this.isInitialized = true // Mark as initialized to prevent retry loops
      throw new Error(`MCP service initialization failed: ${error.message}`)
    }
  }

  /**
   * Load available tools from the MCP server
   */
  private async loadAvailableTools(): Promise<void> {
    try {
      const tools = await mcpHttpService.getAvailableTools()
      
      this.availableTools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters
      }))

      logger.debug('Loaded available tools from MCP server', {
        toolCount: this.availableTools.length,
        tools: this.availableTools.map(t => t.name),
        service: 'MCPService'
      })

    } catch (error: any) {
      logger.warn('Failed to load tools from MCP server, using fallback', {
        error: error.message,
        service: 'MCPService'
      })

      // Fallback to default tools list
      this.availableTools = [
        {
          name: 'list_devices',
          description: 'List all network devices managed by Restorepoint',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 50 },
              offset: { type: 'number', default: 0 },
              sortBy: { type: 'string', enum: ['name', 'type', 'status'], default: 'name' },
              sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
            }
          }
        },
        {
          name: 'get_device',
          description: 'Get detailed information about a specific device',
          inputSchema: {
            type: 'object',
            properties: {
              deviceId: { type: 'string' },
              includeConnections: { type: 'boolean', default: false }
            },
            required: ['deviceId']
          }
        },
        {
          name: 'create_device',
          description: 'Add a new device to the Restorepoint management system',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Device name (1-200 characters)' },
              type: { type: 'string', description: 'Device type identifier (cisco-ios, palo-alto, linux, etc.)' },
              credentials: { 
                type: 'object', 
                properties: {
                  username: { type: 'string', description: 'Device username' },
                  password: { type: 'string', description: 'Device password' }
                },
                required: ['username', 'password']
              },
              ipAddress: { type: 'string', description: 'Device IP address' },
              hostname: { type: 'string', description: 'Device hostname' },
              description: { type: 'string', description: 'Device description' },
              enabled: { type: 'boolean', description: 'Whether device is enabled' }
            },
            required: ['name', 'type', 'credentials']
          }
        },
        {
          name: 'update_device',
          description: 'Update an existing device configuration',
          inputSchema: {
            type: 'object',
            properties: {
              deviceId: { type: 'string' },
              updates: { type: 'object' }
            },
            required: ['deviceId', 'updates']
          }
        },
        {
          name: 'delete_device',
          description: 'Remove a device from the Restorepoint management system',
          inputSchema: {
            type: 'object',
            properties: {
              deviceId: { type: 'string' }
            },
            required: ['deviceId']
          }
        },
        {
          name: 'list_backups',
          description: 'List backup history and current status',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 50 },
              offset: { type: 'number', default: 0 }
            }
          }
        },
        {
          name: 'get_backup',
          description: 'Get detailed information about a specific backup',
          inputSchema: {
            type: 'object',
            properties: {
              backupId: { type: 'string' }
            },
            required: ['backupId']
          }
        },
        {
          name: 'create_backup',
          description: 'Start backup operation on specified devices',
          inputSchema: {
            type: 'object',
            properties: {
              deviceIds: { type: 'array', items: { type: 'string' } },
              backupName: { type: 'string' },
              backupType: { type: 'string', enum: ['full', 'incremental', 'config'] }
            },
            required: ['deviceIds']
          }
        },
        {
          name: 'list_commands',
          description: 'List command execution history',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 50 },
              offset: { type: 'number', default: 0 }
            }
          }
        },
        {
          name: 'get_command',
          description: 'Get details of a specific command execution',
          inputSchema: {
            type: 'object',
            properties: {
              commandId: { type: 'string' }
            },
            required: ['commandId']
          }
        },
        {
          name: 'execute_command',
          description: 'Execute command on devices',
          inputSchema: {
            type: 'object',
            properties: {
              deviceIds: { type: 'array', items: { type: 'string' } },
              command: { type: 'string' },
              timeout: { type: 'number', default: 300 }
            },
            required: ['deviceIds', 'command']
          }
        },
        {
          name: 'get_task_status',
          description: 'Check status of background tasks (backups, commands, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' }
            },
            required: ['taskId']
          }
        },
        {
          name: 'get_device_requirements',
          description: 'Get comprehensive device creation requirements including supported types and examples',
          inputSchema: {
            type: 'object',
            properties: {
              deviceType: { type: 'string', description: 'Optional: Get requirements for specific device type' }
            },
            required: []
          }
        },
        {
          name: 'validate_device_request',
          description: 'Validate device creation request before submission to create_device',
          inputSchema: {
            type: 'object',
            properties: {
              request: { 
                type: 'object', 
                description: 'Device creation request to validate',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  ipAddress: { type: 'string' },
                  hostname: { type: 'string' },
                  credentials: { type: 'object' },
                  description: { type: 'string' },
                  enabled: { type: 'boolean' }
                }
              }
            },
            required: ['request']
          }
        },
        {
          name: 'get_device',
          description: 'Get detailed information about a specific device',
          inputSchema: {
            type: 'object',
            properties: {
              deviceId: { type: 'string', description: 'Unique identifier of the device' },
              includeConnections: { type: 'boolean', default: false, description: 'Include device connection information' }
            },
            required: ['deviceId']
          }
        },
        {
          name: 'get_status',
          description: 'Get device and network status information',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]

      logger.info('Using fallback tool definitions', {
        toolCount: this.availableTools.length,
        tools: this.availableTools.map(t => t.name),
        service: 'MCPService'
      })
    }
  }

  /**
   * Execute a single tool call
   */
  async executeTool(toolCall: ToolCall): Promise<McpResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      logger.info('Executing MCP tool', {
        toolName: toolCall.function.name,
        arguments: toolCall.function.arguments,
        service: 'MCPService'
      })

      const result = await mcpHttpService.executeTool(toolCall)

      if (result.success) {
        logger.info('MCP tool execution successful', {
          toolName: toolCall.function.name,
          hasData: !!result.data,
          metadata: result.metadata,
          service: 'MCPService'
        })

        return {
          success: true,
          data: result.data,
          metadata: result.metadata
        }
      } else {
        logger.warn('MCP tool execution failed', {
          toolName: toolCall.function.name,
          error: result.error,
          metadata: result.metadata,
          service: 'MCPService'
        })

        return {
          success: false,
          error: {
            code: result.error?.code || 'TOOL_EXECUTION_FAILED',
            message: result.error?.message || 'Tool execution failed',
            details: result.error?.details as Record<string, unknown> | undefined
          },
          metadata: result.metadata
        }
      }

    } catch (error: any) {
      logger.error('Failed to execute MCP tool', {
        toolName: toolCall.function.name,
        arguments: toolCall.function.arguments,
        error: error.message,
        stack: error.stack,
        service: 'MCPService'
      })

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Tool execution failed',
          details: {
            toolName: toolCall.function.name,
            arguments: toolCall.function.arguments,
            stack: error.stack
          }
        }
      }
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeTools(toolCalls: ToolCall[]): Promise<McpResult[]> {
    if (!toolCalls || toolCalls.length === 0) {
      return []
    }

    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      logger.info('Executing multiple MCP tools', {
        toolCount: toolCalls.length,
        toolNames: toolCalls.map(call => call.function.name),
        service: 'MCPService'
      })

      const results = await mcpHttpService.executeTools(toolCalls)

      const successCount = results.filter(r => r.success).length
      const errorCount = results.length - successCount

      logger.info('Multiple MCP tools execution completed', {
        total: results.length,
        success: successCount,
        errors: errorCount,
        service: 'MCPService'
      })

      return results.map(result => ({
        success: result.success,
        data: result.data,
        error: result.error ? {
          ...result.error,
          details: result.error.details as Record<string, unknown> | undefined
        } : undefined,
        metadata: result.metadata
      }))

    } catch (error: any) {
      logger.error('Failed to execute multiple MCP tools', {
        toolCount: toolCalls.length,
        error: error.message,
        service: 'MCPService'
      })

      // Return error results for all tools
      return toolCalls.map(toolCall => ({
        success: false,
        error: {
          code: 'BATCH_EXECUTION_ERROR',
          message: error.message || 'Failed to execute tools in batch'
        }
      }))
    }
  }

  /**
   * Get list of available tools
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      logger.debug('Returning available tools', {
        toolCount: this.availableTools.length,
        service: 'MCPService'
      })

      return this.availableTools

    } catch (error: any) {
      logger.error('Failed to get available tools', {
        error: error.message,
        service: 'MCPService'
      })

      // Return empty list on error
      return []
    }
  }

  /**
   * Health check for MCP service
   */
  async healthCheck(): Promise<{ 
    status: string; 
    mcp_connected: boolean;
    details?: any;
    services?: any;
  }> {
    try {
      const health = await mcpHttpService.healthCheck()
      const status = mcpHttpService.getServiceStatus()

      return {
        status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
        mcp_connected: status.initialized && status.health.status === 'connected',
        services: {
          mcp_service: health.status,
          mcp_connected: status.initialized,
          server: health.server,
          version: health.version,
          tools: health.tools,
          uptime: health.uptime,
          responseTime: status.health.responseTime
        }
      }

    } catch (error: any) {
      logger.error('MCP health check failed', {
        error: error.message,
        service: 'MCPService'
      })

      return {
        status: 'unhealthy',
        mcp_connected: false,
        services: {
          mcp_service: 'error',
          mcp_connected: false,
          error: error.message
        }
      }
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from MCP server', {
        service: 'MCPService'
      })

      await mcpHttpService.disconnect()
      this.isInitialized = false

      logger.info('Disconnected from MCP server successfully', {
        service: 'MCPService'
      })

    } catch (error) {
      logger.error('Error during MCP disconnection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'MCPService'
      })
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    initialized: boolean
    connectionStatus: any
    mcpServerPath: string
    toolCount: number
  } {
    const httpStatus = mcpHttpService.getServiceStatus()

    return {
      initialized: this.isInitialized,
      connectionStatus: httpStatus,
      mcpServerPath: `${config.MCP_SERVER_HOST}:${config.MCP_SERVER_PORT}`,
      toolCount: this.availableTools.length
    }
  }
}

// Export singleton instance
export const mcpService = new MCPService()