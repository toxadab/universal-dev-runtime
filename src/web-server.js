#!/usr/bin/env node

/**
 * Web Interface for Universal Dev Runtime 2.0
 *
 * REST API + Static files for managing:
 * - Thread State
 * - Shared Memory
 * - Qdrant Vector Collections
 * - Real-time WebSocket events
 */

import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const WEB_DIR = join(ROOT_DIR, 'web');

// ============================================================================
// Configuration
// ============================================================================

const QWEN_DIR = '.qwen';
const STATE_DIR = 'state';
const SHARED_MEMORY_DIR = 'shared';
const RUNTIME_MEMORY_FILE = 'runtime-memory.md';
const CURRENT_THREAD_FILE = 'current-thread.json';
const PROJECT_MANIFEST_FILE = 'project-manifest.json';
const ARTIFACT_INDEX_FILE = 'artifact-index.json';
const SHARED_MEMORY_FILE = 'shared-memory.json';
const SEMANTIC_INDEX_FILE = 'semantic-index.json';

// ============================================================================
// Helper Functions
// ============================================================================

function getProjectQwenDir(cwd) {
  return join(cwd, QWEN_DIR);
}

function getStateDir(cwd) {
  return join(getProjectQwenDir(cwd), STATE_DIR);
}

function getSharedMemoryDir(cwd) {
  return join(getProjectQwenDir(cwd), SHARED_MEMORY_DIR);
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile(filePath, defaultVal = {}) {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return defaultVal;
}

function writeJsonFile(filePath, data) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readTextFile(filePath, defaultVal = '') {
  try {
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return defaultVal;
}

function writeTextFile(filePath, content) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, 'utf-8');
}

// ============================================================================
// Memory Operations
// ============================================================================

function getCwdFromRequest(req) {
  return req.query.cwd || req.body.cwd || process.cwd();
}

function getThreadState(cwd) {
  const stateDir = getStateDir(cwd);
  return readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {
    currentTask: null,
    activeArtifacts: [],
    recentDecisions: [],
    openQuestions: [],
    correctionNotes: [],
    updatedAt: null,
  });
}

function updateThreadState(cwd, updates) {
  const stateDir = getStateDir(cwd);
  const threadState = getThreadState(cwd);

  Object.assign(threadState, updates, { updatedAt: new Date().toISOString() });
  writeJsonFile(join(stateDir, CURRENT_THREAD_FILE), threadState);

  return threadState;
}

function getSharedMemory(cwd) {
  const sharedDir = getSharedMemoryDir(cwd);
  return readJsonFile(join(sharedDir, SHARED_MEMORY_FILE), {
    team: [],
    decisions: [],
    patterns: [],
    integrations: [],
    conventions: [],
    updatedAt: null,
  });
}

function updateSharedMemory(cwd, updates) {
  const sharedDir = getSharedMemoryDir(cwd);
  const sharedMemory = getSharedMemory(cwd);

  Object.assign(sharedMemory, updates, { updatedAt: new Date().toISOString() });
  writeJsonFile(join(sharedDir, SHARED_MEMORY_FILE), sharedMemory);

  return sharedMemory;
}

function getSemanticIndex(cwd) {
  const sharedDir = getSharedMemoryDir(cwd);
  return readJsonFile(join(sharedDir, SEMANTIC_INDEX_FILE), {
    documents: [],
    version: '2.0',
    updatedAt: null,
  });
}

function addSemanticDocument(cwd, document) {
  const semanticIndex = getSemanticIndex(cwd);

  const doc = {
    id: document.id || `doc_${Date.now()}`,
    text: document.text,
    type: document.type || 'note',
    collection: document.collection || 'decisions',
    metadata: document.metadata || {},
    addedAt: new Date().toISOString(),
  };

  semanticIndex.documents.push(doc);
  semanticIndex.updatedAt = new Date().toISOString();
  writeJsonFile(join(getSharedMemoryDir(cwd), SEMANTIC_INDEX_FILE), semanticIndex);

  return doc;
}

function getProjectManifest(cwd) {
  const stateDir = getStateDir(cwd);
  return readJsonFile(join(stateDir, PROJECT_MANIFEST_FILE), {
    name: basename(cwd),
    path: cwd,
    stack: [],
    bootstrappedAt: null,
  });
}

function getArtifactIndex(cwd) {
  const stateDir = getStateDir(cwd);
  return readJsonFile(join(stateDir, ARTIFACT_INDEX_FILE), {
    files: [],
    byType: {},
    dependencies: [],
  });
}

function getRuntimeMemory(cwd) {
  const qwenDir = getProjectQwenDir(cwd);
  return readTextFile(join(qwenDir, RUNTIME_MEMORY_FILE), '');
}

