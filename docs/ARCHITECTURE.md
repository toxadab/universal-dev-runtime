# Architecture Guide

## Overview

Universal Dev Runtime is a memory management system for Qwen Code CLI that provides:

1. **Thread State** — Instant operational memory
2. **Shared Memory** — Team collaboration
3. **Semantic Search** — TF-IDF based search without external API
4. **Runtime Context** — Auto-generated context for each request

---

## Components

### 1. MCP Server (`src/runtime-mcp.js`)

The core memory management server that implements the Model Context Protocol (MCP).

**Responsibilities:**
- Stack detection (20+ technologies)
- Thread state management
- Shared memory management
- Semantic search (TF-IDF + cosine similarity)
- Runtime memory generation

**Tools:**
- `bootstrap_project` — Initialize project
- `prepare_runtime_packet` — Generate runtime-memory.md
- `persist_delta` — Save changes
- `promote_to_canonical` — Promote to shared memory
- `search_memory` — Keyword + semantic search
- `semantic_search` — Pure semantic search
- `add_semantic_document` — Add to index
- `add_team_member` — Add team member
- `get_shared_memory` — Get team memory
- `update_correction` — Add correction
- `get_artifact_context` — Get artifact info

### 2. CLI Wrapper (`bin/qwx.js`)

Command-line wrapper for qwen that prepares runtime memory before each request.

**Features:**
- Automatic runtime packet preparation
- Stack detection
- Semantic search CLI
- Project bootstrap

**Commands:**
- `qwx "prompt"` — Run with context
- `qwx --bootstrap` — Initialize project
- `qwx --refresh` — Refresh context
- `qwx --search "query"` — Search memory
- `qwx --continue "prompt"` — Continue session

### 3. Qwen Extension

Qwen Code extension that bundles the MCP server.

**Structure:**
```
.qwen/extensions/universal-dev-runtime/
├── qwen-extension.json    # Extension manifest
├── package.json           # npm package
└── dist/
    └── runtime-mcp.js     # MCP server
```

---

## Memory Layers

### Layer 1: Thread State

**File:** `.qwen/state/current-thread.json`

**Purpose:** Instant operational memory for current task

**Structure:**
```json
{
  "currentTask": "Add user authentication",
  "activeArtifacts": ["src/Controller/SecurityController.php"],
  "recentDecisions": ["Use bcrypt for password hashing"],
  "openQuestions": ["Should we add 2FA?"],
  "correctionNotes": ["MySQL on port 3306, not Docker"],
  "updatedAt": "2026-03-28T07:00:00.000Z"
}
```

**Lifecycle:**
- Read before each request
- Updated after each response
- Promoted to shared memory when stable

### Layer 2: Runtime Memory

**File:** `.qwen/runtime-memory.md`

**Purpose:** Auto-generated context for Qwen

**Structure:**
```markdown
# Runtime Memory

## Current Task
...

## Active Artifacts
...

## Team Memory
...

## Project
...
```

**Lifecycle:**
- Generated before each request by `qwx`
- Imported in `QWEN.md` via `@.qwen/runtime-memory.md`
- Never edited manually

### Layer 3: Shared Memory

**File:** `.qwen/shared/shared-memory.json`

**Purpose:** Team collaboration and long-term memory

**Structure:**
```json
{
  "team": [
    { "name": "Alice", "role": "Backend", "addedAt": "..." }
  ],
  "decisions": ["Use Repository pattern"],
  "patterns": ["Money as DECIMAL, not FLOAT"],
  "integrations": ["YooKassa", "Stripe"]
}
```

**Lifecycle:**
- Updated via `promote_to_canonical`
- Shared across team members
- Version controlled (optional)

### Layer 4: Semantic Index

**File:** `.qwen/shared/semantic-index.json`

**Purpose:** Documents for semantic search

**Structure:**
```json
{
  "documents": [
    {
      "id": "decision_001",
      "text": "Session-based cart (no DB persistence)",
      "type": "decision",
      "metadata": { "category": "architecture" }
    }
  ],
  "version": "1.0"
}
```

**Lifecycle:**
- Populated by `persist_delta`
- Searched by `semantic_search`
- TF-IDF indexed

---

## Semantic Search Algorithm

### TF-IDF Implementation

**Tokenization:**
```javascript
tokenize(text) → ["session", "based", "cart"]
```

