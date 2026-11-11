/**
 * Zero Milano Crawler (`services/crawlers/zeroCrawler.js`)
 * Target: https://zero.eu/it/milano/eventi/
 */

import {
  universalFetch,
  cleanDescription,
  decodeHtml,
  hashString,
  classifyMilanCategory,
  detectFreeEntry,
  resolveVenueInstagram
} from './crawlerUtils.js';

export async function crawlZeroMilano({ nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const targetUrl = 'https://zero.eu/it/milano/eventi/';
  const html = await fetcher(targetUrl);
  const events = [];
  const windowEndMs = nowMs + 24 * 3600 * 1000;

  // 1. Check for JSON-LD ItemList / Event schema
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const list = data.itemListElement || (Array.isArray(data) ? data : (data['@type'] === 'Event' ? [data] : []));
      for (const entry of list) {
        const item = entry.item || entry;
        if (!item || (item['@type'] !== 'Event' && item['@type'] !== 'MusicEvent')) continue;

        const title = decodeHtml(item.name || '').trim();
        if (!title) continue;

        let startMs = item.startDate ? Date.parse(item.startDate) : null;
        let endMs = item.endDate ? Date.parse(item.endDate) : null;

        // If event start time is broad date or outside next 24h, verify applicability
        if (!startMs || isNaN(startMs)) {
          startMs = nowMs + 2 * 3600 * 1000;
        }
        if (!endMs || isNaN(endMs) || endMs <= startMs) {
          endMs = startMs + 3 * 3600 * 1000;
        }

        // Keep events overlapping with the next 24h window
        if (endMs <= nowMs || startMs > windowEndMs) continue;

        const venueName = decodeHtml(item.location?.name || 'Milano').trim();
        const address = decodeHtml(item.location?.address?.streetAddress || item.location?.address || `${venueName}, Milano`).trim();
        const descRaw = item.description || '';
        const description = cleanDescription(descRaw, 240) || `Evento segnalato da Zero Milano presso ${venueName}.`;
        const sourceUrl = item.url || targetUrl;
        const isFree = detectFreeEntry(`${title} ${descRaw}`);
        const category = classifyMilanCategory(`${title} ${descRaw}`);
        const id = `zero-${hashString(sourceUrl + title)}`;

        events.push({
          id,
          source: 'Zero',
          sourceName: 'Zero Milano',
          title,
          description,
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          venueName,
          address: /milano/i.test(address) ? address : `${address}, Milano`,
          neighborhood: 'Milano',
          isFree,
          isSoldOut: false,
          priceDetails: isFree ? 'GRATIS' : 'Verifica su Zero.eu',
          category,
          eventType: 'SPECIAL_EVENT',
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' Milano')}`,
          instagramUrl: resolveVenueInstagram(venueName),
          facebookUrl: null,
          sourceUrl,
          origin: 'zero_crawler',
          sourceBadge: 'ZERO'
        });
      }
    } catch {
      // Continue parsing
    }
  }

  // 2. Fallback / HTML Article Card Scraper
  if (events.length === 0) {
    const cardMatches = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)];
    for (const cm of cardMatches) {
      const chunk = cm[1];
      const linkMatch = chunk.match(/<a\b[^>]*href="([^"]*zero\.eu\/it\/eventi\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const titleMatch = chunk.match(/<(?:h2|h3|h4)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i);
      if (!titleMatch) continue;

      const title = decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '')).trim();
      if (!title) continue;

      const sourceUrl = linkMatch ? linkMatch[1] : targetUrl;
      const descMatch = chunk.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      const descRaw = descMatch ? descMatch[1] : '';
      const description = cleanDescription(descRaw) || `Appuntamento in programma a Milano selezionato da Zero.`;

      const venueMatch = chunk.match(/class="[^"]*(?:place|venue|location)[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/i);
      const venueName = venueMatch ? decodeHtml(venueMatch[1].replace(/<[^>]+>/g, '')).trim() : 'Milano';

      const isFree = detectFreeEntry(`${title} ${descRaw}`);
      const category = classifyMilanCategory(`${title} ${descRaw}`);
      const startMs = nowMs + 3 * 3600 * 1000;
      const endMs = startMs + 3 * 3600 * 1000;
      const id = `zero-${hashString(sourceUrl + title)}`;

      events.push({
        id,
        source: 'Zero',
        sourceName: 'Zero Milano',
        title,
        description,
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        venueName,
        address: `${venueName}, Milano`,
        neighborhood: 'Milano',
        isFree,
        isSoldOut: false,
        priceDetails: isFree ? 'GRATIS' : 'A Pagamento',
        category,
        eventType: 'SPECIAL_EVENT',
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' Milano')}`,
        instagramUrl: resolveVenueInstagram(venueName),
        facebookUrl: null,
        sourceUrl,
        origin: 'zero_crawler',
        sourceBadge: 'ZERO'
      });
    }
  }

  return events;
}

export default { crawlZeroMilano };
