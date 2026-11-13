/**
 * Event Sharing & Social Permalink Helper (`src/features/shareModal.js`)
 * Generates permalink URLs (e.g. https://.../?event=evt-id or #evt-id),
 * supports native Web Share API (mobile/desktop), clipboard copy, and direct
 * sharing to WhatsApp, Telegram, X (Twitter), Facebook, and LinkedIn.
 */

export function buildEventPermalink(eventId) {
  const url = new URL(window.location.href);
  url.hash = `event-${eventId}`;
  url.searchParams.set('event', eventId);
  return url.toString();
}

/**
 * Creates and renders the share modal popup
 */
export function openShareModal({ eventId, title = 'Evento a Milano', venue = 'Milano', time = '' }) {
  // Remove existing modal if any
  document.getElementById('milano-share-modal')?.remove();

  const permalink = buildEventPermalink(eventId);
  const shareText = `Scopri "${title}" ${venue ? `presso ${venue}` : ''} su Milano Live 24h!`;

  const modalHtml = `
    <div id="milano-share-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div class="w-full max-w-md rounded-2xl bg-[#111318] border border-[#23272f] shadow-2xl p-5 space-y-4 text-white">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 border-b border-[#1f232b] pb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </span>
            <div>
              <h3 class="text-sm font-bold text-white leading-tight">Condividi Evento</h3>
              <p class="text-xs text-zinc-400">Milano Live 24h Permalink</p>
            </div>
          </div>
          <button id="close-share-modal-btn" type="button" class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Event Preview Summary -->
        <div class="p-3 rounded-xl bg-[#0b0c0e] border border-[#1f232b] space-y-1">
          <div class="text-xs font-bold text-orange-400 leading-snug">${title}</div>
          <div class="text-[11px] text-zinc-400">📍 ${venue} ${time ? `• Ore ${time}` : ''}</div>
        </div>

        <!-- Copy Permalink Input -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Permalink Ufficiale</label>
          <div class="flex items-center gap-2">
            <input
              id="share-permalink-input"
              type="text"
              readonly
              value="${permalink}"
              class="w-full px-3 py-2 text-xs bg-[#090a0d] border border-[#272b35] rounded-lg text-zinc-200 mono-num focus:outline-none select-all"
            />
            <button
              id="copy-permalink-btn"
              type="button"
              class="shrink-0 px-3 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span id="copy-btn-text">Copia</span>
            </button>
          </div>
        </div>

        <!-- Social Share Channels Grid -->
        <div class="space-y-1.5 pt-1">
          <label class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Condividi sui Social</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <!-- WhatsApp -->
            <a
              href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + permalink)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#141720] hover:bg-[#1a1f2c] border border-[#23272f] hover:border-emerald-500/50 transition group"
            >
              <span class="text-lg">💬</span>
              <span class="text-xs font-semibold text-zinc-300 group-hover:text-emerald-400 mt-1">WhatsApp</span>
            </a>

            <!-- Telegram -->
            <a
              href="https://t.me/share/url?url=${encodeURIComponent(permalink)}&text=${encodeURIComponent(shareText)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#141720] hover:bg-[#1a1f2c] border border-[#23272f] hover:border-sky-500/50 transition group"
            >
              <span class="text-lg">✈️</span>
              <span class="text-xs font-semibold text-zinc-300 group-hover:text-sky-400 mt-1">Telegram</span>
            </a>

            <!-- X / Twitter -->
            <a
              href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(permalink)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#141720] hover:bg-[#1a1f2c] border border-[#23272f] hover:border-zinc-400 transition group"
            >
              <span class="text-lg">𝕏</span>
              <span class="text-xs font-semibold text-zinc-300 group-hover:text-white mt-1">X</span>
            </a>

            <!-- Native Web Share (if available) / Facebook -->
            <button
              id="native-web-share-btn"
              type="button"
              class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#141720] hover:bg-[#1a1f2c] border border-[#23272f] hover:border-orange-500/50 transition group cursor-pointer"
            >
              <span class="text-lg">📲</span>
              <span class="text-xs font-semibold text-zinc-300 group-hover:text-orange-400 mt-1">Altro...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('milano-share-modal');
  const closeBtn = document.getElementById('close-share-modal-btn');
  const copyBtn = document.getElementById('copy-permalink-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const nativeBtn = document.getElementById('native-web-share-btn');

  const closeModal = () => modal?.remove();

  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Copy Permalink Action
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(permalink);
      if (copyBtnText) copyBtnText.textContent = 'Copiato!';
      copyBtn.classList.replace('bg-orange-500', 'bg-emerald-500');
      setTimeout(() => {
        if (copyBtnText) copyBtnText.textContent = 'Copia';
        copyBtn.classList.replace('bg-emerald-500', 'bg-orange-500');
      }, 2000);
    } catch {
      // Fallback: select input text
      const input = document.getElementById('share-permalink-input');
      input?.select();
    }
  });

  // Native Web Share
  nativeBtn?.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: permalink
        });
        closeModal();
      } catch {
        // User cancelled or not supported
      }
    } else {
      // Fallback: Facebook share dialog
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(permalink)}`, '_blank', 'width=600,height=400');
    }
  });
}
