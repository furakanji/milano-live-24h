/**
 * EventCard Pure Template Component (`src/components/EventCard.js`)
 */

export const CATEGORY_META = {
  politica: {
    id: 'politica',
    label: '✊ Politica, Attivismo & Sociale',
    shortLabel: 'Politica & Sociale',
    emoji: '✊',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30'
  },
  concerti: {
    id: 'concerti',
    label: '🎵 Concerti & Club',
    shortLabel: 'Concerti & Club',
    emoji: '🎵',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  cinema: {
    id: 'cinema',
    label: '🎬 Cinema & Rassegne',
    shortLabel: 'Cinema & Rassegne',
    emoji: '🎬',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
  },
  teatro: {
    id: 'teatro',
    label: '🎭 Teatro',
    shortLabel: 'Teatro',
    emoji: '🎭',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  },
  libri: {
    id: 'libri',
    label: '📚 Libri, Talk & Conferenze',
    shortLabel: 'Libri & Talk',
    emoji: '📚',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  mostre: {
    id: 'mostre',
    label: '🖼️ Mostre & Musei',
    shortLabel: 'Mostre & Musei',
    emoji: '🖼️',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
  },
  aperture: {
    id: 'aperture',
    label: '🏛️ Aperture Speciali & Luoghi Segreti',
    shortLabel: 'Aperture Speciali',
    emoji: '🏛️',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  }
};

export function renderSourceBadgeHtml(ev) {
  const badge = ev.sourceBadge || ev.source || '';
  const s = badge.toLowerCase();
  const sUrl = (ev.sourceUrl || '').toLowerCase();
  const sId = (ev.id || '').toLowerCase();

  if (s.includes('+')) {
    // Cross-verified dual badge
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-orange-500/25 text-orange-200 border border-orange-500/50 uppercase mono-num">⚡ ${badge}</span>`;
  }
  if (s.includes('zero') || sId.startsWith('zero-') || sUrl.includes('zero.eu')) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase mono-num">🟢 ZERO</span>`;
  }
  if (s.includes('milanotoday') || sId.startsWith('milanotoday-') || sUrl.includes('milanotoday.it')) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase mono-num">🔵 MILANOTODAY</span>`;
  }
  if (s.includes('yesmilano') || sId.startsWith('yesmilano-') || sUrl.includes('yesmilano.it')) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase mono-num">🔴 YESMILANO</span>`;
  }
  if (s.includes('mentelocale') || sId.startsWith('mentelocale-') || sUrl.includes('mentelocale.it')) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase mono-num">🟣 MENTELOCALE</span>`;
  }
  if (s.includes('dice') || sId.startsWith('dice-') || sUrl.includes('dice.fm')) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase mono-num">⚡ DICE LIVE</span>`;
  }
  return '';
}

