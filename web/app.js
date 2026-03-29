/**
 * Universal Dev Runtime 2.0 - Web Interface
 *
 * Memory management with Qdrant vector search and real-time events
 */

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = '';
const WS_URL = `ws://${window.location.hostname}:8765`;

// ============================================================================
// State
// ============================================================================

let currentCwd = localStorage.getItem('qwx_cwd') || '';
let realtimeEnabled = true;
let wsConnection = null;
let translations = {};
let currentLanguage = 'en';

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  initializeWebSocket();
  await refreshDashboard();
  updateLanguageUI();

  // Auto-refresh vector stats every 5 seconds
  setInterval(refreshVectorStats, 5000);
});

// ============================================================================
// WebSocket Real-time Connection
// ============================================================================

function initializeWebSocket() {
  try {
    wsConnection = new WebSocket(WS_URL);

    wsConnection.onopen = () => {
      console.log('[WebSocket] Connected');
      updateQdrantStatus('connected');
      addRealtimeEvent({
        event: 'websocket_connected',
        timestamp: new Date().toISOString(),
      });
    };

    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'memory-event' && realtimeEnabled) {
          handleRealtimeEvent(data);
        }
      } catch (e) {
        console.error('[WebSocket] Parse error:', e);
      }
    };

    wsConnection.onclose = () => {
      console.log('[WebSocket] Disconnected');
      updateQdrantStatus('disconnected');
      // Reconnect after 3 seconds
      setTimeout(initializeWebSocket, 3000);
    };

    wsConnection.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      updateQdrantStatus('local');
    };
  } catch (e) {
    console.error('[WebSocket] Connection failed:', e);
    updateQdrantStatus('local');
  }
}

function handleRealtimeEvent(data) {
  addRealtimeEvent(data);

  // Auto-refresh based on event type
  switch (data.event) {
    case 'document_added':
    case 'delta_persisted':
      refreshDocuments();
      refreshVectorStats();
      break;
    case 'promoted_to_canonical':
      refreshSharedMemory();
      break;
    case 'team_member_added':
      refreshTeamMembers();
      break;
    case 'bootstrap':
      refreshDashboard();
      break;
  }
}

function addRealtimeEvent(data) {
  const container = document.getElementById('realtimeEvents');
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  const eventDiv = document.createElement('div');
  eventDiv.className = `realtime-event event_${data.event}`;
  eventDiv.innerHTML = renderRealtimeEvent(data);

  container.insertBefore(eventDiv, container.firstChild);

  // Keep only last 50 events
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}

function renderRealtimeEvent(data) {
  const icons = {
    bootstrap: 'bi-cpu',
    document_added: 'bi-file-earmark-plus',
    search_performed: 'bi-search',
    multi_search_performed: 'bi-search',
    delta_persisted: 'bi-save',
    promoted_to_canonical: 'bi-arrow-up-circle',
    correction_added: 'bi-exclamation-triangle',
    team_member_added: 'bi-person-plus',
    collection_cleared: 'bi-trash',
    websocket_connected: 'bi-wifi',
  };

  const messages = {
    bootstrap: `Project bootstrapped with stack: ${data.stack || 'unknown'}`,
    document_added: `Document ${data.action} in ${data.collection}`,
    search_performed: `Search: "${data.query}" (${data.resultCount} results)`,
    multi_search_performed: `Multi-search: "${data.query}" (${data.totalResults} results)`,
    delta_persisted: `Persisted ${data.documents?.length || 0} documents`,
    promoted_to_canonical: `Promoted to shared memory`,
    correction_added: `Correction note added`,
    team_member_added: `Team member added: ${data.member}`,
    collection_cleared: `Cleared ${data.deletedCount} documents from ${data.collection}`,
    websocket_connected: 'WebSocket connected to real-time server',
  };

  const icon = icons[data.event] || 'bi-activity';
  const message = messages[data.event] || `Event: ${data.event}`;
  const time = new Date(data.timestamp).toLocaleTimeString();

  return `
    <div class="realtime-event-icon">
      <i class="bi ${icon}"></i>
    </div>
    <div class="realtime-event-content">
      <div>${message}</div>
      <div class="realtime-event-time">${time}</div>
    </div>
  `;
}

function toggleRealtime() {
  realtimeEnabled = !realtimeEnabled;
  const icon = document.getElementById('realtimeToggleIcon');
  icon.className = realtimeEnabled ? 'bi bi-pause' : 'bi bi-play';
}

function updateQdrantStatus(status) {
  const el = document.getElementById('qdrantStatus');
  const labels = {
    connected: 'Qdrant Connected',
    local: 'Local Mode',
    disconnected: 'Connecting...',
  };

  el.className = `qdrant-status ${status}`;
  el.innerHTML = `
    <i class="bi bi-circle-fill" style="font-size: 8px;"></i>
    <span>${labels[status]}</span>
  `;
}

