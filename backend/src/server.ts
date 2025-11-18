import app from './app'
import config from './utils/config'
import logger from './utils/logger'

const PORT = config.PORT || 4001

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`)
  logger.info(`Health check available at http://localhost:${PORT}/health`)
})

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`)
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