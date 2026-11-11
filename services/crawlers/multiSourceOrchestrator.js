/**
 * Multi-Source Orchestrator & Smart Deduplicator (`services/crawlers/multiSourceOrchestrator.js`)
 *
 * Runs all active Milan crawlers concurrently (Promise.allSettled):
 * - Zero Milano
 * - MilanoToday
 * - YesMilano
 * - Mentelocale
 *
 * Applies fuzzy deduplication (title + venue + hour), 30-min cache, and returns aggregated events.
 */

import { crawlZeroMilano } from './zeroCrawler.js';
import { crawlMilanoToday } from './milanoTodayCrawler.js';
import { crawlYesMilano } from './yesMilanoCrawler.js';
import { crawlMentelocale } from './mentelocaleCrawler.js';

export const CRAWLER_MODULES = [
  { id: 'zero', name: 'Zero Milano', badge: 'ZERO', run: crawlZeroMilano },
  { id: 'milanotoday', name: 'MilanoToday', badge: 'MILANOTODAY', run: crawlMilanoToday },
  { id: 'yesmilano', name: 'YesMilano', badge: 'YESMILANO', run: crawlYesMilano },
  { id: 'mentelocale', name: 'Mentelocale', badge: 'MENTELOCALE', run: crawlMentelocale }
];

const LOCAL_STORAGE_CACHE_KEY = 'milano_live_multi_crawler_events_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

/**
 * Fuzzy key for smart cross-portal deduplication:
 * normalized(title) + normalized(venue) + hour
 */
export function buildFuzzyDeduplicationKey(event) {
  const normTitle = (event.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 24);

  const normVenue = (event.venueName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 16);

  let hourSlot = '00';
  if (event.startTime) {
    const d = new Date(event.startTime);
    if (!isNaN(d.getTime())) {
      hourSlot = String(d.getUTCHours()).padStart(2, '0');
    }
  }

  return `${normTitle}_${normVenue}_${hourSlot}`;
}

/**
 * Runs all 4 crawlers in parallel, applies smart deduplication, and returns merged list
 */
export async function runMultiSourceCrawlers({
  nowMs = Date.now(),
  forceRefresh = false,
  fetcher = undefined
} = {}) {
  // Check client-side localStorage cache if available
  if (!forceRefresh && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && (nowMs - cached.timestampMs) < CACHE_TTL_MS && Array.isArray(cached.events)) {
          return {
            events: cached.events,
            stats: cached.stats || {},
            fromCache: true,
            fetchedAt: new Date(cached.timestampMs).toISOString()
          };
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  const stats = {
    zero: { count: 0, status: 'pending' },
    milanotoday: { count: 0, status: 'pending' },
    yesmilano: { count: 0, status: 'pending' },
    mentelocale: { count: 0, status: 'pending' }
  };

  const results = await Promise.allSettled(
    CRAWLER_MODULES.map(m => m.run({ nowMs, fetcher }))
  );

  const allRawEvents = [];

  results.forEach((res, idx) => {
    const mod = CRAWLER_MODULES[idx];
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      stats[mod.id] = { count: res.value.length, status: 'ok' };
      allRawEvents.push(...res.value);
    } else {
      stats[mod.id] = {
        count: 0,
        status: 'error',
        error: res.reason?.message || 'Crawl failed'
      };
    }
  });

  // Smart deduplication across sources
  const deduplicated = [];
  const seenFuzzyKeys = new Set();
  const seenExactIds = new Set();

  for (const ev of allRawEvents) {
    if (!ev || !ev.title) continue;
    if (seenExactIds.has(ev.id)) continue;

    const fuzzyKey = buildFuzzyDeduplicationKey(ev);
    if (seenFuzzyKeys.has(fuzzyKey)) continue;

    seenExactIds.add(ev.id);
    seenFuzzyKeys.add(fuzzyKey);
    deduplicated.push(ev);
  }

  // Sort chronologically
  deduplicated.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  // Save to localStorage if in browser
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify({
        timestampMs: nowMs,
        events: deduplicated,
        stats
      }));
    } catch {
      // Ignore quota exceed
    }
  }

  return {
    events: deduplicated,
    stats,
    fromCache: false,
    fetchedAt: new Date(nowMs).toISOString()
  };
}

export default {
  CRAWLER_MODULES,
  runMultiSourceCrawlers,
  buildFuzzyDeduplicationKey
};
