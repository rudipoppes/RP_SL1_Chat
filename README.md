# RP_SL1_Chat - Restorepoint Management Chat Interface

A professional chat interface for managing Restorepoint network devices through MCP tools.

## 🚀 Features

- **Dynamic Tool Discovery**: Automatically discovers tools from MCP server with real-time synchronization
- **Intelligent Caching**: Smart tool caching with 5-minute TTL and automatic fallback mechanisms
- **Topic Control**: AI assistant that ONLY handles Restorepoint-related tasks
- **HTTP Architecture**: Clean HTTP-based communication with MCP server (no stdio complexity)
- **z.ai Integration**: Advanced AI processing with GLM-4.6 model with dynamic tool injection
- **Professional UI**: Clean interface designed for network engineers
- **Real-time Responses**: Streaming chat experience with tool execution
- **Strict Validation**: Input and output validation for network management only
- **Error Resilience**: Multiple fallback layers and automatic service recovery
- **Health Monitoring**: Comprehensive service health tracking and reporting

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- MCP server running with HTTP mode enabled (`ENABLE_HTTP_SERVER=true`)
- z.ai API key (required for AI functionality)
- Restorepoint API credentials (configured in MCP server)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd RP_SL1_Chat

# Run the local setup script
./deployment/scripts/setup-local.sh

# Or manually install dependencies
npm run install:all

# Copy environment template
cp .env.example .env

# IMPORTANT: Edit .env and add your z.ai API key
nano .env

# Add your ZAI_API_KEY to enable AI functionality
# ZAI_API_KEY=your_actual_zai_api_key_here
```

### Development

```bash
# Start both frontend and backend
npm run dev

# Start individually
npm run dev:frontend  # Frontend: http://localhost:3001
npm run dev:backend   # Backend:  http://localhost:4001
```

## 🏗️ Project Structure

```
RP_SL1_Chat/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities and constants
│   ├── public/             # Static files
│   └── package.json        # Frontend dependencies
├── backend/                  # Node.js API Gateway
│   ├── src/
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   └── package.json        # Backend dependencies
├── deployment/               # Deployment scripts and configs
│   ├── scripts/            # Setup and deployment scripts
│   ├── nginx/              # Nginx configuration
│   └── systemd/            # Systemd service files
├── TODO.md                  # Implementation tracking
├── package.json            # Root package.json
└── .env.example            # Environment variables template
```

## 🏗️ Architecture

### HTTP-Based Communication

The chat interface uses a clean HTTP architecture for communication with the MCP server:

```
Frontend (React) → Backend API → HTTP Client → MCP Server (HTTP mode)
     localhost:3001    localhost:4001    localhost:3000
```

### Key Components

1. **Frontend**: React SPA providing the chat interface
2. **Backend API**: Express server handling chat requests and AI integration
3. **z.ai Service**: Processes natural language and generates tool calls with dynamic tool injection
4. **Tool Discovery Service**: Dynamically discovers and caches tools from MCP server
5. **MCP HTTP Bridge**: Translates tool calls to HTTP requests
6. **MCP Server**: Runs in HTTP mode (`ENABLE_HTTP_SERVER=true`)

### Data Flow

1. User sends message via chat interface
2. Backend validates topic (Restorepoint-only)
3. Tool Discovery Service provides dynamic tools to z.ai
4. z.ai processes message and generates tool calls using real-time MCP server schemas
5. MCP HTTP bridge executes tools via HTTP API
6. Results are formatted and returned to user

### Dynamic Tool Discovery

The system now features **real-time tool discovery** that automatically:

- **Discovers** all available tools from the MCP server on startup
- **Caches** tool definitions with 5-minute TTL for performance
- **Refreshes** tools every 2 minutes to stay synchronized
- **Falls back** to cached tools if MCP server becomes unavailable
- **Validates** tool schemas against actual MCP server implementation

This eliminates the need for static tool definitions and ensures the AI always has access to the latest available tools with accurate schemas.

### Configuration

- **Chat Backend**: Uses `.env` file for z.ai API key and MCP server connection
- **MCP Server**: Uses `config.json` for Restorepoint API credentials
- **HTTP Mode**: MCP server must run with `ENABLE_HTTP_SERVER=true`

## 💬 Usage

1. Open http://localhost:3001 in your browser
2. Use suggested questions or ask about:
   - Device management
   - Backup operations  
   - Command execution
   - Network monitoring

### Example Questions
- "Show me all devices on the network"
- "Which devices need backup?"
- "Run a backup on device X"
- "Show recent command executions"
- "What's the status of device Y?"

## 🔒 Topic Restrictions

The chat interface is designed to ONLY assist with Restorepoint network management tasks. It will refuse to answer general questions or provide non-Restorepoint assistance.

### Valid Topics
- Device management (list, create, update, delete)
- Backup operations (list, get, create)
- Command execution (list, get)
- Network monitoring and status

### Invalid Topics
- Weather, news, general knowledge
- Non-network related questions
- Jokes, entertainment, personal advice

## 🛠️ Development

### Scripts
```bash
# Development
npm run dev              # Start both services
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Building
npm run build            # Build both
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Testing
npm test                 # Run all tests
npm run test:frontend    # Frontend tests
npm run test:backend     # Backend tests

