#!/bin/bash

set -e

echo "🚀 Deploying RP_SL1_Chat to AWS EC2..."

if [ $# -lt 2 ]; then
    echo "Usage: $0 --ip <EC2_IP> --key <SSH_KEY_FILE> --repo <GITHUB_REPO_URL>"
    echo "Example: $0 --ip 1.2.3.4 --key ~/.ssh/my-key.pem --repo https://github.com/user/RP_SL1_Chat.git"
    exit 1
fi

IP=""
KEY=""
REPO=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --ip)
            IP="$2"
            shift 2
            ;;
        --key)
            KEY="$2"
            shift 2
            ;;
        --repo)
            REPO="$2"
            shift 2
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

if [ -z "$IP" ] || [ -z "$KEY" ] || [ -z "$REPO" ]; then
    echo "Error: All parameters are required"
    exit 1
fi

echo "📋 Deployment parameters:"
echo "  EC2 IP: $IP"
echo "  SSH Key: $KEY"
echo "  Repository: $REPO"
echo ""

# SSH Commands
SSH="ssh -i $KEY -o StrictHostKeyChecking=no ec2-user@$IP"

echo "🔧 Setting up EC2 instance..."

$SSH "sudo yum update -y"
$SSH "sudo yum install -y git nginx"
$SSH "curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
$SSH "sudo yum install -y nodejs"

echo "📁 Cloning repository..."
$SSH "rm -rf /home/ec2-user/RP_SL1_Chat || true"
$SSH "git clone $REPO /home/ec2-user/RP_SL1_Chat"

echo "📦 Installing dependencies..."
$SSH "cd /home/ec2-user/RP_SL1_Chat && npm run install:all"

echo "🏗️ Building projects..."
$SSH "cd /home/ec2-user/RP_SL1_Chat && npm run build"

echo "📄 Creating production environment file..."
$SSH "cd /home/ec2-user/RP_SL1_Chat && cp .env.example .env"

echo "🔧 Setting up systemd service..."
$SSH "sudo cp /home/ec2-user/RP_SL1_Chat/deployment/systemd/chat-backend.service /etc/systemd/system/"
$SSH "sudo systemctl daemon-reload"
$SSH "sudo systemctl enable chat-backend"

echo "🌐 Setting up Nginx..."
$SSH "sudo cp /home/ec2-user/RP_SL1_Chat/deployment/nginx/chat-app.conf /etc/nginx/conf.d/"
$SSH "sudo rm -rf /etc/nginx/conf.d/default.conf || true"

echo "🔍 Restarting services..."
$SSH "sudo systemctl start chat-backend"
$SSH "sudo systemctl restart nginx"

echo "✅ Chat interface deployment complete!"
echo ""
echo "🎯 CRITICAL NEXT STEPS:"
echo "1. SSH into the instance: ssh -i $KEY ec2-user@$IP"
echo "2. Deploy MCP server (REQUIRED):"
echo "   cd /home/ec2-user && git clone <MCP_REPO_URL> RP_SL1_MCP"
echo "   cd RP_SL1_MCP && npm install && npm run build"
echo "   sudo systemctl enable mcp-server && sudo systemctl start mcp-server"
echo "3. Configure chat backend:"
echo "   Edit /home/ec2-user/RP_SL1_Chat/.env and add your ZAI_API_KEY"
echo "4. Restart services:"
echo "   sudo systemctl restart chat-backend"
echo "   sudo systemctl restart mcp-server"
echo "5. Open your browser and navigate to http://$IP"
echo ""
echo "📊 Service status:"
echo "  Chat Backend: sudo systemctl status chat-backend"
echo "  MCP Server: sudo systemctl status mcp-server"
echo "  Nginx: sudo systemctl status nginx"
echo ""
echo "📝 Logs:"
echo "  Backend: sudo journalctl -u chat-backend -f"
echo "  Application: tail -f /home/ec2-user/RP_SL1_Chat/backend/logs/combined.log"