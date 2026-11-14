/**
 * User Identity & Seen Events Service (`src/services/seenEventsService.js`)
 * 
 * Provides:
 * 1. Cryptographic hashing of telephone number (SHA-256 via Web Crypto API with custom salt)
 * 2. Registration & Persistence of Phone Hash in Encrypted Cloud DB (Firestore /seen_users/{phoneHash})
 *    with local device fallback (localStorage)
 * 3. Marking events as "Già Visto" (Seen) and excluding them permanently for the user
 * 4. User modal for phone verification/input
 */

const LOCAL_STORAGE_USER_KEY = 'milano_live_seen_user_session_v1';
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/milano-live-24h/databases/(default)/documents';
const API_KEY = 'AIzaSyA8JiCzYKZ3MVaJpZ0Mie-xSNIHiKobbDA';
const PEPPER_SALT = 'milano_live_24h_salt_pepper_v1_';

/**
 * Normalizes phone numbers (removes spaces, dashes, parentheses, ensures format)
 * e.g. "+39 340 123 4567" -> "+393401234567" or "3401234567" -> "+393401234567"
 */
export function normalizePhoneNumber(raw = '') {
  if (!raw) return '';
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '+39' + cleaned;
    }
  }
  return cleaned;
}

/**
 * Validates Italian/international phone numbers (at least 9 digits)
 */
export function isValidPhoneNumber(phone = '') {
  const normalized = normalizePhoneNumber(phone);
  return /^\+?[0-9]{9,15}$/.test(normalized);
}

/**
 * Generates SHA-256 hash of telephone number + pepper salt
 * Works across both modern browser (Web Crypto API) and Node.js
 */
export async function hashPhoneNumber(phone = '') {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return '';
  const message = `${PEPPER_SALT}${normalized}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback hash for environments without crypto.subtle (e.g. older testing envs)
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export class SeenEventsService {
  constructor() {
    this.currentUser = this.loadLocalSession();
    this.seenEventIds = new Set(this.currentUser?.seenEventIds || []);
  }

  loadLocalSession() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore localStorage parse errors
    }
    return null;
  }

  saveLocalSession(data) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data));
    } catch {
      // Ignore localStorage quota errors
    }
  }

  isAuthenticated() {
    return Boolean(this.currentUser && this.currentUser.phoneHash);
  }

  getMaskedPhone() {
    if (!this.currentUser?.phone) return '';
    const p = this.currentUser.phone;
    if (p.length < 6) return '***';
    return `${p.slice(0, 3)}••••${p.slice(-3)}`;
  }

  getSeenEventIds() {
    return this.seenEventIds;
  }

  isEventSeen(eventId) {
    return this.seenEventIds.has(eventId);
  }

  /**
   * Registers or syncs phone number with Encrypted Cloud DB (Firestore /seen_users/{phoneHash})
   */
  async registerUser(rawPhone) {
    const normalized = normalizePhoneNumber(rawPhone);
    if (!isValidPhoneNumber(normalized)) {
      throw new Error('Numero di telefono non valido. Inserisci un numero cellulare corretto (es. 340 123 4567).');
    }

    const phoneHash = await hashPhoneNumber(normalized);
    const nowIso = new Date().toISOString();

    let existingSeen = [];

    // 1. Fetch existing seen events for this phone hash from Firestore (if cloud reachable)
    try {
      const fetchUrl = `${FIRESTORE_BASE_URL}/seen_users/${phoneHash}?key=${API_KEY}`;
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const doc = await res.json();
        const arrayVals = doc.fields?.seenEventIds?.arrayValue?.values || [];
        existingSeen = arrayVals.map(v => v.stringValue).filter(Boolean);
      }
    } catch (err) {
      console.warn('[SeenEventsService] Firestore fetch error (falling back to local):', err.message);
    }

    // Combine with current memory/local events
    const combinedSet = new Set([...existingSeen, ...this.seenEventIds]);
    this.seenEventIds = combinedSet;

    this.currentUser = {
      phone: normalized,
      phoneHash,
      registeredAt: nowIso,
      seenEventIds: Array.from(combinedSet)
    };
    this.saveLocalSession(this.currentUser);

    // 2. Persist to Firestore Encrypted Users collection
    await this.syncToCloud(phoneHash, Array.from(combinedSet), nowIso);

    return this.currentUser;
  }

  /**
   * Marks an event as seen and permanently excludes it
   */
  async markEventAsSeen(eventId) {
    if (!eventId) return;

    this.seenEventIds.add(eventId);

    if (this.currentUser) {
      this.currentUser.seenEventIds = Array.from(this.seenEventIds);
      this.saveLocalSession(this.currentUser);

      // Async push update to Firestore
      this.syncToCloud(this.currentUser.phoneHash, this.currentUser.seenEventIds, new Date().toISOString())
        .catch(err => console.warn('[SeenEventsService] Sync to cloud error:', err));
    }
  }

  /**
   * Unmarks an event (if user wants to restore/reset seen events)
   */
  async unmarkEvent(eventId) {
    if (!eventId) return;
    this.seenEventIds.delete(eventId);
    if (this.currentUser) {
      this.currentUser.seenEventIds = Array.from(this.seenEventIds);
      this.saveLocalSession(this.currentUser);
      await this.syncToCloud(this.currentUser.phoneHash, this.currentUser.seenEventIds, new Date().toISOString());
    }
  }

  /**
   * Resets seen events history for the user
   */
  async clearAllSeenEvents() {
    this.seenEventIds.clear();
    if (this.currentUser) {
      this.currentUser.seenEventIds = [];
      this.saveLocalSession(this.currentUser);
      await this.syncToCloud(this.currentUser.phoneHash, [], new Date().toISOString());
    }
  }

  /**
   * Push encrypted record to Firestore REST
   */
  async syncToCloud(phoneHash, seenIdsList, lastActiveIso) {
    if (!phoneHash) return;

    try {
      const url = `${FIRESTORE_BASE_URL}/seen_users/${phoneHash}?key=${API_KEY}`;
      const payload = {
        fields: {
          phoneHash: { stringValue: phoneHash },
          lastActiveAt: { stringValue: lastActiveIso },
          totalSeenCount: { integerValue: String(seenIdsList.length) },
          seenEventIds: {
            arrayValue: {
              values: seenIdsList.map(id => ({ stringValue: id }))
            }
          }
        }
      };

      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });
    } catch (err) {
      console.warn('[SeenEventsService] Error writing to Firestore:', err.message);
    }
  }

  logout() {
    this.currentUser = null;
    this.seenEventIds.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }
}

export const seenEventsService = new SeenEventsService();
export default seenEventsService;
