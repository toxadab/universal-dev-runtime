# {{PROJECT_NAME}}

## Runtime Import
@.qwen/runtime-memory.md

## Project Rules
- Follow project conventions
- Treat runtime-memory.md as active working context
- Read correction notes before making changes

## MCP Tools Available
- `dev-runtime/bootstrap_project` - Initialize project
- `dev-runtime/prepare_runtime_packet` - Generate runtime-memory.md
- `dev-runtime/persist_delta` - Save changes to thread state
- `dev-runtime/promote_to_canonical` - Promote to shared memory
- `dev-runtime/search_memory` - Search memory (keyword + semantic)
- `dev-runtime/add_semantic_document` - Add document to semantic index
- `dev-runtime/add_team_member` - Add team member
- `dev-runtime/get_shared_memory` - Get team shared memory
- `dev-runtime/update_correction` - Add correction note

## Usage
```bash
# Run with automatic context
qwx "your prompt here"

# Bootstrap (if not done)
qwx --bootstrap

# Search memory
qwx --search "query"

# Web interface
npm run web
```
