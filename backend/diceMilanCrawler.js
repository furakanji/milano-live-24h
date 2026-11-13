/**
 * MILANO LIVE 24H — Ad-Hoc DICE.fm Milan Real-Time Crawler (`diceMilanCrawler.js`)
 *
 * Responsibilities:
 * 1. Calculate `today` and `tomorrow` in `YYYY-MM-DD` in `Europe/Rome` timezone.
 * 2. Fetch DICE.fm Next.js SSR browse pages for Milan slug (`milano-5d68e89f7f285e094f60b00e`):
 *    - Primary browse URL with `from=${today}&until=${tomorrow}`
 *    - Deep/fallback category URLs (Gigs, Club/Party, Culture)
 * 3. Extract and parse `<script id="__NEXT_DATA__">` payload.
 * 4. Filter events strictly within rolling 24-hour window (`now - 60 min` to `now + 24 hours`).
 * 5. Enrich events concurrently (concurrency limit 5, `Promise.allSettled`) via event page `ld+json`.
 * 6. Normalize every event to the standard Milano Live 24h Unified Schema:
 *    - id: "dice-" + event.id
 *    - title, description, startTime, endTime, venueName, address, isFree, priceDetails, category
 *    - mapsUrl, instagramUrl (with top Milan venues mapping / fallback), sourceUrl
 * 7. In-memory 15-minute caching to protect DICE.fm from redundant calls.
 */

import { romeParts } from './romeTime.js';
import { detectOutofTownMilanEvent } from '../services/crawlers/crawlerUtils.js';

export const MILAN_DICE_CITY_SLUG = 'milano-5d68e89f7f285e094f60b00e';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Pre-mapped dictionary of top Milan DICE venues for verified Instagram profiles
 */
export const TOP_MILAN_DICE_VENUES_INSTAGRAM = {
  magnolia: 'https://www.instagram.com/circolomagnolia/',
  santeria: 'https://www.instagram.com/santeriamilano/',
  bellezza: 'https://www.instagram.com/arcibellezza/',
  biko: 'https://www.instagram.com/bikoclubmilano/',
  base: 'https://www.instagram.com/base_milano/',
  alcatraz: 'https://www.instagram.com/alcatrazmilano/',
  magazzini: 'https://www.instagram.com/magazzinigeneralimilano/',
  dude: 'https://www.instagram.com/dudemilano/',
  detune: 'https://www.instagram.com/detunemilano/',
  tunnel: 'https://www.instagram.com/tunnelclubmilano/',
  apollo: 'https://www.instagram.com/apollomilano/',
  yellowsquare: 'https://www.instagram.com/yellowsquaremilano/',
  beltrade: 'https://www.instagram.com/cinemabeltrade/',
  nama: 'https://www.instagram.com/nama.milano/',
  ragoo: 'https://www.instagram.com/ragoomilano/',
  bachelite: 'https://www.instagram.com/bacheliteclab/'
};

/**
 * In-memory cache for crawl results (15-minute TTL)
 */
let diceCache = {
  timestampMs: 0,
  events: []
};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Returns today and tomorrow dates in `YYYY-MM-DD` string format in Europe/Rome fuso
 */
export function getRomeDateStrings(baseMs = Date.now()) {
  const pToday = romeParts(baseMs);
  const pTomorrow = romeParts(baseMs + 24 * 3600 * 1000);

  const pad = n => String(n).padStart(2, '0');
  const today = `${pToday.y}-${pad(pToday.mo)}-${pad(pToday.d)}`;
  const tomorrow = `${pTomorrow.y}-${pad(pTomorrow.mo)}-${pad(pTomorrow.d)}`;

  return { today, tomorrow };
}

/**
 * Extracts and parses `__NEXT_DATA__` JSON from HTML string
 */
export function extractNextData(html) {
  if (!html || typeof html !== 'string') return null;
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    return null;
  }
}

/**
 * Cleans HTML/Markdown tags and trims text
 */
export function cleanText(str, maxLen = 250) {
  if (!str) return '';
  const cleaned = String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).trim().replace(/[,.:; -]+$/, '') + '...';
}

/**
 * Resolves Instagram link for venue
 */
export function resolveVenueInstagram(venueName = '') {
  const normalized = venueName.toLowerCase();
  for (const [needle, igUrl] of Object.entries(TOP_MILAN_DICE_VENUES_INSTAGRAM)) {
    if (normalized.includes(needle)) {
      return igUrl;
    }
  }
  const cleanTag = normalized.replace(/[^a-z0-9]/g, '');
  if (cleanTag.length >= 3) {
    return `https://www.instagram.com/explore/tags/${cleanTag}/`;
  }
  return null;
}

/**
 * Maps DICE event categories/tags to Milano Live 24h category keys:
 * 'concerti' | 'cinema' | 'teatro' | 'libri' | 'mostre' | 'incontri' | 'aperture' | 'politica'
 */
