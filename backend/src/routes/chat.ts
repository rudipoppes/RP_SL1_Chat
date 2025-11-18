import express from 'express'
import logger from '../utils/logger'
import { validateMessage } from '../middleware/validation'
import { chatService } from '../services/chat.service'

const router = express.Router()

router.post('/', validateMessage, async (req, res) => {
  // @ts-ignore - Express middleware doesn't need explicit return
  try {
    const { message } = req.body
    
    logger.info('Chat message received', { 
      sessionId: req.sessionId,
      messageLength: message.length,
      ip: req.ip 
    })

    // Process the message with the chat service (z.ai + MCP integration)
    const result = await chatService.processMessage({
      message,
      sessionId: req.sessionId || `session_${Date.now()}`,
      conversationHistory: [] // TODO: Implement conversation persistence
    })

    const response = {
      id: Date.now().toString(),
      response: result.response,
      session_id: result.sessionId,
      status: 'success' as const,
      tools_used: result.toolsUsed,
      usage: result.usage,
      execution_results: result.executionResults
    }

    logger.info('Chat message processed successfully', {
      sessionId: result.sessionId,
      toolsUsedCount: result.toolsUsed.length,
      toolsUsed: result.toolsUsed,
      responseLength: result.response.length
    })

    return res.json(response)
    
  } catch (error: any) {
    logger.error('Chat message processing failed:', {
      error: error.message,
      stack: error.stack,
      sessionId: req.sessionId,
      ip: req.ip
    })
    
    // Handle specific error cases
    if (error.message.includes('z.ai API key')) {
      return res.status(500).json({
        error: 'Service configuration error',
        message: 'AI service is not properly configured'
      })
    }
    
    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      })
    }
    
    if (error.message.includes('Chat processing failed')) {
      return res.status(500).json({
        error: 'Processing failed',
        message: 'Failed to process your message. Please try again.'
      })
    }

    res.status(500).json({
      error: 'Failed to process message',
      message: 'An error occurred while processing your request',
    })
  }
})

router.post('/validate', validateMessage, async (_, res) => {
  try {
    // Basic validation already passed in middleware
    res.json({
      valid: true,
      message: 'Message is valid for processing'
    })
    
  } catch (error: any) {
    res.status(422).json({
      valid: false,
      errors: [{
        field: 'message',
        message: error.message,
        constraint: 'format'
      }]
    })
  }
})

router.get('/status', async (_, res) => {
  try {
    const status = await chatService.healthCheck()
    
    res.json({
      status: status.status,
      services: status.services,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    logger.error('Service status check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to check service status',
      services: {
        zai_service: 'error',
        mcp_service: 'error'
      }
    })
  }
})

export default router