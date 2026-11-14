/**
 * Domain Crawler Service (`src/services/domainCrawlerService.js`)
 *
 * Implements automated crawling & census of events from any added website/domain:
 * 1. Probes common calendar/event paths if base URL returns no events (e.g. /, /eventi, /programma, /calendario)
 * 2. Parses Schema.org JSON-LD structured data (Event, MusicEvent, TheaterEvent, ScreeningEvent, ExhibitionEvent, etc.)
 * 3. Parses Microdata & HTML semantic event card patterns (<article>, .event, [itemtype*="Event"], etc.)
 * 4. Automatically classifies the category for each event (`classifyMilanCategory`) without manual selection
 * 5. Validates temporal consistency & weekday recurrence (Gate 5)
 * 6. Detects out-of-town venues (Fuori Porta)
 * 7. Normalizes to Milan Live 24h Unified Schema and separates into:
 *    - immediate24h: events active in the rolling 24-hour window
 *    - scheduledFuture: events scheduled > 24 hours into the future
 */

import {
  universalFetch,
  classifyMilanCategory,
  detectFreeEntry,
  decodeHtml,
  cleanDescription,
  hashString,
  resolveCanonicalVenue,
  verifyEventTemporalConsistency,
  detectOutofTownMilanEvent
} from '../../services/crawlers/crawlerUtils.js';

/**
 * Extracts JSON-LD scripts from HTML text
 * Handles single objects, @graph arrays, and nested Event types
 */
export function extractJsonLdEvents(html = '', baseUrl = '') {
  const events = [];
  if (!html) return events;

  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      if (!jsonContent) continue;
      const data = JSON.parse(jsonContent);

      const items = Array.isArray(data)
        ? data
        : data['@graph'] && Array.isArray(data['@graph'])
          ? data['@graph']
          : [data];

      for (const item of items) {
        if (!item) continue;
        const type = (item['@type'] || item.type || '').toString();

        if (/(?:Event|ScreeningEvent|TheaterEvent|MusicEvent|ExhibitionEvent|VisualArtsEvent|EducationEvent)/i.test(type)) {
          events.push(item);
        }
      }
    } catch {
      // Ignore unparseable JSON-LD chunks
    }
  }

  return events;
}

/**
 * Fallback parser for standard HTML event card listings
 */
export function extractHtmlEvents(html = '', baseUrl = '') {
  const candidates = [];
  if (!html) return candidates;

  // Regex looking for event blocks with title, date/time and link
  const blockRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:event|spettacol|show|proiezion|mostra|programma)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let match;
  let count = 0;

  while ((match = blockRegex.exec(html)) !== null && count < 30) {
    count++;
    const block = match[1];

    // Extract title
    const titleMatch = block.match(/<(?:h1|h2|h3|h4|strong|a)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4|strong|a)>/i);
    const title = titleMatch ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '')).trim() : '';

    if (!title || title.length < 3 || title.length > 150) continue;

    // Extract link
    const linkMatch = block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    let eventUrl = linkMatch ? linkMatch[1] : baseUrl;
    try {
      eventUrl = new URL(eventUrl, baseUrl).href;
    } catch {
      eventUrl = baseUrl;
    }

    // Extract date/time pattern (ISO, or YYYY-MM-DD or DD/MM/YYYY)
    const isoMatch = block.match(/datetime=["']([^"']+)["']/i) ||
                     block.match(/\b(202[4-9]-[0-1][0-9]-[0-3][0-9](?:T[0-2][0-9]:[0-5][0-9])?)\b/) ||
                     block.match(/\b([0-3]?[0-9][\/.][0-1]?[0-9][\/.](?:20)?2[4-9])\b/);

    let startTime = null;
    if (isoMatch) {
      const rawDate = isoMatch[1];
      const parsed = Date.parse(rawDate);
      if (!isNaN(parsed)) {
        startTime = new Date(parsed).toISOString();
      }
    }

    candidates.push({
      title,
      description: cleanDescription(block, 200),
      url: eventUrl,
      rawBlock: block,
      startTime
    });
  }

  return candidates;
}

/**
 * Normalizes an extracted JSON-LD or HTML raw event candidate into a Milan UnifiedEvent
 */
