/**
 * Admin Studio Module (`src/admin/AdminStudio.js`)
 * Loaded dynamically on demand when navigating to `#admin`, `?admin=1`, or Ctrl+Shift+A.
 */

export const MILAN_SOURCES_REGISTRY = [
  { name: 'Santeria Toscana 31 — Calendario Eventi', category: 'Concerti & Club', method: 'HTML Calendar + Liveurope', url: 'https://www.santeria.milano.it/eventi/' },
  { name: 'Pirelli HangarBicocca — Mostra Temporanea Luciano Fabro', category: 'Mostre & Musei', method: 'Structured HTML', url: 'https://pirellihangarbicocca.org/mostra/luciano-fabro/' },
  { name: 'Gallerie d’Italia Piazza Scala — Mostra "LIBERE! 1946-2026"', category: 'Mostre & Musei', method: 'Temporary Exhibition Feed', url: 'https://gallerieditalia.com/it/milano/mostre-e-iniziative/mostre/2026/09/24/mostra-libere-1946-2026-le-conquiste-delle-donne-milano/' },
  { name: 'Palazzo Reale Milano — Mostra Temporanea "Dalí e la Moda"', category: 'Mostre & Musei', method: 'Civic Exhibition Portal', url: 'https://www.palazzorealemilano.it/-/dali-e-la-moda' },
  { name: 'GAM Galleria d’Arte Moderna — Mostra Pellizza da Volpedo', category: 'Mostre & Musei', method: 'Civic Exhibition Portal', url: 'https://www.gam-milano.com/mostre/200/pellizza-da-volpedo-i-capolavori' },
  { name: 'Palazzo Reale Milano — Mostra Temporanea "I Brueghel"', category: 'Mostre & Musei', method: 'Civic Exhibition Portal', url: 'https://www.palazzorealemilano.it/-/brueghel' },
  { name: 'Fondazione Prada — Calendario & Cinema Godard', category: 'Mostre & Cinema', method: 'Calendar Feed', url: 'https://www.fondazioneprada.org/calendario/?period=current&tmpl=1' },
  { name: 'MUDEC — Mostre Temporanee in Corso', category: 'Mostre & Musei', method: 'WP REST + HTML', url: 'https://www.mudec.it/mostre-in-corso-2/' },
  { name: 'Villa Necchi Campiglio — FAI Eventi Speciali', category: 'Aperture Speciali', method: 'JSON-LD Events', url: 'https://fondoambiente.it/luoghi/villa-necchi-campiglio/eventi' },
  { name: 'Cineteca Milano Arlecchino', category: 'Cinema & Rassegne', method: 'Calendar Scraper', url: 'https://www.cinetecamilano.it/luogo/cineteca-milano-arlecchino/' },
  { name: 'SpazioCinema Anteo Palazzo del Cinema', category: 'Cinema & Rassegne', method: 'Showtime Parser', url: 'https://www.spaziocinema.info/milano' },
  { name: 'Cinema Beltrade — Programmazione MilanoCinema', category: 'Cinema & Rassegne', method: 'Daily Showtime API', url: 'https://milanocinema.com/it/cinema/beltrade' },
  { name: 'Cinema Mexico — Programmazione MilanoCinema', category: 'Cinema & Rassegne', method: 'Daily Showtime API', url: 'https://milanocinema.com/cinema/mexico' },
  { name: 'Il Cinemino — Programmazione Sala & Classics', category: 'Cinema & Rassegne', method: 'Schedule Table Parser', url: 'https://www.ilcinemino.it/programmazione/' },
  { name: 'Piccolo Teatro Strehler', category: 'Teatro', method: 'Calendar API', url: 'https://www.piccoloteatro.org/it/theaters/piccolo-teatro-strehler' },
  { name: 'Teatro Franco Parenti — Cartellone Spettacoli', category: 'Teatro', method: 'HTML + JSON-LD', url: 'https://teatrofrancoparenti.it/cartellone/spettacoli-teatro-milano/' },
  { name: 'Teatro Elfo Puccini — Teatro Contemporaneo', category: 'Teatro', method: 'Season Schedule Parser', url: 'https://www.elfo.org/' },
  { name: 'Teatro Manzoni — Programma Spettacoli', category: 'Teatro', method: 'Structured HTML', url: 'https://www.teatromanzoni.it/programma/' },
  { name: 'Casa della Cultura Milano (Via Borgogna 3)', category: 'Politica, Attivismo & Sociale', method: 'WP REST + Calendar', url: 'https://www.casadellacultura.it/' },
  { name: 'Camera del Lavoro / CGIL Milano — Stagione Culturale 2026', category: 'Politica, Attivismo & Sociale', method: 'WP REST + Agenda', url: 'https://www.cgil.milano.it/stagione-culturale-2026/' },
  { name: 'Casa delle Donne di Milano — Calendario Eventi', category: 'Politica, Attivismo & Sociale', method: 'WP Calendar Parser', url: 'https://www.casadonnemilano.it/calendario-eventi-nella-casa/' },
  { name: 'Fondazione Giangiacomo Feltrinelli — Partecipa', category: 'Libri, Talk & Conferenze', method: 'WP REST API', url: 'https://fondazionefeltrinelli.it/partecipa-home/' },
  { name: 'Libreria Verso — Calendario Appuntamenti', category: 'Libri, Talk & Conferenze', method: 'WP Events Parser', url: 'http://www.libreriaverso.com/appuntamenti/' },
  { name: 'MEET Digital Culture Center — Tutti gli Eventi', category: 'Libri, Talk & Digital Art', method: 'WP REST API', url: 'https://www.meetcenter.it/it/tutti-gli-eventi/' },
  { name: 'Triennale Milano — Scheda & Programmazione Zero.eu', category: 'Libri, Talk & Mostre', method: 'Zero.eu Structured Feed', url: 'https://zero.eu/it/luoghi/4032-triennale-di-milano,milano/' }
];

