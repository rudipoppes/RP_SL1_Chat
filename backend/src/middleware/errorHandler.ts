import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'
import config from '../utils/config'

interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err }
  error.message = err.message

  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal server error'

  if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation error'
  } else if (error.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 503
    message = 'Database error'
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  })
}

export default errorHandler