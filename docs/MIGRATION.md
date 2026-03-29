# Migration Guide

## For Users with Existing QWEN.md Configuration

If you already have a `.qwen/QWEN.md` file with custom settings, **don't worry** - the bootstrap process will **preserve your existing configuration**.

---

## What Bootstrap Does

### 1. QWEN.md (Existing File)

**If QWEN.md exists:**
- ✅ **Preserved** - Your content is NOT overwritten
- ✅ **Updated** - Adds `@.qwen/runtime-memory.md` import if not present
- ✅ **Appended** - Import is added after the first heading

**Example:**

Before bootstrap:
```markdown
# My Project

## Some Rules
- Do not break things
```

After bootstrap:
```markdown
# My Project

## Runtime Import
@.qwen/runtime-memory.md

## Some Rules
- Do not break things
```

### 2. settings.json (Existing File)

**If settings.json exists:**
- ✅ **Preserved** - Your settings are NOT overwritten
- ✅ **Merged** - Adds `dev-runtime` MCP server if not present
- ✅ **Extended** - Other MCP servers remain configured

**Example:**

Before bootstrap:
```json
{
  "context": { "fileName": "QWEN.md" },
  "mcpServers": {
    "my-custom-server": { ... }
  },
  "$version": 3
}
```

After bootstrap:
```json
{
  "context": { "fileName": "QWEN.md" },
  "mcpServers": {
    "my-custom-server": { ... },
    "dev-runtime": {
      "command": "node",
      "args": ["/path/to/universal-dev-runtime/src/runtime-mcp.js"],
      "cwd": "/your/project",
      "timeout": 15000
    }
  },
  "$version": 3
}
```

### 3. package.json (Existing File)

**If package.json exists:**
- ✅ **Preserved** - Your scripts and dependencies are NOT overwritten
- ✅ **Extended** - Adds `web` and `web:port` scripts if not present

**Example:**

Before bootstrap:
```json
{
  "name": "my-project",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

After bootstrap:
```json
{
  "name": "my-project",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "web": "node /path/to/universal-dev-runtime/src/web-server.js",
    "web:port": "QWX_WEB_PORT=8080 node /path/to/universal-dev-runtime/src/web-server.js"
  }
}
```

---

## What Gets Created

These files are **created** if they don't exist:

| File | Purpose |
|------|---------|
| `.qwen/state/current-thread.json` | Thread state |
| `.qwen/state/project-manifest.json` | Project metadata |
| `.qwen/state/artifact-index.json` | Artifact index |
| `.qwen/shared/shared-memory.json` | Team memory |
| `.qwen/shared/semantic-index.json` | Semantic search index |
| `.qwen/runtime-memory.md` | Auto-generated context |

---

## Manual Migration (Optional)

If you prefer to manually integrate:

### Step 1: Add Runtime Import to QWEN.md

```markdown
# Your Project

## Runtime Import
@.qwen/runtime-memory.md

<!-- Rest of your content -->
```

### Step 2: Add MCP Server to settings.json

```json
{
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

### Step 3: Add Web Script to package.json

```json
{
  "scripts": {
    "web": "node $(npm root -g)/universal-dev-runtime/src/web-server.js"
  }
}
```

### Step 4: Run Bootstrap for State Files

```bash
qwx --bootstrap
```

This will create the state files without modifying your existing configs (since they're already set up).

---

## Rollback

If you need to rollback:

```bash
# Remove runtime import from QWEN.md
# Remove dev-runtime from settings.json mcpServers
# Remove web scripts from package.json

# Or restore from git
git checkout .qwen/QWEN.md
git checkout .qwen/settings.json
git checkout package.json
```

---

## FAQ

### Q: Will bootstrap overwrite my QWEN.md?

**A:** No! It only adds the runtime import if missing.

### Q: Will bootstrap remove my existing MCP servers?

**A:** No! It only adds `dev-runtime` if not present.

### Q: Can I use universal-dev-runtime alongside other MCP servers?

**A:** Yes! Multiple MCP servers can coexist.

### Q: What if I already have a web script in package.json?

**A:** Bootstrap won't overwrite it. You can manually update if needed.

### Q: How do I check if runtime-memory.md is being imported?

**A:** Check `.qwen/QWEN.md` for `@.qwen/runtime-memory.md` or `.qwen/runtime-memory.md`.
