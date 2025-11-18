import rateLimit from 'express-rate-limit'
import config from '../utils/config'
import logger from '../utils/logger'

const rateLimitMiddleware = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    message: `Rate limit exceeded. Please try again in ${Math.ceil(config.RATE_LIMIT_WINDOW_MS / 60000)} minutes.`,
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    })
    
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${Math.ceil(config.RATE_LIMIT_WINDOW_MS / 60000)} minutes.`,
      retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
    })
  },
})

export default rateLimitMiddleware