#!/usr/bin/env node

/**
 * QWX - Qwen Wrapper CLI
 *
 * Universal wrapper for Qwen Code CLI with runtime memory management
 * Works with any tech stack
 *
 * Usage:
 *   qwx "your prompt here"
 *   qwx --bootstrap
 *   qwx --refresh
 *   qwx --search "query"
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const TEMPLATES_DIR = join(ROOT_DIR, 'templates');

const QWEN_DIR = '.qwen';
const STATE_DIR = 'state';
const SHARED_MEMORY_DIR = 'shared';
const RUNTIME_MEMORY_FILE = 'runtime-memory.md';
const CURRENT_THREAD_FILE = 'current-thread.json';
const QWEN_MD_FILE = 'QWEN.md';
const SETTINGS_JSON_FILE = 'settings.json';

function runCommand(cmd, cwd = process.cwd()) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    return e.stdout || e.stderr || e.message;
  }
}

function fileExists(filePath) {
  return existsSync(filePath);
}

function readJsonFile(filePath, defaultVal = {}) {
  try {
    if (fileExists(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return defaultVal;
}

function writeJsonFile(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    execSync(`mkdir -p "${dir}"`);
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getProjectQwenDir(cwd) {
  return join(cwd, QWEN_DIR);
}

function getStateDir(cwd) {
  return join(getProjectQwenDir(cwd), STATE_DIR);
}

function getSharedMemoryDir(cwd) {
  return join(getProjectQwenDir(cwd), SHARED_MEMORY_DIR);
}

function detectStack(cwd) {
  const stack = [];
  const checkFile = (filename) => fileExists(join(cwd, filename));
  const checkDir = (dirname) => fileExists(join(cwd, dirname));

  if (checkFile('composer.json')) stack.push('PHP');
  if (checkFile('symfony.lock')) stack.push('Symfony');
  if (checkFile('package.json')) stack.push('Node.js');
  if (checkFile('tsconfig.json')) stack.push('TypeScript');
  if (checkFile('requirements.txt')) stack.push('Python');
  if (checkFile('manage.py')) stack.push('Django');
  if (checkFile('go.mod')) stack.push('Go');
  if (checkFile('Gemfile')) stack.push('Ruby');
  if (checkFile('Cargo.toml')) stack.push('Rust');
  if (checkFile('pom.xml') || checkFile('build.gradle')) stack.push('Java');
  if (checkFile('Dockerfile')) stack.push('Docker');
  if (checkFile('docker-compose.yml') || checkFile('compose.yaml')) stack.push('Docker Compose');
  if (checkDir('.git')) stack.push('Git');

  return stack.length > 0 ? stack : ['Unknown'];
}

function generateRuntimeMemoryMarkdown(threadState, manifest, sharedMemory) {
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
  
  if (threadState.activeArtifacts?.length > 0) {
    lines.push('## Active Artifacts');
    lines.push('');
    threadState.activeArtifacts.forEach(a => lines.push(`- ${a}`));
    lines.push('');
  }
  
  if (threadState.recentDecisions?.length > 0) {
    lines.push('## Recent Decisions');
    lines.push('');
    threadState.recentDecisions.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  }
  
  if (threadState.openQuestions?.length > 0) {
    lines.push('## Open Questions');
    lines.push('');
    threadState.openQuestions.forEach(q => lines.push(`- ${q}`));
    lines.push('');
  }
  
  if (sharedMemory && (sharedMemory.team?.length > 0 || sharedMemory.decisions?.length > 0 || sharedMemory.patterns?.length > 0)) {
    lines.push('## Team Memory');
    lines.push('');
    
    if (sharedMemory.team?.length > 0) {
      lines.push('### Team Members');
      sharedMemory.team.forEach(m => lines.push(`- ${m.name} (${m.role})`));
      lines.push('');
    }
    
    if (sharedMemory.decisions?.length > 0) {
      lines.push('### Team Decisions');
      sharedMemory.decisions.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
    
    if (sharedMemory.patterns?.length > 0) {
      lines.push('### Patterns & Conventions');
      sharedMemory.patterns.forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }
  }
  
  if (manifest?.name) {
    lines.push('## Project');
    lines.push('');
    lines.push(`**Name:** ${manifest.name}`);
    if (manifest.stack?.length > 0) {
      lines.push(`**Stack:** ${manifest.stack.join(', ')}`);
    }
    lines.push('');
  }
  
  if (threadState.correctionNotes?.length > 0) {
    lines.push('## Correction Notes');
    lines.push('');
    threadState.correctionNotes.forEach((n, i) => {
      lines.push(`${i + 1}. ${typeof n === 'string' ? n : n.text}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

function prepareRuntimePacket(cwd) {
  const qwenDir = getProjectQwenDir(cwd);
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);
  
  const threadState = readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {});
  const manifest = readJsonFile(join(stateDir, 'project-manifest.json'), {});
  const sharedMemory = readJsonFile(join(sharedDir, 'shared-memory.json'), {});
  
  const runtimeMemoryContent = generateRuntimeMemoryMarkdown(threadState, manifest, sharedMemory);
  const runtimeMemoryPath = join(qwenDir, RUNTIME_MEMORY_FILE);
  
  writeFileSync(runtimeMemoryPath, runtimeMemoryContent, 'utf-8');
  
  console.log(`✓ Runtime packet prepared: ${runtimeMemoryPath}`);
  return runtimeMemoryPath;
}

function createQwenMarkdown(cwd, projectName) {
  const qwenDir = getProjectQwenDir(cwd);
  const qwenMdPath = join(qwenDir, QWEN_MD_FILE);
  
  // Check if QWEN.md already exists
  if (fileExists(qwenMdPath)) {
    // QWEN.md exists - update it to include runtime-memory.md import
    const existingContent = readFileSync(qwenMdPath, 'utf-8');
    
    // Check if runtime-memory.md is already imported
    const hasRuntimeImport = existingContent.includes('@.qwen/runtime-memory.md') || 
                             existingContent.includes('.qwen/runtime-memory.md');
    
    if (!hasRuntimeImport) {
      // Add runtime import after the first line (or at the beginning)
      const lines = existingContent.split('\n');
      const runtimeImport = '\n## Runtime Import\n@.qwen/runtime-memory.md\n';
      
      // Insert after first heading or at position 1
      let insertIndex = 1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) {
          insertIndex = i + 1;
          break;
        }
      }
      
      lines.splice(insertIndex, 0, runtimeImport);
      const newContent = lines.join('\n');
      
      writeFileSync(qwenMdPath, newContent, 'utf-8');
      console.log(`  → QWEN.md updated (added runtime-memory.md import)`);
    } else {
      console.log(`  → QWEN.md already has runtime-memory.md import`);
    }
    
    return qwenMdPath;
  }
  
  // QWEN.md doesn't exist - create from template
  let template = `# ${projectName}

## Runtime Import
@.qwen/runtime-memory.md

## Project Rules
- Follow project conventions
- Treat runtime-memory.md as active working context
- Read correction notes before making changes

## Usage
\`\`\`bash
# Run with automatic context
qwx "your prompt here"

# Bootstrap (if not done)
qwx --bootstrap

# Search memory
qwx --search "query"

# Web interface
npm run web
\`\`\`
`;

  try {
    const templatePath = join(TEMPLATES_DIR, QWEN_MD_FILE);
    if (existsSync(templatePath)) {
      template = readFileSync(templatePath, 'utf-8')
        .replace(/{{PROJECT_NAME}}/g, projectName);
    }
  } catch (e) {
    // Use default template
  }

  writeFileSync(qwenMdPath, template, 'utf-8');
  console.log(`  → QWEN.md created`);
  return qwenMdPath;
}

function createSettingsJson(cwd) {
  const qwenDir = getProjectQwenDir(cwd);
  const settingsPath = join(qwenDir, SETTINGS_JSON_FILE);
  
  // Check if settings.json already exists
  if (fileExists(settingsPath)) {
    // settings.json exists - update it to include MCP server if not present
    const existingSettings = readJsonFile(settingsPath, {});
    
    // Check if dev-runtime MCP server is already configured
    const hasDevRuntime = existingSettings.mcpServers?.['dev-runtime'];
    
    if (!hasDevRuntime) {
      // Add dev-runtime MCP server
      existingSettings.mcpServers = existingSettings.mcpServers || {};
      existingSettings.mcpServers['dev-runtime'] = {
        "command": "node",
        "args": [join(ROOT_DIR, 'src', 'runtime-mcp.js')],
        "cwd": cwd,
        "timeout": 15000
      };
      
      writeJsonFile(settingsPath, existingSettings);
      console.log(`  → settings.json updated (added dev-runtime MCP server)`);
    } else {
      console.log(`  → settings.json already has dev-runtime MCP server`);
    }
    
    return settingsPath;
  }
  
  // settings.json doesn't exist - create new
  const settings = {
    "context": {
      "fileName": "QWEN.md"
    },
    "mcpServers": {
      "dev-runtime": {
        "command": "node",
        "args": [join(ROOT_DIR, 'src', 'runtime-mcp.js')],
        "cwd": cwd,
        "timeout": 15000
      }
    },
    "permissions": {
      "allow": [
        "Bash(node *)",
        "Bash(python3 *)",
        "Bash(pip3 install *)",
        `Read(//${cwd.replace(/^\//, '')}/**)` ,
        `Write(//${cwd.replace(/^\//, '')}/**)`
      ]
    },
    "$version": 3
  };

  writeJsonFile(settingsPath, settings);
  console.log(`  → settings.json created`);
  return settingsPath;
}

function createOrUpdatePackageJson(cwd) {
  const packageJsonPath = join(cwd, 'package.json');
  
  let packageJson = {};
  
  // Try to read existing package.json
  try {
    if (fileExists(packageJsonPath)) {
      packageJson = readJsonFile(packageJsonPath, {});
    }
  } catch (e) {
    // Use empty package.json
  }

  // Add web scripts if not present
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  // Add web script for universal-dev-runtime web interface
  if (!packageJson.scripts.web) {
    packageJson.scripts.web = 'node ' + join(ROOT_DIR, 'src', 'web-server.js');
  }
  
  // Add web:port script for custom port
  if (!packageJson.scripts['web:port']) {
    packageJson.scripts['web:port'] = 'QWX_WEB_PORT=${QWX_WEB_PORT:-3000} node ' + join(ROOT_DIR, 'src', 'web-server.js');
  }

  writeJsonFile(packageJsonPath, packageJson);
  return packageJsonPath;
}

function cmdBootstrap(cwd) {
  console.log('Bootstrapping project...');

  const qwenDir = getProjectQwenDir(cwd);
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);

  if (!fileExists(qwenDir)) {
    execSync(`mkdir -p "${qwenDir}" "${stateDir}" "${sharedDir}"`, { cwd });
  }

  const stack = detectStack(cwd);
  const projectName = basename(cwd);

  const manifest = {
    name: projectName,
    path: cwd,
    stack,
    bootstrappedAt: new Date().toISOString(),
    lastIndexedAt: null,
  };
  writeJsonFile(join(stateDir, 'project-manifest.json'), manifest);

  writeJsonFile(join(stateDir, 'artifact-index.json'), {
    files: [],
    byType: {},
    dependencies: [],
  });

  const threadState = readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {
    currentTask: null,
    activeArtifacts: [],
    recentDecisions: [],
    openQuestions: [],
    correctionNotes: [],
  });
  threadState.updatedAt = new Date().toISOString();
  writeJsonFile(join(stateDir, CURRENT_THREAD_FILE), threadState);

  const sharedMemoryPath = join(sharedDir, 'shared-memory.json');
  if (!fileExists(sharedMemoryPath)) {
    writeJsonFile(sharedMemoryPath, {
      team: [],
      decisions: [],
      patterns: [],
      integrations: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const semanticIndexPath = join(sharedDir, 'semantic-index.json');
  if (!fileExists(semanticIndexPath)) {
    writeJsonFile(semanticIndexPath, {
      documents: [],
      version: '1.0',
      updatedAt: new Date().toISOString(),
    });
  }

  // Create QWEN.md with runtime import
  const qwenMdPath = createQwenMarkdown(cwd, projectName);
  console.log(`✓ QWEN.md created: ${qwenMdPath}`);

  // Create settings.json with MCP server config
  const settingsPath = createSettingsJson(cwd);
  console.log(`✓ settings.json created: ${settingsPath}`);

  // Create or update package.json with web scripts
  const packageJsonPath = createOrUpdatePackageJson(cwd);
  console.log(`✓ package.json updated: ${packageJsonPath}`);

  prepareRuntimePacket(cwd);

  console.log(`✓ Project bootstrapped: ${projectName}`);
  console.log(`  Stack: ${stack.join(', ')}`);
  console.log('');
  console.log('  Auto-context enabled: QWEN.md imports @.qwen/runtime-memory.md');
  console.log('  MCP server configured: dev-runtime');
  console.log('  Web interface: npm run web');
}

function cmdRefresh(cwd) {
  console.log('Refreshing runtime packet...');
  prepareRuntimePacket(cwd);
  console.log('✓ Runtime packet refreshed');
}

function computeSimilarity(query, text) {
  const queryWords = query.split(/\s+/).filter(w => w.length > 2);
  const textWords = text.split(/\s+/);
  if (queryWords.length === 0) return 0;
  
  let matches = 0;
  queryWords.forEach(qw => {
    if (textWords.some(tw => tw.includes(qw) || qw.includes(tw))) {
      matches++;
    }
  });
  
  return matches / queryWords.length;
}

function cmdSearch(cwd, query) {
  console.log(`Searching for: "${query}"`);
  
  const stateDir = getStateDir(cwd);
  const sharedDir = getSharedMemoryDir(cwd);
  
  const threadState = readJsonFile(join(stateDir, CURRENT_THREAD_FILE), {});
  const sharedMemory = readJsonFile(join(sharedDir, 'shared-memory.json'), {});
  const semanticIndex = readJsonFile(join(sharedDir, 'semantic-index.json'), { documents: [] });
  
  const results = {
    threadState: [],
    sharedMemory: [],
    semantic: [],
  };
  
  const queryLower = query.toLowerCase();
  
  if (threadState.currentTask?.toLowerCase().includes(queryLower)) {
    results.threadState.push({ type: 'currentTask', value: threadState.currentTask });
  }
  
  threadState.recentDecisions?.forEach(d => {
    if (d.toLowerCase().includes(queryLower)) {
      results.threadState.push({ type: 'decision', value: d });
    }
  });
  
  threadState.correctionNotes?.forEach(n => {
    const text = typeof n === 'string' ? n : n.text;
    if (text.toLowerCase().includes(queryLower)) {
      results.threadState.push({ type: 'correction', value: text });
    }
  });
  
  sharedMemory.decisions?.forEach(d => {
    if (d.toLowerCase().includes(queryLower)) {
      results.sharedMemory.push({ type: 'teamDecision', value: d });
    }
  });
  
  sharedMemory.patterns?.forEach(p => {
    if (p.toLowerCase().includes(queryLower)) {
      results.sharedMemory.push({ type: 'pattern', value: p });
    }
  });
  
  semanticIndex.documents?.forEach(doc => {
    const score = computeSimilarity(queryLower, doc.text.toLowerCase());
    if (score > 0.1) {
      results.semantic.push({ ...doc, score });
    }
  });
  
  results.semantic.sort((a, b) => b.score - a.score);
  results.semantic = results.semantic.slice(0, 5);
  
  console.log('\n=== Results ===\n');
  
  if (results.threadState.length > 0) {
    console.log('Thread State:');
    results.threadState.forEach(r => console.log(`  [${r.type}] ${r.value}`));
    console.log('');
  }
  
  if (results.sharedMemory.length > 0) {
    console.log('Shared Memory:');
    results.sharedMemory.forEach(r => console.log(`  [${r.type}] ${r.value}`));
    console.log('');
  }
  
  if (results.semantic.length > 0) {
    console.log('Semantic Search:');
    results.semantic.forEach(r => console.log(`  [${r.type}] (${r.score.toFixed(2)}) ${r.text}`));
    console.log('');
  }
  
  if (results.threadState.length === 0 && results.sharedMemory.length === 0 && results.semantic.length === 0) {
    console.log('No results found.');
  }
}

function cmdRun(prompt, cwd, options = {}) {
  prepareRuntimePacket(cwd);
  
  const qwenArgs = [];
  if (options.continue) {
    qwenArgs.push('--continue');
  }
  qwenArgs.push('-p', `"${prompt}"`);
  
  const cmd = `qwen ${qwenArgs.join(' ')}`;
  console.log(`Running: ${cmd}`);
  
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (e) {
    console.error('Qwen command failed:', e.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  
  if (args.length === 0) {
    console.log('QWX - Qwen Wrapper CLI v1.1');
    console.log('');
    console.log('Usage:');
    console.log('  qwx "prompt"             Run Qwen with runtime memory');
    console.log('  qwx --bootstrap          Bootstrap project');
    console.log('  qwx --refresh            Refresh runtime packet');
    console.log('  qwx --continue "prompt"  Continue session');
    console.log('  qwx --search "query"     Search memory');
    console.log('  qwx --help               Show help');
    process.exit(0);
  }
  
  const firstArg = args[0];
  
  if (firstArg === '--bootstrap') {
    cmdBootstrap(cwd);
  } else if (firstArg === '--refresh') {
    cmdRefresh(cwd);
  } else if (firstArg === '--search') {
    const query = args.slice(1).join(' ');
    if (!query) {
      console.error('Error: --search requires a query');
      process.exit(1);
    }
    cmdSearch(cwd, query);
  } else if (firstArg === '--continue') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      console.error('Error: --continue requires a prompt');
      process.exit(1);
    }
    cmdRun(prompt, cwd, { continue: true });
  } else if (firstArg === '--help' || firstArg === '-h') {
    console.log('QWX - Qwen Wrapper CLI v1.1');
    console.log('');
    console.log('Commands:');
    console.log('  qwx "prompt"             Run Qwen with runtime memory preparation');
    console.log('  qwx --bootstrap          Bootstrap project (create state files)');
    console.log('  qwx --refresh            Refresh runtime packet');
    console.log('  qwx --continue "prompt"  Continue previous session');
    console.log('  qwx --search "query"     Search memory (keyword + semantic)');
    console.log('  qwx --help               Show this help');
    console.log('');
    console.log('Features:');
    console.log('  - Thread state for instant operational memory');
    console.log('  - Shared memory for team collaboration');
    console.log('  - Semantic search using TF-IDF + cosine similarity');
    console.log('  - Works with any tech stack');
  } else {
    const prompt = args.join(' ');
    cmdRun(prompt, cwd);
  }
}

main();
