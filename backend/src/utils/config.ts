import dotenv from 'dotenv'
import path from 'path'

// Load .env from root directory (three levels up from backend/dist/utils)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

interface Config {
  NODE_ENV: string
  PORT: number
  ZAI_API_KEY: string
  MCP_SERVER_HOST: string
  MCP_SERVER_PORT: number
  MCP_SERVER_PATH: string
  ALLOWED_ORIGINS: string
  LOG_LEVEL: string
  RATE_LIMIT_WINDOW_MS: number
  RATE_LIMIT_MAX_REQUESTS: number
}

const config: Config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4001', 10),
  ZAI_API_KEY: process.env.ZAI_API_KEY || '',
  MCP_SERVER_HOST: process.env.MCP_SERVER_HOST || 'localhost',
  MCP_SERVER_PORT: parseInt(process.env.MCP_SERVER_PORT || '3000', 10),
  MCP_SERVER_PATH: process.env.MCP_SERVER_PATH || '../RP_SL1_MCP',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3000',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
}

export default config