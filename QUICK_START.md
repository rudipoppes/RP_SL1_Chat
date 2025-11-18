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

**Test with:** "show devices"

**Requirements:**
- ✅ Both repos cloned side-by-side
- ✅ z.ai API key in `RP_SL1_Chat/.env`
- ✅ Restorepoint credentials in `RP_SL1_MCP/config.json`

**Ports:**
- Frontend: http://localhost:3001
- Backend: http://localhost:4001  
- MCP Server: http://localhost:3000

**Full Guide:** See `HTTP_STARTUP_GUIDE.md`