// ============================================================================
// API Calls
// ============================================================================

async function apiCall(endpoint, options = {}) {
  const url = currentCwd
    ? `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}cwd=${encodeURIComponent(currentCwd)}`
    : `${API_BASE}${endpoint}`;

  const response = await fetch(url, options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API call failed');
  }

  return data.data;
}

// ============================================================================
// Dashboard
// ============================================================================

async function refreshDashboard() {
  try {
    const dashboard = await apiCall('/api/dashboard');

    // Update stats
    document.getElementById('statDecisions').textContent =
      (dashboard.threadState?.recentDecisions?.length || 0) +
      (dashboard.sharedMemory?.decisions?.length || 0);
    document.getElementById('statPatterns').textContent =
      (dashboard.sharedMemory?.patterns?.length || 0);
    document.getElementById('statDocuments').textContent =
      dashboard.semanticIndex?.documents?.length || 0;
    document.getElementById('statTeam').textContent =
      dashboard.sharedMemory?.team?.length || 0;

    // Update thread state
    renderThreadState(dashboard.threadState);

    // Update shared memory
    renderSharedMemory(dashboard.sharedMemory);

    // Update documents
    renderDocuments(dashboard.semanticIndex?.documents || []);

    // Update runtime memory
    await refreshRuntimeMemory();

    // Update vector stats
    refreshVectorStats();
  } catch (e) {
    console.error('Dashboard refresh failed:', e);
  }
}

function renderThreadState(state) {
  // Current task
  document.getElementById('currentTask').innerHTML = state.currentTask
    ? `<span class="memory-item-text">${escapeHtml(state.currentTask)}</span>`
    : '<span class="text-muted">No current task</span>';

  // Active artifacts
  document.getElementById('activeArtifacts').innerHTML = state.activeArtifacts?.length
    ? state.activeArtifacts.map(a => `
        <div class="memory-item">
          <span class="memory-item-text"><i class="bi bi-file-code text-info"></i> ${escapeHtml(a)}</span>
        </div>
      `).join('')
    : '<span class="text-muted">No active artifacts</span>';

  // Recent decisions
  document.getElementById('recentDecisions').innerHTML = state.recentDecisions?.length
    ? state.recentDecisions.map(d => `
        <div class="memory-item">
          <span class="memory-item-text"><i class="bi bi-check-circle text-success"></i> ${escapeHtml(d)}</span>
        </div>
      `).join('')
    : '<span class="text-muted">No recent decisions</span>';

  // Open questions
  document.getElementById('openQuestions').innerHTML = state.openQuestions?.length
    ? state.openQuestions.map(q => `
        <div class="memory-item">
          <span class="memory-item-text"><i class="bi bi-question-circle text-primary"></i> ${escapeHtml(q)}</span>
        </div>
      `).join('')
    : '<span class="text-muted">No open questions</span>';

  // Correction notes
  document.getElementById('correctionNotes').innerHTML = state.correctionNotes?.length
    ? state.correctionNotes.map((n, i) => `
        <div class="memory-item">
          <span class="memory-item-text"><i class="bi bi-exclamation-triangle text-danger"></i> ${escapeHtml(typeof n === 'string' ? n : n.text)}</span>
          <button class="btn btn-icon btn-outline-danger" onclick="deleteCorrection(${i})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `).join('')
    : '<span class="text-muted">No correction notes</span>';
}

function renderSharedMemory(memory) {
  // Team members
  document.getElementById('teamMembers').innerHTML = memory.team?.length
    ? memory.team.map((m, i) => `
        <div class="memory-item">
          <div class="d-flex align-items-center gap-3">
            <div class="team-avatar">${m.name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="fw-semibold">${escapeHtml(m.name)}</div>
              <small class="text-muted">${escapeHtml(m.role)}</small>
            </div>
          </div>
          <button class="btn btn-icon btn-outline-danger" onclick="deleteTeamMember(${i})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `).join('')
    : '<span class="text-muted">No team members</span>';

  // Team decisions
  document.getElementById('teamDecisions').innerHTML = memory.decisions?.length
    ? memory.decisions.map((d, i) => `
        <div class="memory-item">
          <span class="memory-item-text"><i class="bi bi-check-all text-success"></i> ${escapeHtml(d)}</span>
          <button class="btn btn-icon btn-outline-danger" onclick="deleteDecision(${i})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `).join('')
    : '<span class="text-muted">No team decisions</span>';

  // Patterns
  document.getElementById('patterns').innerHTML = memory.patterns?.length
    ? memory.patterns.map((p, i) => `
        <div class="memory-item">
          <span class="memory-item-text"><i class="bi bi-palette text-warning"></i> ${escapeHtml(p)}</span>
          <button class="btn btn-icon btn-outline-danger" onclick="deletePattern(${i})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `).join('')
    : '<span class="text-muted">No patterns or conventions</span>';
}

