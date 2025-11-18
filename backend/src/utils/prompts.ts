export const RESTOREPOINT_SYSTEM_PROMPT = `
You are a Restorepoint network management assistant. You can ONLY help with Restorepoint-related tasks.

## AVAILABLE MCP TOOLS:
1. **list_devices** - List all network devices
2. **create_device** - Add a new device to the network  
3. **update_device** - Update device configuration
4. **delete_device** - Remove a device from the network
5. **list_backups** - List backup history and status
6. **create_backup** - Run backup on specified device
7. **get_backup** - Get backup details and status
8. **list_commands** - List command execution history
9. **execute_command** - Run command on device
10. **get_command** - Get command execution details
11. **get_status** - Get device and network status

## RULES:
1. **NEVER answer questions outside Restorepoint domain**
2. **ALWAYS use available MCP tools** when relevant
3. **If asked about general topics**: "I can only help with Restorepoint network management topics. Please ask about devices, backups, commands, or network status."
4. **Be professional and technical** - you're talking to network engineers
5. **Focus on actionable tasks** - what can be done with the available tools
6. **Explain what you're doing** - show which tools you're using
7. **Provide clear, concise responses**

## RESPONSE FORMAT:
- Use tools when appropriate
- Explain what action you're taking
- Provide clear results
- If no tools are needed for a Restorepoint question, answer directly

Remember: You are a professional network management assistant, not a general AI chatbot.
`

export const RESTOREPOINT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_devices",
      description: "List all network devices managed by Restorepoint",
      parameters: {
        type: "object" as const,
        properties: {},
        required: [] as string[]
      }
    }
  },
  {
    type: "function" as const, 
    function: {
      name: "create_device",
      description: "Add a new device to the Restorepoint management system",
      parameters: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const, description: "Device name" },
          ip_address: { type: "string" as const, description: "Device IP address" },
          device_type: { type: "string" as const, description: "Device type (router, switch, firewall, etc.)" },
          description: { type: "string" as const, description: "Device description" }
        },
        required: ["name", "ip_address", "device_type"] as string[]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "list_backups", 
      description: "List backup history and current status",
      parameters: {
        type: "object" as const,
        properties: {
          device_id: { type: "string" as const, description: "Optional: Filter by specific device" }
        },
        required: [] as string[]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_backup",
      description: "Run backup operation on specified device",
      parameters: {
        type: "object" as const, 
        properties: {
          device_id: { type: "string" as const, description: "Device ID to backup" },
          backup_type: { type: "string" as const, description: "Type of backup (full, incremental, config)" }
        },
        required: ["device_id"] as string[]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_status",
      description: "Get current status of devices and network",
      parameters: {
        type: "object" as const,
        properties: {
          device_id: { type: "string" as const, description: "Optional: Get status for specific device" }
        },
        required: [] as string[]
      }
    }
  }
]