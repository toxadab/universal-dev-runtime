/**
 * Universal Dev Runtime - Web Interface JavaScript
 */

const API_BASE = '';

// ============================================================================
// Localization
// ============================================================================

let currentLang = localStorage.getItem('language') || 'en';
let translations = {};

// Load translations
async function loadTranslations() {
  try {
    const response = await fetch('locales.json');
    translations = await response.json();
    applyLanguage(currentLang);
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('language', lang);
  applyLanguage(lang);
}

function applyLanguage(lang) {
  // Update button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translation = getTranslation(key, lang);
    if (translation) {
      el.textContent = translation;
    }
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const translation = getTranslation(key, lang);
    if (translation) {
      el.placeholder = translation;
    }
  });
  
  // Update document type select options
  const docTypeSelect = document.getElementById('documentType');
  if (docTypeSelect) {
    const types = ['decision', 'correction', 'note', 'architecture', 'convention'];
    types.forEach(type => {
      const option = docTypeSelect.querySelector(`option[value="${type}"]`);
      if (option) {
        const translation = getTranslation(`modals.documentTypes.${type}`, lang);
        if (translation) {
          option.textContent = translation;
        }
      }
    });
  }
}

function getTranslation(key, lang) {
  const keys = key.split('.');
  let value = translations[lang];
  for (const k of keys) {
    if (value && value[k] !== undefined) {
      value = value[k];
    } else {
      return null;
    }
  }
  return value;
}

function t(key, params = {}) {
  let translation = getTranslation(key, currentLang) || key;
  // Replace parameters like {decisions}
  Object.entries(params).forEach(([param, value]) => {
    translation = translation.replace(`{${param}}`, value);
  });
  return translation;
}

// ============================================================================
// API Helpers
// ============================================================================

async function api(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data.data;
}

// ============================================================================
// Dashboard
// ============================================================================

async function refreshDashboard() {
  try {
    const dashboard = await api('/api/dashboard');
    
    // Update stats
    document.getElementById('statDecisions').textContent = 
      (dashboard.sharedMemory?.decisions?.length || 0) + (dashboard.threadState?.recentDecisions?.length || 0);
    document.getElementById('statPatterns').textContent = 
      dashboard.sharedMemory?.patterns?.length || 0;
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
    
    // Update project info
    if (dashboard.projectManifest?.stack?.length > 0) {
      renderStack(dashboard.projectManifest.stack);
    }
    
    showNotification(t('notifications.dashboardRefreshed'), 'success');
  } catch (error) {
    showNotification(t('errors.failedToRefresh') + error.message, 'danger');
  }
}

function renderStack(stack) {
  // Stack badges can be shown in navbar or header if needed
  console.log('Project stack:', stack);
}

// ============================================================================
// Thread State
// ============================================================================

