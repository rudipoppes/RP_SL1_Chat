import express from 'express'
import logger from '../utils/logger'

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      },
    }

    logger.info('Health check accessed', { ip: req.ip })
    res.json(healthData)
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    })
  }
})

export default router