export function normalizeDiscoveredEvent(rawItem, domainMeta = {}, { nowMs = Date.now() } = {}) {
  const title = decodeHtml(rawItem.name || rawItem.title || rawItem.headline || '').trim();
  if (!title) return null;

  const desc = decodeHtml(rawItem.description || rawItem.text || '').trim();
  const sourceUrl = rawItem.url || rawItem['@id'] || domainMeta.url || `https://${domainMeta.domain}`;

  // Start & End time resolution
  let startMs = null;
  const rawStart = rawItem.startDate || rawItem.startTime || rawItem.start;
  if (rawStart) {
    const p = Date.parse(rawStart);
    if (!isNaN(p)) startMs = p;
  }

  // If no date parsed, default to today evening (rolling window test)
  if (!startMs) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(nowMs));
    startMs = Date.parse(`${today}T20:30:00+01:00`);
  }

  let endMs = null;
  const rawEnd = rawItem.endDate || rawItem.endTime || rawItem.end;
  if (rawEnd) {
    const p = Date.parse(rawEnd);
    if (!isNaN(p)) endMs = p;
  }
  if (!endMs || endMs <= startMs) {
    endMs = startMs + (2 * 3600 * 1000);
  }

  const startTimeIso = new Date(startMs).toISOString();
  const endTimeIso = new Date(endMs).toISOString();

  // Location / Venue
  let locationObj = rawItem.location;
  if (Array.isArray(locationObj)) locationObj = locationObj[0];

  let rawVenue = domainMeta.venueName || '';
  let address = 'Milano';

  if (typeof locationObj === 'string') {
    rawVenue = rawVenue || locationObj;
  } else if (locationObj && typeof locationObj === 'object') {
    rawVenue = locationObj.name || rawVenue;
    const addr = locationObj.address;
    if (typeof addr === 'string') {
      address = addr;
    } else if (addr && typeof addr === 'object') {
      address = [addr.streetAddress, addr.addressLocality, addr.postalCode].filter(Boolean).join(', ') || 'Milano';
    }
  }

  if (!rawVenue) {
    rawVenue = (domainMeta.domain || 'Milano').replace(/\.[a-z]+$/i, '').toUpperCase();
  }

  const canonicalVenue = resolveCanonicalVenue(rawVenue);
  const venueName = canonicalVenue.name || rawVenue;
  if (canonicalVenue.address) {
    address = canonicalVenue.address;
  }

  // Automatic Category Classification
  // Reads title, description, venue and types, avoiding any need for user manual selection
  const haystack = `${title} ${desc} ${venueName} ${domainMeta.notes || ''} ${rawItem['@type'] || ''}`;
  const category = classifyMilanCategory(haystack);

  // Free entry & pricing
  let isFree = detectFreeEntry(haystack);
  let priceDetails = isFree ? 'Ingresso Gratuito' : 'Vedi sito ufficiale';

  const offers = rawItem.offers;
  if (offers) {
    const offerItem = Array.isArray(offers) ? offers[0] : offers;
    if (offerItem) {
      if (offerItem.price === 0 || offerItem.price === '0' || String(offerItem.price).toLowerCase() === 'free') {
        isFree = true;
        priceDetails = 'Gratuito';
      } else if (offerItem.price) {
        priceDetails = `${offerItem.price} ${offerItem.priceCurrency || '€'}`.trim();
        isFree = false;
      }
    }
  }

  const id = `dom-${hashString(domainMeta.domain || 'milan')}-${hashString(title)}-${startMs}`;

  const baseEvent = {
    id,
    title,
    description: cleanDescription(desc, 240) || `Evento programmato presso ${venueName}.`,
    venueName,
    address,
    category,
    startTime: startTimeIso,
    endTime: endTimeIso,
    sourceUrl,
    sourceBadge: (domainMeta.domain || 'WEB').replace(/\.[a-z]+$/i, '').toUpperCase(),
    isFree,
    priceDetails,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${address}`)}`,
    neighborhood: domainMeta.neighborhood || canonicalVenue.neighborhood || 'Milano',
    instagramUrl: canonicalVenue.instagramUrl || null
  };

  // Gate 5 temporal consistency check
  const temporal = verifyEventTemporalConsistency(baseEvent, nowMs);
  let verified = temporal.event || baseEvent;

  // Fuori Porta check
  const outCheck = detectOutofTownMilanEvent(verified);
  if (outCheck.isOutOfTown) {
    verified = {
      ...verified,
      isOutOfTown: true,
      outOfTownLocation: outCheck.locationName || 'Fuori Porta'
    };
  }

  return verified;
}

