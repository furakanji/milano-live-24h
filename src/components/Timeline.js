/**
 * Timeline Component with Surgical DOM Filtering & Continuous Exhibitions Drawer (`src/components/Timeline.js`)
 */

import { renderEventCard } from './EventCard.js';
import { checkContinuousExhibitionStatus } from '../../services/crawlers/crawlerUtils.js';
import { openShareModal } from '../features/shareModal.js';

export class Timeline {
  constructor(containerEl, store) {
    this.container = containerEl;
    this.store = store;
    this.expandedExhibitions = true;
    this.init();
  }

  init() {
    this.store.subscribe((state, eventKey) => {
      if (eventKey === 'events' || eventKey === 'init') {
        this.renderFull();
      } else if (eventKey && eventKey.startsWith('filter:')) {
        this.applySurgicalFilter();
      } else if (eventKey === 'card:expand') {
        this.updateCardExpandStates();
      }
    });

    // Delegate click events for cards expansion and sharing inside timeline container
    this.container.addEventListener('click', (e) => {
      const shareBtn = e.target.closest('[data-share-event]');
      if (shareBtn) {
        e.stopPropagation();
        const eventId = shareBtn.getAttribute('data-share-event');
        const title = shareBtn.getAttribute('data-event-title') || 'Evento a Milano';
        const venue = shareBtn.getAttribute('data-event-venue') || 'Milano';
        const time = shareBtn.getAttribute('data-event-time') || '';
        openShareModal({ eventId, title, venue, time });
        return;
      }

      const toggleBtn = e.target.closest('[data-toggle-card]');
      if (toggleBtn) {
        const eventId = toggleBtn.getAttribute('data-toggle-card');
        this.store.toggleCardExpanded(eventId);
      }
    });
  }

  /**
   * Full DOM render — called only on new data ingestion or initial load
   */
  renderFull() {
    const state = this.store.getState();
    const allEvents = state.allEvents;

    if (!allEvents || allEvents.length === 0) {
      this.container.innerHTML = '';
      document.getElementById('empty-state')?.classList.remove('hidden');
      return;
    }

    // 1. Separate Continuous Exhibitions from punctual hourly events
    const continuousEvents = allEvents.filter(ev => ev.isContinuous);
    const hourlyPunctualEvents = allEvents.filter(ev => !ev.isContinuous);

    // Build Continuous Drawer HTML (Top of timeline)
    const continuousHtml = this.renderContinuousExhibitionsDrawer(continuousEvents);

    // 2. Build 24 Hourly Slots
    const nextHourStartMs = state.nextHourStartMs;
    const nowRome = this.getRomeParts(new Date(state.pageLoadAnchorMs));
    let hourlyHtml = '';

    for (let i = 0; i < 24; i++) {
      const slotStartMs = nextHourStartMs + i * 3600000;
      const slotRome = this.getRomeParts(new Date(slotStartMs));
      const isTomorrow = slotRome.day !== nowRome.day;
      const nextHourNum = (slotRome.hourNum + 1) % 24;
      const slotRangeLabel = `${String(slotRome.hourNum).padStart(2, '0')}:00 – ${String(nextHourNum).padStart(2, '0')}:00`;

      // Filter events belonging to this hour slot
      const slotEvents = hourlyPunctualEvents.filter(ev => {
        const evStartMs = ev._fixedStartMs || Date.parse(ev.startTime);
        return evStartMs >= slotStartMs && evStartMs < slotStartMs + 3600000;
      });

      const hasEvents = slotEvents.length > 0;

      hourlyHtml += `
        <section
          id="slot-${slotRome.hourNum}"
          data-slot-hour="${slotRome.hourNum}"
          data-total-events="${slotEvents.length}"
          class="hourly-slot-section space-y-4 pt-2 ${!hasEvents ? 'hourly-slot-empty' : ''}"
        >
          <!-- Hour Header -->
          <div class="sticky top-[148px] z-20 flex items-center justify-between py-2 px-3.5 rounded-lg bg-[#0e1014]/90 backdrop-blur-md border border-[#23272f]">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full ${hasEvents ? 'bg-orange-500' : 'bg-zinc-600'}"></span>
              <h2 class="text-sm font-black text-white mono-num tracking-wide flex items-center gap-2">
                <span>FASCIA ORE ${slotRangeLabel}</span>
                <span class="text-xs font-semibold ${isTomorrow ? 'text-amber-400' : 'text-zinc-400'} uppercase">
                  (${isTomorrow ? 'DOMANI' : 'OGGI'} • ${slotRome.weekday})
                </span>
              </h2>
            </div>
            <div class="slot-count-badge text-xs font-bold mono-num ${hasEvents ? 'text-orange-400' : 'text-zinc-500'}">
              ${hasEvents ? `${slotEvents.length} ${slotEvents.length === 1 ? 'evento' : 'eventi'}` : 'Nessun evento programmato'}
            </div>
          </div>

          <!-- Event Cards List -->
          <div class="slot-cards-container space-y-3.5">
            ${slotEvents.map(ev => renderEventCard(ev, state.expandedEventIds.has(ev.id))).join('')}
          </div>
        </section>
      `;
    }

    this.container.innerHTML = continuousHtml + hourlyHtml;

    // Apply surgical filter immediately to sync visibility
    this.applySurgicalFilter();
  }

