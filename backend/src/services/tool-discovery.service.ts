/**
 * Tool Discovery Service
 * Dynamically discovers and caches tools from MCP server
 * Provides single source of truth for AI tool definitions
 */

import { mcpService, MCPTool } from './mcp.service'
import logger from '../utils/logger'
import config from '../utils/config'

export interface CachedTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, any>
      required: string[]
    }
  }
}

export interface ToolCacheStatus {
  isInitialized: boolean
  lastSync: Date | null
  toolCount: number
  syncStatus: 'healthy' | 'stale' | 'error' | 'syncing'
  mcpConnected: boolean
  nextSyncIn: number // seconds
}

/**
 * Manages dynamic tool discovery and caching from MCP server
 * Follows enterprise patterns with proper error handling and fallback mechanisms
 */
export class ToolDiscoveryService {
  private static instance: ToolDiscoveryService
  private tools: CachedTool[] = []
  private lastSync: Date | null = null
  private isInitialized = false
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private readonly SYNC_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY_MS = 5000 // 5 seconds

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ToolDiscoveryService {
    if (!ToolDiscoveryService.instance) {
      ToolDiscoveryService.instance = new ToolDiscoveryService()
    }
    return ToolDiscoveryService.instance
  }

  /**
   * Initialize tool discovery service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('ToolDiscoveryService already initialized', { service: 'ToolDiscoveryService' })
      return
    }

    try {
      logger.info('Initializing ToolDiscoveryService', {
        cacheTTL: this.CACHE_TTL_MS,
        syncInterval: this.SYNC_INTERVAL_MS,
        service: 'ToolDiscoveryService'
      })

      // Initial sync
      await this.syncToolsWithRetry()

      // Start periodic sync
      this.startPeriodicSync()

      this.isInitialized = true
      this.lastSync = new Date()

      logger.info('ToolDiscoveryService initialized successfully', {
        toolCount: this.tools.length,
        toolNames: this.tools.map(t => t.function.name),
        service: 'ToolDiscoveryService'
      })

    } catch (error: any) {
      logger.error('Failed to initialize ToolDiscoveryService', {
        error: error.message,
        stack: error.stack,
        service: 'ToolDiscoveryService'
      })

      // Don't throw - allow service to continue with fallback tools
      this.isInitialized = true
      logger.warn('ToolDiscoveryService continuing with fallback tools', { service: 'ToolDiscoveryService' })
    }
  }

  /**
   * Get all available tools for AI
   */
  async getToolsForAI(): Promise<CachedTool[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      // Check if cache is stale
      if (this.isCacheStale() && !this.syncInProgress) {
        // Trigger async refresh but don't wait
        this.syncToolsAsync()
      }

      return [...this.tools] // Return copy to prevent mutations

    } catch (error: any) {
      logger.error('Failed to get tools for AI', {
        error: error.message,
        service: 'ToolDiscoveryService'
      })

      // Return cached tools even if there's an error
      return [...this.tools]
    }
  }

  /**
   * Get service status for monitoring
   */
  getServiceStatus(): ToolCacheStatus {
    const now = new Date()
    const nextSyncIn = this.lastSync 
      ? Math.max(0, this.CACHE_TTL_MS - (now.getTime() - this.lastSync.getTime())) / 1000
      : 0

    let syncStatus: ToolCacheStatus['syncStatus'] = 'healthy'
    
    if (this.syncInProgress) {
      syncStatus = 'syncing'
    } else if (this.isCacheStale()) {
      syncStatus = 'stale'
    } else if (this.tools.length === 0) {
      syncStatus = 'error'
    }

    return {
      isInitialized: this.isInitialized,
      lastSync: this.lastSync,
      toolCount: this.tools.length,
      syncStatus,
      mcpConnected: this.lastSync !== null,
      nextSyncIn: Math.round(nextSyncIn)
    }
  }

  /**
   * Force immediate tool sync
   */
  async forceSync(): Promise<void> {
    logger.info('Force sync requested', { service: 'ToolDiscoveryService' })
    await this.syncToolsWithRetry()
  }

  /**
   * Check if cache is stale
   */
  private isCacheStale(): boolean {
    if (!this.lastSync || this.tools.length === 0) {
      return true
    }

    const now = new Date()
    const age = now.getTime() - this.lastSync.getTime()
    return age > this.CACHE_TTL_MS
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      if (!this.syncInProgress) {
        await this.syncToolsAsync()
      }
    }, this.SYNC_INTERVAL_MS)

    logger.info('Started periodic tool sync', {
      interval: this.SYNC_INTERVAL_MS,
      service: 'ToolDiscoveryService'
    })
  }

  /**
   * Synchronous tool sync with retry logic
   */
  private async syncToolsWithRetry(): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        await this.syncTools()
        return // Success - exit retry loop

      } catch (error: any) {
        lastError = error
        logger.warn('Tool sync attempt failed', {
          attempt,
          maxAttempts: this.MAX_RETRY_ATTEMPTS,
          error: error.message,
          service: 'ToolDiscoveryService'
        })

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY_MS)
        }
      }
    }

    // All attempts failed - use fallback tools
    logger.error('All tool sync attempts failed, using fallback tools', {
      attempts: this.MAX_RETRY_ATTEMPTS,
      lastError: lastError?.message,
      service: 'ToolDiscoveryService'
    })

    this.loadFallbackTools()
  }

  /**
   * Synchronize tools from MCP server
   */
  private async syncTools(): Promise<void> {
    if (this.syncInProgress) {
      logger.debug('Tool sync already in progress', { service: 'ToolDiscoveryService' })
      return
    }

    this.syncInProgress = true

    try {
      logger.debug('Starting tool sync from MCP server', { service: 'ToolDiscoveryService' })

      const mcpTools = await mcpService.getAvailableTools()
      
      // Transform MCP tools to AI format
      this.tools = mcpTools.map(mcpTool => this.transformMcpToolToAIFormat(mcpTool))
      
      this.lastSync = new Date()

      logger.info('Tool sync completed successfully', {
        toolCount: this.tools.length,
        toolNames: this.tools.map(t => t.function.name),
        service: 'ToolDiscoveryService'
      })

    } catch (error: any) {
      logger.error('Tool sync failed', {
        error: error.message,
        stack: error.stack,
        service: 'ToolDiscoveryService'
      })
      throw error
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Asynchronous tool sync (fire and forget)
   */
  private async syncToolsAsync(): Promise<void> {
    try {
      await this.syncTools()
    } catch (error: any) {
      logger.warn('Async tool sync failed', {
        error: error.message,
        service: 'ToolDiscoveryService'
      })
      // Don't rethrow - this is async fire-and-forget
    }
  }

  /**
   * Transform MCP tool format to AI tool format
   */
  private transformMcpToolToAIFormat(mcpTool: MCPTool): CachedTool {
    return {
      type: "function",
      function: {
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: this.normalizeToolParameters(mcpTool.inputSchema)
      }
    }
  }

  /**
   * Normalize tool parameters to ensure consistent format
   */
  private normalizeToolParameters(inputSchema: any): {
    type: "object"
    properties: Record<string, any>
    required: string[]
  } {
    try {
      // Handle different input schema formats
      if (!inputSchema) {
        return {
          type: "object",
          properties: {},
          required: []
        }
      }

      // Extract properties and required fields
      let properties: Record<string, any> = {}
      let required: string[] = []

      if (inputSchema.properties && typeof inputSchema.properties === 'object') {
        properties = { ...inputSchema.properties }
      }

      if (Array.isArray(inputSchema.required)) {
        required = [...inputSchema.required]
      }

      // Ensure proper structure for each property
      Object.keys(properties).forEach(key => {
        const prop = properties[key]
        if (typeof prop !== 'object' || prop === null) {
          properties[key] = { type: 'string', description: `Property ${key}` }
        } else if (!prop.type) {
          properties[key] = { ...prop, type: prop.type || 'string' }
        }
      })

      return {
        type: "object",
        properties,
        required
      }

    } catch (error: any) {
      logger.warn('Failed to normalize tool parameters, using fallback', {
        error: error.message,
        inputSchema,
        service: 'ToolDiscoveryService'
      })

      return {
        type: "object",
        properties: {},
        required: []
      }
    }
  }

  /**
   * Load fallback tools when MCP server is unavailable
   */
  private loadFallbackTools(): void {
    logger.warn('Loading fallback tools', { service: 'ToolDiscoveryService' })

    this.tools = [
      {
        type: "function",
        function: {
          name: "list_devices",
          description: "List all network devices managed by Restorepoint",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_device", 
          description: "Add a new device to the Restorepoint management system",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Device name (1-200 characters)" },
              type: { type: "string", description: "Device type identifier (e.g., cisco-ios, palo-alto, linux)" },
              credentials: { 
                type: "object", 
                properties: {
                  username: { type: "string", description: "Device username" },
                  password: { type: "string", description: "Device password" }
                },
                required: ["username", "password"]
              },
              ipAddress: { type: "string", description: "Device IP address" },
              hostname: { type: "string", description: "Device hostname" },
              description: { type: "string", description: "Device description" },
              enabled: { type: "boolean", description: "Whether device is enabled" }
            },
            required: ["name", "type", "credentials"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_device_requirements",
          description: "Get comprehensive device creation requirements including supported types and examples",
          parameters: {
            type: "object",
            properties: {
              deviceType: { type: "string", description: "Optional: Get requirements for specific device type" }
            },
            required: []
          }
        }
      }
    ]

    this.lastSync = new Date()
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ToolDiscoveryService', { service: 'ToolDiscoveryService' })

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    this.isInitialized = false
    this.tools = []
    this.lastSync = null

    logger.info('ToolDiscoveryService shut down successfully', { service: 'ToolDiscoveryService' })
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const toolDiscoveryService = ToolDiscoveryService.getInstance()