function renderDocuments(documents) {
  document.getElementById('documentsList').innerHTML = documents.length
    ? documents.map(doc => `
        <div class="memory-item">
          <div class="flex-1">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="collection-badge collection-${doc.collection || 'decisions'}">${doc.collection || 'decisions'}</span>
              <span class="badge bg-secondary">${doc.type}</span>
            </div>
            <div>${escapeHtml(doc.text)}</div>
            ${doc.metadata?.category ? `<small class="text-muted"><i class="bi bi-tag"></i> ${escapeHtml(doc.metadata.category)}</small>` : ''}
          </div>
          <button class="btn btn-icon btn-outline-danger" onclick="deleteDocument('${doc.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `).join('')
    : '<div class="empty-state"><i class="bi bi-file-earmark-text"></i><p>No documents</p></div>';
}

async function refreshVectorStats() {
  try {
    const stats = await apiCall('/api/vector-stats');

    const container = document.getElementById('vectorStats');
    const collections = stats.vectorStats || {};

    let html = '';
    for (const [name, data] of Object.entries(collections)) {
      html += `
        <div class="vector-stat-item">
          <div class="vector-stat-value">${data.count || 0}</div>
          <div class="vector-stat-label">${name}</div>
        </div>
      `;
    }

    if (!html) {
      html = '<div class="text-muted text-center">No vector stats available</div>';
    }

    container.innerHTML = html;

    // Update Qdrant status based on availability
    if (stats.qdrantAvailable) {
      updateQdrantStatus('connected');
    } else {
      updateQdrantStatus('local');
    }
  } catch (e) {
    console.error('Vector stats refresh failed:', e);
  }
}

// ============================================================================
// Thread State Operations
// ============================================================================

async function updateCurrentTask(event) {
  event.preventDefault();
  const input = document.getElementById('currentTaskInput');
  const task = input.value.trim();

  if (!task) return;

  try {
    await apiCall('/api/thread-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentTask: task }),
    });

    input.value = '';
    await refreshDashboard();

    addRealtimeEvent({
      event: 'delta_persisted',
      timestamp: new Date().toISOString(),
      documents: [{ collection: 'tasks', action: 'updated' }],
    });
  } catch (e) {
    alert('Failed to update task: ' + e.message);
  }
}

async function clearThreadState() {
  if (!confirm('Clear all thread state?')) return;

  try {
    await apiCall('/api/thread-state/clear', { method: 'POST' });
    await refreshDashboard();
  } catch (e) {
    alert('Failed to clear thread state: ' + e.message);
  }
}

async function promoteToCanonical() {
  try {
    await apiCall('/api/promote', { method: 'POST' });
    await refreshDashboard();
    alert('Promoted to shared memory!');
  } catch (e) {
    alert('Failed to promote: ' + e.message);
  }
}

// ============================================================================
// Shared Memory Operations
// ============================================================================

async function refreshSharedMemory() {
  try {
    const memory = await apiCall('/api/shared-memory');
    renderSharedMemory(memory);
  } catch (e) {
    console.error('Shared memory refresh failed:', e);
  }
}

async function refreshTeamMembers() {
  await refreshSharedMemory();
}

function showAddTeamModal() {
  new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

async function addTeamMember(event) {
  event.preventDefault();
  const name = document.getElementById('teamMemberName').value;
  const role = document.getElementById('teamMemberRole').value;

  try {
    await apiCall('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role }),
    });

    bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
    document.getElementById('teamMemberName').value = '';
    document.getElementById('teamMemberRole').value = '';
    await refreshDashboard();
  } catch (e) {
    alert('Failed to add team member: ' + e.message);
  }
}

