# 🚀 QUICK START - 2 Minutes

```bash
# Terminal 1: Start MCP Server (HTTP Mode)
cd RP_SL1_MCP
ENABLE_HTTP_SERVER=true npm run dev

# Terminal 2: Start Chat Interface
cd RP_SL1_Chat  
npm run dev

# Open Browser
open http://localhost:3001
```

**Test with:** 
- "show devices" 
- "what is required to add a device?" (Now gives accurate requirements!)

**🆕 v2.1.0 Features:**
- ✅ **Dynamic Tool Discovery** - Automatically discovers all tools from MCP server
- ✅ **Accurate Device Requirements** - No more incorrect IP/DeviceType requirements
- ✅ **Real-time Synchronization** - Tools refresh every 2 minutes
- ✅ **Intelligent Caching** - 5-minute TTL for performance

**Requirements:**
- ✅ Both repos cloned side-by-side
- ✅ z.ai API key in `RP_SL1_Chat/.env`
- ✅ Restorepoint credentials in `RP_SL1_MCP/config.json`

**Ports:**
- Frontend: http://localhost:3001
- Backend: http://localhost:4001  
- MCP Server: http://localhost:3000

**Full Guide:** See `HTTP_STARTUP_GUIDE.md`