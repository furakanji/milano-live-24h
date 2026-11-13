/**
 * Multi-Source Orchestrator & Smart Deduplicator 2.0 (`services/crawlers/multiSourceOrchestrator.js`)
 *
 * Runs all active Milan crawlers concurrently (Promise.allSettled):
 * - Zero Milano
 * - MilanoToday
 * - YesMilano
 * - Mentelocale
 *
 * Release 2 Upgrades:
 * - Telemetry & Source Health Log (`HEALTHY`, `DEGRADED`, `DOWN`, latencyMs, error)
 * - Self-Healing Retention ("Stale-While-Degraded"): retains valid previous events if scraper fails
 * - Future Scheduled Events promotion: automatically pulls queued community events into active 24h feed
 */

import { crawlZeroMilano } from './zeroCrawler.js';
import { crawlMilanoToday } from './milanoTodayCrawler.js';
import { crawlYesMilano } from './yesMilanoCrawler.js';
import { crawlMentelocale } from './mentelocaleCrawler.js';
import {
  resolveCanonicalVenue,
  tokenizeTitle,
  computeJaccardSimilarity,
  verifyEventTemporalConsistency
} from './crawlerUtils.js';

export const CRAWLER_MODULES = [
  { id: 'zero', name: 'Zero Milano', badge: 'ZERO', run: crawlZeroMilano },
  { id: 'milanotoday', name: 'MilanoToday', badge: 'MILANOTODAY', run: crawlMilanoToday },
  { id: 'yesmilano', name: 'YesMilano', badge: 'YESMILANO', run: crawlYesMilano },
  { id: 'mentelocale', name: 'Mentelocale', badge: 'MENTELOCALE', run: crawlMentelocale }
];

const LOCAL_STORAGE_CACHE_KEY = 'milano_live_multi_crawler_events_v2';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

/**
 * Check if two events are duplicates based on:
 * 1. Same canonical venue (or high venue string match)
 * 2. Start times within ±90 minutes
 * 3. Title token Jaccard similarity >= 0.60
 */
