#!/bin/bash

set -e

# =============================================================================
# RP_SL1_Chat - Frontend and Backend Services Script
# Chat Interface with HTTP API
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
    print_header "CHAT SERVICES STATUS CHECK"
    
    echo "Checking chat services (Frontend + Backend)..."
    
    FRONTEND_RUNNING=$(check_service "Frontend" 3001 "http://localhost:3001" && echo "" || true)
    BACKEND_RUNNING=$(check_service "Backend" 4001 "http://localhost:4001/api/health" && echo "" || true)
    MCP_RUNNING=$(check_service "MCP Server" 3000 "http://localhost:3000/health" && echo "" || true)
    
    if [ "$FRONTEND_RUNNING" = "0" ] || [ "$BACKEND_RUNNING" = "0" ]; then
        print_error "Some chat services are not running!"
        echo ""
        echo "Use './scripts/services.sh start' to start chat services"
        echo "Use '../RP_SL1_MCP/start-mcp-server.sh' to start MCP server"
        return 1
    else
        print_status "All chat services are running!"
        echo ""
        echo "Chat Access Points:"
        echo "  • Frontend: http://localhost:3001"
        echo "  • Backend API: http://localhost:4001"
        echo ""
        if [ "$MCP_RUNNING" = "0" ]; then
            echo "MCP Server: http://localhost:3000"
        else
            print_warning "MCP Server not running - start with:"
            echo "  ../RP_SL1_MCP/start-mcp-server.sh"
        fi
        return 0
    fi
}

# =============================================================================
# CHAT SERVICE MANAGEMENT FUNCTIONS  
# =============================================================================

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
        print_header "STARTING CHAT SERVICES"
        
        print_status "Starting chat services (Frontend + Backend)..."
        
        # Start services in dependency order
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
        
        print_header "CHAT SERVICES STARTED SUCCESSFULLY"
        print_status "Access the chat interface at: http://localhost:3001"
        print_status "Backend API available at: http://localhost:4001"
        echo ""
        echo "Note: MCP Server should be started separately with:"
        echo "  ../RP_SL1_MCP/start-mcp-server.sh"
        ;;
        
    "stop"|"stop-all")
        print_header "STOPPING CHAT SERVICES"
        
        print_status "Stopping chat services..."
        
        # Stop in reverse dependency order
        stop_frontend
        stop_backend
        
        print_header "CHAT SERVICES STOPPED SUCCESSFULLY"
        ;;
        
    "restart"|"restart-all")
        print_header "RESTARTING CHAT SERVICES"
        
        print_status "Restarting chat services..."
        
        # Stop all services first
        stop_frontend
        stop_backend
        
        sleep 3
        
        # Start chat services
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
        
        print_header "CHAT SERVICES RESTARTED SUCCESSFULLY"
        ;;
        
    "status")
        check_all_services
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
        print_header "DEVELOPMENT MODE - CHAT SERVICES"
        
        print_status "Starting chat services for development..."
        
        # Start services in dependency order
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
        
        print_header "DEVELOPMENT MODE ACTIVE"
        print_status "Chat services running in development mode"
        print_status "Access chat interface: http://localhost:3001"
        echo ""
        print_status "Note: MCP Server should be started separately with:"
        echo "  ../RP_SL1_MCP/start-mcp-server.sh"
        echo ""
        print_status "Press Ctrl+C to stop chat services"
        
        # Wait for interrupt signal
        trap 'echo ""; echo "Stopping chat services..."; stop_frontend; stop_backend; exit 0' INT
        while true; do
            sleep 5
            # Check services are still running
            if ! check_service "Backend" 4001 "http://localhost:4001/api/health" \
                || ! check_service "Frontend" 3001 "http://localhost:3001"; then
                print_warning "One or more chat services stopped unexpectedly!"
                break
            fi
        done
        ;;
        
    *)
        echo "RP_SL1_Chat Services Management Script"
        echo ""
        echo "Usage: $0 {command}"
        echo ""
        echo "Chat Service Management:"
        echo "  start, start-all    Start Frontend + Backend"
        echo "  stop, stop-all      Stop Frontend + Backend"
        echo "  restart, restart-all Restart Frontend + Backend"
        echo "  status              Check service status"
        echo "  dev, dev-all       Start in development mode"
        echo ""
        echo "Individual Services:"
        echo "  start-backend        Start Backend API only (port 4001)"
        echo "  stop-backend         Stop Backend API only"
        echo "  start-frontend       Start Frontend only (port 3001)"
        echo "  stop-frontend        Stop Frontend only"
        echo ""
        echo "MCP Server (separate):"
        echo "  ../RP_SL1_MCP/start-mcp-server.sh  Start MCP Server (port 3000)"
        echo ""
        echo "Examples:"
        echo "  $0 start              # Start chat services"
        echo "  $0 stop               # Stop chat services"
        echo "  $0 status             # Check what's running"
        echo "  $0 dev                # Start chat in development mode"
        echo "  $0 start-backend       # Start only backend"
        exit 0
        ;;
esac

exit 0