/**
 * Scans a target custom domain automatically:
 * - Probes the home page and sensible calendar/event paths
 * - Discovers events via JSON-LD and HTML heuristics
 * - Classifies categories automatically
 * - Splits findings into immediate 24h events and scheduled future events
 *
 * @param {Object} domainObj - { domain, url, venueName, neighborhood, notes }
 * @param {Object} options - { nowMs, fetcher }
 * @returns {Promise<{ immediate24h: Array, scheduledFuture: Array, scannedUrls: Array, categoriesFound: Set<string> }>}
 */
export async function scanDomainForMilanEvents(domainObj, { nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const result = {
    immediate24h: [],
    scheduledFuture: [],
    scannedUrls: [],
    categoriesFound: new Set(),
    error: null
  };

  if (!domainObj || !domainObj.domain) {
    result.error = 'Dominio non specificato';
    return result;
  }

  const cleanHost = domainObj.domain.toLowerCase().replace(/^www\./, '');
  const baseOrigin = domainObj.url ? new URL(domainObj.url).origin : `https://${cleanHost}`;

  // Candidates paths to probe
  const pathsToProbe = ['/'];
  if (domainObj.notes && domainObj.notes.startsWith('/')) {
    pathsToProbe.unshift(domainObj.notes.trim());
  } else {
    pathsToProbe.push('/programma', '/eventi', '/calendario', '/cinema', '/spettacoli');
  }

  const rawDiscovered = [];

  for (const path of pathsToProbe) {
    const targetUrl = `${baseOrigin}${path}`;
    try {
      result.scannedUrls.push(targetUrl);
      const html = await fetcher(targetUrl, { timeout: 7000 });
      if (!html || html.length < 200) continue;

      // 1. Try structured JSON-LD
      const jsonLdItems = extractJsonLdEvents(html, targetUrl);
      if (jsonLdItems.length > 0) {
        for (const it of jsonLdItems) {
          rawDiscovered.push(it);
        }
      }

      // 2. Try HTML semantic cards
      if (rawDiscovered.length < 5) {
        const htmlItems = extractHtmlEvents(html, targetUrl);
        for (const it of htmlItems) {
          rawDiscovered.push(it);
        }
      }

      // If we found events on this path, stop probing additional secondary paths
      if (rawDiscovered.length >= 3) {
        break;
      }
    } catch {
      // Continue to next probe
    }
  }

  // Deduplicate raw discovered items by name/title
  const seenTitles = new Set();
  const normalizedEvents = [];

  for (const raw of rawDiscovered) {
    const normalized = normalizeDiscoveredEvent(raw, domainObj, { nowMs });
    if (!normalized || !normalized.title) continue;

    const normKey = normalized.title.toLowerCase().trim();
    if (seenTitles.has(normKey)) continue;
    seenTitles.add(normKey);

    normalizedEvents.push(normalized);
    if (normalized.category) {
      result.categoriesFound.add(normalized.category);
    }
  }

  // Categorize into 24h rolling window vs scheduled future queue (>24h)
  const windowEndMs = nowMs + 24 * 3600 * 1000;
  const windowStartMs = nowMs - 2 * 3600 * 1000; // include current/just started

  for (const ev of normalizedEvents) {
    const startMs = Date.parse(ev.startTime);
    if (isNaN(startMs)) {
      result.immediate24h.push(ev);
      continue;
    }

    if (startMs >= windowStartMs && startMs <= windowEndMs) {
      result.immediate24h.push(ev);
    } else if (startMs > windowEndMs) {
      result.scheduledFuture.push(ev);
    } else {
      // Past event, keep in immediate if finished recently
      if (Date.parse(ev.endTime || ev.startTime) >= nowMs) {
        result.immediate24h.push(ev);
      }
    }
  }

  return result;
}
