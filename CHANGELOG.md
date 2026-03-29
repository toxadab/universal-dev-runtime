# Changelog

All notable changes to Universal Dev Runtime will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-03-29

### 🎉 Major Release: Qdrant Vector Search

#### Added

- **Qdrant Integration**
  - Full vector database support with 5 collections: `decisions`, `patterns`, `artifacts`, `tasks`, `team`
  - Automatic collection creation on bootstrap
  - Local fallback mode when Qdrant is unavailable
  - Connection status indicator in web UI

- **Embeddings Module** (`src/embeddings.js`)
  - Local embedding generation using `@xenova/transformers`
  - Model: `all-MiniLM-L6-v2` (384 dimensions)
  - Automatic caching for performance
  - Batch processing support

- **Semantic Replacement Logic**
  - Smart upsert with similarity threshold (0.85)
  - Automatically updates similar documents instead of creating duplicates
  - Version tracking for updated documents

- **Real-time Event System**
  - WebSocket server for live memory events
  - Real-time panel in web interface
  - Event types: `bootstrap`, `document_added`, `search_performed`, `delta_persisted`, `promoted_to_canonical`, `correction_added`, `team_member_added`
  - Auto-refresh UI based on events

- **Enhanced Web Interface**
  - Modern dark theme with gradient backgrounds
  - Real-time events panel with live updates
  - Vector statistics dashboard
  - Qdrant connection status indicator
  - Collection badges for document categorization
  - Similarity scores in search results

- **New MCP Tools**
  - `semantic_search` - Vector search in specific collection
  - `multi_collection_search` - Search across multiple collections
  - `get_vector_stats` - Get Qdrant statistics
  - `clear_collection` - Clear all documents from collection

#### Changed

- **Version Bump**: 1.1.0 → 2.0.0
- **Dependencies**:
  - Added `@qdrant/js-client-rest@^1.9.0`
  - Added `@xenova/transformers@^2.17.2`
  - Added `ws@^8.18.0`
  - Updated to Node.js 18+ requirement

- **Architecture**:
  - Replaced TF-IDF with vector embeddings
  - Replaced JSON file storage with Qdrant vector DB
  - Maintained backward compatibility with local fallback

- **Web Interface**:
  - Redesigned UI with real-time panel
  - Added vector search visualization
  - Improved search results display with similarity scores

#### Deprecated

- TF-IDF semantic search (replaced by vector embeddings)
- Direct JSON file storage for documents (now in Qdrant)

#### Removed

- `SemanticSearch` class from MCP server (moved to embeddings module)

#### Fixed

- Memory duplication issues (now using semantic replacement)
- Search accuracy (vector similarity vs keyword matching)

---

## [1.1.0] - 2026-03-28

### Added

- Web interface for memory management
- Team collaboration features
- Semantic search with TF-IDF + cosine similarity
- Project bootstrap with stack detection
- Thread state management
- Shared team memory

### Changed

- Improved documentation
- Better error handling

---

## [1.0.0] - 2026-03-27

### Initial Release

- Basic MCP server implementation
- Thread state management
- Simple semantic search
- CLI wrapper (`qwx`)