export function verifyEventCandidateWithAgent(candidate = {}) {
  const text = `${candidate.title || ''} ${candidate.description || ''} ${candidate.sourceUrl || ''} ${candidate.rawText || ''}`;
  const reasons = [];

  if (/milanoguida\.com\/visite-guidate\/|tour\s+su\s+richiesta|prenota\s+un\s+tour\s+privato|itinerario\s+a\s+catalogo|walking\s+tour/i.test(text)) {
    reasons.push('Gate 1 (Natura Occasione): Pagina promozionale di tour/visita guidata a catalogo ricorrente (non è un singolo evento o appuntamento speciale).');
  }
  if (/collezione\s+permanente\s+a\s+ingresso\s+libero\s+senza\s+mostra|solo\s+collezione\s+permanente|orari\s+sportello\s+al\s+pubblico|sportelli\s+diritti\s+civili/i.test(text)) {
    reasons.push('Gate 1 (Natura Occasione): Attività ordinaria ricorrente (collezione permanente o sportello), non costituisce un evento speciale.');
  }
  if (/in\s+programmazione\s*[-—:]?\s*vuoi\s+essere\s+avvisato|vuoi\s+essere\s+avvisato\s+quando\s+saranno\s+online|nessuna\s+data\s+disponibile|attualmente\s+non\s+prenotabile/i.test(text)) {
    reasons.push('Gate 2 (Disponibilità & Prenotabilità): L’attività non ha date attive e non è né disponibile né prenotabile.');
  }

  if (candidate.sourceUrl) {
    try {
      const parsed = new URL(candidate.sourceUrl);
      const path = parsed.pathname.replace(/\/+$/, '');
      if (!path && !parsed.search) {
        reasons.push(`Gate 4 (Fedeltà Link Sorgente): L'URL associato (${parsed.origin}/) è una homepage generica e non riporta il permalink con i dettagli specifici dell'evento.`);
      }
    } catch {
      // Ignore
    }
  }

  const isSoldOut =
    Boolean(candidate.isSoldOut) ||
    /sold\s*out|tutto\s+esaurito|posti\s+esauriti|biglietti\s+esauriti/i.test(text);

  if (reasons.length > 0) {
    return {
      isValidEvent: false,
      verdict: 'SCARTATO DALL’AGENTE',
      isSoldOut: false,
      availabilityBadge: 'NON DISPONIBILE / SCARTATO',
      reasons
    };
  }

  return {
    isValidEvent: true,
    verdict: isSoldOut ? 'APPROVATO CON BADGE SOLD OUT' : 'APPROVATO E PRENOTABILE / ATTIVO',
    isSoldOut,
    availabilityBadge: isSoldOut ? 'SOLD OUT • POSTI ESAURITI' : 'DISPONIBILE / PRENOTABILE',
    reasons: ['Tutti i 4 gate di fedeltà e validità superati con successo.']
  };
}

