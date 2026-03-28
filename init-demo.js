#!/usr/bin/env node

/**
 * Initialize demo data for Universal Dev Runtime Web Interface
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const cwd = process.argv[2] || process.cwd();
const QWEN_DIR = join(cwd, '.qwen');
const STATE_DIR = join(QWEN_DIR, 'state');
const SHARED_DIR = join(QWEN_DIR, 'shared');

// Ensure directories exist
[QWEN_DIR, STATE_DIR, SHARED_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Thread State
const threadState = {
  currentTask: "Implement user authentication with JWT",
  activeArtifacts: [
    "src/Controller/SecurityController.php",
    "src/Entity/User.php",
    "src/Service/JwtTokenService.php"
  ],
  recentDecisions: [
    "Use bcrypt for password hashing",
    "JWT tokens with 1 hour expiration",
    "Refresh tokens stored in httpOnly cookies"
  ],
  openQuestions: [
    "Should we add 2FA support?",
    "Rate limiting for login attempts?"
  ],
  correctionNotes: [
    "MySQL runs on port 3306, not through Docker",
    "Redis is available at redis:6379"
  ],
  updatedAt: new Date().toISOString()
};

// Project Manifest
const projectManifest = {
  name: "demo-project",
  path: cwd,
  stack: ["node", "express", "typescript", "docker", "git"],
  bootstrappedAt: new Date().toISOString(),
  lastIndexedAt: null
};

// Artifact Index
const artifactIndex = {
  files: [
    { path: "src/Controller/SecurityController.php", type: "controller" },
    { path: "src/Entity/User.php", type: "entity" },
    { path: "src/Service/JwtTokenService.php", type: "service" }
  ],
  byType: {
    controller: ["SecurityController.php"],
    entity: ["User.php"],
    service: ["JwtTokenService.php"]
  },
  dependencies: []
};

// Shared Memory
const sharedMemory = {
  team: [
    { name: "Alice Johnson", role: "Backend Developer", addedAt: new Date().toISOString() },
    { name: "Bob Smith", role: "Frontend Developer", addedAt: new Date().toISOString() },
    { name: "Carol Williams", role: "DevOps Engineer", addedAt: new Date().toISOString() }
  ],
  decisions: [
    "Use Repository pattern for database access",
    "All API responses must be in JSON format",
    "Use UUID for primary keys",
    "Implement API versioning via URL path"
  ],
  patterns: [
    "Money stored as DECIMAL(10,2), never FLOAT",
    "All dates in UTC, convert on frontend",
    "Password minimum 12 characters",
    "Use soft deletes for user data"
  ],
  integrations: [
    "Stripe for payments",
    "SendGrid for emails",
    "Sentry for error tracking"
  ],
  conventions: [
    "Commit messages in present tense: 'Add feature' not 'Added feature'",
    "Branch naming: feature/xxx, bugfix/xxx, hotfix/xxx"
  ],
  updatedAt: new Date().toISOString()
};

// Semantic Index
const semanticIndex = {
  documents: [
    {
      id: "decision_001",
      text: "Session-based cart (no DB persistence) - cart stored in Redis with 24h TTL",
      type: "decision",
      metadata: { category: "architecture" },
      addedAt: new Date().toISOString()
    },
    {
      id: "decision_002",
      text: "Use PostgreSQL JSONB columns for flexible metadata storage",
      type: "decision",
      metadata: { category: "database" },
      addedAt: new Date().toISOString()
    },
    {
      id: "correction_001",
      text: "SMTP port 587 for TLS, not 465",
      type: "correction",
      metadata: { category: "infrastructure" },
      addedAt: new Date().toISOString()
    },
    {
      id: "note_001",
      text: "API rate limiting: 100 requests/minute for authenticated users, 10 for anonymous",
      type: "note",
      metadata: { category: "security" },
      addedAt: new Date().toISOString()
    },
    {
      id: "architecture_001",
      text: "Microservices communicate via RabbitMQ message broker with retry logic",
      type: "architecture",
      metadata: { category: "infrastructure" },
      addedAt: new Date().toISOString()
    }
  ],
  version: "1.0",
  updatedAt: new Date().toISOString()
};

// Runtime Memory
const runtimeMemory = `# Runtime Memory

> Auto-generated context for Qwen Code CLI. Do not edit manually.

**Generated:** ${new Date().toISOString()}

## Current Task

${threadState.currentTask}

## Active Artifacts

${threadState.activeArtifacts.map(a => `- ${a}`).join('\n')}

## Recent Decisions

${threadState.recentDecisions.map(d => `- ${d}`).join('\n')}

## Open Questions

${threadState.openQuestions.map(q => `- ${q}`).join('\n')}

## Team Memory

### Team Members
${sharedMemory.team.map(m => `- ${m.name} (${m.role})`).join('\n')}

### Team Decisions
${sharedMemory.decisions.map(d => `- ${d}`).join('\n')}

### Patterns & Conventions
${sharedMemory.patterns.map(p => `- ${p}`).join('\n')}

### Integrations
${sharedMemory.integrations.map(i => `- ${i}`).join('\n')}

## Project

**Name:** ${projectManifest.name}
**Stack:** ${projectManifest.stack.join(', ')}

## Correction Notes

${threadState.correctionNotes.map((n, i) => `${i + 1}. ${typeof n === 'string' ? n : n.text}`).join('\n')}
`;

// Write all files
writeFileSync(join(STATE_DIR, 'current-thread.json'), JSON.stringify(threadState, null, 2));
writeFileSync(join(STATE_DIR, 'project-manifest.json'), JSON.stringify(projectManifest, null, 2));
writeFileSync(join(STATE_DIR, 'artifact-index.json'), JSON.stringify(artifactIndex, null, 2));
writeFileSync(join(SHARED_DIR, 'shared-memory.json'), JSON.stringify(sharedMemory, null, 2));
writeFileSync(join(SHARED_DIR, 'semantic-index.json'), JSON.stringify(semanticIndex, null, 2));
writeFileSync(join(QWEN_DIR, 'runtime-memory.md'), runtimeMemory);

console.log('✅ Demo data initialized!');
console.log('');
console.log('📁 Files created:');
console.log('   .qwen/state/current-thread.json');
console.log('   .qwen/state/project-manifest.json');
console.log('   .qwen/state/artifact-index.json');
console.log('   .qwen/shared/shared-memory.json');
console.log('   .qwen/shared/semantic-index.json');
console.log('   .qwen/runtime-memory.md');
console.log('');
console.log('📊 Stats:');
console.log(`   Team Members: ${sharedMemory.team.length}`);
console.log(`   Decisions: ${sharedMemory.decisions.length}`);
console.log(`   Patterns: ${sharedMemory.patterns.length}`);
console.log(`   Documents: ${semanticIndex.documents.length}`);
console.log('');
console.log('🚀 Now open http://localhost:3000 in your browser!');
