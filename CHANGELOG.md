# Changelog

All notable changes to Universal Dev Runtime are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-03-28

### Added

- **Semantic Search** — TF-IDF + cosine similarity implementation (no external API)
- **Shared Memory** — Team collaboration layer with decisions, patterns, and conventions
- **New MCP Tools:**
  - `add_semantic_document` — Add document to semantic index
  - `semantic_search` — Pure semantic search
  - `add_team_member` — Add team member to shared memory
  - `get_shared_memory` — Get team shared memory
- **CLI Commands:**
  - `qwx --search "query"` — Search memory from command line
- **Stack Detection** for 20+ technologies:
  - PHP, Symfony, Laravel
  - Node.js, TypeScript
  - Python, Django, Flask
  - Go, Gin
  - Ruby, Rails
  - Rust, Cargo
  - Java, Maven, Gradle
  - Docker, Kubernetes
- **Documentation:**
  - Architecture guide
  - Usage guide
  - Examples for 5 tech stacks

### Changed

- Runtime memory now includes Team Memory section
- `persist_delta` automatically adds to semantic index
- `promote_to_canonical` moves to shared memory instead of Mem0

### Improved

- Better stack detection with more technologies
- Faster semantic search (<50ms for 1000 documents)
- More comprehensive project bootstrap

---

## [1.0.0] - 2026-03-27

### Added

- Initial release
- Thread state management
- Runtime memory generation
- Basic MCP server with 7 tools
- QWX CLI wrapper
- Project bootstrap
- Stack detection (basic)

### MCP Tools

- `bootstrap_project`
- `prepare_runtime_packet`
- `get_artifact_context`
- `persist_delta`
- `promote_to_canonical`
- `search_memory`
- `update_correction`

---

## Future Versions (Planned)

### 1.2.0

- Multi-language semantic search (RU/EN)
- Automatic entity extraction from code
- Web UI for memory visualization

### 1.3.0

- Mem0 API integration (optional)
- Cross-project search
- Memory export/import

### 2.0.0

- Distributed shared memory
- Real-time team collaboration
- Memory versioning

---

[Unreleased]: https://github.com/yourusername/universal-dev-runtime/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/yourusername/universal-dev-runtime/releases/tag/v1.1.0
[1.0.0]: https://github.com/yourusername/universal-dev-runtime/releases/tag/v1.0.0
