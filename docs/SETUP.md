# Universal Dev Runtime - Setup Guide

## Complete Installation & Setup

### Step 1: Install Universal Dev Runtime

```bash
# Clone from GitHub
git clone https://github.com/toxadab/universal-dev-runtime.git
cd universal-dev-runtime

# Install dependencies
npm install

# Link globally
npm link
```

### Step 2: Run Installer

```bash
# Run the automated installer
./install.sh
```

The installer will:
- ✓ Check prerequisites (Node.js, npm, qwen)
- ✓ Install dependencies
- ✓ Link package globally
- ✓ Setup qwx wrapper
- ✓ Link MCP extension

### Step 3: Bootstrap Your Project

```bash
cd your-project

# Run bootstrap
qwx --bootstrap
```

This creates:
```
your-project/
├── .qwen/
│   ├── QWEN.md                 # Entry point with runtime import
│   ├── settings.json           # MCP server configuration
│   ├── runtime-memory.md       # Auto-generated context
│   ├── state/
│   │   ├── current-thread.json    # Thread state
│   │   ├── project-manifest.json  # Project metadata
│   │   └── artifact-index.json    # Artifact index
│   └── shared/
│       ├── shared-memory.json     # Team memory
│       └── semantic-index.json    # Semantic search index
└── package.json              # Updated with web script
```

### Step 4: How Auto-Context Works

**QWEN.md** contains:
```markdown
# Your Project

## Runtime Import
@.qwen/runtime-memory.md

...
```

**Before every request:**
1. `qwx "prompt"` reads thread state + shared memory
2. Generates `runtime-memory.md`
3. Runs `qwen --continue -p "prompt"`
4. Qwen reads `QWEN.md` → imports `@.qwen/runtime-memory.md`
5. Model receives full context automatically!

### Step 5: Using the System

```bash
# Run with automatic context
qwx "add user authentication"

# Search memory
qwx --search "database pattern"

# Continue session
qwx --continue "now add validation"

# Web interface (from your project directory)
npm run web

# Web interface with custom port
QWX_WEB_PORT=8080 npm run web
```

### Step 6: MCP Tools Available

In your Qwen conversation, use:
- `/dev-runtime:bootstrap_project` - Initialize project
- `/dev-runtime:prepare_runtime_packet` - Generate runtime-memory.md
- `/dev-runtime:persist_delta` - Save changes
- `/dev-runtime:promote_to_canonical` - Promote to shared memory
- `/dev-runtime:search_memory` - Search memory
- `/dev-runtime:add_semantic_document` - Add document
- `/dev-runtime:add_team_member` - Add team member

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  qwx "add authentication"                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Read .qwen/state/current-thread.json                    │
│  2. Read .qwen/shared/shared-memory.json                     │
│  3. Generate .qwen/runtime-memory.md                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. QWEN.md imports @.qwen/runtime-memory.md                │
│  5. qwen --continue -p "add authentication"                 │
│     (runtime-memory.md is in context automatically)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Model responds with full project context                │
│  7. persist_delta → save to thread state + semantic index   │
└─────────────────────────────────────────────────────────────┘
```

---

## What's Included

| Component | Location | Purpose |
|-----------|----------|---------|
| **qwx wrapper** | `bin/qwx.js` | CLI wrapper with auto-context |
| **MCP Server** | `src/runtime-mcp.js` | Memory management tools |
| **Web Interface** | `src/web-server.js` + `web/` | Visual dashboard |
| **Templates** | `templates/QWEN.md` | QWEN.md template |

---

## Troubleshooting

### qwx not found

```bash
# Add to PATH
export PATH="$(npm root -g)/universal-dev-runtime/bin:$PATH"
```

### MCP server not loading

```bash
# Check extension is linked
qwen extensions list

# Relink if needed
qwen extensions unlink universal-dev-runtime
qwen extensions link $(npm root -g)/universal-dev-runtime
```

### Web interface not starting

```bash
# Check dependencies
cd $(npm root -g)/universal-dev-runtime
npm install

# Try with explicit port
QWX_WEB_PORT=3000 npm run web
```

### Context not updating

```bash
# Force refresh
qwx --refresh

# Check QWEN.md has import
cat .qwen/QWEN.md | grep "Runtime Import"
```

---

## Quick Reference

```bash
# Install from GitHub
git clone https://github.com/toxadab/universal-dev-runtime.git
cd universal-dev-runtime
npm install
npm link

# Bootstrap project
qwx --bootstrap

# Run with context
qwx "your prompt"

# Search
qwx --search "query"

# Web UI
npm run web

# Custom port
QWX_WEB_PORT=8080 npm run web
```