**Term Frequency (TF):**
```
tf[token] = count / maxFreq
```

**Inverse Document Frequency (IDF):**
```
idf[token] = log(N / docFreq) + 1
```

**TF-IDF Vector:**
```
tfidf[token] = tf[token] * idf[token]
```

**Cosine Similarity:**
```
similarity = dot(A, B) / (norm(A) * norm(B))
```

### Performance

| Operation | 100 docs | 1000 docs |
|-----------|----------|-----------|
| Indexing | ~10ms | ~100ms |
| Search | ~5ms | ~50ms |
| Add doc | ~1ms | ~1ms |

---

## Stack Detection

Automatic detection for 20+ technologies:

```javascript
detectStack(cwd) → ['php', 'symfony', 'docker', 'git']
```

**Detection rules:**
- `composer.json` → PHP
- `symfony.lock` → Symfony
- `package.json` → Node.js
- `requirements.txt` → Python
- `go.mod` → Go
- `Gemfile` → Ruby
- `Cargo.toml` → Rust
- `pom.xml` → Maven
- `Dockerfile` → Docker
- `.git/` → Git

---

## Data Flow

### Bootstrap Flow

```
qwx --bootstrap
    ↓
detectStack(cwd)
    ↓
Create directories: .qwen/, .qwen/state/, .qwen/shared/
    ↓
Initialize files:
  - project-manifest.json
  - current-thread.json
  - artifact-index.json
  - shared-memory.json
  - semantic-index.json
    ↓
Generate runtime-memory.md
```

### Request Flow

```
User: "add controller"
    ↓
qwx reads current-thread.json
    ↓
qwx reads shared-memory.json
    ↓
qwx generates runtime-memory.md
    ↓
qwen --continue -p "add controller"
    ↓
Model responds with context
    ↓
Extract delta (decisions, corrections)
    ↓
persist_delta → current-thread.json + semantic-index.json
```

### Promotion Flow

```
promote_to_canonical
    ↓
Read current-thread.json
    ↓
Read shared-memory.json
    ↓
Move decisions → shared-memory.decisions
    ↓
Move corrections → shared-memory.patterns
    ↓
Write updated shared-memory.json
    ↓
Mark thread state as promoted
```

---

## Extension Points

### Custom Stack Detection

Add your own stack detection:

```javascript
function detectStack(cwd) {
  // ... existing checks ...
  
  // Custom check
  if (checkFile('custom.lock')) stack.push('custom-framework');
  
  return stack;
}
```

### Custom Memory Types

Add custom memory types to shared memory:

```javascript
const sharedMemory = {
  team: [],
  decisions: [],
  patterns: [],
  integrations: [],
  conventions: [],      // Custom
  architecture: [],     // Custom
  updatedAt: "...",
};
```

### Custom Search Filters

Filter semantic search results:

```javascript
semanticSearch(cwd, query, {
  topK: 5,
  type: 'decision',           // Filter by type
  metadata: { category: 'db' } // Filter by metadata
})
```

---

## Best Practices

### 1. Keep Thread State Focused

Only active task context in thread state:
```json
{
  "currentTask": "Add login feature",
  "activeArtifacts": ["SecurityController.php"],
  "recentDecisions": ["Use JWT tokens"]
}
```

### 2. Promote Regularly

Promote stable knowledge to shared memory:
```bash
qwen /memory:promote
```

### 3. Use Semantic Search

Search before making decisions:
```bash
qwx --search "authentication jwt"
```

### 4. Document Decisions

Add important decisions as semantic documents:
```javascript
dev-runtime/add_semantic_document({
  text: "Use JWT for stateless authentication",
  type: "decision",
  metadata: { category: "security" }
})
```

---

## Troubleshooting

### MCP Server Not Found

```bash
# Check installation
npm list -g universal-dev-runtime

# Relink
qwen extensions unlink universal-dev-runtime
qwen extensions link $(npm root -g)/universal-dev-runtime
```

### Runtime Memory Not Updating

```bash
# Force refresh
qwx --refresh

# Check file permissions
ls -la .qwen/runtime-memory.md
```

### Semantic Search Returns Nothing

```bash
# Check index
cat .qwen/shared/semantic-index.json

# Add documents
dev-runtime/add_semantic_document({...})
```
