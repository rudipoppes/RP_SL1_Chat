export const SUGGESTED_QUESTIONS = [
  {
    id: '1',
    text: "Show me all devices on the network",
    category: 'device' as const,
  },
  {
    id: '2', 
    text: "Which devices need backup?",
    category: 'backup' as const,
  },
  {
    id: '3',
    text: "Run a backup on device X",
    category: 'backup' as const,
  },
  {
    id: '4',
    text: "Show recent command executions",
    category: 'command' as const,
  },
  {
    id: '5',
    text: "What's the status of device Y?",
    category: 'status' as const,
  },
]

export const RESTOREPOINT_KEYWORDS = [
  'device', 'backup', 'command', 'network', 'restorepoint',
  'list', 'show', 'run', 'execute', 'status', 'create',
  'update', 'delete', 'monitor', 'check', 'start', 'stop'
]

export const VALIDATION_MESSAGES = {
  EMPTY_INPUT: "Please enter a message",
  INVALID_TOPIC: "I can only help with Restorepoint network management topics. Please ask about devices, backups, commands, or network status.",
  TOO_SHORT: "Message is too short",
  TOO_LONG: "Message is too long (max 500 characters)",
}

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  VALIDATION_ERROR: "Invalid input. Please check your message.",
  TIMEOUT_ERROR: "Request timeout. Please try again.",
}