async function deleteTeamMember(index) {
  if (!confirm('Remove this team member?')) return;

  try {
    await apiCall(`/api/team/${index}`, { method: 'DELETE' });
    await refreshDashboard();
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

function showAddDecisionModal() {
  new bootstrap.Modal(document.getElementById('addDecisionModal')).show();
}

async function addDecision(event) {
  event.preventDefault();
  const text = document.getElementById('decisionText').value;

  try {
    await apiCall('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    bootstrap.Modal.getInstance(document.getElementById('addDecisionModal')).hide();
    document.getElementById('decisionText').value = '';
    await refreshDashboard();
  } catch (e) {
    alert('Failed to add decision: ' + e.message);
  }
}

async function deleteDecision(index) {
  if (!confirm('Remove this decision?')) return;

  try {
    await apiCall(`/api/decisions/${index}`, { method: 'DELETE' });
    await refreshDashboard();
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

function showAddPatternModal() {
  new bootstrap.Modal(document.getElementById('addPatternModal')).show();
}

async function addPattern(event) {
  event.preventDefault();
  const text = document.getElementById('patternText').value;

  try {
    await apiCall('/api/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    bootstrap.Modal.getInstance(document.getElementById('addPatternModal')).hide();
    document.getElementById('patternText').value = '';
    await refreshDashboard();
  } catch (e) {
    alert('Failed to add pattern: ' + e.message);
  }
}

async function deletePattern(index) {
  if (!confirm('Remove this pattern?')) return;

  try {
    await apiCall(`/api/patterns/${index}`, { method: 'DELETE' });
    await refreshDashboard();
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

// ============================================================================
// Vector Search
// ============================================================================

async function performSearch(event) {
  event.preventDefault();
  const query = document.getElementById('searchQuery').value.trim();

  if (!query) return;

  try {
    const results = await apiCall(`/api/semantic-search?q=${encodeURIComponent(query)}&topK=10`);

    const container = document.getElementById('searchResults');
    if (!results.results || results.results.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="bi bi-search"></i><p>No results found</p></div>';
      return;
    }

    container.innerHTML = results.results.map(r => `
      <div class="search-result">
        <div class="search-result-body">
          <div class="flex-1">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge bg-secondary">${r.type}</span>
              ${r.metadata?.category ? `<span class="badge bg-info">${escapeHtml(r.metadata.category)}</span>` : ''}
            </div>
            <div>${escapeHtml(r.text)}</div>
          </div>
          <div class="search-score">
            <i class="bi bi-graph-up"></i> ${(r.score * 100).toFixed(1)}% match
          </div>
        </div>
      </div>
    `).join('');

    addRealtimeEvent({
      event: 'search_performed',
      query,
      resultCount: results.results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    document.getElementById('searchResults').innerHTML =
      `<div class="alert alert-danger">Search failed: ${escapeHtml(e.message)}</div>`;
  }
}

// ============================================================================
// Documents
// ============================================================================

async function refreshDocuments() {
  try {
    const docs = await apiCall('/api/semantic-documents');
    renderDocuments(docs);
  } catch (e) {
    console.error('Documents refresh failed:', e);
  }
}

function showAddDocumentModal() {
  new bootstrap.Modal(document.getElementById('addDocumentModal')).show();
}

async function addDocument(event) {
  event.preventDefault();
  const text = document.getElementById('documentText').value;
  const collection = document.getElementById('documentCollection').value;
  const type = document.getElementById('documentType').value;
  const category = document.getElementById('documentCategory').value;

  try {
    await apiCall('/api/semantic-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        collection,
        type,
        metadata: category ? { category } : {},
      }),
    });

    bootstrap.Modal.getInstance(document.getElementById('addDocumentModal')).hide();
    document.getElementById('documentText').value = '';
    document.getElementById('documentCategory').value = '';
    await refreshDashboard();
  } catch (e) {
    alert('Failed to add document: ' + e.message);
  }
}

async function deleteDocument(id) {
  if (!confirm('Delete this document?')) return;

  try {
    await apiCall(`/api/semantic-documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refreshDashboard();
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

// ============================================================================
// Runtime Memory
// ============================================================================

async function refreshRuntimeMemory() {
  try {
    const data = await apiCall('/api/runtime-memory');
    document.getElementById('runtimeMemoryContent').textContent = data.content || 'No runtime memory generated';
  } catch (e) {
    document.getElementById('runtimeMemoryContent').textContent = 'Error loading runtime memory: ' + e.message;
  }
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function switchToTab(tabId) {
  const tab = document.querySelector(`[href="#${tabId}"]`);
  if (tab) {
    new bootstrap.Tab(tab).show();
  }
}

async function loadTranslations() {
  try {
    const response = await fetch('locales.json');
    translations = await response.json();
  } catch (e) {
    console.error('Failed to load translations:', e);
  }
}

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('qwx_language', lang);
  updateLanguageUI();
  applyTranslations();
}

function updateLanguageUI() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
  });
}

function applyTranslations() {
  const t = translations[currentLanguage] || translations['en'] || {};

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const value = key.split('.').reduce((obj, k) => obj?.[k], t);
    if (value) {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const value = key.split('.').reduce((obj, k) => obj?.[k], t);
    if (value) {
      el.placeholder = value;
    }
  });
}
