#!/bin/bash
# ============================================
# PEGASUS NEO - Startup Script (Unix/macOS)
# ============================================

set -e

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║        PEGASUS NEO v1.1               ║"
echo "  ║   Agentic Security Operating System   ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm $(pnpm -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Determine mode
MODE=${1:-dev}

if [ "$MODE" = "prod" ] || [ "$MODE" = "production" ]; then
    echo ""
    echo "🚀 Building for production..."
    pnpm build
    echo ""
    echo "🌐 Starting production server..."
    pnpm start
else
    echo ""
    echo "🔧 Starting development server..."
    echo "   URL: http://localhost:3000"
    echo ""
    pnpm dev
fi