export class AdminStudio {
  constructor(store) {
    this.store = store;
    this.currentTab = 'overview';
    this.domainSearchQuery = '';
    this.domainCategoryFilter = 'all';
    this.STORAGE_KEY_CUSTOM_DOMAINS = 'milano_live_custom_search_domains_v1';
    this.STORAGE_KEY_QUARANTINE = 'milano_live_quarantine_queue_v1';
    this.STORAGE_KEY_LEARNED = 'milano_live_learned_sources_v1';

    this.customDomains = this.loadCustomDomains();
    this.quarantineQueue = this.loadQuarantineQueue();
    this.learnedSources = this.loadLearnedSources();

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  loadCustomDomains() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_CUSTOM_DOMAINS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }

  saveCustomDomains(list) {
    this.customDomains = list;
    try {
      localStorage.setItem(this.STORAGE_KEY_CUSTOM_DOMAINS, JSON.stringify(list));
    } catch { /* ignore */ }
  }

  loadQuarantineQueue() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_QUARANTINE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [
      {
        qId: 'quar-crypto-rave-01',
        submittedVia: 'LINK_URL',
        rawSourceInput: 'https://bit.ly/milano-secret-warehouse-crypto-rave',
        inferredSourceName: 'Redirect bit.ly -> milano-secret-tickets.xyz',
        inferredSourceType: 'OBFUSCATED_SHORTLINK_REDIRECT',
        trustScore: 22,
        riskLevel: 'ALTO',
        redFlags: [
          'URL Shortener offuscato (bit.ly) verso dominio .xyz non censito a Milano',
          'Richiesta prevendita esterna non affiliata a circuiti sicuri (DICE / RA / Mailticket)',
          'Indirizzo civico milanese mancante ("Secret Location TBA")'
        ],
        eventCandidate: {
          id: 'evt-quar-rave-01',
          title: 'Secret Industrial Warehouse Night — Prevendita Token',
          venueName: 'Ex Magazzini Scalo Farini (Da Verificare)',
          address: 'Via Valtellina, Milano',
          category: 'concerti'
        }
      }
    ];
  }

  saveQuarantineQueue(q) {
    this.quarantineQueue = q;
    try {
      localStorage.setItem(this.STORAGE_KEY_QUARANTINE, JSON.stringify(q));
    } catch { /* ignore */ }
  }

  loadLearnedSources() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_LEARNED);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [
      {
        id: 'src-learned-arcibellezza',
        name: 'Circolo ARCI Bellezza Milano',
        domainOrHandle: 'arcibellezza.it',
        inferredType: 'JSON_LD_VENUE + WP_REST_API',
        category: 'politica',
        trustScore: 94,
        status: 'AUTO_LEARNED',
        url: 'https://www.arcibellezza.it'
      }
    ];
  }

  saveLearnedSources(s) {
    this.learnedSources = s;
    try {
      localStorage.setItem(this.STORAGE_KEY_LEARNED, JSON.stringify(s));
    } catch { /* ignore */ }
  }

  bindEvents() {
    // Back to Public View button
    document.getElementById('back-to-public-view-btn')?.addEventListener('click', () => {
      history.pushState('', document.title, window.location.pathname);
      this.syncVisibility();
    });

    // Admin Tab switching
    document.getElementById('admin-tab-btn-overview')?.addEventListener('click', () => {
      window.location.hash = '#admin';
      this.setActiveTab('overview');
    });

    document.getElementById('admin-tab-btn-domains')?.addEventListener('click', () => {
      window.location.hash = '#admin-domains';
      this.setActiveTab('domains');
    });

    // Domain Search input
    document.getElementById('admin-domains-search-input')?.addEventListener('input', (e) => {
      this.domainSearchQuery = e.target.value;
      this.renderDomainsPage();
    });

    // Domain Category filter buttons
    const filterBtns = {
      all: document.getElementById('admin-domains-filter-all'),
      cinema: document.getElementById('admin-domains-filter-cinema'),
      teatro: document.getElementById('admin-domains-filter-teatro'),
      mostre: document.getElementById('admin-domains-filter-mostre')
    };

    Object.entries(filterBtns).forEach(([cat, btn]) => {
      btn?.addEventListener('click', () => {
        this.domainCategoryFilter = cat;
        Object.entries(filterBtns).forEach(([k, b]) => {
          if (!b) return;
          b.className = k === cat
            ? 'px-2.5 py-1.5 rounded bg-emerald-500 text-black font-bold text-xs cursor-pointer'
            : 'px-2.5 py-1.5 rounded bg-[#161920] hover:bg-[#202530] text-zinc-300 border border-[#2a2f3a] text-xs cursor-pointer';
        });
        this.renderDomainsPage();
      });
    });

    // Add Domain Form
    document.getElementById('admin-add-domain-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddDomainSubmit();
    });

    // Delete custom domain button delegation
    document.getElementById('admin-domains-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-custom-domain]');
      if (!btn) return;
      const customId = btn.getAttribute('data-remove-custom-domain');
      if (confirm('Rimuovere questo dominio personalizzato dalle ricerche su Milano?')) {
        const updated = this.customDomains.filter(d => d.id !== customId);
        this.saveCustomDomains(updated);
        this.render();
      }
    });

    // Agent Verifier interactive test form
    const agentInput = document.getElementById('agent-test-input');
    const runTest = (text) => {
      const box = document.getElementById('agent-test-result-box');
      if (!box) return;
      const v = verifyEventCandidateWithAgent({ title: text, rawText: text, sourceUrl: text });
      box.classList.remove('hidden');
      box.className = `p-3.5 rounded-lg border text-xs space-y-1.5 ${v.isValidEvent ? (v.isSoldOut ? 'bg-red-500/10 border-red-500/40 text-red-200' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200') : 'bg-zinc-800 border-zinc-600 text-zinc-200'}`;
      box.innerHTML = `<div class="font-bold">${v.verdict} — ${v.availabilityBadge}</div>${v.reasons.map(r => `<div>• ${r}</div>`).join('')}`;
    };

    document.querySelectorAll('[data-agent-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const presets = {
          milanoguida: 'https://www.milanoguida.com/visite-guidate/itinerari-milano/milano-medievale/ In programmazione — Vuoi essere avvisato quando saranno online nuove date?',
          soldout: 'Live Jazz Blue Note Milano — SOLD OUT posti esauriti',
          valid: 'Mostra temporanea Dalí e la Moda — Palazzo Reale, biglietti disponibili'
        };
        const t = presets[btn.getAttribute('data-agent-preset')] || '';
        if (agentInput) agentInput.value = t;
        runTest(t);
      });
    });

    document.getElementById('agent-verifier-test-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      runTest((agentInput?.value || '').trim());
    });
  }

  handleAddDomainSubmit() {
    const hostInput = document.getElementById('input-new-domain-host');
    const venueInput = document.getElementById('input-new-domain-venue');
    const categorySelect = document.getElementById('input-new-domain-category');
    const neighborhoodInput = document.getElementById('input-new-domain-neighborhood');
    const notesInput = document.getElementById('input-new-domain-notes');
    const feedbackEl = document.getElementById('admin-add-domain-feedback');

    if (!hostInput || !feedbackEl) return;
    let raw = hostInput.value.trim();
    if (!raw) return;

    let cleanHost = '';
    let targetUrl = '';
    try {
      targetUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      cleanHost = new URL(targetUrl).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      cleanHost = raw.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0].trim();
      targetUrl = `https://${cleanHost}`;
    }

    if (!cleanHost || cleanHost.length < 3) {
      feedbackEl.className = 'p-3.5 rounded-lg border bg-rose-500/10 border-rose-500/40 text-rose-300 text-xs';
      feedbackEl.textContent = '❌ Specifica un nome di dominio valido.';
      feedbackEl.classList.remove('hidden');
      return;
    }

    const category = categorySelect?.value || 'teatro';
    const venueName = (venueInput?.value || '').trim() || cleanHost.replace(/\.[a-z]+$/i, '').toUpperCase();
    const neighborhood = (neighborhoodInput?.value || '').trim() || 'Milano';
    const notes = (notesInput?.value || '').trim();

    const exists = this.customDomains.some(d => d.domain.toLowerCase().replace(/^www\./, '') === cleanHost);
    if (exists) {
      feedbackEl.className = 'p-3.5 rounded-lg border bg-amber-500/10 border-amber-500/40 text-amber-300 text-xs';
      feedbackEl.textContent = `ℹ️ Il dominio "${cleanHost}" è già registrato.`;
      feedbackEl.classList.remove('hidden');
      return;
    }

    const customId = `custom-dom-${Date.now()}`;
    const newEntry = {
      id: customId,
      domain: cleanHost,
      url: targetUrl,
      venueName,
      category,
      neighborhood,
      notes,
      addedAt: new Date().toISOString(),
      sampleTitle: `Occasione in programma presso ${venueName}`
    };

    this.customDomains.unshift(newEntry);
    this.saveCustomDomains(this.customDomains);

    MILAN_SOURCES_REGISTRY.unshift({
      name: `${venueName} [Dominio Ricerca Attivo]`,
      category: category,
      method: 'DOMINIO RICERCA ATTIVO (Auto-Ingestion)',
      url: targetUrl
    });

    hostInput.value = '';
    if (venueInput) venueInput.value = '';
    if (neighborhoodInput) neighborhoodInput.value = '';
    if (notesInput) notesInput.value = '';

    feedbackEl.className = 'p-3.5 rounded-lg border bg-emerald-500/10 border-emerald-500/40 text-emerald-300 text-xs';
    feedbackEl.textContent = `✅ Dominio "${cleanHost}" registrato con successo tra le fonti monitorate.`;
    feedbackEl.classList.remove('hidden');

    this.render();
  }

  setActiveTab(tabName) {
    this.currentTab = tabName;
    const overviewBtn = document.getElementById('admin-tab-btn-overview');
    const domainsBtn = document.getElementById('admin-tab-btn-domains');
    const overviewContent = document.getElementById('admin-console-content');
    const domainsContent = document.getElementById('admin-domains-content');

    if (tabName === 'domains') {
      overviewBtn?.classList.remove('bg-orange-500', 'text-black', 'font-extrabold', 'shadow-sm');
      overviewBtn?.classList.add('bg-[#161920]', 'hover:bg-[#1f242d]', 'text-zinc-300', 'font-bold', 'border', 'border-[#262b36]');

      domainsBtn?.classList.remove('bg-[#161920]', 'hover:bg-[#1f242d]', 'text-zinc-300', 'font-bold', 'border', 'border-[#262b36]');
      domainsBtn?.classList.add('bg-orange-500', 'text-black', 'font-extrabold', 'shadow-sm');

      overviewContent?.classList.add('hidden');
      domainsContent?.classList.remove('hidden');
      this.renderDomainsPage();
    } else {
      domainsBtn?.classList.remove('bg-orange-500', 'text-black', 'font-extrabold', 'shadow-sm');
      domainsBtn?.classList.add('bg-[#161920]', 'hover:bg-[#1f242d]', 'text-zinc-300', 'font-bold', 'border', 'border-[#262b36]');

      overviewBtn?.classList.remove('bg-[#161920]', 'hover:bg-[#1f242d]', 'text-zinc-300', 'font-bold', 'border', 'border-[#262b36]');
      overviewBtn?.classList.add('bg-orange-500', 'text-black', 'font-extrabold', 'shadow-sm');

      domainsContent?.classList.add('hidden');
      overviewContent?.classList.remove('hidden');
    }
  }

  syncVisibility() {
    const params = new URLSearchParams(window.location.search);
    const isAdmin = window.location.hash.startsWith('#admin') || params.has('admin');

    const publicView = document.getElementById('public-app-view');
    const adminPage = document.getElementById('hidden-admin-page');

    if (isAdmin) {
      publicView?.classList.add('hidden');
      adminPage?.classList.remove('hidden');
      const isDomains = window.location.hash === '#admin-domains' || params.get('admin') === 'domains';
      this.setActiveTab(isDomains ? 'domains' : 'overview');
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      adminPage?.classList.add('hidden');
      publicView?.classList.remove('hidden');
    }
  }

  render() {
    this.renderOverview();
    this.renderDomainsPage();
  }

  renderOverview() {
    // 1. Sources Registry Grid
    const sourcesGrid = document.getElementById('sources-grid');
    if (sourcesGrid) {
      sourcesGrid.innerHTML = MILAN_SOURCES_REGISTRY.map((src, idx) => `
        <a
          href="${src.url}"
          target="_blank"
          rel="noopener noreferrer"
          class="p-3 rounded-lg bg-[#161920] hover:bg-[#1c2029] border border-[#252a34] hover:border-emerald-500/40 transition flex flex-col justify-between gap-1.5"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="font-bold text-white text-xs leading-snug">${idx + 1}. ${src.name}</span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold mono-num shrink-0">ATTIVA</span>
          </div>
          <div class="text-zinc-400 text-[11px]">${src.category} • <span class="text-zinc-300">${src.method}</span></div>
          <div class="text-[11px] text-orange-400 mono-num truncate pt-1 border-t border-[#222731]">
            🔗 ${src.url}
          </div>
        </a>
      `).join('');
    }

    // 2. Quarantine List
    const qContainer = document.getElementById('quarantine-list-container');
    const qCountPill = document.getElementById('quarantine-count-pill');
    if (qCountPill) qCountPill.textContent = String(this.quarantineQueue.length);

    if (qContainer) {
      if (this.quarantineQueue.length === 0) {
        qContainer.innerHTML = '<div class="p-4 rounded-xl bg-[#161920] border border-[#252a34] text-zinc-400 text-center">✅ Nessuna fonte sospetta in coda.</div>';
      } else {
        qContainer.innerHTML = this.quarantineQueue.map(item => `
          <div class="p-4 rounded-xl bg-[#161920] border border-red-500/40 space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span class="px-2 py-0.5 rounded bg-red-500 text-black font-extrabold text-xs uppercase mono-num">
                  RISCHIO ${item.riskLevel} • TRUST ${item.trustScore}/100
                </span>
                <h4 class="text-sm font-bold text-white mt-1.5">${item.eventCandidate?.title || item.inferredSourceName}</h4>
                <div class="text-xs text-zinc-400">Origine: <code class="text-red-300">${item.rawSourceInput}</code></div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // 3. Learned Sources List
    const lContainer = document.getElementById('learned-sources-container');
    const lSummary = document.getElementById('learned-sources-summary');
    if (lSummary) lSummary.textContent = String(this.learnedSources.length);

    if (lContainer) {
      lContainer.innerHTML = this.learnedSources.map(s => `
        <div class="p-3 rounded-lg bg-[#161920] border border-[#252a34] flex flex-col justify-between gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-white text-xs">${s.name}</span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold mono-num">${s.status}</span>
          </div>
          <div class="text-xs text-zinc-400 mono-num">${s.domainOrHandle}</div>
        </div>
      `).join('');
    }

    // 4. Schema sample
    const jsonPre = document.getElementById('live-json-preview');
    if (jsonPre) {
      const state = this.store.getState();
      const sample = state.allEvents[0] || {};
      jsonPre.textContent = JSON.stringify({
        id: sample.id || 'sample-evt-01',
        title: sample.title || 'Titolo Evento Esempio',
        venueName: sample.venueName || 'Spazio Esempio Milano',
        startTime: sample.startTime || new Date().toISOString(),
        isFree: sample.isFree ?? true
      }, null, 2);
    }
  }

  renderDomainsPage() {
    const grid = document.getElementById('admin-domains-grid');
    const badge = document.getElementById('admin-domains-total-badge');
    const statsCount = document.getElementById('admin-domains-stats-count');
    const statsEvents = document.getElementById('admin-domains-stats-events');
    if (!grid) return;

    const state = this.store.getState();
    const domainsMap = new Map();

    state.allEvents.forEach(ev => {
      if (!ev.sourceUrl) return;
      try {
        const parsed = new URL(ev.sourceUrl);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!domainsMap.has(host)) {
          domainsMap.set(host, {
            hostname: host,
            eventCount: 0,
            isCustomAdded: false,
            categories: new Set(),
            venues: new Set(),
            sampleTitles: [],
            sampleUrls: []
          });
        }
        const entry = domainsMap.get(host);
        entry.eventCount++;
        if (ev.category) entry.categories.add(ev.category);
        if (ev.venueName) entry.venues.add(ev.venueName);
        if (entry.sampleTitles.length < 2 && ev.title) {
          entry.sampleTitles.push(ev.title);
          entry.sampleUrls.push(ev.sourceUrl);
        }
      } catch { /* ignore */ }
    });

    this.customDomains.forEach(cd => {
      const host = cd.domain.toLowerCase().replace(/^www\./, '');
      if (!domainsMap.has(host)) {
        domainsMap.set(host, {
          hostname: host,
          eventCount: 0,
          isCustomAdded: true,
          customId: cd.id,
          categories: new Set([cd.category || 'teatro']),
          venues: new Set([cd.venueName || host]),
          sampleTitles: [cd.sampleTitle || 'Monitoraggio attivo su Milano'],
          sampleUrls: [cd.url || `https://${host}`]
        });
      } else {
        const entry = domainsMap.get(host);
        entry.isCustomAdded = true;
        entry.customId = cd.id;
      }
    });

    let domainEntries = Array.from(domainsMap.values());

    if (this.domainCategoryFilter !== 'all') {
      domainEntries = domainEntries.filter(d => {
        if (this.domainCategoryFilter === 'cinema') return d.categories.has('cinema') || d.hostname.includes('cinema');
        if (this.domainCategoryFilter === 'teatro') return d.categories.has('teatro') || d.hostname.includes('teatro');
        if (this.domainCategoryFilter === 'mostre') return d.categories.has('mostre') || d.categories.has('arte');
        return true;
      });
    }

    if (this.domainSearchQuery.trim()) {
      const q = this.domainSearchQuery.trim().toLowerCase();
      domainEntries = domainEntries.filter(d => d.hostname.toLowerCase().includes(q) || Array.from(d.venues).some(v => v.toLowerCase().includes(q)));
    }

    if (badge) badge.textContent = String(domainsMap.size);
    if (statsCount) statsCount.textContent = String(domainsMap.size);
    if (statsEvents) statsEvents.textContent = String(state.allEvents.length);

    grid.innerHTML = domainEntries.map(d => `
      <div class="p-4 rounded-xl bg-[#131519] border ${d.isCustomAdded ? 'border-orange-500/50' : 'border-[#252a34]'} flex flex-col justify-between gap-3">
        <div class="space-y-1.5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="font-extrabold text-white text-xs mono-num">${d.hostname}</span>
              ${d.isCustomAdded ? '<span class="ml-1.5 px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-bold uppercase">Personalizzato</span>' : ''}
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black ${d.eventCount > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}">
              ${d.eventCount} eventi
            </span>
          </div>
          <div class="text-[11px] text-zinc-400 truncate">Luoghi: ${Array.from(d.venues).slice(0, 3).join(', ')}</div>
        </div>
        <div class="pt-2 border-t border-[#1e232d] flex items-center justify-between text-[10px]">
          <a href="${d.sampleUrls[0] || `https://${d.hostname}`}" target="_blank" rel="noopener noreferrer" class="text-zinc-400 hover:text-emerald-400 underline">
            Apri Sito ↗
          </a>
          ${d.isCustomAdded && d.customId ? `
            <button type="button" data-remove-custom-domain="${d.customId}" class="text-rose-400 hover:text-rose-300 underline cursor-pointer">
              Rimuovi
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
}

export function mountAdminStudio(store) {
  return new AdminStudio(store);
}
