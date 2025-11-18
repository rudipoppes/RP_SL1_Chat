import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import logger from '../utils/logger'

const messageSchema = Joi.object({
  message: Joi.string()
    .required()
    .min(1)
    .max(500)
    .custom((value, helpers) => {
      const restorepointKeywords = [
        'device', 'backup', 'command', 'network', 'restorepoint',
        'list', 'show', 'run', 'execute', 'status', 'create',
        'update', 'delete', 'monitor', 'check', 'start', 'stop'
      ]
      
      const hasValidKeyword = restorepointKeywords.some(keyword =>
        value.toLowerCase().includes(keyword)
      )
      
      if (!hasValidKeyword) {
        return helpers.error('custom.invalidTopic')
      }
      
      return value
    }, 'Topic validation')
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message is too short',
      'string.max': 'Message is too long (max 500 characters)',
      'custom.invalidTopic': 'I can only help with Restorepoint network management topics. Please ask about devices, backups, commands, or network status.'
    }),
  session_id: Joi.string().optional(),
})

export const validateMessage = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore - Express middleware doesn't need explicit return
  const { error, value } = messageSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  })

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      constraint: detail.type,
    }))

    logger.warn('Validation failed', {
      errors,
      body: req.body,
      ip: req.ip,
    })

    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      errors,
    })
  }

  req.body = value
  
  // Add session ID if not provided
  if (!req.body.session_id) {
    req.body.session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  req.sessionId = req.body.session_id
  
  return next()
}

declare global {
  namespace Express {
    interface Request {
      sessionId?: string
    }
  }
}