# Code Quality
npm run lint             # Lint all code
npm run lint:fix         # Auto-fix linting issues

# Maintenance
npm run clean            # Clean node_modules and dist
npm run install:all      # Install all dependencies
```

## 🚀 Production Deployment

### Prerequisites
- AWS EC2 instance (Amazon Linux 2)
- Domain name (optional)
- SSL certificate (optional)

### AWS Deployment

```bash
# Deploy to AWS EC2
./deployment/scripts/deploy-chat-to-aws.sh \
  --ip 1.2.3.4 \
  --key ~/.ssh/my-key.pem \
  --repo https://github.com/user/RP_SL1_Chat.git
```

### Manual Deployment Steps

1. **Server Setup**
   ```bash
   sudo yum update -y
   sudo yum install -y git nginx
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   ```

2. **Application Setup**
   ```bash
   git clone <repository-url>
   cd RP_SL1_Chat
   npm run install:all
   npm run build
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Service Configuration**
   ```bash
   sudo cp deployment/systemd/chat-backend.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable chat-backend
   sudo systemctl start chat-backend
   ```

4. **Nginx Configuration**
   ```bash
   sudo cp deployment/nginx/chat-app.conf /etc/nginx/conf.d/
   sudo rm /etc/nginx/conf.d/default.conf
   sudo systemctl restart nginx
   ```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Frontend
VITE_APP_API_URL=http://localhost:4001/api
VITE_APP_TITLE=Restorepoint Chat Interface

# Backend
NODE_ENV=development
PORT=4001
ZAI_API_KEY=your_zai_api_key_here
# MCP_SERVER_PATH=../RP_SL1_MCP  # DEPRECATED - Use HTTP architecture instead
MCP_SERVER_HOST=localhost
MCP_SERVER_PORT=3000

# Security
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
LOG_LEVEL=debug
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production Variables
```env
NODE_ENV=production
ZAI_API_KEY=production_zai_key
ALLOWED_ORIGINS=https://your-chat-domain.com
LOG_LEVEL=warn
```

## 🔍 Monitoring & Troubleshooting

### Health Check
- Frontend: http://localhost:3001
- Backend API: http://localhost:4001/api/health

### Logs
```bash
# Backend logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# Systemd service logs (production)
sudo journalctl -u chat-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Service Status
```bash
# Development
npm run dev

# Production
sudo systemctl status chat-backend
sudo systemctl status nginx
```

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:4001/api/health

# Chat endpoint
curl -X POST http://localhost:4001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me all devices"}'
```

### Validation Testing
```bash
# Test invalid input
curl -X POST http://localhost:4001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather?"}'
```

## 🤝 Contributing

1. Follow the coding standards defined in `CLAUDE.md`
2. Run tests before committing
3. Use atomic commits with clear messages
4. Create pull requests for review

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the logs in `backend/logs/`
2. Verify environment variables are set correctly
3. Ensure MCP server is running and accessible
4. Check network connectivity between services

---

**Built with ❤️ for network engineers**