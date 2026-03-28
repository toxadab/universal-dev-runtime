#!/usr/bin/env node

/**
 * Universal Dev Runtime MCP Server
 * 
 * A universal memory management system for Qwen Code CLI
 * Works with any tech stack: PHP, Python, Node.js, Go, Ruby, etc.
 * 
 * Features:
 * - Thread state management (instant operational memory)
 * - Shared team memory (collaborative decisions & patterns)
 * - Semantic search (TF-IDF + cosine similarity, no external API)
 * - Runtime context generation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
// State Management
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
// Stack Detection (Universal - supports multiple tech stacks)
// ============================================================================

function detectStack(cwd) {
  const stack = [];
  
  const checkFile = (filename) => existsSync(join(cwd, filename));
  const checkDir = (dirname) => existsSync(join(cwd, dirname));
  
  // PHP
  if (checkFile('composer.json')) stack.push('php');
  if (checkFile('symfony.lock')) stack.push('symfony');
  if (checkFile('laravel.lock')) stack.push('laravel');
  
  // Node.js / JavaScript
  if (checkFile('package.json')) stack.push('node');
  if (checkFile('yarn.lock')) stack.push('yarn');
  if (checkFile('pnpm-lock.yaml')) stack.push('pnpm');
  if (checkFile('tsconfig.json')) stack.push('typescript');
  
  // Python
  if (checkFile('requirements.txt')) stack.push('python');
  if (checkFile('pyproject.toml')) stack.push('python-poetry');
  if (checkFile('Pipfile')) stack.push('pipenv');
  if (checkFile('manage.py')) stack.push('django');
  if (checkFile('app.py') || checkFile('main.py')) stack.push('flask-fastapi');
  
  // Go
  if (checkFile('go.mod')) stack.push('go');
  
  // Ruby
  if (checkFile('Gemfile')) stack.push('ruby');
  if (checkFile('Gemfile.lock')) stack.push('bundler');
  if (checkFile('config.ru')) stack.push('rack');
  
  // Java / Kotlin
  if (checkFile('pom.xml')) stack.push('maven');
  if (checkFile('build.gradle') || checkFile('build.gradle.kts')) stack.push('gradle');
  
  // Rust
  if (checkFile('Cargo.toml')) stack.push('rust');
  if (checkFile('Cargo.lock')) stack.push('rust-cargo');
  
  // Infrastructure
  if (checkFile('Dockerfile')) stack.push('docker');
  if (checkFile('compose.yaml') || checkFile('docker-compose.yml')) stack.push('docker-compose');
  if (checkFile('main.tf')) stack.push('terraform');
  
  // Version Control
  if (checkDir('.git')) stack.push('git');
  
  // Build Tools
  if (checkFile('Makefile')) stack.push('make');
  
  return stack.length > 0 ? stack : ['unknown'];
}

// ============================================================================
// TF-IDF Semantic Search Implementation
// ============================================================================

class SemanticSearch {
  constructor() {
    this.documents = [];
    this.vocabulary = new Map();
    this.idf = new Map();
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\sа-яёa-z]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  index(documents) {
    this.documents = documents;
    this.vocabulary.clear();
    this.idf.clear();

    const N = documents.length;
    const df = new Map();

    documents.forEach((doc, docIdx) => {
      const tokens = this.tokenize(doc.text || '');
      const tf = new Map();

      tokens.forEach(token => {
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, this.vocabulary.size);
        }
        tf.set(token, (tf.get(token) || 0) + 1);
      });

      const maxFreq = Math.max(...tf.values(), 1);
      tf.forEach((value, key) => {
        tf.set(key, value / maxFreq);
        df.set(key, (df.get(key) || 0) + 1);
      });

      doc.tf = tf;
    });

    this.vocabulary.forEach((_, term) => {
      const docFreq = df.get(term) || 1;
      this.idf.set(term, Math.log(N / docFreq) + 1);
    });

    return this;
  }

  queryVector(query) {
    const tokens = this.tokenize(query);
    const tf = new Map();

    tokens.forEach(token => {
      tf.set(token, (tf.get(token) || 0) + 1);
    });

    const maxFreq = Math.max(...tf.values(), 1);
    tf.forEach((value, key) => {
      tf.set(key, (value / maxFreq) * (this.idf.get(key) || 0));
    });

    return tf;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    vecA.forEach((valueA, term) => {
      const valueB = vecB.get(term) || 0;
      dotProduct += valueA * valueB;
      normA += valueA * valueA;
    });

    vecB.forEach((valueB) => {
      normB += valueB * valueB;
    });

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  search(query, topK = 5) {
    const queryVec = this.queryVector(query);
    
    const scores = this.documents.map((doc, idx) => ({
      idx,
      score: this.cosineSimilarity(queryVec, doc.tf || new Map()),
      document: doc,
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK).filter(s => s.score > 0);
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

function bootstrapProject(cwd) {
  const qwenDir = getProjectQwenDir(cwd);
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);
  
  ensureDir(qwenDir);
  ensureDir(stateDir);
  ensureDir(sharedDir);
  
  const stack = detectStack(cwd);
  
  const manifest = {
    name: basename(cwd),
    path: cwd,
    stack,
    bootstrappedAt: new Date().toISOString(),
    lastIndexedAt: null,
  };
  
  const artifactIndex = {
    files: [],
    byType: {},
    dependencies: [],
  };
  
  const threadState = {
    currentTask: null,
    activeArtifacts: [],
    recentDecisions: [],
    openQuestions: [],
    correctionNotes: [],
    updatedAt: new Date().toISOString(),
  };

  const sharedMemory = {
    team: [],
    decisions: [],
    patterns: [],
    integrations: [],
    conventions: [],
    updatedAt: new Date().toISOString(),
  };

  const semanticIndex = {
    documents: [],
    version: '1.0',
    updatedAt: new Date().toISOString(),
  };
  
  writeJsonFile(join(stateDir, PROJECT_MANIFEST_FILE), manifest);
  writeJsonFile(join(stateDir, ARTIFACT_INDEX_FILE), artifactIndex);
  writeJsonFile(join(stateDir, CURRENT_THREAD_FILE), threadState);
  writeJsonFile(join(sharedDir, SHARED_MEMORY_FILE), sharedMemory);
  writeJsonFile(join(sharedDir, SEMANTIC_INDEX_FILE), semanticIndex);
  
  writeTextFile(join(qwenDir, RUNTIME_MEMORY_FILE), generateRuntimeMemoryMarkdown(threadState, manifest, artifactIndex, sharedMemory));
  
  return {
    success: true,
    manifest,
    message: `Project bootstrapped with stack: ${stack.join(', ')}`,
  };
}

function prepareRuntimePacket(cwd) {
  const qwenDir = getProjectQwenDir(cwd);
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);
  
  const threadState = readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {});
  const manifest = readJsonFile(join(stateDir, PROJECT_MANIFEST_FILE), {});
  const artifactIndex = readJsonFile(join(stateDir, ARTIFACT_INDEX_FILE), {});
  const sharedMemory = readJsonFile(join(sharedDir, SHARED_MEMORY_FILE), {});
  
  const runtimeMemoryPath = join(qwenDir, RUNTIME_MEMORY_FILE);
  const content = generateRuntimeMemoryMarkdown(threadState, manifest, artifactIndex, sharedMemory);
  writeTextFile(runtimeMemoryPath, content);
  
  return {
    success: true,
    runtimeMemoryPath,
    threadState,
    manifest,
    artifactIndex,
    sharedMemory,
    message: 'Runtime packet prepared',
  };
}

function generateRuntimeMemoryMarkdown(threadState, manifest, artifactIndex, sharedMemory = {}) {
  const lines = [
    '# Runtime Memory',
    '',
    '> Auto-generated context for Qwen Code CLI. Do not edit manually.',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
  ];
  
  if (threadState.currentTask) {
    lines.push('## Current Task');
    lines.push('');
    lines.push(threadState.currentTask);
    lines.push('');
  }
  
  if (threadState.activeArtifacts && threadState.activeArtifacts.length > 0) {
    lines.push('## Active Artifacts');
    lines.push('');
    threadState.activeArtifacts.forEach(a => lines.push(`- ${a}`));
    lines.push('');
  }
  
  if (threadState.recentDecisions && threadState.recentDecisions.length > 0) {
    lines.push('## Recent Decisions');
    lines.push('');
    threadState.recentDecisions.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  }
  
  if (threadState.openQuestions && threadState.openQuestions.length > 0) {
    lines.push('## Open Questions');
    lines.push('');
    threadState.openQuestions.forEach(q => lines.push(`- ${q}`));
    lines.push('');
  }
  
  // Shared Team Memory
  if (sharedMemory && (sharedMemory.team?.length > 0 || sharedMemory.decisions?.length > 0 || sharedMemory.patterns?.length > 0)) {
    lines.push('## Team Memory');
    lines.push('');
    
    if (sharedMemory.team && sharedMemory.team.length > 0) {
      lines.push('### Team Members');
      sharedMemory.team.forEach(m => lines.push(`- ${m.name} (${m.role})`));
      lines.push('');
    }
    
    if (sharedMemory.decisions && sharedMemory.decisions.length > 0) {
      lines.push('### Team Decisions');
      sharedMemory.decisions.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
    
    if (sharedMemory.patterns && sharedMemory.patterns.length > 0) {
      lines.push('### Patterns & Conventions');
      sharedMemory.patterns.forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }
    
    if (sharedMemory.integrations && sharedMemory.integrations.length > 0) {
      lines.push('### Integrations');
      sharedMemory.integrations.forEach(i => lines.push(`- ${i}`));
      lines.push('');
    }
  }
  
  if (manifest && manifest.name) {
    lines.push('## Project');
    lines.push('');
    lines.push(`**Name:** ${manifest.name}`);
    if (manifest.stack && manifest.stack.length > 0) {
      lines.push(`**Stack:** ${manifest.stack.join(', ')}`);
    }
    lines.push('');
  }
  
  if (threadState.correctionNotes && threadState.correctionNotes.length > 0) {
    lines.push('## Correction Notes');
    lines.push('');
    threadState.correctionNotes.forEach((n, i) => {
      lines.push(`${i + 1}. ${typeof n === 'string' ? n : n.text}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

function addSemanticDocument(cwd, document) {
  const sharedDir = getSharedMemoryDir(cwd);
  const semanticIndexPath = join(sharedDir, SEMANTIC_INDEX_FILE);
  const semanticIndex = readJsonFile(semanticIndexPath, { documents: [], version: '1.0' });
  
  const doc = {
    id: document.id || `doc_${Date.now()}`,
    text: document.text,
    type: document.type || 'note',
    metadata: document.metadata || {},
    addedAt: new Date().toISOString(),
  };
  
  semanticIndex.documents.push(doc);
  semanticIndex.updatedAt = new Date().toISOString();
  
  writeJsonFile(semanticIndexPath, semanticIndex);
  
  return {
    success: true,
    documentId: doc.id,
    message: 'Document added to semantic index',
  };
}

function semanticSearch(cwd, query, options = {}) {
  const sharedDir = getSharedMemoryDir(cwd);
  const semanticIndexPath = join(sharedDir, SEMANTIC_INDEX_FILE);
  const semanticIndex = readJsonFile(semanticIndexPath, { documents: [] });
  
  if (semanticIndex.documents.length === 0) {
    return {
      success: true,
      results: [],
      message: 'No documents indexed',
    };
  }
  
  const searchEngine = new SemanticSearch();
  searchEngine.index(semanticIndex.documents.map(d => ({ text: d.text })));
  
  const topK = options.topK || 5;
  const results = searchEngine.search(query, topK);
  
  return {
    success: true,
    query,
    results: results.map(r => ({
      id: r.document.id,
      score: r.score,
      text: r.document.text,
      type: r.document.type,
      metadata: r.document.metadata,
    })),
    totalDocuments: semanticIndex.documents.length,
  };
}

function getArtifactContext(cwd, artifactPath) {
  const stateDir = getStateDir(cwd);
  const artifactIndex = readJsonFile(join(stateDir, ARTIFACT_INDEX_FILE), { files: [], byType: {} });
  
  const artifact = artifactIndex.files.find(f => f.path === artifactPath);
  
  if (!artifact) {
    return {
      found: false,
      message: `Artifact not found: ${artifactPath}`,
    };
  }
  
  return {
    found: true,
    artifact,
  };
}

function persistDelta(cwd, delta) {
  const stateDir = getStateDir(cwd);
  const threadStatePath = join(stateDir, CURRENT_THREAD_FILE);
  const threadState = readJsonFile(threadStatePath, {
    currentTask: null,
    activeArtifacts: [],
    recentDecisions: [],
    openQuestions: [],
    correctionNotes: [],
  });
  
  if (delta.currentTask) threadState.currentTask = delta.currentTask;
  if (delta.activeArtifacts) {
    threadState.activeArtifacts = [...new Set([...threadState.activeArtifacts, ...delta.activeArtifacts])];
  }
  if (delta.recentDecisions) {
    threadState.recentDecisions = [...delta.recentDecisions, ...threadState.recentDecisions].slice(0, 10);
  }
  if (delta.openQuestions) {
    threadState.openQuestions = [...delta.openQuestions, ...threadState.openQuestions].slice(0, 10);
  }
  if (delta.correctionNotes) {
    threadState.correctionNotes = [...delta.correctionNotes, ...threadState.correctionNotes].slice(0, 20);
  }
  
  threadState.updatedAt = new Date().toISOString();
  writeJsonFile(threadStatePath, threadState);
  
  // Add to semantic index
  if (delta.recentDecisions || delta.correctionNotes) {
    const newDocs = [];
    if (delta.recentDecisions) {
      delta.recentDecisions.forEach((d, i) => {
        newDocs.push({
          id: `decision_${Date.now()}_${i}`,
          text: d,
          type: 'decision',
        });
      });
    }
    if (delta.correctionNotes) {
      delta.correctionNotes.forEach((n, i) => {
        newDocs.push({
          id: `correction_${Date.now()}_${i}`,
          text: typeof n === 'string' ? n : n.text,
          type: 'correction',
        });
      });
    }
    newDocs.forEach(doc => addSemanticDocument(cwd, doc));
  }
  
  return {
    success: true,
    message: 'Delta persisted to thread state',
  };
}

function promoteToCanonical(cwd) {
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);
  
  const threadState = readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {});
  const sharedMemory = readJsonFile(join(sharedDir, SHARED_MEMORY_FILE), {
    team: [],
    decisions: [],
    patterns: [],
    integrations: [],
    conventions: [],
  });
  
  // Promote decisions
  if (threadState.recentDecisions) {
    threadState.recentDecisions.forEach(d => {
      if (!sharedMemory.decisions.includes(d)) {
        sharedMemory.decisions.push(d);
      }
    });
  }
  
  // Promote correction notes to patterns
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
    success: true,
    message: 'Thread state promoted to shared team memory',
    promoted: {
      decisions: sharedMemory.decisions.length,
      patterns: sharedMemory.patterns.length,
    },
  };
}

function searchMemory(cwd, query, options = {}) {
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);
  
  const threadState = readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {});
  const manifest = readJsonFile(join(stateDir, PROJECT_MANIFEST_FILE), {});
  const sharedMemory = readJsonFile(join(sharedDir, SHARED_MEMORY_FILE), {});
  
  const results = {
    keyword: [],
    semantic: [],
    shared: [],
  };
  
  const queryLower = query.toLowerCase();
  
  // Keyword search in thread state
  if (threadState.currentTask && threadState.currentTask.toLowerCase().includes(queryLower)) {
    results.keyword.push({ type: 'currentTask', value: threadState.currentTask });
  }
  
  for (const decision of (threadState.recentDecisions || [])) {
    if (decision.toLowerCase().includes(queryLower)) {
      results.keyword.push({ type: 'decision', value: decision });
    }
  }
  
  // Search shared memory
  if (sharedMemory.decisions) {
    for (const decision of sharedMemory.decisions) {
      if (decision.toLowerCase().includes(queryLower)) {
        results.shared.push({ type: 'teamDecision', value: decision });
      }
    }
  }
  
  if (sharedMemory.patterns) {
    for (const pattern of sharedMemory.patterns) {
      if (pattern.toLowerCase().includes(queryLower)) {
        results.shared.push({ type: 'pattern', value: pattern });
      }
    }
  }
  
  // Semantic search
  const semanticResult = semanticSearch(cwd, query, { topK: options.topK || 3 });
  results.semantic = semanticResult.results || [];
  
  return {
    success: true,
    query,
    results,
  };
}

function updateCorrection(cwd, note) {
  const stateDir = getStateDir(cwd);
  const threadStatePath = join(stateDir, CURRENT_THREAD_FILE);
  const threadState = readJsonFile(threadStatePath, { correctionNotes: [] });
  
  threadState.correctionNotes = threadState.correctionNotes || [];
  threadState.correctionNotes.unshift({
    text: note,
    timestamp: new Date().toISOString(),
  });
  threadState.correctionNotes = threadState.correctionNotes.slice(0, 20);
  threadState.updatedAt = new Date().toISOString();
  
  writeJsonFile(threadStatePath, threadState);
  
  addSemanticDocument(cwd, {
    text: note,
    type: 'correction',
  });
  
  return {
    success: true,
    message: 'Correction note added',
  };
}

function addTeamMember(cwd, member) {
  const sharedDir = getSharedMemoryDir(cwd);
  const sharedMemory = readJsonFile(join(sharedDir, SHARED_MEMORY_FILE), { team: [] });
  
  sharedMemory.team = sharedMemory.team || [];
  sharedMemory.team.push({
    name: member.name,
    role: member.role,
    addedAt: new Date().toISOString(),
  });
  sharedMemory.updatedAt = new Date().toISOString();
  
  writeJsonFile(join(sharedDir, SHARED_MEMORY_FILE), sharedMemory);
  
  return {
    success: true,
    message: `Team member ${member.name} added`,
  };
}

function getSharedMemory(cwd) {
  const sharedDir = getSharedMemoryDir(cwd);
  const sharedMemory = readJsonFile(join(sharedDir, SHARED_MEMORY_FILE), {});
  
  return {
    success: true,
    sharedMemory,
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'universal-dev-runtime',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'bootstrap_project',
        description: 'Bootstrap a project: detect stack, create state directories and files',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
          },
        },
      },
      {
        name: 'prepare_runtime_packet',
        description: 'Generate runtime-memory.md from current state',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
          },
        },
      },
      {
        name: 'get_artifact_context',
        description: 'Get context for a specific artifact',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            artifactPath: { type: 'string', description: 'Path to artifact' },
          },
          required: ['cwd', 'artifactPath'],
        },
      },
      {
        name: 'persist_delta',
        description: 'Save changes to thread state and semantic index',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            delta: {
              type: 'object',
              properties: {
                currentTask: { type: 'string' },
                activeArtifacts: { type: 'array', items: { type: 'string' } },
                recentDecisions: { type: 'array', items: { type: 'string' } },
                openQuestions: { type: 'array', items: { type: 'string' } },
                correctionNotes: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          required: ['cwd', 'delta'],
        },
      },
      {
        name: 'promote_to_canonical',
        description: 'Promote thread state to shared team memory',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
          },
        },
      },
      {
        name: 'search_memory',
        description: 'Search with keyword + semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            query: { type: 'string', description: 'Search query' },
            topK: { type: 'number', description: 'Number of results' },
          },
          required: ['cwd', 'query'],
        },
      },
      {
        name: 'update_correction',
        description: 'Add a correction note',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            note: { type: 'string', description: 'Correction note text' },
          },
          required: ['cwd', 'note'],
        },
      },
      {
        name: 'add_semantic_document',
        description: 'Add document for semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            document: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                type: { type: 'string' },
                metadata: { type: 'object' },
              },
              required: ['text'],
            },
          },
          required: ['cwd', 'document'],
        },
      },
      {
        name: 'semantic_search',
        description: 'Semantic search using TF-IDF + cosine similarity',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            query: { type: 'string', description: 'Search query' },
            topK: { type: 'number', description: 'Number of results' },
          },
          required: ['cwd', 'query'],
        },
      },
      {
        name: 'add_team_member',
        description: 'Add team member to shared memory',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
            member: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
              },
              required: ['name', 'role'],
            },
          },
          required: ['cwd', 'member'],
        },
      },
      {
        name: 'get_shared_memory',
        description: 'Get shared team memory',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory' },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const cwd = args.cwd || process.cwd();
  
  try {
    let result;
    
    switch (name) {
      case 'bootstrap_project':
        result = bootstrapProject(cwd);
        break;
      case 'prepare_runtime_packet':
        result = prepareRuntimePacket(cwd);
        break;
      case 'get_artifact_context':
        result = getArtifactContext(cwd, args.artifactPath);
        break;
      case 'persist_delta':
        result = persistDelta(cwd, args.delta);
        break;
      case 'promote_to_canonical':
        result = promoteToCanonical(cwd);
        break;
      case 'search_memory':
        result = searchMemory(cwd, args.query, args.options);
        break;
      case 'update_correction':
        result = updateCorrection(cwd, args.note);
        break;
      case 'add_semantic_document':
        result = addSemanticDocument(cwd, args.document);
        break;
      case 'semantic_search':
        result = semanticSearch(cwd, args.query, { topK: args.topK });
        break;
      case 'add_team_member':
        result = addTeamMember(cwd, args.member);
        break;
      case 'get_shared_memory':
        result = getSharedMemory(cwd);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Universal Dev Runtime MCP Server v1.1 running on stdio');
  console.error('Features: Thread state, Shared memory, Semantic search (TF-IDF)');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
