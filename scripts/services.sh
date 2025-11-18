#!/bin/bash

set -e

# =============================================================================
# RP_SL1_Chat - Start and Stop Script
# Chat Interface with Realtime Communication
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# =============================================================================
# SERVICES STATUS CHECKS
# =============================================================================

check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $service_name (Port $port) - RUNNING"
        return 0
    else
        echo -e "${RED}❌${NC} $service_name (Port $port) - NOT RUNNING"
        return 1
    fi
}

check_all_services() {
    print_header "SERVICE STATUS CHECK"
    
    echo "Checking all required services..."
    
    FRONTEND_RUNNING=$(check_service "Frontend" 3001 "http://localhost:3001" && echo "" || true)
    BACKEND_RUNNING=$(check_service "Backend" 4001 "http://localhost:4001/api/health" && echo "" || true)
    MCP_RUNNING=$(check_service "MCP Server" 3000 "http://localhost:3000/health" && echo "" || true)
    
    if [ "$FRONTEND_RUNNING" = "0" ] || [ "$BACKEND_RUNNING" = "0" ] || [ "$MCP_RUNNING" = "0" ]; then
        print_error "Some services are not running!"
        echo ""
        echo "Use './scripts/start-services.sh' to start all services"
        return 1
    else
        print_status "All services are running!"
        echo ""
        echo "Access Points:"
        echo "  • Frontend: http://localhost:3001"
        echo "  • Backend API: http://localhost:4001"
        echo "  • MCP Server: http://localhost:3000"
        return 0
    fi
}

# =============================================================================
# SERVICE MANAGEMENT FUNCTIONS  
# =============================================================================

start_mcp_server() {
    print_header "STARTING MCP SERVER"
    
    cd "$(dirname "$0")/../RP_SL1_MCP"
    if [ ! -f "dist/server.js" ]; then
        print_error "MCP server not built. Run 'npm run build' first."
        return 1
    fi
    
    print_status "Starting MCP Server on port 3000..."
    
    # Start MCP server in background with proper logging
    node -e "
const { RestorepointHttpServer } = require('./dist/server.js');
const server = new RestorepointHttpServer();
server.start().then(() => {
  console.log('✅ MCP Server started successfully on port 3000!');
  console.log('   Health: http://localhost:3000/health');
  console.log('   Info: http://localhost:3000/info');
  console.log('   Tools: http://localhost:3000/tools/execute');
}).catch((error) => {
  console.error('❌ MCP Server failed to start:', error.message);
  process.exit(1);
});
" &
    
    # Give server time to start
    sleep 3
    
    # Verify server started
    if check_service "MCP Server" 3000 "http://localhost:3000/health"; then
        print_status "MCP Server started successfully!"
        return 0
    else
        print_error "MCP Server failed to start properly"
        return 1
    fi
}

stop_mcp_server() {
    print_header "STOPPING MCP SERVER"
    
    print_status "Stopping MCP Server (port 3000)..."
    
    # Kill MCP server processes
    pkill -f "RestorepointHttpServer" 2>/dev/null || true
    pkill -f "node.*dist/server.js" 2>/dev/null || true
    pkill -f "node.*RP_SL1_MCP" 2>/dev/null || true
    
    # Wait for graceful shutdown
    sleep 2
    
    # Verify stopped
    if ! check_service "MCP Server" 3000 "http://localhost:3000/health"; then
        print_status "MCP Server stopped successfully!"
        return 0
    else
        print_error "MCP Server may still be running"
        return 1
    fi
}

start_backend() {
    print_header "STARTING BACKEND API"
    
    cd "$(dirname "$0")"
    print_status "Starting Backend Server on port 4001..."
    
    npm run dev:backend &
    
    # Give server time to start
    sleep 5
    
    # Verify server started
    if check_service "Backend" 4001 "http://localhost:4001/api/health"; then
        print_status "Backend started successfully!"
        return 0
    else
        print_error "Backend failed to start properly"
        return 1
    fi
}

stop_backend() {
    print_header "STOPPING BACKEND API"
    
    print_status "Stopping Backend Server (port 4001)..."
    
    # Kill backend processes
    pkill -f "nodemon.*server" 2>/dev/null || true
    pkill -f "ts-node.*server" 2>/dev/null || true
    pkill -f "node.*4001" 2>/dev/null || true
    
    # Wait for graceful shutdown
    sleep 3
    
    # Verify stopped
    if ! check_service "Backend" 4001 "http://localhost:4001/api/health"; then
        print_status "Backend Server stopped successfully!"
        return 0
    else
        print_error "Backend Server may still be running"
        return 1
    fi
}

start_frontend() {
    print_header "STARTING FRONTEND"
    
    cd "$(dirname "$0")"
    print_status "Starting Frontend on port 3001..."
    
    npm run dev:frontend &
    
    # Give server time to start
    sleep 5
    
    # Verify server started
    if check_service "Frontend" 3001 "http://localhost:3001"; then
        print_status "Frontend started successfully!"
        return 0
    else
        print_error "Frontend failed to start properly"
        return 1
    fi
}