  /**
   * Continuous exhibitions drawer at the top
   */
  renderContinuousExhibitionsDrawer(exhibitions) {
    if (!exhibitions || exhibitions.length === 0) return '';
    const nowMs = Date.now();

    // Check how many are open right now
    const openNowCount = exhibitions.filter(ev => checkContinuousExhibitionStatus(ev, nowMs).isOpenNow).length;

    return `
      <section id="continuous-exhibitions-section" class="mb-8 rounded-xl bg-[#111318] border border-teal-500/40 overflow-hidden shadow-xl">
        <div class="px-4 sm:px-5 py-3.5 bg-[#141720] flex items-center justify-between gap-3 border-b border-[#23272f]">
          <div class="flex items-center gap-2.5">
            <span class="px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-black uppercase tracking-wider mono-num">
              🖼️ MOSTRE &amp; MUSEI APERTI
            </span>
            <span class="text-xs text-zinc-300 font-medium">
              ${openNowCount > 0 ? `<span class="text-emerald-400 font-bold mono-num">🟢 ${openNowCount} APERTI ORA</span> • ` : ''}
              ${exhibitions.length} Grandi Mostre in Corso
            </span>
          </div>
          <button
            id="toggle-continuous-drawer-btn"
            type="button"
            class="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
          >
            <span>${this.expandedExhibitions ? 'Comprimi ▲' : 'Espandi ▼'}</span>
          </button>
        </div>

        <div id="continuous-cards-list" class="${this.expandedExhibitions ? 'block' : 'hidden'} p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#0b0c0e]">
          ${exhibitions.map(ev => {
            const status = checkContinuousExhibitionStatus(ev, nowMs);
            const statusBadge = status.isOpenNow
              ? `<span class="px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase mono-num">${status.statusText}</span>`
              : `<span class="px-2 py-0.5 rounded text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 mono-num">${status.statusText}</span>`;

            return `
              <div
                class="event-card-item rounded-xl p-4 editorial-card border border-[#23272f] hover:border-teal-500/50 transition flex flex-col justify-between space-y-2.5"
                data-event-id="${ev.id}"
                data-category="${ev.category}"
                data-is-free="${ev.isFree ? 'true' : 'false'}"
                data-is-sold-out="false"
                data-source="${ev.source || ''}"
                data-searchable-text="${(ev.title + ' ' + ev.venueName + ' ' + ev.description).toLowerCase().replace(/"/g, '&quot;')}"
              >
                <div>
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    ${statusBadge}
                    <span class="text-[11px] text-zinc-400 font-bold">${ev.priceDetails}</span>
                  </div>
                  <h4 class="text-sm font-bold text-white leading-snug">${ev.title}</h4>
                  <p class="text-xs text-zinc-400 mt-1 line-clamp-2">${ev.description}</p>
                </div>
                <div class="pt-2 border-t border-[#1e222a] flex items-center justify-between text-xs">
                  <span class="text-zinc-300 font-medium truncate max-w-[50%]">📍 ${ev.venueName}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      data-share-event="${ev.id}"
                      data-event-title="${ev.title.replace(/"/g, '&quot;')}"
                      data-event-venue="${(ev.venueName || '').replace(/"/g, '&quot;')}"
                      data-event-time="${ev.openHour || '10:00'}"
                      class="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
                      title="Condividi evento o copia permalink"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      <span>Condividi</span>
                    </button>
                    <a href="${ev.mapsUrl}" target="_blank" rel="noopener noreferrer" class="text-teal-400 hover:text-teal-300 font-bold underline">Maps →</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  /**
   * High-Performance Surgical DOM Filtering (< 5ms)
   * Toggles `.hidden` class on existing DOM nodes without destroying the tree!
   */
  applySurgicalFilter() {
    const s = this.store.getState();
    const query = s.activeSearchQuery.toLowerCase();
    let totalVisible = 0;

    // Filter each event card
    const allCards = this.container.querySelectorAll('.event-card-item');
    allCards.forEach(card => {
      const cat = card.getAttribute('data-category');
      const isFree = card.getAttribute('data-is-free') === 'true';
      const isSoldOut = card.getAttribute('data-is-sold-out') === 'true';
      const source = (card.getAttribute('data-source') || '').toLowerCase();
      const searchable = card.getAttribute('data-searchable-text') || '';

      let visible = true;

      // Price filter
      if (s.activePriceFilter === 'free' && !isFree) visible = false;
      if (s.activePriceFilter === 'paid' && isFree) visible = false;

      // Category filter & disabled categories
      if (s.disabledCategories.has(cat)) visible = false;
      if (s.activeCategoryFilter !== 'all' && cat !== s.activeCategoryFilter) visible = false;

      // Source filter
      if (s.activeSourceFilter !== 'all') {
        if (!source.includes(s.activeSourceFilter.toLowerCase())) visible = false;
      }

      // Cinema venue filter
      if (s.activeCinemaVenueFilter !== 'all' && (cat === 'cinema' || s.activeCategoryFilter === 'cinema')) {
        if (!searchable.includes(s.activeCinemaVenueFilter.toLowerCase())) visible = false;
      }

      // Search query
      if (query !== '' && !searchable.includes(query)) visible = false;

      if (visible) {
        card.classList.remove('hidden');
        totalVisible++;
      } else {
        card.classList.add('hidden');
      }
    });

    // Toggle hourly sections visibility based on visible card count
    const slotSections = this.container.querySelectorAll('.hourly-slot-section');
    slotSections.forEach(section => {
      const visibleInSlot = section.querySelectorAll('.event-card-item:not(.hidden)').length;
      const countBadge = section.querySelector('.slot-count-badge');

      if (countBadge) {
        countBadge.textContent = visibleInSlot > 0
          ? `${visibleInSlot} ${visibleInSlot === 1 ? 'evento' : 'eventi'}`
          : 'Nessun evento con i filtri attivi';
      }

      // If all filters are default ('all') and slot originally had 0 events, keep empty indicator
      if (visibleInSlot === 0 && (s.activePriceFilter !== 'all' || s.activeCategoryFilter !== 'all' || s.activeSourceFilter !== 'all' || query !== '')) {
        section.classList.add('hidden');
      } else {
        section.classList.remove('hidden');
      }
    });

    // Update global counter
    const counterEl = document.getElementById('active-events-counter');
    if (counterEl) {
      counterEl.textContent = `${totalVisible} EVENTI ATTIVI`;
    }

    // Toggle empty state
    const emptyStateEl = document.getElementById('empty-state');
    if (emptyStateEl) {
      if (totalVisible === 0) {
        emptyStateEl.classList.remove('hidden');
      } else {
        emptyStateEl.classList.add('hidden');
      }
    }

    // Bind Continuous Drawer toggle button if present
    const continuousToggle = document.getElementById('toggle-continuous-drawer-btn');
    if (continuousToggle) {
      continuousToggle.onclick = () => {
        this.expandedExhibitions = !this.expandedExhibitions;
        const list = document.getElementById('continuous-cards-list');
        if (list) list.classList.toggle('hidden');
        continuousToggle.querySelector('span').textContent = this.expandedExhibitions ? 'Comprimi ▲' : 'Espandi ▼';
      };
    }
  }

  /**
   * Surgical drawer expansion toggle
   */
  updateCardExpandStates() {
    const s = this.store.getState();
    const allCards = this.container.querySelectorAll('.event-card-item');

    allCards.forEach(card => {
      const id = card.getAttribute('data-event-id');
      const isExp = s.expandedEventIds.has(id);
      const drawer = card.querySelector(`#drawer-${id}`);
      const arrowSvg = card.querySelector('[data-toggle-card] svg');

      if (drawer) {
        if (isExp) drawer.classList.remove('hidden');
        else drawer.classList.add('hidden');
      }
      if (arrowSvg) {
        if (isExp) arrowSvg.classList.add('rotate-180');
        else arrowSvg.classList.remove('rotate-180');
      }
    });
  }

  getRomeParts(dateObj) {
    const formatter = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(dateObj);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const hourNum = parseInt(map.hour, 10) % 24;
    return {
      hourNum,
      weekday: (map.weekday || '').toUpperCase(),
      day: map.day
    };
  }
}

export default Timeline;
