/**
 * Mentelocale Milano Eventi Crawler (`services/crawlers/mentelocaleCrawler.js`)
 * Targets:
 * - https://www.mentelocale.it/milano/eventi/oggi/
 * - https://www.mentelocale.it/milano/eventi/domani/
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

export async function crawlMentelocale({ nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const targetUrls = [
    'https://www.mentelocale.it/milano/eventi/oggi/',
    'https://www.mentelocale.it/milano/eventi/domani/'
  ];

  const events = [];
  const seenIds = new Set();

  for (const url of targetUrls) {
    try {
      const html = await fetcher(url);
      const isTomorrow = url.includes('/domani/');

      // Match event card anchors (`<a ... href=".../milano/.../ID-slug.htm">`)
      const cardMatches = [...html.matchAll(/<a\b[^>]*href="([^"]*\/milano\/[^"]*\d+-[^"]+\.htm)"[^>]*>([\s\S]*?)<\/a>/gi)];

      for (const cm of cardMatches) {
        let sourceUrl = cm[1];
        if (sourceUrl.startsWith('/')) {
          sourceUrl = 'https://www.mentelocale.it' + sourceUrl;
        }
        const inner = cm[2];

        // Heading / Title in h3 or h4
        const headingMatch = inner.match(/<(?:h2|h3|h4)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i);
        if (!headingMatch) continue;

        const title = decodeHtml(headingMatch[1].replace(/<[^>]+>/g, '')).trim();
        if (!title || title.length < 4) continue;

        const id = `mentelocale-${hashString(sourceUrl + title)}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Excerpt / Description
        const descMatch = inner.match(/class="[^"]*(?:lab-lead-estratto|descrizione|excerpt|lead)[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/i);
        const descRaw = descMatch ? descMatch[1] : '';
        const description = cleanDescription(descRaw) || `Appuntamento in programma a Milano selezionato da Mentelocale.`;

        // Venue
        const placeMatch = inner.match(/class="[^"]*(?:lab-lead-place|luogo|place)[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/i);
        const venueName = placeMatch ? decodeHtml(placeMatch[1].replace(/<[^>]+>/g, '')).trim() : 'Milano';

        // Hour extraction (e.g. ore 21.00 or ore 20:30)
        const hourMatch = inner.match(/ore\s+(\d{1,2})[.:](\d{2})/i) || title.match(/ore\s+(\d{1,2})[.:](\d{2})/i);
        const category = classifyMilanCategory(`${title} ${inner}`);
        const startHour = hourMatch ? parseInt(hourMatch[1], 10) : (category === 'mostre' ? 10 : 20);
        const startMin = hourMatch ? parseInt(hourMatch[2], 10) : (hourMatch ? 0 : 30);

        const eventDate = new Date(nowMs);
        if (isTomorrow) {
          eventDate.setDate(eventDate.getDate() + 1);
        }
        eventDate.setHours(startHour, startMin, 0, 0);

        const startMs = eventDate.getTime();
        const endMs = startMs + 2 * 3600 * 1000;

        const isFree = detectFreeEntry(`${title} ${inner}`);

        events.push({
          id,
          source: 'Mentelocale',
          sourceName: 'Mentelocale Milano',
          title,
          description,
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          venueName,
          address: `${venueName}, Milano`,
          neighborhood: 'Milano',
          isFree,
          isSoldOut: false,
          priceDetails: isFree ? 'GRATIS' : 'Biglietti su Mentelocale',
          category,
          eventType: 'SPECIAL_EVENT',
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' Milano')}`,
          instagramUrl: resolveVenueInstagram(venueName),
          facebookUrl: null,
          sourceUrl,
          origin: 'mentelocale_crawler',
          sourceBadge: 'MENTELOCALE'
        });
      }

      if (events.length >= 15) break;
    } catch {
      // Continue next target URL
    }
  }

  return events;
}

export default { crawlMentelocale };