stop_frontend() {
    print_header "STOPPING FRONTEND"
    
    print_status "Stopping Frontend (port 3001)..."
    
    # Kill frontend processes
    pkill -f "vite.*3001" 2>/dev/null || true
    pkill -f "node.*3001" 2>/dev/null || true
    
    # Wait for graceful shutdown
    sleep 3
    
    # Verify stopped
    if ! check_service "Frontend" 3001 "http://localhost:3001"; then
        print_status "Frontend stopped successfully!"
        return 0
    else
        print_error "Frontend may still be running"
        return 1
    fi
}

# =============================================================================
# MAIN COMMAND HANDLING
# =============================================================================

case "$1" in
    "start"|"start-all")
        print_header "STARTING ALL RP_SL1_CHAT SERVICES"
        
        print_status "Starting all required services..."
        
        # Start services in dependency order
        start_mcp_server || exit 1
        sleep 2
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
        
        print_header "SERVICES STARTED SUCCESSFULLY"
        print_status "Access the chat interface at: http://localhost:3001"
        print_status "Backend API available at: http://localhost:4001"
        print_status "MCP Server running at: http://localhost:3000"
        ;;
        
    "stop"|"stop-all")
        print_header "STOPPING ALL RP_SL1_CHAT SERVICES"
        
        print_status "Stopping all services..."
        
        # Stop in reverse dependency order
        stop_frontend
        stop_backend
        stop_mcp_server
        
        print_header "SERVICES STOPPED SUCCESSFULLY"
        ;;
        
    "restart"|"restart-all")
        print_header "RESTARTING ALL RP_SL1_CHAT SERVICES"
        
        print_status "Restarting all services..."
        
        # Stop all services first
        stop_frontend
        stop_backend
        stop_mcp_server
        
        sleep 3
        
        # Start all services
        start_mcp_server || exit 1
        sleep 2
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
        
        print_header "SERVICES RESTARTED SUCCESSFULLY"
        ;;
        
    "status")
        check_all_services
        ;;
        
    "start-mcp"|"start-mcp-server")
        start_mcp_server
        ;;
        
    "stop-mcp"|"stop-mcp-server")
        stop_mcp_server
        ;;
        
    "start-backend")
        start_backend
        ;;
        
    "stop-backend")
        stop_backend
        ;;
        
    "start-frontend")
        start_frontend
        ;;
        
    "stop-frontend")
        stop_frontend
        ;;
        
    "dev"|"dev-all")
        print_header "DEVELOPMENT MODE - STARTING ALL SERVICES"
        
        print_status "Starting all services for development..."
        
        # Start services in dependency order
        start_mcp_server || exit 1
        sleep 2
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
        
        print_header "DEVELOPMENT MODE ACTIVE"
        print_status "All services running in development mode"
        print_status "Access chat interface: http://localhost:3001"
        echo ""
        print_status "Press Ctrl+C to stop all services"
        
        # Wait for interrupt signal
        trap 'echo ""; echo "Stopping all services..."; stop_frontend; stop_backend; stop_mcp_server; exit 0' INT
        while true; do
            sleep 5
            # Check services are still running
            if ! check_service "MCP Server" 3000 "http://localhost:3000/health" \
                || ! check_service "Backend" 4001 "http://localhost:4001/api/health" \
                || ! check_service "Frontend" 3001 "http://localhost:3001"; then
                print_warning "One or more services stopped unexpectedly!"
                break
            fi
        done
        ;;
        
    *)
        echo "RP_SL1_Chat Services Management Script"
        echo ""
        echo "Usage: $0 {command}"
        echo ""
        echo "Service Management:"
        echo "  start, start-all    Start all services"
        echo "  stop, stop-all      Stop all services"
        echo "  restart, restart-all Restart all services"
        echo "  status              Check service status"
        echo "  dev, dev-all       Start all in development mode (auto-restart on changes)"
        echo ""
        echo "Individual Services:"
        echo "  start-mcp, start-mcp-server  Start MCP Server only (port 3000)"
        echo "  stop-mcp, stop-mcp-server   Stop MCP Server only"
        echo "  start-backend        Start Backend API only (port 4001)"
        echo "  stop-backend         Stop Backend API only (port 4001)"
        echo "  start-frontend       Start Frontend only (port 3001)"
        echo "  stop-frontend        Stop Frontend only (port 3001)"
        echo ""
        echo "Examples:"
        echo "  $0 start              # Start all services"
        echo "  $0 stop               # Stop all services"
        echo "  $0 status             # Check what's running"
        echo "  $0 dev                # Start in development mode"
        echo "  $0 start-backend       # Start only backend"
        echo "  $0 stop-mcp-server     # Stop only MCP server"
        exit 0
        ;;
esac

exit 0