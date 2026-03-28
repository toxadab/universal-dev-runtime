# Universal Dev Runtime for Qwen Code CLI

[![npm version](https://img.shields.io/npm/v/universal-dev-runtime.svg)](https://www.npmjs.com/package/universal-dev-runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Memory management system for Qwen Code CLI with semantic search and team collaboration.**

Works with **any tech stack**: PHP, Python, Node.js, Go, Ruby, Rust, Java, and more.

---

## Features

- 🧠 **Thread State** — Instant operational memory for current task context
- 👥 **Shared Memory** — Team decisions, patterns, and conventions
- 🔍 **Semantic Search** — TF-IDF + cosine similarity (no external API required)
- 🔄 **Auto Context** — Runtime memory generated before each request
- 🌐 **Universal** — Works with any technology stack
- 📦 **Zero Config** — Automatic stack detection and project bootstrap
- 🌈 **Web Interface** — Beautiful UI for managing all memory types

---

## Quick Start

### Installation

```bash
# Install globally
npm install -g universal-dev-runtime

# Or from GitHub
git clone https://github.com/yourusername/universal-dev-runtime.git
cd universal-dev-runtime
npm install
npm link
```

### Link Qwen Extension

```bash
qwen extensions link $(npm root -g)/universal-dev-runtime
```

### Bootstrap Your Project

```bash
cd your-project
qwx --bootstrap
```

### Start Using

```bash
qwx "create a new controller for user authentication"
```

### Web Interface (NEW!)

```bash
# Initialize demo data (optional)
npm run init-demo

# Start web server
npm run web

# Open in browser
http://localhost:3000
```

---

## Commands

| Command | Description |
|---------|-------------|
| `qwx "prompt"` | Run Qwen with runtime memory preparation |
| `qwx --bootstrap` | Initialize project state files |
| `qwx --refresh` | Regenerate runtime memory |
| `qwx --continue "prompt"` | Continue previous session |
| `qwx --search "query"` | Search memory (keyword + semantic) |
| `qwx --help` | Show help message |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    QWEN CODE CLI                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  qwx wrapper                                                 │
│  1. Read thread state                                        │
│  2. Read shared memory                                       │
│  3. Generate runtime-memory.md                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  qwen --continue -p "prompt"                                │
│  (runtime-memory.md imported in context)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Response with full project context                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Extract delta → persist to thread state + semantic index   │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Layers

### 1. Thread State (`.qwen/state/current-thread.json`)

Instant operational memory:
- Current task
- Active artifacts
- Recent decisions
- Open questions
- Correction notes

### 2. Runtime Memory (`.qwen/runtime-memory.md`)

Auto-generated context for Qwen:
- Includes thread state
- Includes shared memory
- Imported via `@.qwen/runtime-memory.md`

### 3. Shared Memory (`.qwen/shared/shared-memory.json`)

Team collaboration:
- Team members
- Team decisions
- Patterns & conventions
- Integrations

### 4. Semantic Index (`.qwen/shared/semantic-index.json`)

Documents for semantic search:
- Decisions
- Corrections
- Patterns
- Custom documents

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `bootstrap_project` | Detect stack, create state directories |
| `prepare_runtime_packet` | Generate runtime-memory.md |
| `get_artifact_context` | Get artifact context |
| `persist_delta` | Save to thread state + semantic index |
| `promote_to_canonical` | Promote to shared memory |
| `search_memory` | Keyword + semantic search |
| `update_correction` | Add correction note |
| `add_semantic_document` | Add document for search |
| `semantic_search` | TF-IDF semantic search |
| `add_team_member` | Add team member |
| `get_shared_memory` | Get team memory |

---

## Examples

### Search Memory

```bash
# Search for cart-related decisions
qwx --search "session cart"

# Output:
# Semantic Search:
#   [decision] (1.00) Session-based cart (no DB persistence)
#   [pattern] (0.50) Use Redis for session storage
```

### Add Team Member

```javascript
// Via MCP tool
dev-runtime/add_team_member({
  cwd: "/path/to/project",
  member: { name: "Alice", role: "Backend Developer" }
})
```

### Add Semantic Document

```javascript
dev-runtime/add_semantic_document({
  cwd: "/path/to/project",
  document: {
    text: "Use Repository pattern for all database queries",
    type: "pattern",
    metadata: { category: "architecture" }
  }
})
```

---

## Supported Stacks

**Automatic detection** for:

| Backend | Frontend | Infrastructure |
|---------|----------|----------------|
| PHP (Symfony, Laravel) | Node.js | Docker |
| Python (Django, Flask) | TypeScript | Kubernetes |
| Go (Gin, Echo) | | Terraform |
| Ruby (Rails) | | Make |
| Rust (Actix, Axum) | | CMake |
| Java (Spring) | | |
| .NET (ASP.NET) | | |

---

## Project Structure

```
your-project/
├── .qwen/
│   ├── QWEN.md                    # Project entry (imports runtime-memory.md)
│   ├── runtime-memory.md          # Auto-generated context
│   ├── settings.json              # MCP config
│   ├── state/
│   │   ├── current-thread.json    # Thread state
│   │   ├── project-manifest.json  # Project metadata
│   │   └── artifact-index.json    # Artifact index
│   └── shared/
│       ├── shared-memory.json     # Team memory
│       └── semantic-index.json    # Semantic search index
```

---

## Configuration

### `.qwen/settings.json`

```json
{
  "context": {
    "fileName": "QWEN.md"
  },
  "mcpServers": {
    "dev-runtime": {
      "command": "node",
      "args": ["$(npm root -g)/universal-dev-runtime/src/runtime-mcp.js"],
      "cwd": ".",
      "timeout": 15000
    }
  }
}
```

### `QWEN.md`

```markdown
# Project Entry

## Runtime Import
@.qwen/runtime-memory.md

## Project Rules
- Follow project conventions
- Treat runtime-memory as active working context
```

---

## Programmatic Usage

### As MCP Server

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({ name: 'universal-dev-runtime', version: '1.1.0' });
const transport = new StdioServerTransport();
await server.connect(transport);
```

### As CLI

```bash
# Bootstrap
qwx --bootstrap

# Search
qwx --search "database connection"

# Run with context
qwx "add migration for users table"
```

---

## Development

```bash
# Clone repository
git clone https://github.com/yourusername/universal-dev-runtime.git

# Install dependencies
npm install

# Link locally
npm link

# Test
qwx --help
```

---

## Web Interface

The web interface provides a visual dashboard for managing all memory types:

### Features

- 📊 **Dashboard** - Overview of all memory with statistics
- 🧵 **Thread State** - Edit current task, artifacts, decisions, questions
- 👥 **Team Management** - Add/remove team members
- 📝 **Shared Memory** - Manage team decisions and patterns
- 🔍 **Semantic Search** - Search memory with TF-IDF algorithm
- 📄 **Documents** - Browse and manage semantic documents

### Usage

```bash
# From your project directory
npm run web

# Or with custom port
QWX_WEB_PORT=8080 npm run web
```

Then open **http://localhost:3000** in your browser.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get all memory overview |
| GET/PUT | `/api/thread-state` | Get/update thread state |
| GET/PUT | `/api/shared-memory` | Get/update shared memory |
| GET/POST/DELETE | `/api/team` | Manage team members |
| GET | `/api/semantic-search?q=query` | Search memory |
| GET/POST/DELETE | `/api/semantic-documents` | Manage documents |
| POST | `/api/decisions` | Add decision |
| POST | `/api/patterns` | Add pattern |
| POST | `/api/promote` | Promote thread to shared |

See [docs/WEB.md](docs/WEB.md) for full documentation.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Support

- **Documentation:** [docs/](docs/)
- **Examples:** [examples/](examples/)
- **Issues:** https://github.com/yourusername/universal-dev-runtime/issues
