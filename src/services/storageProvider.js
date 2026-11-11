/**
 * Unified Cloud / Local Storage Layer (`src/services/storageProvider.js`)
 * Implements Zero-Downtime Provider Pattern:
 * Primary: Firebase Firestore REST API (if VITE_FIREBASE_PROJECT_ID is set)
 * Secondary / Offline Fallback: public/live-events.json + localStorage
 */

const STORAGE_KEYS = {
  SNAPSHOT: 'milano_live_snapshot_v2',
  CUSTOM_DOMAINS: 'milano_live_custom_search_domains_v1',
  QUARANTINE: 'milano_live_quarantine_queue_v1',
  SCHEDULED_EVENTS: 'milano_live_scheduled_events_v2',
  HEALTH_LOG: 'milano_live_crawler_health_log_v2'
};

export class StorageProvider {
  constructor() {
    this.projectId = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_FIREBASE_PROJECT_ID || '')
      : (typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID : '');

    this.apiKey = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_FIREBASE_API_KEY || '')
      : (typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_API_KEY : '');

    this.firestoreBaseUrl = this.projectId
      ? `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`
      : '';
  }

  isCloudConfigured() {
    return Boolean(this.projectId);
  }

  /**
   * Helper to convert Firestore REST document to normal JS object
   */
  _fromFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const result = {};
    for (const [key, val] of Object.entries(doc.fields)) {
      if (val.stringValue !== undefined) result[key] = val.stringValue;
      else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
      else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
      else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
      else if (val.mapValue !== undefined) result[key] = this._fromFirestoreDoc(val.mapValue);
      else if (val.arrayValue !== undefined) {
        result[key] = (val.arrayValue.values || []).map(v => {
          if (v.stringValue !== undefined) return v.stringValue;
          if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
          if (v.booleanValue !== undefined) return v.booleanValue;
          if (v.mapValue !== undefined) return this._fromFirestoreDoc(v.mapValue);
          return v;
        });
      }
    }
    return result;
  }

  /**
   * Helper to convert normal JS object into Firestore REST format
   */
  _toFirestoreFields(obj) {
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'string') {
        fields[key] = { stringValue: val };
      } else if (typeof val === 'number') {
        if (Number.isInteger(val)) {
          fields[key] = { integerValue: String(val) };
        } else {
          fields[key] = { doubleValue: val };
        }
      } else if (typeof val === 'boolean') {
        fields[key] = { booleanValue: val };
      } else if (Array.isArray(val)) {
        fields[key] = {
          arrayValue: {
            values: val.map(item => {
              if (typeof item === 'string') return { stringValue: item };
              if (typeof item === 'number') return { integerValue: String(item) };
              if (typeof item === 'boolean') return { booleanValue: item };
              if (typeof item === 'object') return { mapValue: { fields: this._toFirestoreFields(item) } };
              return { stringValue: String(item) };
            })
          }
        };
      } else if (typeof val === 'object') {
        fields[key] = { mapValue: { fields: this._toFirestoreFields(val) } };
      }
    }
    return fields;
  }

  /**
   * Reads the latest 24h feed snapshot.
   * Order of precedence:
   * 1. Firestore REST snapshot doc (`snapshots/live_24h`)
   * 2. Local public JSON (`live-events.json` or `public/live-events.json`)
   * 3. LocalStorage snapshot cache
   */
  async fetchLiveSnapshot() {
    // 1. Try Firebase Cloud first if configured
    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/snapshots/live_24h${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const json = await res.json();
          const docData = this._fromFirestoreDoc(json);
          if (docData && Array.isArray(docData.events)) {
            return {
              events: docData.events,
              stats: docData.stats || {},
              source: 'firestore',
              fetchedAt: docData.generatedAt || new Date().toISOString()
            };
          }
        }
      } catch (err) {
        console.warn('[storageProvider] Firestore fetch failed, falling back to static:', err.message);
      }
    }

    // 2. Fallback to public/live-events.json
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
        const events = (data && (data.events || data.verifiedEvents)) || [];
        if (Array.isArray(events) && events.length > 0) {
          return {
            events,
            stats: data.stats || {},
            source: 'static-json',
            fetchedAt: data.generatedAt || new Date().toISOString()
          };
        }
      } catch {
        // try next candidate
      }
    }

    // 3. Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SNAPSHOT);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && Array.isArray(cached.events)) {
            return {
              ...cached,
              source: 'localStorage'
            };
          }
        }
      } catch {
        // Ignore
      }
    }

    return {
      events: [],
      stats: {},
      source: 'none',
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Publishes the live 24h snapshot to cloud & local storage
   */
  async publishLiveSnapshot(payload) {
    // 1. Update localStorage cache if in browser
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.SNAPSHOT, JSON.stringify(payload));
      } catch {
        // Quota exceed or blocked
      }
    }

    // 2. Push to Firestore if configured
    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/snapshots/live_24h${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        const firestoreFields = this._toFirestoreFields({
          generatedAt: payload.generatedAt || new Date().toISOString(),
          stats: payload.stats || {},
          events: payload.events || []
        });

        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: firestoreFields }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          return { success: true, destination: 'firestore' };
        }
      } catch (err) {
        console.warn('[storageProvider] Publish to Firestore failed:', err.message);
      }
    }

    return { success: true, destination: 'local' };
  }

  /**
   * Scheduled events (Queue for events discovered via OCR that start > 24h in future)
   */
  async fetchScheduledEvents() {
    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/scheduled_events${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.documents)) {
            return json.documents.map(doc => {
              const data = this._fromFirestoreDoc(doc);
              const id = doc.name.split('/').pop();
              return { ...data, id };
            });
          }
        }
      } catch (err) {
        console.warn('[storageProvider] fetchScheduledEvents cloud fallback:', err.message);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULED_EVENTS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [];
  }

  async saveScheduledEvent(event) {
    if (!event || !event.id) return false;

    // Local save
    if (typeof localStorage !== 'undefined') {
      try {
        const existing = await this.fetchScheduledEvents();
        const filtered = existing.filter(e => e.id !== event.id);
        filtered.unshift(event);
        localStorage.setItem(STORAGE_KEYS.SCHEDULED_EVENTS, JSON.stringify(filtered));
      } catch { /* ignore */ }
    }

    // Cloud save
    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/scheduled_events/${encodeURIComponent(event.id)}${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        const firestoreFields = this._toFirestoreFields(event);
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: firestoreFields }),
          signal: AbortSignal.timeout(4000)
        });
      } catch (err) {
        console.warn('[storageProvider] saveScheduledEvent cloud failed:', err.message);
      }
    }
    return true;
  }

  async removeScheduledEvent(eventId) {
    if (typeof localStorage !== 'undefined') {
      try {
        const existing = await this.fetchScheduledEvents();
        const filtered = existing.filter(e => e.id !== eventId);
        localStorage.setItem(STORAGE_KEYS.SCHEDULED_EVENTS, JSON.stringify(filtered));
      } catch { /* ignore */ }
    }

    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/scheduled_events/${encodeURIComponent(eventId)}${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        await fetch(url, { method: 'DELETE', signal: AbortSignal.timeout(3000) });
      } catch { /* ignore */ }
    }
  }

  /**
   * Health Log / Crawler Telemetry persistence
   */
  async fetchHealthLog() {
    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/telemetry/crawlers_health${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const json = await res.json();
          return this._fromFirestoreDoc(json);
        }
      } catch { /* ignore */ }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.HEALTH_LOG);
        if (raw) return JSON.parse(raw);
      } catch { /* ignore */ }
    }
    return null;
  }

  async saveHealthLog(healthData) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.HEALTH_LOG, JSON.stringify(healthData));
      } catch { /* ignore */ }
    }

    if (this.isCloudConfigured()) {
      try {
        const url = `${this.firestoreBaseUrl}/telemetry/crawlers_health${this.apiKey ? `?key=${this.apiKey}` : ''}`;
        const fields = this._toFirestoreFields(healthData);
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
          signal: AbortSignal.timeout(3000)
        });
      } catch { /* ignore */ }
    }
  }
}

export const storageProvider = new StorageProvider();
export default storageProvider;
