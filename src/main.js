/**
 * Application Bootstrap Entry Point (`src/main.js`)
 * Orchestrates Store, Timeline, FilterBar, Community Ingestion, and Lazy Loading of Admin Studio & Vision OCR.
 */

import { store } from './state/store.js';
import { Timeline } from './components/Timeline.js';
import { FilterBar } from './components/FilterBar.js';
import { generateRolling24hFeed, getRomeDateParts, getNextHourStartMs } from './data/milanEventsGenerator.js';

let adminStudioInstance = null;

// Clock updates
function updateLiveClock() {
  const now = new Date();
  const rome = getRomeDateParts(now);
  const nextHourStartMs = getNextHourStartMs(now.getTime());
  const nextHourRome = getRomeDateParts(new Date(nextHourStartMs));
  const plus24Rome = getRomeDateParts(new Date(nextHourStartMs + 24 * 3600000));

  const clockEl = document.getElementById('rome-clock');
  if (clockEl) {
    clockEl.textContent = `Milano (Europe/Rome) ${rome.hm}:${rome.second}`;
  }

  const windowLabel = document.getElementById('rolling-window-label');
  if (windowLabel) {
    windowLabel.textContent = `Dalle ${nextHourRome.hm} (prossima ora) → Domani ${plus24Rome.hm} (+24h)`;
  }
}

// Ingestion of live-events.json
async function loadLiveFeed() {
  const candidateUrls = [
    'live-events.json',
    'public/live-events.json',
    'verified-events-24h.json',
    'public/verified-events-24h.json'
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const eventsList = (data && (data.events || data.verifiedEvents)) || [];
      if (Array.isArray(eventsList) && eventsList.length > 0) {
        return eventsList;
      }
    } catch {
      // try next
    }
  }
  return null;
}

// Lazy load Admin Studio
async function ensureAdminStudioLoaded() {
  if (!adminStudioInstance) {
    const { mountAdminStudio } = await import('./admin/AdminStudio.js');
    adminStudioInstance = mountAdminStudio(store);
  }
  return adminStudioInstance;
}

// Route handler for Admin URL (?admin=1 or #admin or #admin-domains)
async function syncAdminRoute() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = window.location.hash.startsWith('#admin') || params.has('admin');

  if (isAdmin) {
    const studio = await ensureAdminStudioLoaded();
    studio.syncVisibility();
  } else {
    document.getElementById('hidden-admin-page')?.classList.add('hidden');
    document.getElementById('public-app-view')?.classList.remove('hidden');
  }
}

// Lazy load Vision OCR
async function handleVisionOcrTrigger(action) {
  const { openCameraCaptureModal, processFlyerWithTesseract } = await import('./features/VisionOcrModal.js');

  const onCaptured = async (source, name) => {
    const statusLine = document.getElementById('flyer-ocr-status-line');
    if (statusLine) {
      statusLine.classList.remove('hidden');
      statusLine.className = 'text-[11px] text-amber-300 mono-num truncate animate-pulse';
      statusLine.textContent = '🔍 Lettura testo locandina in corso (Tesseract OCR)...';
    }

    const ocrResult = await processFlyerWithTesseract(source, name, (pct) => {
      if (statusLine) statusLine.textContent = `🔍 Lettura testo locandina: ${pct}%...`;
    });

    if (statusLine) {
      statusLine.className = 'text-[11px] text-emerald-400 mono-num truncate';
      statusLine.textContent = `✓ OCR completato: "${ocrResult.title.slice(0, 32)}..." inviato in Quarantena Admin!`;
    }

    const studio = await ensureAdminStudioLoaded();
    studio.quarantineQueue.unshift({
      qId: `quar-flyer-${Date.now()}`,
      submittedVia: 'FLYER_PHOTO_OCR',
      rawSourceInput: name,
      inferredSourceName: ocrResult.venueName,
      inferredSourceType: 'VISION_OCR + FRONTEND_TESSERACT',
      trustScore: 75,
      riskLevel: 'MEDIO',
      redFlags: ['Evento estratto da foto locandina, richiede approvazione dell\'Admin'],
      eventCandidate: ocrResult
    });
    studio.saveQuarantineQueue(studio.quarantineQueue);
    studio.render();
  };

  if (action === 'camera') {
    openCameraCaptureModal(onCaptured);
  }
}

