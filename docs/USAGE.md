# Usage Guide

## Quick Start

### 1. Install

```bash
# Clone from GitHub
git clone https://github.com/toxadab/universal-dev-runtime.git
cd universal-dev-runtime

# Install dependencies
npm install

# Link globally
npm link
```

### 2. Link Qwen Extension

```bash
qwen extensions link $(npm root -g)/universal-dev-runtime
```

### 3. Bootstrap Project

```bash
cd your-project
qwx --bootstrap
```

### 4. Start Using

```bash
qwx "create a new controller"
```

---

## Commands Reference

### qwx "prompt"

Run Qwen with automatic runtime memory preparation.

```bash
qwx "add user authentication"
```

**What happens:**
1. Reads thread state
2. Reads shared memory
3. Generates runtime-memory.md
4. Runs `qwen --continue -p "prompt"`

### qwx --bootstrap

Initialize project state files.

```bash
qwx --bootstrap
```

**Creates:**
- `.qwen/state/current-thread.json`
- `.qwen/state/project-manifest.json`
- `.qwen/state/artifact-index.json`
- `.qwen/shared/shared-memory.json`
- `.qwen/shared/semantic-index.json`
- `.qwen/runtime-memory.md`

### qwx --refresh

Regenerate runtime-memory.md from current state.

```bash
qwx --refresh
```

**Use when:**
- You manually edited state files
- Context seems outdated
- After switching branches

### qwx --continue "prompt"

Continue previous session with prompt.

```bash
qwx --continue "now add validation"
```

**Use when:**
- Continuing a conversation
- Building on previous response

### qwx --search "query"

Search memory with keyword + semantic search.

```bash
qwx --search "database connection"
```

**Output:**
```
=== Results ===

Thread State:
  [decision] Use MySQL on localhost:3306

Shared Memory:
  [pattern] Use Repository pattern for DB queries

Semantic Search:
  [decision] (1.00) Session-based cart (no DB persistence)
  [correction] (0.50) Project uses local MySQL, not Docker
```

### qwx --help

Show help message.

```bash
qwx --help
```

---

## MCP Tools Reference

### bootstrap_project

Initialize project with stack detection.

```javascript
dev-runtime/bootstrap_project({
  cwd: "/path/to/project"
})
```

### prepare_runtime_packet

Generate runtime-memory.md.

```javascript
dev-runtime/prepare_runtime_packet({
  cwd: "/path/to/project"
})
```

### persist_delta

Save changes to thread state and semantic index.

```javascript
dev-runtime/persist_delta({
  cwd: "/path/to/project",
  delta: {
    currentTask: "Add authentication",
    recentDecisions: ["Use JWT tokens"],
    correctionNotes: ["API on port 8000"]
  }
})
```

### promote_to_canonical

Promote thread state to shared memory.

```javascript
dev-runtime/promote_to_canonical({
  cwd: "/path/to/project"
})
```

### search_memory

Search with keyword + semantic.

```javascript
dev-runtime/search_memory({
  cwd: "/path/to/project",
  query: "authentication jwt",
  topK: 5
})
```

### semantic_search

Pure semantic search (TF-IDF).

```javascript
dev-runtime/semantic_search({
  cwd: "/path/to/project",
  query: "database repository",
  topK: 3
})
```

### add_semantic_document

Add document to semantic index.

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

### add_team_member

Add team member to shared memory.

```javascript
dev-runtime/add_team_member({
  cwd: "/path/to/project",
  member: {
    name: "Alice",
    role: "Backend Developer"
  }
})
```

### get_shared_memory

Get team shared memory.

```javascript
dev-runtime/get_shared_memory({
  cwd: "/path/to/project"
})
```

### update_correction

Add correction note.

```javascript
dev-runtime/update_correction({
  cwd: "/path/to/project",
  note: "Database port is 3306, not 5432"
})
```

### get_artifact_context

Get context for specific artifact.

```javascript
dev-runtime/get_artifact_context({
  cwd: "/path/to/project",
  artifactPath: "src/Controller/MainController.php"
})
```

---

## Workflows

### Solo Developer

```bash
# Morning: bootstrap (if new project)
cd project
qwx --bootstrap

# Work session
qwx "add login feature"
qwx --continue "now add password reset"

# Save decisions
qwen /memory:promote

# Search when needed
qwx --search "session handling"
```

### Team Collaboration

```bash
# Team member joins
cd project
qwx --bootstrap  # Creates local state

# Add team members
qwen /memory:add_member { "name": "Bob", "role": "Frontend" }

# Share decisions
qwen /memory:promote  # After each task

# Search before changes
qwx --search "authentication flow"
```

### Code Review

```bash
# Reviewer: check decisions
qwx --search "security decisions"

# Reviewer: check patterns
cat .qwen/shared/shared-memory.json

# Add review notes
dev-runtime/update_correction({
  note: "Use prepared statements for SQL"
})
```

---

## Best Practices

### 1. Bootstrap Early

Run `qwx --bootstrap` as soon as you start working with a project.

### 2. Promote Regularly

After completing a task:
```bash
qwen /memory:promote
```

### 3. Search Before Decisions

Before making architectural decisions:
```bash
qwx --search "similar pattern"
```

### 4. Keep Context Focused

Only active task in thread state:
```json
{
  "currentTask": "Add login",
  "activeArtifacts": ["SecurityController.php"]
}
```

### 5. Document Important Decisions

```javascript
dev-runtime/add_semantic_document({
  text: "Use bcrypt for password hashing",
  type: "decision",
  metadata: { category: "security" }
})
```

---

## Troubleshooting

### Context Not Updating

```bash
# Force refresh
qwx --refresh

# Check state files
cat .qwen/state/current-thread.json
```

### Search Returns Nothing

```bash
# Check semantic index
cat .qwen/shared/semantic-index.json

# Add documents
dev-runtime/add_semantic_document({...})
```

### Extension Not Loading

```bash
# Check linked extensions
qwen extensions list

# Relink
qwen extensions unlink universal-dev-runtime
qwen extensions link $(npm root -g)/universal-dev-runtime
```

### MCP Server Errors

```bash
# Check Node.js version
node --version  # Should be >= 16

# Reinstall dependencies
cd $(npm root -g)/universal-dev-runtime
npm install
```
