import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import config from './utils/config'
import errorHandler from './middleware/errorHandler'
import rateLimitMiddleware from './middleware/rateLimit'
import chatRoutes from './routes/chat'
import healthRoutes from './routes/health'

const app = express()

app.use(helmet())

app.use(cors({
  origin: config.ALLOWED_ORIGINS.split(','),
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(rateLimitMiddleware)

app.use('/api/health', healthRoutes)
app.use('/api/chat', chatRoutes)

app.get('/api', (_, res) => {
  res.json({
    message: 'RP_SL1_Chat Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
})

app.use(errorHandler)

export default app