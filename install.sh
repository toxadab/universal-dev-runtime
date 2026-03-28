#!/bin/bash

# Universal Dev Runtime Installer
# Installs the Qwen Dev Runtime extension for Qwen Code CLI

set -e

echo "========================================"
echo "  Universal Dev Runtime Installer"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Check qwen
if ! command -v qwen &> /dev/null; then
    echo -e "${YELLOW}! Qwen Code CLI is not installed${NC}"
    echo "  Install from: https://github.com/qwenlm/qwen-code"
    echo "  Continuing without qwen check..."
fi

echo ""
echo "Installing Universal Dev Runtime..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Install dependencies
echo "Installing dependencies..."
cd "$SCRIPT_DIR"
npm install --production

# Link package globally
echo "Linking package globally..."
npm link

# Get global npm root
GLOBAL_ROOT=$(npm root -g)
RUNTIME_PATH="$GLOBAL_ROOT/universal-dev-runtime"

echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""

# Configure qwen if available
if command -v qwen &> /dev/null; then
    echo "Configuring Qwen Code CLI..."
    
    # Link extension
    qwen extensions link "$RUNTIME_PATH" 2>/dev/null || {
        echo -e "${YELLOW}! Extension link command failed${NC}"
        echo "  Manual: qwen extensions link $RUNTIME_PATH"
    }
    
    echo -e "${GREEN}✓ Extension linked${NC}"
fi

echo ""
echo "Next steps:"
echo ""
echo "1. Add qwx to your PATH (if not already):"
echo "   export PATH=\"\$(npm root -g)/universal-dev-runtime/bin:\$PATH\""
echo ""
echo "2. Bootstrap your project:"
echo "   cd your-project"
echo "   qwx --bootstrap"
echo ""
echo "3. Start using:"
echo "   qwx \"your prompt here\""
echo ""
echo "For more information:"
echo "  qwx --help"
echo "  https://github.com/yourusername/universal-dev-runtime"
echo ""
