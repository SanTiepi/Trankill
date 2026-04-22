/**
 * Trankill Frontend App
 * Dark mode, scan UI, circle family, dashboard
 */

// State
const state = {
  currentSection: 'scan',
  circles: [],
  selectedCircle: null,
  circleData: null,
  alerts: [],
};

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
  setupEventListeners();
  loadCircles();
});

// Render main app structure
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header>
      <h1>Trankill</h1>
      <p>Sois tranquille, ta famille est protégée.</p>
      <nav>
        <button class="nav-btn active" data-section="scan">🔍 Scanner un lien</button>
        <button class="nav-btn" data-section="circle">👨‍👩‍👧 Cercle familial</button>
      </nav>
    </header>
    <main>
      <section id="scan" class="section active">${renderScanSection()}</section>
      <section id="circle" class="section">${renderCircleSection()}</section>
    </main>
    ${renderModals()}
  `;
}

// Scan section HTML
function renderScanSection() {
  return `
    <div class="scan-container">
      <h2>🛡️ Analyse un lien ou message suspect</h2>
      <form class="scan-form" id="scanForm">
        <div class="form-group">
          <label for="scanInput">Colle le lien ou le texte du message :</label>
          <textarea 
            id="scanInput" 
            name="input" 
            placeholder="Exemple : 'Votre colis est bloqué — payer CHF 2.90 sur https://post-ch-fr.com/colis?id=123'"
            required
          ></textarea>
        </div>
        <button type="submit" class="scan-button">Analyser</button>
      </form>
      <div id="scanResult" class="scan-result"></div>
    </div>
  `;
}

// Circle section HTML
function renderCircleSection() {
  return `
    <div class="circle-container">
      <div class="circle-box">
        <h2>📝 Créer un cercle</h2>
        <form class="create-circle-form" id="createCircleForm">
          <input 
            type="text" 
            id="circleOwner" 
            name="ownerName" 
            placeholder="Ton nom"
            required
          />
          <button type="submit">Créer mon cercle</button>
        </form>
      </div>
      <div class="circle-box">
        <h2>👥 Mes cercles</h2>
        <div id="circleList"></div>
      </div>
    </div>
    <div id="circleDashboard" class="hidden" style="margin-top: 2rem;"></div>
  `;
}

// Modals
function renderModals() {
  return `
    <div id="joinCircleModal" class="modal">
      <div class="modal-content">
        <span class="modal-close" onclick="closeModal('joinCircleModal')">&times;</span>
        <h3>Rejoindre un cercle</h3>
        <form class="modal-form" id="joinForm">
          <input 
            type="text" 
            id="circleCode" 
            name="circleCode" 
            placeholder="Code d'invitation (6 caractères)"
            maxlength="6"
            required
          />
          <input 
            type="text" 
            id="memberName" 
            name="memberName" 
            placeholder="Ton nom"
            required
          />
          <button type="submit">Rejoindre</button>
        </form>
      </div>
    </div>

    <div id="circleDetailsModal" class="modal">
      <div class="modal-content">
        <span class="modal-close" onclick="closeModal('circleDetailsModal')">&times;</span>
        <h3 id="modalCircleName"></h3>
        <div id="modalCircleContent"></div>
      </div>
    </div>
  `;
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchSection(e.target.dataset.section);
    });
  });

  // Scan form
  const scanForm = document.getElementById('scanForm');
  if (scanForm) {
    scanForm.addEventListener('submit', handleScan);
  }

  // Create circle form
  const createCircleForm = document.getElementById('createCircleForm');
  if (createCircleForm) {
    createCircleForm.addEventListener('submit', handleCreateCircle);
  }

  // Join circle form
  const joinForm = document.getElementById('joinForm');
  if (joinForm) {
    joinForm.addEventListener('submit', handleJoinCircle);
  }
}

// Switch section
function switchSection(section) {
  state.currentSection = section;

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  // Show/hide sections
  document.querySelectorAll('.section').forEach(sec => {
    sec.classList.remove('active');
  });
  document.getElementById(section).classList.add('active');

  // Re-setup events for the new section
  setTimeout(() => {
    setupEventListeners();
    if (section === 'circle') {
      loadCircles();
    }
  }, 0);
}

// Handle scan form submission
async function handleScan(e) {
  e.preventDefault();

  const input = document.getElementById('scanInput').value.trim();
  if (!input) return;

  const btn = e.target.querySelector('.scan-button');
  btn.disabled = true;
  btn.textContent = 'Analyse en cours...';

  try {
    const response = await fetch('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    const result = await response.json();
    displayScanResult(result);

    // Auto-save alert to circle if one is selected
    if (state.selectedCircle) {
      saveAlertToCircle(result);
    }
  } catch (err) {
    console.error('Scan error:', err);
    displayScanError('Erreur lors de l\'analyse. Réessaye.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyser';
  }
}

// Display scan result (4 verdicts: safe, doubt, suspect, danger)
function displayScanResult(result) {
  const resultDiv = document.getElementById('scanResult');
  const { verdict, score, signals, explanation, action, official_contact, suggested_verifiers } = result;

  const verdictText = {
    safe: '✅ Rien de suspect',
    doubt: '🤔 Dans le doute, vérifie',
    suspect: '⚠️ Suspect',
    danger: '🚨 Danger',
    error: '❌ Erreur',
  };
  const icon = { safe: '✅', doubt: '🤔', suspect: '⚠️', danger: '🚨', error: '❌' }[verdict] || '❓';

  const signalsHtml = signals && signals.length ? `
    <div class="signals-list">
      <h4>Ce qu'on a vu :</h4>
      ${signals.map(s => `
        <div class="signal ${s.severity}">
          <span class="signal-icon">${s.severity === 'high' ? '⚠️' : s.severity === 'medium' ? '⚡' : s.severity === 'safe' ? '✓' : '•'}</span>
          <span>${(s.description && s.description.fr) || s.description || ''}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Consent-first actions: le coeur du produit
  const controlActionsHtml = (verdict === 'doubt' || verdict === 'suspect' || verdict === 'danger')
    ? renderControlActions(official_contact, suggested_verifiers, verdict)
    : '';

  const actionHtml = action && action.fr ? `
    <div class="action-box">
      <h4>📋 Étapes recommandées :</h4>
      <p style="white-space: pre-line;">${action.fr}</p>
    </div>
  ` : '';

  const alertBanner = verdict === 'danger' ? `
    <div class="alert-banner">
      ⚠️ Si tu as déjà cliqué ou donné tes infos, appelle ta banque IMMÉDIATEMENT (numéro au dos de ta carte) ou la police (117).
    </div>
  ` : '';

  resultDiv.innerHTML = `
    <div class="verdict-header">
      <div class="verdict-icon">${icon}</div>
      <div class="verdict-title ${verdict}">
        <h3>${verdictText[verdict] || 'Résultat'}</h3>
        <p class="score">Score : ${score}/100</p>
      </div>
    </div>
    <div class="explanation">
      ${(explanation && explanation.fr) || explanation || ''}
    </div>
    ${controlActionsHtml}
    ${signalsHtml}
    ${actionHtml}
    ${alertBanner}
  `;

  resultDiv.classList.add('show', verdict);
}

// Render the two consent-first control buttons (the core differentiator)
function renderControlActions(officialContact, verifiers, verdict) {
  const blocks = [];

  // Ask a trusted person
  const firstVerifier = verifiers && verifiers.length ? verifiers[0] : null;
  const verifierLabel = firstVerifier
    ? `Demander à ${firstVerifier.name}`
    : 'Demander à un proche de confiance';
  const verifierAction = firstVerifier && firstVerifier.phone
    ? `<a class="control-btn ask" href="tel:${firstVerifier.phone}">📞 ${verifierLabel}</a>`
    : `<button class="control-btn ask" onclick="alert('Appelle un proche maintenant — montre-lui le message et demande son avis avant de cliquer.')">👨‍👩‍👧 ${verifierLabel}</button>`;
  blocks.push(verifierAction);

  // Call the official source
  if (officialContact && officialContact.name) {
    const callLabel = `Appeler ${officialContact.name}`;
    const callAction = officialContact.phone
      ? `<a class="control-btn call-official" href="tel:${officialContact.phone.replace(/\s/g, '')}">☎️ ${callLabel} (${officialContact.phone})</a>`
      : officialContact.url
        ? `<a class="control-btn call-official" href="${officialContact.url}" target="_blank" rel="noopener">🌐 ${callLabel}</a>`
        : `<div class="control-btn call-official static">☎️ ${callLabel}</div>`;
    blocks.push(callAction);
  }

  const title = verdict === 'doubt'
    ? 'Avant de cliquer, prends 1 minute pour vérifier :'
    : 'Ne clique pas. Vérifie d\'abord :';

  return `
    <div class="control-actions ${verdict}">
      <h4>${title}</h4>
      <div class="control-buttons">
        ${blocks.join('\n')}
      </div>
    </div>
  `;
}

// Display scan error
function displayScanError(message) {
  const resultDiv = document.getElementById('scanResult');
  resultDiv.innerHTML = `
    <div class="verdict-header">
      <div class="verdict-icon">❌</div>
      <div class="verdict-title">
        <h3>Erreur</h3>
      </div>
    </div>
    <div class="explanation">${message}</div>
  `;
  resultDiv.classList.add('show', 'error');
}

// Load circles
async function loadCircles() {
  try {
    const stored = localStorage.getItem('trankill_circles');
    state.circles = stored ? JSON.parse(stored) : [];
    renderCircleList();
  } catch {
    console.error('Error loading circles');
  }
}

// Render circle list
function renderCircleList() {
  const listDiv = document.querySelector('#circleList');
  if (!listDiv) return;

  if (state.circles.length === 0) {
    listDiv.innerHTML = '<div class="no-circles">Aucun cercle créé. Crée-en un pour protéger ta famille!</div>';
    return;
  }

  listDiv.innerHTML = `
    <ul class="circle-list">
      ${state.circles.map(circle => `
        <li class="circle-item">
          <div class="circle-name">👥 ${circle.owner}</div>
          <div class="circle-meta">ID: ${circle.circleId.substring(0, 8)}...</div>
          <div class="circle-meta">Code: <strong>${circle.inviteCode}</strong></div>
          <div class="circle-meta">Membres: ${circle.memberCount || 1}</div>
          <div class="circle-actions">
            <button onclick="showCircleDetails('${circle.circleId}')">📊 Dashboard</button>
            <button onclick="showJoinModal('${circle.circleId}')">👤 Ajouter</button>
            <button onclick="copyToClipboard('${circle.inviteCode}')">📋 Copier code</button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

// Handle create circle
async function handleCreateCircle(e) {
  e.preventDefault();

  const ownerName = document.getElementById('circleOwner').value.trim();
  if (!ownerName) return;

  try {
    const response = await fetch('/circle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName }),
    });

    const circle = await response.json();
    state.circles.push(circle);
    localStorage.setItem('trankill_circles', JSON.stringify(state.circles));

    document.getElementById('circleOwner').value = '';
    renderCircleList();

    alert(`✅ Cercle créé! Code d'invitation: ${circle.inviteCode}`);
  } catch (err) {
    alert('Erreur lors de la création du cercle.');
    console.error(err);
  }
}

// Show join modal
function showJoinModal(circleId) {
  const modal = document.getElementById('joinCircleModal');
  document.getElementById('circleCode').dataset.circleId = circleId;
  modal.classList.add('show');
}

// Handle join circle
async function handleJoinCircle(e) {
  e.preventDefault();

  const circleId = document.getElementById('circleCode').dataset.circleId;
  const inviteCode = document.getElementById('circleCode').value.trim();
  const memberName = document.getElementById('memberName').value.trim();

  if (!inviteCode || !memberName) return;

  try {
    const response = await fetch(`/circle/${circleId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, memberName }),
    });

    if (!response.ok) throw new Error('Invalid code or circle full');

    alert(`✅ Tu as rejoint le cercle!`);
    closeModal('joinCircleModal');
    document.getElementById('circleCode').value = '';
    document.getElementById('memberName').value = '';
  } catch (err) {
    alert('Code invalide ou cercle plein.');
    console.error(err);
  }
}

// Show circle details (dashboard)
async function showCircleDetails(circleId) {
  try {
    const response = await fetch(`/circle/${circleId}`);
    const circle = await response.json();

    const statsResponse = await fetch(`/circle/${circleId}/stats`);
    const stats = await statsResponse.json();

    const alertsResponse = await fetch(`/circle/${circleId}/alerts`);
    const alertsData = await alertsResponse.json();

    state.selectedCircle = circleId;
    state.circleData = circle;
    state.alerts = alertsData.alerts || [];

    renderCircleDashboard(circle, stats);
    openModal('circleDetailsModal');
  } catch (err) {
    alert('Erreur lors du chargement du cercle.');
    console.error(err);
  }
}

// Render circle dashboard
function renderCircleDashboard(circle, stats) {
  const modalTitle = document.getElementById('modalCircleName');
  const modalContent = document.getElementById('modalCircleContent');

  modalTitle.textContent = `👥 ${circle.owner}`;

  const membersHtml = circle.members.map(m => `
    <div class="alert-item">
      <div class="alert-header">
        <span class="alert-member">${m.name} <span style="color: var(--text-secondary);">(${m.role})</span></span>
      </div>
      <div class="alert-time">Membre depuis ${new Date(m.joinedAt).toLocaleDateString('fr-FR')}</div>
    </div>
  `).join('');

  const alertsHtml = state.alerts.length ? state.alerts.map(alert => `
    <div class="alert-item ${alert.verdict} ${alert.read ? '' : 'unread'}">
      <div class="alert-header">
        <span class="alert-member">${alert.memberName}</span>
        <span class="alert-verdict">${alert.verdict.toUpperCase()}</span>
      </div>
      <div class="alert-time">${new Date(alert.timestamp).toLocaleString('fr-FR')}</div>
      ${alert.scannedUrl ? `<div class="alert-url">🔗 ${alert.scannedUrl}</div>` : ''}
      ${alert.message ? `<div>${alert.message}</div>` : ''}
    </div>
  `).join('') : '<div class="no-alerts">Aucune alerte pour ce cercle.</div>';

  modalContent.innerHTML = `
    <div class="dashboard">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-number">${stats.memberCount}</div>
        <div class="stat-label">Membres</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-number">${stats.totalAlerts}</div>
        <div class="stat-label">Alertes totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-number">${stats.thisWeek}</div>
        <div class="stat-label">Cette semaine</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📆</div>
        <div class="stat-number">${stats.thisMonth}</div>
        <div class="stat-label">Ce mois</div>
      </div>
    </div>

    <div class="alerts-container">
      <h3>📍 Historique d'alertes</h3>
      ${alertsHtml}
    </div>

    <div class="alerts-container" style="margin-top: 1.5rem;">
      <h3>👥 Membres du cercle</h3>
      ${membersHtml}
    </div>
  `;
}

// Save alert to circle
async function saveAlertToCircle(scanResult) {
  try {
    // Find first member ID (for demo, use owner)
    const response = await fetch(`/circle/${state.selectedCircle}`);
    const circle = await response.json();
    const member = circle.members[0];

    await fetch(`/circle/${state.selectedCircle}/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.memberId,
        verdict: scanResult.verdict,
        message: scanResult.explanation.fr,
        type: 'link_scan',
      }),
    });
  } catch (err) {
    console.error('Error saving alert:', err);
  }
}

// Modal helpers
function openModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Code copié!');
  });
}