function promoteToCanonical(cwd) {
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);

  const threadState = getThreadState(cwd);
  const sharedMemory = getSharedMemory(cwd);

  if (threadState.recentDecisions) {
    threadState.recentDecisions.forEach(d => {
      if (!sharedMemory.decisions.includes(d)) {
        sharedMemory.decisions.push(d);
      }
    });
  }

  if (threadState.correctionNotes) {
    threadState.correctionNotes.forEach(n => {
      const text = typeof n === 'string' ? n : n.text;
      if (!sharedMemory.patterns.includes(text)) {
        sharedMemory.patterns.push(text);
      }
    });
  }

  sharedMemory.updatedAt = new Date().toISOString();
  writeJsonFile(join(sharedDir, SHARED_MEMORY_FILE), sharedMemory);

  threadState.promotedAt = new Date().toISOString();
  writeJsonFile(join(stateDir, CURRENT_THREAD_FILE), threadState);

  return {
    decisions: sharedMemory.decisions.length,
    patterns: sharedMemory.patterns.length,
  };
}

function getVectorStats(cwd) {
  const semanticIndex = getSemanticIndex(cwd);
  const documents = semanticIndex.documents || [];

  // Count by collection
  const stats = {
    decisions: 0,
    patterns: 0,
    artifacts: 0,
    tasks: 0,
    team: 0,
  };

  documents.forEach(doc => {
    const collection = doc.collection || 'decisions';
    if (stats[collection] !== undefined) {
      stats[collection]++;
    }
  });

  return {
    vectorStats: Object.entries(stats).map(([name, count]) => ({ name, count })),
    totalDocuments: documents.length,
    qdrantAvailable: false, // Local mode
  };
}

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();
const PORT = process.env.QWX_WEB_PORT || 3000;
const WS_PORT = process.env.QWX_WS_PORT || 8765;

app.use(cors());
app.use(express.json());
app.use(express.static(WEB_DIR));

// ============================================================================
// API Routes
// ============================================================================

// Dashboard - get all memory overview
app.get('/api/dashboard', (req, res) => {
  const cwd = getCwdFromRequest(req);

  res.json({
    success: true,
    data: {
      threadState: getThreadState(cwd),
      sharedMemory: getSharedMemory(cwd),
      projectManifest: getProjectManifest(cwd),
      semanticIndex: getSemanticIndex(cwd),
      artifactIndex: getArtifactIndex(cwd),
    },
  });
});

// Thread State
app.get('/api/thread-state', (req, res) => {
  const cwd = getCwdFromRequest(req);
  res.json({ success: true, data: getThreadState(cwd) });
});

app.put('/api/thread-state', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const updated = updateThreadState(cwd, req.body);
  res.json({ success: true, data: updated });
});

app.post('/api/thread-state/clear', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const stateDir = getStateDir(cwd);
  const cleared = {
    currentTask: null,
    activeArtifacts: [],
    recentDecisions: [],
    openQuestions: [],
    correctionNotes: [],
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile(join(stateDir, CURRENT_THREAD_FILE), cleared);
  res.json({ success: true, data: cleared });
});

// Shared Memory
app.get('/api/shared-memory', (req, res) => {
  const cwd = getCwdFromRequest(req);
  res.json({ success: true, data: getSharedMemory(cwd) });
});

app.put('/api/shared-memory', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const updated = updateSharedMemory(cwd, req.body);
  res.json({ success: true, data: updated });
});

// Team Members
app.get('/api/team', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const sharedMemory = getSharedMemory(cwd);
  res.json({ success: true, data: sharedMemory.team || [] });
});

app.post('/api/team', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const { name, role } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Name and role required' });
  }

  const sharedMemory = getSharedMemory(cwd);
  sharedMemory.team = sharedMemory.team || [];
  sharedMemory.team.push({
    name,
    role,
    addedAt: new Date().toISOString(),
  });
  sharedMemory.updatedAt = new Date().toISOString();

  writeJsonFile(join(getSharedMemoryDir(cwd), SHARED_MEMORY_FILE), sharedMemory);

  res.json({ success: true, data: sharedMemory.team });
});

app.delete('/api/team/:index', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const index = parseInt(req.params.index);

  const sharedMemory = getSharedMemory(cwd);
  if (sharedMemory.team && sharedMemory.team[index]) {
    sharedMemory.team.splice(index, 1);
    sharedMemory.updatedAt = new Date().toISOString();
    writeJsonFile(join(getSharedMemoryDir(cwd), SHARED_MEMORY_FILE), sharedMemory);
  }

  res.json({ success: true, data: sharedMemory.team });
});

// Semantic Search (local fallback)
app.get('/api/semantic-search', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const { q, topK = 10 } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }

  const semanticIndex = getSemanticIndex(cwd);
  const documents = semanticIndex.documents || [];

  // Simple keyword search (local fallback)
  const queryLower = q.toLowerCase();
  const results = documents
    .filter(doc => doc.text.toLowerCase().includes(queryLower))
    .slice(0, parseInt(topK))
    .map(doc => ({
      id: doc.id,
      score: 0.5, // Placeholder score
      text: doc.text,
      type: doc.type,
      metadata: doc.metadata,
      collection: doc.collection,
    }));

  res.json({ success: true, data: { query: q, results } });
});

// Semantic Documents
app.get('/api/semantic-documents', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const semanticIndex = getSemanticIndex(cwd);
  res.json({ success: true, data: semanticIndex.documents || [] });
});

