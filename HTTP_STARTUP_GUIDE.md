# 🚀 HTTP Architecture Startup Guide

## **QUICK START - 5 MINUTES TO RUNNING CHAT**

### **Prerequisites**
- ✅ Node.js 18+ installed
- ✅ Both repositories cloned: `RP_SL1_Chat` and `RP_SL1_MCP`
- ✅ z.ai API key
- ✅ Restorepoint API credentials

### **1. Start MCP Server (HTTP Mode Required)**
```bash
cd RP_SL1_MCP
ENABLE_HTTP_SERVER=true npm run dev
```
**Result**: MCP server running on http://localhost:3000 with HTTP endpoints

### **2. Start Chat Interface**
```bash
cd RP_SL1_Chat
npm run dev
```
**Result**: 
- Frontend: http://localhost:3001
- Backend: http://localhost:4001

### **3. Use the Chat**
Open http://localhost:3001 and ask:
- "Show me all devices"
- "Create a backup for router X"
- "What's the network status?"

---

## **🏗️ ARCHITECTURE OVERVIEW**

### **HTTP-First Design**
```
┌─────────────┐    HTTP    ┌─────────────┐    HTTP    ┌─────────────┐
│   Frontend  │ ────────►  │   Backend   │ ────────►  │ MCP Server  │
│  (React)    │           │ (Express)   │           │(HTTP Mode) │
│  :3001      │           │  :4001      │           │   :3000     │
└─────────────┘           └─────────────┘           └─────────────┘
       │                           │                           │
       │                      z.ai API                   Restorepoint
       │                           │                           │
       └───────────────────────────┼───────────────────────────┘
                                   │
                              AI Processing
```

### **Component Responsibilities**

| Component | Role | HTTP Endpoints |
|-----------|------|----------------|
| **Frontend** | Chat UI | `/` (React SPA) |
| **Backend** | AI + HTTP Client | `/api/chat` |
| **MCP Server** | Tool Execution | `/tools/execute`, `/health`, `/info` |

---

## **📋 STEP-BY-STEP SETUP**

### **Step 1: MCP Server Setup**
```bash
# Clone MCP server
git clone <mcp-repo-url> RP_SL1_MCP
cd RP_SL1_MCP

# Install dependencies
npm install

# Configure Restorepoint credentials
cp config.example.json config.json
# Edit config.json with your Restorepoint API details

# Start HTTP server (REQUIRED for web integration)
ENABLE_HTTP_SERVER=true npm run dev
```

**Verify MCP Server:**
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","server":"RP_SL1_API",...}
```

### **Step 2: Chat Interface Setup**
```bash
# Clone chat interface  
git clone <chat-repo-url> RP_SL1_Chat
cd RP_SL1_Chat

# Install all dependencies
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env and add your ZAI_API_KEY

# Start both frontend and backend
npm run dev
```

**Verify Chat Interface:**
- Frontend: http://localhost:3001
- Backend Health: `curl http://localhost:4001/api/health`

### **Step 3: Test Integration**
1. Open http://localhost:3001
2. Send message: "show devices"
3. **Expected Flow:**
   - Frontend → Backend → z.ai → Tool Call → MCP Server → Response
   - Should see device list from Restorepoint

---

## **🔧 CONFIGURATION DETAILS**

### **Chat Backend (.env)**
```bash
# AI Configuration
ZAI_API_KEY=your_zai_api_key_here

# MCP Server Connection (HTTP)
MCP_SERVER_HOST=localhost
MCP_SERVER_PORT=3000
# MCP_SERVER_PATH=../RP_SL1_MCP  # DEPRECATED - use HTTP instead
```

### **MCP Server (config.json)**
```json
{
  "restorepoint": {
    "serverUrl": "https://your-restorepoint-server.com",
    "token": "your-restorepoint-api-token",
    "apiVersion": "v2"
  },
  "mcp": {
    "serverName": "RP_SL1_MCP",
    "logLevel": "info"
  }
}
```

---

## **🚀 STARTUP COMMANDS**

### **Option 1: Start Everything (Recommended)**
```bash
# Terminal 1: Start MCP server
cd RP_SL1_MCP && ENABLE_HTTP_SERVER=true npm run dev

# Terminal 2: Start chat interface  
cd RP_SL1_Chat && npm run dev
```

### **Option 2: Single Command**
```bash
cd RP_SL1_Chat && npm run dev:full
```
*(Starts MCP server + chat backend + frontend)*

### **Option 3: Individual Components**
```bash
# MCP server only
cd RP_SL1_MCP && ENABLE_HTTP_SERVER=true npm run dev

# Chat backend only
cd RP_SL1_Chat && npm run dev:backend

# Chat frontend only  
cd RP_SL1_Chat && npm run dev:frontend
```

---

## **❌ TROUBLESHOOTING**

### **"MCP server not reachable"**
**Cause**: MCP server not running in HTTP mode
**Fix**: 
```bash
cd RP_SL1_MCP
ENABLE_HTTP_SERVER=true npm run dev
```

### **"Invalid z.ai API key"**
**Cause**: Missing or wrong ZAI_API_KEY in .env
**Fix**: Edit `.env` file and add valid API key

### **"No Restorepoint connection"** 
**Cause**: Wrong credentials in config.json
**Fix**: Verify `serverUrl` and `token` in `RP_SL1_MCP/config.json`

### **Chat loads but no responses**
**Cause**: Backend can't connect to MCP server
**Fix**: Check MCP server is running on port 3000
```bash
curl http://localhost:3000/health
```

---

## **🧪 TESTING THE SYSTEM**

### **Test 1: Health Checks**
```bash
# MCP Server
curl http://localhost:3000/health

# Chat Backend  
curl http://localhost:4001/api/health

# Frontend (should load React app)
curl http://localhost:3001
```

### **Test 2: API Endpoints**
```bash
# Test MCP tool execution
curl -X POST http://localhost:3000/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"list_devices","arguments":{}}'

# Test chat endpoint
curl -X POST http://localhost:4001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"show devices"}'
```

### **Test 3: Full Integration**
1. Open http://localhost:3001
2. Send: "What devices are on my network?"
3. **Should**: See device list from your Restorepoint server

---

## **📊 PRODUCTION DEPLOYMENT**

### **Quick Production Setup**
```bash
# Deploy MCP Server
cd RP_SL1_MCP
npm run build
ENABLE_HTTP_SERVER=true NODE_ENV=production node dist/server.js

# Deploy Chat Interface
cd RP_SL1_Chat  
npm run build
npm run prod:start
```

### **Docker Deployment**
```bash
# MCP Server
cd RP_SL1_MCP
ENABLE_HTTP_SERVER=true npm run docker:prod

# Chat Interface
cd RP_SL1_Chat
npm run docker:prod
```

---

## **✅ SUCCESS CRITERIA**

You'll know it's working when:
- ✅ MCP server health endpoint returns `{"status":"healthy"}`
- ✅ Chat frontend loads at http://localhost:3001
- ✅ Chat messages like "show devices" return actual device data
- ✅ No "MCP server not reachable" errors
- ✅ Tool execution shows real Restorepoint data

---

**🎯 THAT'S IT! You now have a fully functional Restorepoint chat interface running on clean HTTP architecture!**