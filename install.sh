#!/bin/bash

# Universal Dev Runtime Installer
# Installs the Qwen Dev Runtime extension for Qwen Code CLI
# Full automation: qwx, MCP server, web interface, auto-context

set -e

echo "========================================"
echo "  Universal Dev Runtime Installer"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
QWEN_AVAILABLE=false
if command -v qwen &> /dev/null; then
    QWEN_AVAILABLE=true
    echo -e "${GREEN}✓ Qwen Code CLI $(qwen --version 2>&1 | head -1)${NC}"
else
    echo -e "${YELLOW}! Qwen Code CLI is not installed${NC}"
    echo "  Install from: https://github.com/qwenlm/qwen-code"
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
echo "Setting up components..."

# Setup qwx wrapper
echo -e "${BLUE}→ Setting up qwx wrapper...${NC}"
QWX_BIN="$GLOBAL_ROOT/universal-dev-runtime/bin/qwx.js"
if [ -f "$QWX_BIN" ]; then
    ln -sf "$QWX_BIN" "$GLOBAL_ROOT/bin/qwx" 2>/dev/null || {
        echo -e "${YELLOW}  ! Could not create symlink, qwx may not be in PATH${NC}"
    }
    echo -e "${GREEN}  ✓ qwx wrapper installed${NC}"
fi

# Setup web interface script
echo -e "${BLUE}→ Setting up web interface...${NC}"
WEB_SERVER="$GLOBAL_ROOT/universal-dev-runtime/src/web-server.js"
if [ -f "$WEB_SERVER" ]; then
    echo -e "${GREEN}  ✓ web-server.js available${NC}"
fi

echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""

# Configure qwen if available
if [ "$QWEN_AVAILABLE" = true ]; then
    echo "Configuring Qwen Code CLI..."

    # Link extension
    qwen extensions link "$RUNTIME_PATH" 2>/dev/null || {
        echo -e "${YELLOW}! Extension link command failed${NC}"
        echo "  Manual: qwen extensions link $RUNTIME_PATH"
    }

    echo -e "${GREEN}✓ MCP Extension linked${NC}"
fi

echo ""
echo "========================================"
echo "  Quick Start Guide"
echo "========================================"
echo ""
echo "1. Add qwx to your PATH (if not already):"
echo -e "   ${BLUE}export PATH=\"\$(npm root -g)/universal-dev-runtime/bin:\$PATH${NC}"
echo ""
echo "2. Bootstrap your project:"
echo -e "   ${BLUE}cd your-project${NC}"
echo -e "   ${BLUE}qwx --bootstrap${NC}"
echo ""
echo "3. Start using (automatic context):"
echo -e "   ${BLUE}qwx \"your prompt here\"${NC}"
echo ""
echo "4. Web interface (optional):"
echo -e "   ${BLUE}cd your-project${NC}"
echo -e "   ${BLUE}npm run web${NC}"
echo "   # Or with custom port:"
echo -e "   ${BLUE}QWX_WEB_PORT=8080 npm run web${NC}"
echo ""
echo "========================================"
echo "  What's Included"
echo "========================================"
echo ""
echo -e "${GREEN}✓${NC} qwx wrapper - automatic context generation"
echo -e "${GREEN}✓${NC} MCP server - memory management tools"
echo -e "${GREEN}✓${NC} Web interface - visual memory dashboard"
echo -e "${GREEN}✓${NC} Semantic search - TF-IDF + cosine similarity"
echo -e "${GREEN}✓${NC} Team collaboration - shared memory"
echo ""
echo "For more information:"
echo -e "  ${BLUE}qwx --help${NC}"
echo -e "  ${BLUE}npm run web${NC}"
echo "  https://github.com/yourusername/universal-dev-runtime"
echo ""