export function mapDiceCategory(event, deepUrl = '') {
  const haystack = `${event.name || ''} ${event.event_tag || ''} ${deepUrl} ${event.reasoning || ''}`.toLowerCase();
  if (/talk|conferenza|presentazione|library|book|libro|poesia/i.test(haystack)) {
    return 'libri';
  }
  if (/comedy|stand\s*up|teatro|theatre|acting|comico/i.test(haystack)) {
    return 'teatro';
  }
  if (/cinema|film|proiezione|screening/i.test(haystack)) {
    return 'cinema';
  }
  if (/mostra|exhibition|art\b|galleria|vernissage/i.test(haystack)) {
    return 'mostre';
  }
  if (/tango|party|dj\s*set|club|clubbing|disco|rave|techno|house|elettronica/i.test(haystack)) {
    return 'concerti';
  }
  // Default for DICE is live music / concerti
  return 'concerti';
}

/**
 * Concurrency runner for Promise.allSettled with max concurrent limit
 */
async function mapConcurrent(items, limit, asyncFn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => asyncFn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.allSettled(results);
}

/**
 * Enriches a single event by fetching its event detail page and parsing schema.org ld+json
 */
export async function enrichEventFromDetailPage(rawEvent, userAgent = DEFAULT_USER_AGENT) {
  // Candidate URLs: either perm_name or direct event ID
  const eventId = rawEvent.id;
  const eventSlug = rawEvent.perm_name || eventId;
  const targetUrl = `https://dice.fm/event/${eventSlug}`;

  try {
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
      }
    });

    if (!res.ok) {
      return { rawEvent, targetUrl, enriched: null };
    }

    const html = await res.text();
    const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    let eventLd = null;

    for (const match of ldMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed['@type'] === 'MusicEvent' || parsed['@type'] === 'Event') {
          eventLd = parsed;
          break;
        }
      } catch {
        // Continue searching
      }
    }

    return { rawEvent, targetUrl: res.url || targetUrl, enriched: eventLd };
  } catch (err) {
    return { rawEvent, targetUrl, enriched: null, error: err.message };
  }
}

/**
 * Normalizes a DICE raw event + enriched detail into the unified schema
 */
