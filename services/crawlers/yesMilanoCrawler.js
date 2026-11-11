/**
 * YesMilano Eventi Crawler (`services/crawlers/yesMilanoCrawler.js`)
 * Target: https://www.yesmilano.it/eventi/tutti-gli-eventi
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

export async function crawlYesMilano({ nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const targetUrl = 'https://www.yesmilano.it/eventi/tutti-gli-eventi';
  const html = await fetcher(targetUrl);
  const events = [];
  const seenIds = new Set();

  // Match article cards in YesMilano
  const cardMatches = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)];

  for (const cm of cardMatches) {
    const chunk = cm[1];
    const linkMatch = chunk.match(/<a\b[^>]*href="([^"]*\/eventi\/[^"]+)"[^>]*>/i);
    if (!linkMatch) continue;

    let sourceUrl = linkMatch[1];
    if (sourceUrl.startsWith('/')) {
      sourceUrl = 'https://www.yesmilano.it' + sourceUrl;
    }

    // Title
    const titleMatch = chunk.match(/<(?:h2|h3|h4)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i) ||
                       chunk.match(/<img\b[^>]*alt="([^"]+)"[^>]*>/i) ||
                       chunk.match(/title="([^"]+)"/i);
    let title = titleMatch ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '')).trim() : '';

    if (!title || title.length < 4) {
      // Extract from slug
      const slug = sourceUrl.split('/').pop().replace(/-/g, ' ');
      title = slug.replace(/\b\w/g, l => l.toUpperCase());
    }

    const id = `yesmilano-${hashString(sourceUrl + title)}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    // Date extraction: e.g. "Fino al 11 Novembre" or date intervals
    const dataMatch = chunk.match(/class="data"[^>]*>([\s\S]*?)<\/div>/i);
    const dateText = dataMatch ? decodeHtml(dataMatch[1].replace(/<[^>]+>/g, '')).trim() : '';

    // Description
    const descMatch = chunk.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const descRaw = descMatch ? descMatch[1] : '';
    const description = cleanDescription(descRaw || dateText) || `Evento e mostra in corso a Milano segnalato dal portale ufficiale YesMilano.`;

    const isFree = detectFreeEntry(`${title} ${chunk}`);
    let category = classifyMilanCategory(`${title} ${chunk}`);
    if (category === 'concerti' && !/live|concerto|dj|club/i.test(`${title} ${chunk}`)) {
      category = 'mostre'; // YesMilano features mainly exhibitions & cultural events
    }

    // Set daytime slot: 10:00 for daytime exhibitions/museums
    const startHour = category === 'mostre' || category === 'aperture' ? 10 : 19;
    const eventDate = new Date(nowMs);
    eventDate.setHours(startHour, 0, 0, 0);

    const startMs = eventDate.getTime();
    const endMs = startMs + (category === 'mostre' ? 8 * 3600 * 1000 : 2 * 3600 * 1000);

    const venueMatch = chunk.match(/class="[^"]*(?:luogo|venue|location|place)[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/i);
    const venueName = venueMatch ? decodeHtml(venueMatch[1].replace(/<[^>]+>/g, '')).trim() : 'Milano';

    events.push({
      id,
      source: 'YesMilano',
      sourceName: 'YesMilano.it',
      title,
      description,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      venueName,
      address: `${venueName}, Milano`,
      neighborhood: 'Milano',
      isFree,
      isSoldOut: false,
      priceDetails: isFree ? 'GRATIS' : 'Consulta YesMilano.it',
      category,
      eventType: 'TEMPORARY_EXHIBITION',
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' Milano')}`,
      instagramUrl: resolveVenueInstagram(venueName),
      facebookUrl: null,
      sourceUrl,
      origin: 'yesmilano_crawler',
      sourceBadge: 'YESMILANO'
    });
  }

  return events;
}

export default { crawlYesMilano };
