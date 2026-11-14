/**
 * User Phone Modal for Seen Events Verification (`src/features/seenUserModal.js`)
 * 
 * Invoked when a user clicks the "Già Visto / Elimina" button on an event card.
 * If user has not yet entered their mobile phone:
 * 1. Opens an elegant modal explaining that the phone is used only to create an encrypted hash
 *    (zero cleartext phone stored, privacy-first SHA-256) to remember dismissed events across devices.
 * 2. On submit, validates format and encrypts/syncs to cloud Firestore.
 * 3. Immediately dismisses the target event from the timeline.
 */

import { seenEventsService } from '../services/seenEventsService.js';

let modalElement = null;

export function openPhonePromptModal({ onAuthenticated, targetEventTitle = '' }) {
  if (seenEventsService.isAuthenticated()) {
    if (onAuthenticated) onAuthenticated();
    return;
  }

  // Remove existing modal if any
  document.getElementById('seen-user-auth-modal')?.remove();

  const modalHtml = `
    <div id="seen-user-auth-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="relative w-full max-w-md bg-[#131519] border border-[#2b303d] rounded-2xl shadow-2xl overflow-hidden p-6 text-zinc-200">
        <!-- Close Button -->
        <button
          type="button"
          id="btn-close-seen-modal"
          class="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          aria-label="Chiudi"
        >
          ✕
        </button>

        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-lg border border-orange-500/30">
            👁️
          </div>
          <div>
            <h3 class="text-base font-bold text-white leading-tight">Nascondi Eventi Già Visti</h3>
            <p class="text-xs text-zinc-400 mt-0.5">Sincronizzazione personale senza password</p>
          </div>
        </div>

        <!-- Description -->
        <div class="text-xs text-zinc-300 space-y-2 mb-5 leading-relaxed bg-[#0c0e12] p-3.5 rounded-xl border border-[#20242e]">
          ${targetEventTitle ? `
            <div class="text-zinc-200 font-semibold mb-1 truncate text-xs">
              Stai per eliminare: <span class="text-white font-bold">"${targetEventTitle}"</span>
            </div>
          ` : ''}
          <p>
            Per rimuovere gli eventi che hai già visto ed evitare di rivederli nelle prossime visite, inserisci il tuo <strong class="text-white">numero di cellulare</strong>.
          </p>
          <div class="flex items-start gap-2 pt-1 text-[11px] text-emerald-400 font-medium">
            <span class="mt-0.5">🔒</span>
            <span>
              <strong class="text-emerald-300">Privacy &amp; DB Criptato:</strong> Il numero viene trasformato in una chiave crittografica (SHA-256) prima del salvataggio nel database. Non riceverai spam né chiamate.
            </span>
          </div>
        </div>

        <!-- Form -->
        <form id="form-seen-auth" class="space-y-4">
          <div>
            <label for="input-user-phone" class="block text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1.5">
              Numero di Cellulare
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">📱</span>
              <input
                id="input-user-phone"
                type="tel"
                placeholder="es. 340 123 4567"
                required
                autocomplete="tel"
                class="w-full pl-9 pr-3 py-2.5 bg-[#0b0c0e] border border-[#272b35] focus:border-orange-500 rounded-xl text-sm text-white placeholder-zinc-500 outline-none transition font-medium mono-num"
              />
            </div>
            <div id="seen-auth-error-msg" class="hidden text-xs text-rose-400 mt-1.5 font-medium"></div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-seen-modal"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-[#181a20] hover:bg-zinc-800 text-zinc-300 border border-[#2a2f3b] transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              id="btn-submit-seen-auth"
              class="px-5 py-2 rounded-xl text-xs font-extrabold bg-orange-500 hover:bg-orange-400 text-black transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
            >
              <span>Conferma &amp; Elimina</span>
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  modalElement = document.getElementById('seen-user-auth-modal');

  const close = () => {
    modalElement?.remove();
    modalElement = null;
  };

  document.getElementById('btn-close-seen-modal')?.addEventListener('click', close);
  document.getElementById('btn-cancel-seen-modal')?.addEventListener('click', close);

  modalElement?.addEventListener('click', (e) => {
    if (e.target === modalElement) close();
  });

  const form = document.getElementById('form-seen-auth');
  const inputPhone = document.getElementById('input-user-phone');
  const errorMsg = document.getElementById('seen-auth-error-msg');
  const submitBtn = document.getElementById('btn-submit-seen-auth');

  inputPhone?.focus();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneVal = inputPhone?.value?.trim();
    if (!phoneVal) return;

    if (errorMsg) errorMsg.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Criptazione &amp; Salvataggio...</span>';
    }

    try {
      await seenEventsService.registerUser(phoneVal);
      close();
      if (onAuthenticated) onAuthenticated();
    } catch (err) {
      if (errorMsg) {
        errorMsg.textContent = err.message || 'Errore durante la registrazione. Riprova.';
        errorMsg.classList.remove('hidden');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Conferma &amp; Elimina</span><span>→</span>';
      }
    }
  });
}

export default { openPhonePromptModal };