export function normalizeDiceEvent({ rawEvent, targetUrl, enriched }) {
  const id = `dice-${rawEvent.id}`;
  const title = (enriched?.name || rawEvent.name || '').trim();

  // Timing: ISO-8601 strings
  const rawStart = enriched?.startDate || rawEvent.dates?.event_start_date;
  const rawEnd = enriched?.endDate || rawEvent.dates?.event_end_date;

  const startMs = rawStart ? Date.parse(rawStart) : Date.now();
  let endMs = rawEnd ? Date.parse(rawEnd) : (startMs + 3 * 3600 * 1000);
  if (isNaN(endMs) || endMs <= startMs) {
    endMs = startMs + 3 * 3600 * 1000;
  }

  const startTime = new Date(startMs).toISOString();
  const endTime = new Date(endMs).toISOString();

  // Venue & Address
  const primaryVenue = Array.isArray(rawEvent.venues) && rawEvent.venues[0] ? rawEvent.venues[0] : null;
  const venueName = (enriched?.location?.name || primaryVenue?.name || 'Milano Live Club').trim();

  let rawAddress = (enriched?.location?.address?.streetAddress || primaryVenue?.address || '').trim();
  const rawDesc = enriched?.description || rawEvent.about || rawEvent.reasoning || '';
  const description = cleanText(rawDesc, 250) || `Evento dal vivo in programma a Milano presso ${venueName}. Biglietti e dettagli ufficiali su DICE.fm.`;
  const sourceUrl = targetUrl || `https://dice.fm/event/${rawEvent.id}`;

  const outOfTownCheck = detectOutofTownMilanEvent({
    title,
    description,
    venueName,
    address: rawAddress,
    sourceUrl
  });

  const isOutOfTown = outOfTownCheck.isOutOfTown;
  const locationName = outOfTownCheck.locationName || 'Milano';

  let address = rawAddress;
  if (!address) {
    address = isOutOfTown ? `${venueName}, ${locationName}` : `${venueName}, Milano`;
  } else if (!isOutOfTown && !/milano/i.test(address)) {
    address = `${address}, Milano`;
  }

  // Pricing & Sold out
  const isSoldOut = rawEvent.status === 'sold-out' || Boolean(rawEvent.is_sold_out);
  let rawAmount = rawEvent.price?.amount !== undefined ? rawEvent.price.amount : (enriched?.offers?.lowPrice ? parseFloat(enriched.offers.lowPrice) : null);
  
  // DICE amounts in rawEvent.price.amount are represented in cents (e.g., 1400 = €14.00, 3800 = €38.00)
  if (typeof rawAmount === 'number' && rawAmount >= 100) {
    rawAmount = rawAmount / 100;
  }

  const isFree = rawAmount === 0 || rawEvent.price?.amount_from === 0;

  let priceDetails = '€€ / Biglietti su DICE';
  if (isFree) {
    priceDetails = 'GRATIS';
  } else if (typeof rawAmount === 'number' && rawAmount > 0) {
    priceDetails = `€${rawAmount.toFixed(2)}`;
  }

  const category = mapDiceCategory(rawEvent, targetUrl);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' ' + (isOutOfTown ? locationName : address))}`;
  const instagramUrl = resolveVenueInstagram(venueName);

  return {
    id,
    title,
    description,
    startTime,
    endTime,
    venueName,
    neighborhood: isOutOfTown ? locationName : (primaryVenue?.space_name || 'Milano'),
    address,
    isOutOfTown,
    outOfTownLocation: isOutOfTown ? locationName : null,
    isFree,
    isSoldOut,
    priceDetails,
    category,
    eventType: 'LIVE_CONCERT',
    source: 'DICE',
    sourceName: 'DICE.fm Milano',
    sourceUrl,
    mapsUrl,
    instagramUrl,
    facebookUrl: null,
    origin: 'dice_crawler',
    sourceBadge: 'DICE Live'
  };
}

/**
 * Main Crawler Function: Fetches, deduplicates, filters and enriches DICE Milan events
 *
 * @param {Object} options
 * @param {number} [options.nowMs] - Base timestamp
 * @param {boolean} [options.forceRefresh] - Bypass in-memory 15m cache
 * @param {number} [options.concurrencyLimit] - Concurrency for detail page fetching (default 5)
 * @returns {Promise<{ events: Array, fetchedAt: string, fromCache: boolean, totalFound: number }>}
 */
export async function crawlDiceMilanEvents({
  nowMs = Date.now(),
  forceRefresh = false,
  concurrencyLimit = 5
} = {}) {
  // Check 15-minute in-memory cache
  if (!forceRefresh && diceCache.events.length > 0 && (nowMs - diceCache.timestampMs) < CACHE_TTL_MS) {
    return {
      events: diceCache.events,
      fetchedAt: new Date(diceCache.timestampMs).toISOString(),
      fromCache: true,
      totalFound: diceCache.events.length
    };
  }

  const { today, tomorrow } = getRomeDateStrings(nowMs);

  // Target URLs as requested in specification
  const targetUrls = [
    `https://dice.fm/browse/${MILAN_DICE_CITY_SLUG}?lng=it&from=${today}&until=${tomorrow}`,
    `https://dice.fm/browse/${MILAN_DICE_CITY_SLUG}/music/gig?lng=it&from=${today}&until=${tomorrow}`,
    `https://dice.fm/browse/${MILAN_DICE_CITY_SLUG}/music/party?lng=it`, // Without params to prevent DICE 307 loop
    `https://dice.fm/browse/${MILAN_DICE_CITY_SLUG}/culture?lng=it&from=${today}&until=${tomorrow}`
  ];

  const rawEventsById = new Map();

  // Fetch browse pages in parallel
  await Promise.allSettled(
    targetUrls.map(async url => {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
          }
        });

        if (!res.ok) return;
        const html = await res.text();
        const nextData = extractNextData(html);
        const events = nextData?.props?.pageProps?.events;

        if (Array.isArray(events)) {
          events.forEach(ev => {
            if (ev && ev.id && !rawEventsById.has(ev.id)) {
              rawEventsById.set(ev.id, ev);
            }
          });
        }
      } catch (err) {
        // Non-blocking error logging
        console.warn(`[diceMilanCrawler] Warning fetching browse URL ${url}:`, err.message);
      }
    })
  );

  const rawList = Array.from(rawEventsById.values());

  // Step 2 — Strict 24h Rolling Window Filter:
  // between `now - 60 min` and `now + 24 hours`
  const windowStartMs = nowMs - 60 * 60 * 1000;
  const windowEndMs = nowMs + 24 * 3600 * 1000;

  const filteredRawEvents = rawList.filter(ev => {
    const startStr = ev.dates?.event_start_date;
    if (!startStr) return false;
    const startMs = Date.parse(startStr);
    if (isNaN(startMs)) return false;
    return startMs >= windowStartMs && startMs <= windowEndMs;
  });

  // Step 3 — Detail Enrichment via ld+json (Concurrent Fetch with Concurrency Limit 5)
  const enrichmentResults = await mapConcurrent(
    filteredRawEvents,
    concurrencyLimit,
    ev => enrichEventFromDetailPage(ev, DEFAULT_USER_AGENT)
  );

  const normalizedEvents = [];

  enrichmentResults.forEach((res, idx) => {
    const rawEvent = filteredRawEvents[idx];
    if (res.status === 'fulfilled') {
      normalizedEvents.push(normalizeDiceEvent(res.value));
    } else {
      // Fallback without enriched detail
      normalizedEvents.push(normalizeDiceEvent({
        rawEvent,
        targetUrl: `https://dice.fm/event/${rawEvent.id}`,
        enriched: null
      }));
    }
  });

  // Sort strictly chronologically
  normalizedEvents.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  // Update in-memory cache
  diceCache = {
    timestampMs: nowMs,
    events: normalizedEvents
  };

  return {
    events: normalizedEvents,
    fetchedAt: new Date(nowMs).toISOString(),
    fromCache: false,
    totalFound: normalizedEvents.length
  };
}

export default {
  crawlDiceMilanEvents,
  enrichEventFromDetailPage,
  normalizeDiceEvent,
  getRomeDateStrings,
  extractNextData,
  mapDiceCategory,
  resolveVenueInstagram
};