function renderThreadState(state) {
  // Current Task
  const currentTaskEl = document.getElementById('currentTask');
  if (state.currentTask) {
    currentTaskEl.innerHTML = `
      <span class="memory-item-text">${escapeHtml(state.currentTask)}</span>
      <button class="btn btn-sm btn-outline-primary" onclick="editCurrentTask()">
        <i class="bi bi-pencil"></i>
      </button>
    `;
    document.getElementById('currentTaskInput').value = state.currentTask;
  } else {
    currentTaskEl.innerHTML = `<span class="text-muted">${t('threadState.noCurrentTask')}</span>`;
  }

  // Active Artifacts
  const artifactsEl = document.getElementById('activeArtifacts');
  if (state.activeArtifacts?.length > 0) {
    artifactsEl.innerHTML = state.activeArtifacts.map(a => `
      <div class="memory-item">
        <span class="memory-item-text"><i class="bi bi-file-code text-info"></i> ${escapeHtml(a)}</span>
        <button class="btn btn-sm btn-outline-danger btn-icon" onclick="removeArtifact('${escapeHtml(a)}')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `).join('');
  } else {
    artifactsEl.innerHTML = `<div class="empty-state"><i class="bi bi-folder"></i><p>${t('threadState.noActiveArtifacts')}</p></div>`;
  }

  // Recent Decisions
  const decisionsEl = document.getElementById('recentDecisions');
  if (state.recentDecisions?.length > 0) {
    decisionsEl.innerHTML = state.recentDecisions.map((d, i) => `
      <div class="memory-item">
        <span class="memory-item-text">${escapeHtml(d)}</span>
      </div>
    `).join('');
  } else {
    decisionsEl.innerHTML = `<div class="empty-state"><i class="bi bi-check-circle"></i><p>${t('threadState.noRecentDecisions')}</p></div>`;
  }

  // Open Questions
  const questionsEl = document.getElementById('openQuestions');
  if (state.openQuestions?.length > 0) {
    questionsEl.innerHTML = state.openQuestions.map(q => `
      <div class="memory-item">
        <span class="memory-item-text"><i class="bi bi-question text-primary"></i> ${escapeHtml(q)}</span>
      </div>
    `).join('');
  } else {
    questionsEl.innerHTML = `<div class="empty-state"><i class="bi bi-question-circle"></i><p>${t('threadState.noOpenQuestions')}</p></div>`;
  }

  // Correction Notes
  const correctionsEl = document.getElementById('correctionNotes');
  if (state.correctionNotes?.length > 0) {
    correctionsEl.innerHTML = state.correctionNotes.map((n, i) => `
      <div class="memory-item">
        <span class="memory-item-text"><i class="bi bi-exclamation-triangle text-danger"></i> ${escapeHtml(typeof n === 'string' ? n : n.text)}</span>
      </div>
    `).join('');
  } else {
    correctionsEl.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><p>${t('threadState.noCorrectionNotes')}</p></div>`;
  }
}

async function updateCurrentTask(event) {
  event.preventDefault();
  const task = document.getElementById('currentTaskInput').value.trim();
  
  if (!task) {
    showNotification(t('errors.enterTask'), 'warning');
    return;
  }
  
  try {
    await api('/api/thread-state', {
      method: 'PUT',
      body: JSON.stringify({ currentTask: task }),
    });
    showNotification(t('notifications.taskUpdated'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToUpdateTask') + error.message, 'danger');
  }
}

function editCurrentTask() {
  document.getElementById('currentTaskInput').focus();
}

async function clearThreadState() {
  if (!confirm(t('confirmations.clearThreadState'))) return;
  
  try {
    await api('/api/thread-state/clear', { method: 'POST' });
    showNotification(t('notifications.threadStateCleared'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToClear') + error.message, 'danger');
  }
}

async function promoteToCanonical() {
  try {
    const result = await api('/api/promote', { method: 'POST' });
    showNotification(t('notifications.promoted', { decisions: result.decisions, patterns: result.patterns }), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToPromote') + error.message, 'danger');
  }
}

// ============================================================================
// Shared Memory
// ============================================================================

function renderSharedMemory(sharedMemory) {
  // Team Members
  const teamEl = document.getElementById('teamMembers');
  if (sharedMemory.team?.length > 0) {
    teamEl.innerHTML = sharedMemory.team.map((m, i) => `
      <div class="memory-item">
        <div class="d-flex align-items-center gap-3">
          <div class="team-avatar">${m.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="fw-semibold">${escapeHtml(m.name)}</div>
            <div class="text-muted small">${escapeHtml(m.role)}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-danger btn-icon" onclick="removeTeamMember(${i})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');
  } else {
    teamEl.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><p>${t('sharedMemory.noTeamMembers')}</p></div>`;
  }

  // Team Decisions
  const decisionsEl = document.getElementById('teamDecisions');
  if (sharedMemory.decisions?.length > 0) {
    decisionsEl.innerHTML = sharedMemory.decisions.map((d, i) => `
      <div class="memory-item">
        <span class="memory-item-text"><i class="bi bi-check-circle text-success"></i> ${escapeHtml(d)}</span>
        <button class="btn btn-sm btn-outline-danger btn-icon" onclick="removeDecision(${i})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');
  } else {
    decisionsEl.innerHTML = `<div class="empty-state"><i class="bi bi-check-circle"></i><p>${t('sharedMemory.noTeamDecisions')}</p></div>`;
  }

  // Patterns
  const patternsEl = document.getElementById('patterns');
  if (sharedMemory.patterns?.length > 0) {
    patternsEl.innerHTML = sharedMemory.patterns.map((p, i) => `
      <div class="memory-item">
        <span class="memory-item-text"><i class="bi bi-palette text-warning"></i> ${escapeHtml(p)}</span>
        <button class="btn btn-sm btn-outline-danger btn-icon" onclick="removePattern(${i})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');
  } else {
    patternsEl.innerHTML = `<div class="empty-state"><i class="bi bi-palette"></i><p>${t('sharedMemory.noPatterns')}</p></div>`;
  }
}

function showAddTeamModal() {
  new bootstrap.Modal(document.getElementById('addTeamModal')).show();
}

async function addTeamMember(event) {
  event.preventDefault();
  const name = document.getElementById('teamMemberName').value.trim();
  const role = document.getElementById('teamMemberRole').value.trim();
  
  try {
    await api('/api/team', {
      method: 'POST',
      body: JSON.stringify({ name, role }),
    });
    bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
    document.getElementById('teamMemberName').value = '';
    document.getElementById('teamMemberRole').value = '';
    showNotification(t('notifications.teamMemberAdded'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToAddTeamMember') + error.message, 'danger');
  }
}

async function removeTeamMember(index) {
  try {
    await api(`/api/team/${index}`, { method: 'DELETE' });
    showNotification(t('notifications.teamMemberRemoved'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToRemoveTeamMember') + error.message, 'danger');
  }
}

function showAddDecisionModal() {
  new bootstrap.Modal(document.getElementById('addDecisionModal')).show();
}

async function addDecision(event) {
  event.preventDefault();
  const text = document.getElementById('decisionText').value.trim();
  
  if (!text) {
    showNotification(t('errors.enterDecisionText'), 'warning');
    return;
  }
  
  try {
    await api('/api/decisions', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    bootstrap.Modal.getInstance(document.getElementById('addDecisionModal')).hide();
    document.getElementById('decisionText').value = '';
    showNotification(t('notifications.decisionAdded'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToAddDecision') + error.message, 'danger');
  }
}

async function removeDecision(index) {
  try {
    await api(`/api/decisions/${index}`, { method: 'DELETE' });
    showNotification(t('notifications.decisionRemoved'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToRemoveDecision') + error.message, 'danger');
  }
}

function showAddPatternModal() {
  new bootstrap.Modal(document.getElementById('addPatternModal')).show();
}

async function addPattern(event) {
  event.preventDefault();
  const text = document.getElementById('patternText').value.trim();
  
  if (!text) {
    showNotification(t('errors.enterPatternText'), 'warning');
    return;
  }
  
  try {
    await api('/api/patterns', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    bootstrap.Modal.getInstance(document.getElementById('addPatternModal')).hide();
    document.getElementById('patternText').value = '';
    showNotification(t('notifications.patternAdded'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToAddPattern') + error.message, 'danger');
  }
}

async function removePattern(index) {
  try {
    await api(`/api/patterns/${index}`, { method: 'DELETE' });
    showNotification(t('notifications.patternRemoved'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToRemovePattern') + error.message, 'danger');
  }
}

// ============================================================================
// Semantic Search
// ============================================================================

async function performSearch(event) {
  event.preventDefault();
  const query = document.getElementById('searchQuery').value.trim();
  
  if (!query) {
    showNotification(t('errors.enterSearchQuery'), 'warning');
    return;
  }
  
  try {
    const results = await api(`/api/semantic-search?q=${encodeURIComponent(query)}`);
    renderSearchResults(results);
  } catch (error) {
    showNotification(t('errors.searchFailed') + error.message, 'danger');
  }
}

function renderSearchResults(data) {
  const resultsEl = document.getElementById('searchResults');

  if (!data.results || data.results.length === 0) {
    resultsEl.innerHTML = `<div class="empty-state"><i class="bi bi-search"></i><p>${t('search.noResults')}</p></div>`;
    return;
  }

  resultsEl.innerHTML = `
    <div class="alert alert-info">
      <i class="bi bi-info-circle"></i> ${t('search.found')} ${data.results.length} ${t('search.results')} ${t('search.for')} "${escapeHtml(data.query)}"
    </div>
    ${data.results.map(r => `
      <div class="search-result">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-1">
            <span class="badge badge-stack mb-2">${escapeHtml(r.type)}</span>
            <div>${escapeHtml(r.text)}</div>
          </div>
          <div class="search-score ms-3">
            ${(r.score * 100).toFixed(1)}% ${t('search.match')}
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

// ============================================================================
// Documents
// ============================================================================

function renderDocuments(documents) {
  const docsEl = document.getElementById('documentsList');

  if (documents.length === 0) {
    docsEl.innerHTML = `<div class="empty-state"><i class="bi bi-file-earmark-text"></i><p>${t('documents.noDocuments')}</p></div>`;
    return;
  }
  
  docsEl.innerHTML = documents.map((doc, i) => `
    <div class="memory-item">
      <div class="flex-1">
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge badge-stack">${escapeHtml(doc.type)}</span>
          <small class="text-muted">${new Date(doc.addedAt).toLocaleDateString()}</small>
        </div>
        <div>${escapeHtml(doc.text)}</div>
        ${doc.metadata?.category ? `<div class="text-muted small mt-1"><i class="bi bi-tag"></i> ${escapeHtml(doc.metadata.category)}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-outline-danger btn-icon" onclick="removeDocument('${escapeHtml(doc.id)}')">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `).join('');
}

function showAddDocumentModal() {
  new bootstrap.Modal(document.getElementById('addDocumentModal')).show();
}

async function addDocument(event) {
  event.preventDefault();
  const text = document.getElementById('documentText').value.trim();
  const type = document.getElementById('documentType').value;
  const category = document.getElementById('documentCategory').value.trim();
  
  if (!text) {
    showNotification(t('errors.enterDocumentText'), 'warning');
    return;
  }
  
  try {
    await api('/api/semantic-documents', {
      method: 'POST',
      body: JSON.stringify({
        text,
        type,
        metadata: category ? { category } : {},
      }),
    });
    bootstrap.Modal.getInstance(document.getElementById('addDocumentModal')).hide();
    document.getElementById('documentText').value = '';
    document.getElementById('documentCategory').value = '';
    showNotification(t('notifications.documentAdded'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToAddDocument') + error.message, 'danger');
  }
}

async function removeDocument(id) {
  try {
    await api(`/api/semantic-documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
    showNotification(t('notifications.documentRemoved'), 'success');
    refreshDashboard();
  } catch (error) {
    showNotification(t('errors.failedToRemoveDocument') + error.message, 'danger');
  }
}

// ============================================================================
// Runtime Memory
// ============================================================================

async function refreshRuntimeMemory() {
  try {
    const data = await api('/api/runtime-memory');
    document.getElementById('runtimeMemoryContent').textContent = data.content || t('runtimeMemory.notGenerated');
    showNotification(t('notifications.runtimeMemoryRefreshed'), 'success');
  } catch (error) {
    showNotification(t('errors.failedToRefreshRuntime') + error.message, 'danger');
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

function showNotification(message, type = 'info') {
  const alertClass = {
    success: 'alert-success',
    danger: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info',
  }[type] || 'alert-info';
  
  const icon = {
    success: 'bi-check-circle',
    danger: 'bi-exclamation-triangle',
    warning: 'bi-exclamation-circle',
    info: 'bi-info-circle',
  }[type] || 'bi-info-circle';
  
  const alert = document.createElement('div');
  alert.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
  alert.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
  alert.innerHTML = `
    <i class="bi ${icon}"></i> ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

// ============================================================================
// Initialize
// ============================================================================

function switchToTab(tabId) {
  const tabTrigger = new bootstrap.Tab(document.querySelector(`[href="#${tabId}"]`));
  tabTrigger.show();
}

document.addEventListener('DOMContentLoaded', () => {
  loadTranslations();
  refreshDashboard();
  refreshRuntimeMemory();
});
