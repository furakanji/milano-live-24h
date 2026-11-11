/**
 * Multi-Source Orchestrator & Smart Deduplicator 2.0 (`services/crawlers/multiSourceOrchestrator.js`)
 *
 * Runs all active Milan crawlers concurrently (Promise.allSettled):
 * - Zero Milano
 * - MilanoToday
 * - YesMilano
 * - Mentelocale
 *
 * Upgraded Deduplication 2.0:
 * - Canonical Venue resolution
 * - Elastic Time Window (±90 minutes)
 * - Jaccard Token Similarity (>= 0.60, excluding stop words)
 * - Smart Multi-Source Field Merging (best description, ticketing data, dual badges)
 */

import { crawlZeroMilano } from './zeroCrawler.js';
import { crawlMilanoToday } from './milanoTodayCrawler.js';
import { crawlYesMilano } from './yesMilanoCrawler.js';
import { crawlMentelocale } from './mentelocaleCrawler.js';
import {
  resolveCanonicalVenue,
  tokenizeTitle,
  computeJaccardSimilarity
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
 * 3. Title Jaccard similarity >= 0.60 or substring containment
 */
export function areEventsDuplicates(eventA, eventB) {
  if (!eventA || !eventB) return false;
  if (eventA.id === eventB.id) return true;

  // 1. Venue comparison
  const venueA = resolveCanonicalVenue(eventA.venueName);
  const venueB = resolveCanonicalVenue(eventB.venueName);

  const sameCanonical = venueA.canonicalId === venueB.canonicalId && venueA.canonicalId !== 'milano-generic';
  const cleanVA = (eventA.venueName || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
  const cleanVB = (eventB.venueName || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
  const venueStringMatch = cleanVA.length > 3 && cleanVB.length > 3 && (cleanVA.includes(cleanVB) || cleanVB.includes(cleanVA));

  if (!sameCanonical && !venueStringMatch) {
    return false;
  }

  // 2. Elastic Time Window check (±90 minutes = 5400000 ms)
  const timeA = Date.parse(eventA.startTime);
  const timeB = Date.parse(eventB.startTime);
  if (!isNaN(timeA) && !isNaN(timeB)) {
    const diffMs = Math.abs(timeA - timeB);
    if (diffMs > 90 * 60 * 1000) {
      return false;
    }
  }

  // 3. Title similarity (Jaccard on non-stopwords + Substring check)
  const titleA = (eventA.title || '').toLowerCase().trim();
  const titleB = (eventB.title || '').toLowerCase().trim();

  const normA = titleA.replace(/[^a-z0-9]/gi, '');
  const normB = titleB.replace(/[^a-z0-9]/gi, '');

  if (normA.length >= 5 && normB.length >= 5 && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  const tokensA = tokenizeTitle(eventA.title);
  const tokensB = tokenizeTitle(eventB.title);
  const jaccard = computeJaccardSimilarity(tokensA, tokensB);

  return jaccard >= 0.60;
}

/**
 * Smart Multi-Source Field Merging
 * Merges two duplicate events into a richer UnifiedEvent
 */
export function mergeDuplicateEvents(primary, secondary) {
  // Source badges merging (e.g. "DICE + ZERO" or "ZERO + MENTELOCALE")
  const badgeA = primary.sourceBadge || primary.source || 'EVENT';
  const badgeB = secondary.sourceBadge || secondary.source || 'EVENT';
  const combinedBadge = badgeA.includes(badgeB) ? badgeA : `${badgeA} + ${badgeB}`;

  // Priority for ticketing: DICE > Zero > MilanoToday > Mentelocale > YesMilano
  const isSecondaryTicketingPriority =
    (secondary.source === 'DICE' && primary.source !== 'DICE') ||
    (secondary.source === 'Zero' && !['DICE', 'Zero'].includes(primary.source));

  const preferredPriceDetails = isSecondaryTicketingPriority
    ? (secondary.priceDetails || primary.priceDetails)
    : (primary.priceDetails || secondary.priceDetails);

  const preferredIsFree = primary.isFree && secondary.isFree;
  const preferredIsSoldOut = Boolean(primary.isSoldOut || secondary.isSoldOut);

  // Longest, cleanest description
  const descA = primary.description || '';
  const descB = secondary.description || '';
  const preferredDescription = descB.length > descA.length && !descB.includes('segnalato da') ? descB : descA;

  // Instagram URL
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
 * Runs all 4 crawlers in parallel, applies Deduplication 2.0 and smart merge
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

  // Deduplication 2.0 with Smart Merge
  const deduplicated = [];

  for (const rawEv of allRawEvents) {
    if (!rawEv || !rawEv.title) continue;

    // Check if duplicate of an existing event in list
    const existingIndex = deduplicated.findIndex(item => areEventsDuplicates(item, rawEv));

    if (existingIndex !== -1) {
      // Merge into richer unified event
      deduplicated[existingIndex] = mergeDuplicateEvents(deduplicated[existingIndex], rawEv);
    } else {
      deduplicated.push(rawEv);
    }
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
  areEventsDuplicates,
  mergeDuplicateEvents
};