export function renderEventCard(ev, isExpanded = false) {
  const catMeta = CATEGORY_META[ev.category] || CATEGORY_META.mostre;

  let liveStatusBadgeHtml = '';
  if (ev._isHappeningNow) {
    const statusText = ev._hasAlreadyStarted
      ? `IN CORSO • Iniziato da ${Math.abs(ev._diffMinutes)} min`
      : `IN PARTENZA • Tra ${ev._diffMinutes} min`;
    liveStatusBadgeHtml = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide bg-orange-500 text-black uppercase mono-num shadow-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-black live-dot"></span>
        ${statusText}
      </span>
    `;
  }

  const soldOutBadgeHtml = ev.isSoldOut
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold tracking-wider bg-red-500/20 text-red-300 border border-red-500/50 uppercase mono-num">
         🔴 SOLD OUT • POSTI ESAURITI
       </span>`
    : '';

  const priceBadgeHtml = ev.isFree
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase mono-num">
         GRATIS
       </span>`
    : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 mono-num">
         €€ / Biglietto • ${ev.priceDetails}
       </span>`;

  const searchableText = `${ev.title} ${ev.venueName} ${ev.neighborhood} ${ev.address} ${ev.description} ${ev.sourceName}`.toLowerCase();

  return `
    <article
      id="card-${ev.id}"
      data-event-id="${ev.id}"
      data-category="${ev.category}"
      data-is-free="${ev.isFree ? 'true' : 'false'}"
      data-is-sold-out="${ev.isSoldOut ? 'true' : 'false'}"
      data-source="${ev.source || ''}"
      data-searchable-text="${searchableText.replace(/"/g, '&quot;')}"
      class="event-card-item ${ev._isHappeningNow ? 'editorial-card-live' : 'editorial-card'} rounded-xl p-4 sm:p-5 transition"
    >
      <!-- Top Row: Time + Status Badge + Sold Out / Pricing Badge -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0b0c0e] border border-[#272b35] text-white font-bold text-xs mono-num">
            <svg class="w-3.5 h-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${ev._startHM || '18:00'} – ${ev._endHM || '20:00'}
          </span>
          ${liveStatusBadgeHtml}
          ${soldOutBadgeHtml}
        </div>
        <div class="flex items-center gap-2">
          ${priceBadgeHtml}
        </div>
      </div>

      <!-- Title & Category Badge -->
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1.5 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${catMeta.badgeClass}">
              ${catMeta.emoji} ${catMeta.shortLabel}
            </span>
            ${renderSourceBadgeHtml(ev)}
            <span class="text-xs text-zinc-400 mono-num">• Fonte: ${ev.sourceName || ev.source || 'Redazione'}</span>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-white leading-snug">
            <button
              type="button"
              data-toggle-card="${ev.id}"
              class="text-left hover:text-orange-400 transition cursor-pointer"
            >
              ${ev.title}
            </button>
          </h3>
        </div>

        <button
          type="button"
          data-toggle-card="${ev.id}"
          class="shrink-0 w-8 h-8 rounded-lg bg-[#0b0c0e] hover:bg-zinc-800 border border-[#23272f] flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          aria-label="Espandi dettagli evento"
          title="Mostra o nascondi dettagli"
        >
          <svg class="w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      <!-- Venue Name & Neighborhood -->
      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
        <span class="font-semibold text-white flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-orange-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${ev.venueName}
        </span>
        <span class="text-zinc-400">${ev.address} (${ev.neighborhood || 'Milano'})</span>
      </div>

      <!-- Description -->
      <p class="mt-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
        ${ev.description}
      </p>

      <!-- Expandable Details Drawer -->
      <div id="drawer-${ev.id}" class="${isExpanded ? 'block' : 'hidden'} mt-3.5 pt-3 border-t border-[#23272f] text-xs text-zinc-400 space-y-2">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0b0c0e] p-3 rounded-lg border border-[#1f232b]">
          <div>
            <div class="text-zinc-500 uppercase font-semibold">Modalità d'ingresso &amp; Stato</div>
            <div class="text-zinc-200 font-medium mt-0.5">${ev.priceDetails} • <span class="${ev.isSoldOut ? 'text-red-300 font-bold' : 'text-emerald-300 font-semibold'}">${ev.availabilityBadge || 'Disponibile'}</span></div>
          </div>
          <div>
            <div class="text-zinc-500 uppercase font-semibold">Indirizzo Verificato</div>
            <div class="text-zinc-200 font-medium mt-0.5">${ev.address}</div>
          </div>
          <div>
            <div class="text-zinc-500 uppercase font-semibold">Fascia Oraria (Europe/Rome)</div>
            <div class="text-zinc-200 font-medium mono-num mt-0.5">${ev._weekday || ''} ${ev._dayMonth || ''} • ${ev._startHM || ''} → ${ev._endHM || ''}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons: Google Maps + Official Source (+ Instagram / Facebook ONLY if present) -->
      <div class="mt-4 pt-3 border-t border-[#1e222a] flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <a
            href="${ev.mapsUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-bold text-xs transition"
          >
            <svg class="w-3.5 h-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            Indicazioni Maps
          </a>

          <a
            href="${ev.sourceUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181a20] hover:bg-zinc-800 text-zinc-200 border border-[#2b303c] text-xs font-semibold transition"
          >
            <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Fonte Ufficiale
          </a>

          <!-- Social Share & Permalink Button -->
          <button
            type="button"
            data-share-event="${ev.id}"
            data-event-title="${ev.title.replace(/"/g, '&quot;')}"
            data-event-venue="${(ev.venueName || '').replace(/"/g, '&quot;')}"
            data-event-time="${ev._startHM || ''}"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-xs font-bold transition cursor-pointer"
            title="Condividi evento o copia permalink"
          >
            <svg class="w-3.5 h-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Condividi</span>
          </button>
        </div>

        <div class="flex items-center gap-1.5">
          ${ev.instagramUrl ? `
            <a
              href="${ev.instagramUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-8 h-8 rounded-lg bg-[#181a20] hover:bg-zinc-800 border border-[#282d38] flex items-center justify-center text-zinc-400 hover:text-pink-400 transition"
              title="Profilo Instagram del luogo"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          ` : ''}
        </div>
      </div>
    </article>
  `;
}

export default {
  CATEGORY_META,
  renderSourceBadgeHtml,
  renderEventCard
};