export function areEventsDuplicates(eventA, eventB) {
  if (!eventA || !eventB) return false;

  // 1. Venue Matching via Canonical resolution + Flexible Venue Name check
  const venueA = resolveCanonicalVenue(eventA.venueName || '');
  const venueB = resolveCanonicalVenue(eventB.venueName || '');

  const sameCanonical = venueA.canonicalId && venueB.canonicalId && venueA.canonicalId !== 'milano-generic'
    ? venueA.canonicalId === venueB.canonicalId
    : false;

  const rawVenA = (eventA.venueName || '').toLowerCase().replace(/['"“”’]/g, '').trim();
  const rawVenB = (eventB.venueName || '').toLowerCase().replace(/['"“”’]/g, '').trim();
  const sameVenueString = rawVenA === rawVenB;

  // Substring match between venues (e.g., 'Palazzo Morando' vs 'Palazzo Morando Costume Moda Immagine')
  let venueSubstringMatch = false;
  if (!sameCanonical && !sameVenueString && rawVenA && rawVenB) {
    const minVenLen = Math.min(rawVenA.length, rawVenB.length);
    if (minVenLen >= 8 && (rawVenA.includes(rawVenB) || rawVenB.includes(rawVenA))) {
      venueSubstringMatch = true;
    }
  }

  const venueMatches = sameCanonical || sameVenueString || venueSubstringMatch;
  if (!venueMatches) {
    return false;
  }

  // 2. Elastic Time Window Matching
  const timeA = Date.parse(eventA.startTime);
  const timeB = Date.parse(eventB.startTime);

  if (isNaN(timeA) || isNaN(timeB)) return false;

  const diffMs = Math.abs(timeA - timeB);
  const isContinuousPair = Boolean(eventA.isContinuous || eventB.isContinuous);

  // If one or both are daytime/continuous exhibitions or daytime museum events, compare the calendar day
  if (isContinuousPair) {
    const dayA = new Date(timeA).toISOString().slice(0, 10);
    const dayB = new Date(timeB).toISOString().slice(0, 10);
    if (dayA !== dayB) return false;
  } else {
    // For punctual shows (movies, theater, concerts), allow ±90 minutes (or up to 120 min for differing crawl slots)
    if (diffMs > 120 * 60 * 1000) {
      return false;
    }
  }

  // 3. Title Matching: exact, substring of core title, or Jaccard Token Similarity
  const normTitleA = (eventA.title || '').trim().toLowerCase().replace(/['"“”’«»]/g, '');
  const normTitleB = (eventB.title || '').trim().toLowerCase().replace(/['"“”’«»]/g, '');

  if (normTitleA === normTitleB) return true;

  // Clean core titles (stripping editorial subtitles, e.g. "BLITZ: La zona nuova" vs "La zona nuova, spettacolo con...")
  const coreA = normTitleA.replace(/^blitz:\s*/i, '').split(/[,:–—\-]|(\bcon\b)|\b(al teatro|allo spazio|a palazzo)\b/i)[0].trim();
  const coreB = normTitleB.replace(/^blitz:\s*/i, '').split(/[,:–—\-]|(\bcon\b)|\b(al teatro|allo spazio|a palazzo)\b/i)[0].trim();

  if (coreA && coreB && coreA === coreB && coreA.length >= 6) {
    return true;
  }
  if (coreA.length >= 10 && (coreB.includes(coreA) || coreA.includes(coreB))) {
    return true;
  }

  const tokensA = tokenizeTitle(eventA.title);
  const tokensB = tokenizeTitle(eventB.title);
  const jaccard = computeJaccardSimilarity(tokensA, tokensB);

  return jaccard >= 0.45;
}

/**
 * Smart Multi-Source Field Merging
 * Merges two duplicate events into a richer UnifiedEvent
 */
export function mergeDuplicateEvents(primary, secondary) {
  const badgeA = primary.sourceBadge || primary.source || 'EVENT';
  const badgeB = secondary.sourceBadge || secondary.source || 'EVENT';
  const combinedBadge = badgeA.includes(badgeB) ? badgeA : `${badgeA} + ${badgeB}`;

  const isSecondaryTicketingPriority =
    (secondary.source === 'DICE' && primary.source !== 'DICE') ||
    (secondary.source === 'Zero' && !['DICE', 'Zero'].includes(primary.source));

  const preferredPriceDetails = isSecondaryTicketingPriority
    ? (secondary.priceDetails || primary.priceDetails)
    : (primary.priceDetails || secondary.priceDetails);

  const preferredIsFree = primary.isFree && secondary.isFree;
  const preferredIsSoldOut = Boolean(primary.isSoldOut || secondary.isSoldOut);

  const descA = primary.description || '';
  const descB = secondary.description || '';
  const preferredDescription = descB.length > descA.length && !descB.includes('segnalato da') ? descB : descA;

  const preferredInstagram = primary.instagramUrl || secondary.instagramUrl;

  return {
    ...primary,
    description: preferredDescription,
    priceDetails: preferredPriceDetails,
    isFree: preferredIsFree,
    isSoldOut: preferredIsSoldOut,
    instagramUrl: preferredInstagram,
    sourceBadge: combinedBadge,
    secondarySourceUrl: secondary.sourceUrl || null,
    mergedSources: [...new Set([primary.source, secondary.source])]
  };
}

/**
 * Deduplicates an array of events using Deduplication 2.0 and Smart Merge,
 * and validates temporal consistency (Gate 5: weekday recurrence & showtimes)
 */
export function deduplicateEventsList(rawEvents = [], { nowMs = Date.now() } = {}) {
  const deduplicated = [];
  for (const rawEv of rawEvents) {
    if (!rawEv || !rawEv.title) continue;

    // Gate 5: Temporal Consistency & Weekday Recurrence Check
    const temporalCheck = verifyEventTemporalConsistency(rawEv, nowMs);
    if (!temporalCheck.isValidForScheduledDate) {
      // Event is explicitly scheduled for a different weekday (e.g., "Ogni mercoledì" on a Thursday)
      continue;
    }

    const verifiedEv = temporalCheck.event || rawEv;

    const existingIndex = deduplicated.findIndex(item => areEventsDuplicates(item, verifiedEv));
    if (existingIndex !== -1) {
      deduplicated[existingIndex] = mergeDuplicateEvents(deduplicated[existingIndex], verifiedEv);
    } else {
      deduplicated.push(verifiedEv);
    }
  }
  deduplicated.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return deduplicated;
}

/**
 * Evaluates crawler health telemetry & applies Self-Healing Stale-While-Degraded retention
 */
export function applySelfHealingRetention({
  crawlerId,
  crawlerBadge,
  freshEvents = [],
  previousEvents = [],
  error = null,
  latencyMs = 0,
  nowMs = Date.now()
}) {
  const previousSourceEvents = (previousEvents || []).filter(e => {
    const src = (e.source || e.sourceBadge || '').toLowerCase();
    const isTargetSource = src.includes(crawlerId) || (e.id && e.id.toLowerCase().startsWith(`${crawlerId}-`));
    if (!isTargetSource) return false;
    // Check if still within valid rolling 24h window
    const startMs = Date.parse(e.startTime);
    return startMs >= (nowMs - 3600000) && startMs <= (nowMs + 24 * 3600000);
  });

  const isFailedRun = Boolean(error) || (freshEvents.length === 0 && previousSourceEvents.length >= 3);

  if (isFailedRun) {
    if (previousSourceEvents.length > 0) {
      return {
        events: previousSourceEvents,
        telemetry: {
          sourceId: crawlerId,
          badge: crawlerBadge,
          status: 'DEGRADED',
          statusText: 'DEGRADED (Using Cached Events)',
          eventsCount: previousSourceEvents.length,
          latencyMs,
          lastError: error ? error.message || String(error) : 'Empty results during active hours',
          lastRunAt: new Date(nowMs).toISOString(),
          retainedFromCache: true
        }
      };
    }
    return {
      events: [],
      telemetry: {
        sourceId: crawlerId,
        badge: crawlerBadge,
        status: 'DOWN',
        statusText: 'DOWN (Error & No Cache)',
        eventsCount: 0,
        latencyMs,
        lastError: error ? error.message || String(error) : 'No events available',
        lastRunAt: new Date(nowMs).toISOString(),
        retainedFromCache: false
      }
    };
  }

  return {
    events: freshEvents,
    telemetry: {
      sourceId: crawlerId,
      badge: crawlerBadge,
      status: 'HEALTHY',
      statusText: 'HEALTHY',
      eventsCount: freshEvents.length,
      latencyMs,
      lastError: null,
      lastRunAt: new Date(nowMs).toISOString(),
      retainedFromCache: false
    }
  };
}

/**
 * Filters and promotes scheduled community events whose startTime has entered the rolling 24h window
 */
export function promoteScheduledEventsInto24h(scheduledQueue = [], nowMs = Date.now()) {
  const windowEndMs = nowMs + 24 * 3600000;
  const windowStartMs = nowMs - 3600000; // include happening now up to 1h past

  const promoted = [];
  const remaining = [];

  for (const item of scheduledQueue) {
    const ev = item.event || item;
    const startMs = Date.parse(ev.startTime);
    if (startMs >= windowStartMs && startMs <= windowEndMs) {
      promoted.push(ev);
    } else if (startMs > windowEndMs) {
      remaining.push(item);
    }
  }

  return { promoted, remaining };
}

/**
 * Runs all 4 crawlers in parallel, applies Self-Healing Telemetry, Deduplication 2.0 and Promotion
 */
export async function runMultiSourceCrawlers({
  nowMs = Date.now(),
  forceRefresh = false,
  fetcher = undefined,
  previousSnapshotEvents = [],
  scheduledEventsQueue = []
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
            telemetry: cached.telemetry || {},
            fromCache: true,
            fetchedAt: new Date(cached.timestampMs).toISOString()
          };
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  const telemetry = {};
  const stats = {};
  const allRawEvents = [];

  // Concurrently run crawlers with timing measurement
  const runPromises = CRAWLER_MODULES.map(async (mod) => {
    const startT = Date.now();
    try {
      const result = await mod.run({ nowMs, fetcher });
      const latencyMs = Date.now() - startT;
      return { id: mod.id, badge: mod.badge, freshEvents: result || [], latencyMs, error: null };
    } catch (err) {
      const latencyMs = Date.now() - startT;
      return { id: mod.id, badge: mod.badge, freshEvents: [], latencyMs, error: err };
    }
  });

  const settledResults = await Promise.all(runPromises);

  for (const item of settledResults) {
    const healed = applySelfHealingRetention({
      crawlerId: item.id,
      crawlerBadge: item.badge,
      freshEvents: item.freshEvents,
      previousEvents: previousSnapshotEvents,
      error: item.error,
      latencyMs: item.latencyMs,
      nowMs
    });

    telemetry[item.id] = healed.telemetry;
    stats[item.id] = {
      count: healed.events.length,
      status: healed.telemetry.status.toLowerCase(),
      latencyMs: item.latencyMs,
      retainedFromCache: healed.telemetry.retainedFromCache
    };

    allRawEvents.push(...healed.events);
  }

  // Promote any scheduled community events entered into the 24h window
  if (Array.isArray(scheduledEventsQueue) && scheduledEventsQueue.length > 0) {
    const { promoted } = promoteScheduledEventsInto24h(scheduledEventsQueue, nowMs);
    if (promoted.length > 0) {
      allRawEvents.push(...promoted);
    }
  }

  // Deduplication 2.0 with Smart Merge
  const deduplicated = deduplicateEventsList(allRawEvents);

  // Save to localStorage if in browser
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify({
        timestampMs: nowMs,
        events: deduplicated,
        stats,
        telemetry
      }));
    } catch {
      // Ignore quota exceed
    }
  }

  return {
    events: deduplicated,
    stats,
    telemetry,
    fromCache: false,
    fetchedAt: new Date(nowMs).toISOString()
  };
}

export default {
  CRAWLER_MODULES,
  runMultiSourceCrawlers,
  areEventsDuplicates,
  mergeDuplicateEvents,
  deduplicateEventsList,
  applySelfHealingRetention,
  promoteScheduledEventsInto24h
};