app.post('/api/semantic-documents', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const doc = addSemanticDocument(cwd, req.body);
  res.json({ success: true, data: doc });
});

app.delete('/api/semantic-documents/:id', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const docId = req.params.id;

  const semanticIndex = getSemanticIndex(cwd);
  semanticIndex.documents = (semanticIndex.documents || []).filter(d => d.id !== docId);
  semanticIndex.updatedAt = new Date().toISOString();

  writeJsonFile(join(getSharedMemoryDir(cwd), SEMANTIC_INDEX_FILE), semanticIndex);

  res.json({ success: true, data: semanticIndex.documents });
});

// Decisions & Patterns
app.post('/api/decisions', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const { text } = req.body;

  const sharedMemory = getSharedMemory(cwd);
  sharedMemory.decisions = sharedMemory.decisions || [];
  sharedMemory.decisions.push(text);
  sharedMemory.updatedAt = new Date().toISOString();

  writeJsonFile(join(getSharedMemoryDir(cwd), SHARED_MEMORY_FILE), sharedMemory);

  res.json({ success: true, data: sharedMemory.decisions });
});

app.delete('/api/decisions/:index', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const index = parseInt(req.params.index);

  const sharedMemory = getSharedMemory(cwd);
  if (sharedMemory.decisions && sharedMemory.decisions[index]) {
    sharedMemory.decisions.splice(index, 1);
    sharedMemory.updatedAt = new Date().toISOString();
    writeJsonFile(join(getSharedMemoryDir(cwd), SHARED_MEMORY_FILE), sharedMemory);
  }

  res.json({ success: true, data: sharedMemory.decisions });
});

app.post('/api/patterns', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const { text } = req.body;

  const sharedMemory = getSharedMemory(cwd);
  sharedMemory.patterns = sharedMemory.patterns || [];
  sharedMemory.patterns.push(text);
  sharedMemory.updatedAt = new Date().toISOString();

  writeJsonFile(join(getSharedMemoryDir(cwd), SHARED_MEMORY_FILE), sharedMemory);

  res.json({ success: true, data: sharedMemory.patterns });
});

app.delete('/api/patterns/:index', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const index = parseInt(req.params.index);

  const sharedMemory = getSharedMemory(cwd);
  if (sharedMemory.patterns && sharedMemory.patterns[index]) {
    sharedMemory.patterns.splice(index, 1);
    sharedMemory.updatedAt = new Date().toISOString();
    writeJsonFile(join(getSharedMemoryDir(cwd), SHARED_MEMORY_FILE), sharedMemory);
  }

  res.json({ success: true, data: sharedMemory.patterns });
});

// Promote to Canonical
app.post('/api/promote', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const result = promoteToCanonical(cwd);
  res.json({ success: true, data: result });
});

// Runtime Memory
app.get('/api/runtime-memory', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const content = getRuntimeMemory(cwd);
  res.json({ success: true, data: { content } });
});

// Project Info
app.get('/api/project', (req, res) => {
  const cwd = getCwdFromRequest(req);
  res.json({
    success: true,
    data: {
      manifest: getProjectManifest(cwd),
      artifactIndex: getArtifactIndex(cwd),
    },
  });
});

// Vector Stats
app.get('/api/vector-stats', (req, res) => {
  const cwd = getCwdFromRequest(req);
  const stats = getVectorStats(cwd);
  res.json({ success: true, data: stats });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Universal Dev Runtime Web Interface v2.0`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📁 Working Directory: ${process.cwd()}`);
  console.log(``);
  console.log(`API Endpoints:`);
  console.log(`  GET  /api/dashboard          - Overview of all memory`);
  console.log(`  GET  /api/thread-state       - Get thread state`);
  console.log(`  PUT  /api/thread-state       - Update thread state`);
  console.log(`  GET  /api/shared-memory      - Get shared memory`);
  console.log(`  PUT  /api/shared-memory      - Update shared memory`);
  console.log(`  GET  /api/team               - Get team members`);
  console.log(`  POST /api/team               - Add team member`);
  console.log(`  GET  /api/semantic-search    - Search memory`);
  console.log(`  GET  /api/semantic-documents - Get all documents`);
  console.log(`  POST /api/semantic-documents - Add document`);
  console.log(`  POST /api/decisions          - Add decision`);
  console.log(`  POST /api/patterns           - Add pattern`);
  console.log(`  POST /api/promote            - Promote thread to shared`);
  console.log(`  GET  /api/vector-stats       - Get vector database stats`);
  console.log(``);
  console.log(`WebSocket: ws://localhost:${WS_PORT}`);
});

// ============================================================================
// WebSocket Server for Real-time Events (Optional)
// ============================================================================

try {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error.message);
    });
  });

  console.log(`[WebSocket] Real-time server running on ws://localhost:${WS_PORT}`);
} catch (e) {
  console.warn('[WebSocket] Could not start WebSocket server:', e.message);
  console.warn('[WebSocket] Real-time features will be limited');
}
