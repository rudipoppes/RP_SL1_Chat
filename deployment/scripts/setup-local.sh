#!/bin/bash

set -e

echo "🚀 Setting up RP_SL1_Chat local development environment..."

echo "📦 Installing dependencies..."

if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js is installed"
else
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    echo "✅ npm is installed"
else
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📋 Installing root dependencies..."
npm install

echo "📋 Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "📋 Installing backend dependencies..."
cd backend && npm install && cd ..

echo "📄 Creating environment files..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from template"
    echo "⚠️  Please edit .env file and add your ZAI_API_KEY"
else
    echo "📝 .env file already exists"
fi

echo "📁 Creating logs directory..."
mkdir -p backend/logs

echo "🔧 Building projects..."

echo "🏗️  Building frontend..."
cd frontend && npm run build && cd ..

echo "🏗️  Building backend..."
cd backend && npm run build && cd ..

echo "✅ Local development setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env file and add your ZAI_API_KEY"
echo "2. Set up MCP server:"
echo "   cd ../RP_SL1_MCP && ENABLE_HTTP_SERVER=true npm run dev"
echo "3. Run 'npm run dev' to start both frontend and backend"
echo "4. Open http://localhost:3001 in your browser"
echo ""
echo "📚 Development commands:"
echo "  npm run dev          - Start both frontend and backend"
echo "  npm run dev:frontend - Start frontend only"
echo "  npm run dev:backend  - Start backend only"
echo "  npm run build        - Build both for production"
echo "  npm test             - Run all tests"
echo ""
echo "🌟 Happy coding!"