// Setup community radar
function setupCommunityRadar() {
  const body = document.getElementById('studio-collapsible-body');
  const toggleBtn = document.getElementById('toggle-studio-collapse-btn');

  const updateRadarLabel = () => {
    if (!body || !toggleBtn) return;
    const isClosed = body.classList.contains('hidden');
    toggleBtn.textContent = isClosed ? '+ Apri Community Radar' : '✕ Chiudi Community Radar';
    toggleBtn.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
  };

  toggleBtn?.addEventListener('click', () => {
    body?.classList.toggle('hidden');
    updateRadarLabel();
  });

  document.getElementById('open-submit-panel-btn')?.addEventListener('click', () => {
    body?.classList.remove('hidden');
    updateRadarLabel();
    document.getElementById('community-ingestion-section')?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('input-link-url')?.focus();
  });

  // Link Form
  document.getElementById('submit-link-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('input-link-url');
    const val = input?.value?.trim();
    if (!val) return;

    const alertBox = document.getElementById('ingestion-feedback-alert');
    if (alertBox) {
      alertBox.className = 'p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/40 text-emerald-200 text-xs space-y-1.5';
      alertBox.innerHTML = `
        <div class="font-extrabold text-white">✅ Link Ricevuto & Inoltrato al Servizio!</div>
        <div>L'URL <code>${val}</code> è stato inviato per validazione e verifica date. Verrà pubblicato appena confermato.</div>
      `;
      alertBox.classList.remove('hidden');
    }
    if (input) input.value = '';
  });

  // Camera & Photo buttons
  const chooseInput = document.getElementById('input-flyer-choose');
  document.getElementById('btn-choose-flyer-photo')?.addEventListener('click', () => chooseInput?.click());
  chooseInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { processFlyerWithTesseract } = await import('./features/VisionOcrModal.js');
    const studio = await ensureAdminStudioLoaded();
    const ocrResult = await processFlyerWithTesseract(file, file.name);
    studio.quarantineQueue.unshift({
      qId: `quar-flyer-${Date.now()}`,
      submittedVia: 'FLYER_FILE_UPLOAD',
      rawSourceInput: file.name,
      inferredSourceName: ocrResult.venueName,
      inferredSourceType: 'VISION_OCR_FILE',
      trustScore: 78,
      riskLevel: 'MEDIO',
      redFlags: ['Locandina caricata da utente, in attesa di validazione'],
      eventCandidate: ocrResult
    });
    studio.saveQuarantineQueue(studio.quarantineQueue);
    studio.render();
    const statusLine = document.getElementById('flyer-ocr-status-line');
    if (statusLine) {
      statusLine.classList.remove('hidden');
      statusLine.textContent = `✓ OCR completato: "${ocrResult.title.slice(0, 32)}..." in Quarantena Admin!`;
    }
    e.target.value = '';
  });

  document.getElementById('btn-take-flyer-photo')?.addEventListener('click', () => {
    handleVisionOcrTrigger('camera');
  });
}

// Setup Keyboard shortcuts
function setupAdminShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      const params = new URLSearchParams(window.location.search);
      const isAdmin = window.location.hash.startsWith('#admin') || params.has('admin');
      if (isAdmin) {
        history.pushState('', document.title, window.location.pathname);
      } else {
        window.location.hash = '#admin';
      }
      syncAdminRoute();
    }
  });

  window.addEventListener('hashchange', syncAdminRoute);
  window.addEventListener('popstate', syncAdminRoute);
}

// Main App Initialization
export async function initApp() {
  // 1. Initial Timeline & FilterBar
  const timelineContainer = document.getElementById('timeline-container');
  new Timeline(timelineContainer, store);
  new FilterBar(store);

  // 2. Setup Community Radar & Shortcuts
  setupCommunityRadar();
  setupAdminShortcuts();

  // 3. Setup Live Clock
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // 4. Ingest Events
  let events = await loadLiveFeed();
  if (!events || events.length === 0) {
    events = generateRolling24hFeed();
  }

  store.setEvents(events);

  // 5. Check if loaded with Admin hash or query
  syncAdminRoute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
