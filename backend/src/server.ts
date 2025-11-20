import app from './app'
import config from './utils/config'
import logger from './utils/logger'
import { zaiService } from './services/zai.service'
import { mcpService } from './services/mcp.service'
import { toolDiscoveryService } from './services/tool-discovery.service'

const PORT = config.PORT || 4001

/**
 * Initialize services before starting server
 */
async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...')

    // Initialize MCP service first
    await mcpService.initialize()
    logger.info('✓ MCP service initialized')

    // Initialize ZAI service (will also initialize tool discovery)
    await zaiService.initialize()
    logger.info('✓ ZAI service initialized')

    // Tool discovery service status
    const toolStatus = toolDiscoveryService.getServiceStatus()
    logger.info('✓ Tool discovery service initialized', {
      toolCount: toolStatus.toolCount,
      syncStatus: toolStatus.syncStatus
    })

    logger.info('All services initialized successfully')

  } catch (error: any) {
    logger.error('Failed to initialize services', {
      error: error.message,
      stack: error.stack
    })

    // Continue with server startup even if services fail
    // Services can recover independently
    logger.warn('Server starting with degraded service availability')
  }
}

const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`)
  logger.info(`Health check available at http://localhost:${PORT}/health`)
  
  // Initialize services after server is ready
  await initializeServices()
})

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`)
  
  try {
    // Shutdown services gracefully
    logger.info('Shutting down services...')
    
    await toolDiscoveryService.shutdown()
    logger.info('✓ Tool discovery service shut down')
    
    await mcpService.disconnect()
    logger.info('✓ MCP service disconnected')
    
    logger.info('All services shut down successfully')
  } catch (error: any) {
    logger.error('Error during service shutdown', {
      error: error.message,
      stack: error.stack
    })
  }
  
  server.close(() => {
    logger.info('Server closed successfully')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})