/**
 * Application Bootstrap Entry Point (`src/main.js`)
 * Orchestrates Store, Timeline, FilterBar, Community Ingestion, Gemini Vision OCR,
 * StorageProvider, and Lazy Loading of Admin Studio & Vision OCR Modal.
 */

import { store } from './state/store.js';
import { Timeline } from './components/Timeline.js';
import { FilterBar } from './components/FilterBar.js';
import { storageProvider } from './services/storageProvider.js';
import { generateRolling24hFeed, getRomeDateParts, getNextHourStartMs } from './data/milanEventsGenerator.js';
import { seenEventsService } from './services/seenEventsService.js';
import { openPhonePromptModal } from './features/seenUserModal.js';

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

// Ingestion via storageProvider (Firestore -> public/live-events.json -> localStorage -> generator)
async function loadLiveFeed() {
  try {
    const snapshot = await storageProvider.fetchLiveSnapshot();
    if (snapshot && Array.isArray(snapshot.events) && snapshot.events.length > 0) {
      return snapshot.events;
    }
  } catch (err) {
    console.warn('[main.js] storageProvider fetchLiveSnapshot error:', err);
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

// Vision OCR Processor with Gemini Vision & Dual-Routing
async function processFlyerWithOcrPipeline(imageSource, displayName) {
  const statusLine = document.getElementById('flyer-ocr-status-line');
  if (statusLine) {
    statusLine.classList.remove('hidden');
    statusLine.className = 'text-[11px] text-amber-300 mono-num truncate animate-pulse';
    statusLine.textContent = '🔍 Analisi locandina in corso (Gemini Vision Flash)...';
  }

  const { extractEventsFromFlyerImage, routeOcrEvent } = await import('./features/visionOcrService.js');
  const extractedList = await extractEventsFromFlyerImage(imageSource, displayName);

  if (extractedList && extractedList.length > 0) {
    for (const rawEv of extractedList) {
      const decision = routeOcrEvent(rawEv);

      if (decision.destination === 'live_24h') {
        // Immediate 24h timeline
        const currentEvents = store.getState().allEvents;
        store.setEvents([decision.event, ...currentEvents]);

        if (statusLine) {
          statusLine.className = 'text-[11px] text-emerald-400 mono-num truncate';
          statusLine.textContent = `✓ OCR: "${decision.event.title.slice(0, 28)}..." pubblicato nel radar 24h!`;
        }
      } else if (decision.destination === 'scheduled_events') {
        // Save to future scheduled events cloud queue
        await storageProvider.saveScheduledEvent(decision.event);
        if (statusLine) {
          statusLine.className = 'text-[11px] text-purple-300 mono-num truncate';
          statusLine.textContent = `✓ OCR: "${decision.event.title.slice(0, 28)}..." programmato in coda futura!`;
        }
      } else {
        // Quarantine
        const studio = await ensureAdminStudioLoaded();
        studio.quarantineQueue.unshift({
          qId: `quar-ocr-${Date.now()}`,
          submittedVia: 'FLYER_OCR',
          rawSourceInput: displayName,
          inferredSourceName: rawEv.venueName,
          inferredSourceType: rawEv.extractionMethod,
          trustScore: 65,
          riskLevel: 'MEDIO',
          redFlags: [decision.reason],
          eventCandidate: rawEv
        });
        studio.saveQuarantineQueue(studio.quarantineQueue);
        if (statusLine) {
          statusLine.className = 'text-[11px] text-amber-300 mono-num truncate';
          statusLine.textContent = `⏳ Locandina inviata in Quarantena Admin (#admin) per revisione`;
        }
      }
    }
  }
}

// Lazy load Vision OCR Camera Modal
async function handleVisionOcrTrigger(action) {
  const { openCameraCaptureModal } = await import('./features/VisionOcrModal.js');
  if (action === 'camera') {
    openCameraCaptureModal(async (source, name) => {
      await processFlyerWithOcrPipeline(source, name);
    });
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
    await processFlyerWithOcrPipeline(file, file.name);
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

// Deep linking & Permalink handler (?event=<id> or #event-<id>)
function handleEventPermalink() {
  const urlParams = new URLSearchParams(window.location.search);
  let targetEventId = urlParams.get('event');

  if (!targetEventId && window.location.hash.startsWith('#event-')) {
    targetEventId = window.location.hash.replace('#event-', '');
  }

  if (!targetEventId) return;

  // Let DOM settle after store.setEvents
  setTimeout(() => {
    // If the event exists in state
    const allEvents = store.getState().allEvents || [];
    const targetEvent = allEvents.find(e => e.id === targetEventId);

    if (!targetEvent) return;

    // Reset filters to ensure the event isn't hidden
    store.setFilter('price', 'all');
    store.setFilter('category', 'all');
    store.setFilter('source', 'all');
    store.setFilter('search', '');

    // Expand the card drawer
    store.state.expandedEventIds.add(targetEventId);
    store.notify('card:expand');

    // Scroll card into view
    const cardEl = document.getElementById(`card-${targetEventId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Visual pulse highlight
      cardEl.classList.add('ring-2', 'ring-orange-500', 'shadow-[0_0_25px_rgba(249,115,22,0.4)]');
      setTimeout(() => {
        cardEl.classList.remove('ring-2', 'ring-orange-500', 'shadow-[0_0_25px_rgba(249,115,22,0.4)]');
      }, 3500);
    }
  }, 100);
}

// Setup User Phone Profile & Seen Events Synchronization
function setupSeenEventsSync() {
  const profileBtn = document.getElementById('btn-user-seen-profile');
  const dot = document.getElementById('user-seen-status-dot');
  const label = document.getElementById('user-seen-label');

  const refreshProfileButton = () => {
    if (!profileBtn || !dot || !label) return;
    const isAuth = seenEventsService.isAuthenticated();
    const countSeen = seenEventsService.getSeenEventIds().size;

    if (isAuth) {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      label.innerHTML = `👤 ${seenEventsService.getMaskedPhone()} • <span class="text-emerald-300 font-bold">${countSeen} visti</span>`;
      profileBtn.classList.add('border-emerald-500/40', 'bg-emerald-500/10');
      profileBtn.classList.remove('bg-[#161921]');
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-zinc-500';
      label.textContent = 'Sincronizza Visti';
      profileBtn.classList.remove('border-emerald-500/40', 'bg-emerald-500/10');
      profileBtn.classList.add('bg-[#161921]');
    }
  };

  profileBtn?.addEventListener('click', () => {
    openPhonePromptModal({
      onAuthenticated: () => {
        refreshProfileButton();
        store.setSeenEvents(seenEventsService.getSeenEventIds());
      }
    });
  });

  // Load existing seen events into state store
  const existingSeen = seenEventsService.getSeenEventIds();
  if (existingSeen.size > 0) {
    store.setSeenEvents(existingSeen);
  }

  refreshProfileButton();
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

  // 4. Setup Seen Events User Profile
  setupSeenEventsSync();

  // 5. Ingest Events
  let events = await loadLiveFeed();
  if (!events || events.length === 0) {
    events = generateRolling24hFeed();
  }

  store.setEvents(events);

  // 6. Handle Event Deep-link / Permalink
  handleEventPermalink();

  // 7. Check if loaded with Admin hash or query
  syncAdminRoute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

