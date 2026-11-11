/**
 * MilanoToday Eventi Crawler (`services/crawlers/milanoTodayCrawler.js`)
 * Targets:
 * - https://www.milanotoday.it/eventi/da/${today}/a/${today}/
 * - https://www.milanotoday.it/eventi/da/${tomorrow}/a/${tomorrow}/
 * - Fallback: https://www.milanotoday.it/eventi/
 */

import {
  universalFetch,
  cleanDescription,
  decodeHtml,
  hashString,
  getRomeDateStrings,
  classifyMilanCategory,
  detectFreeEntry,
  resolveVenueInstagram
} from './crawlerUtils.js';

export async function crawlMilanoToday({ nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const { today, tomorrow } = getRomeDateStrings(nowMs);
  const targetUrls = [
    `https://www.milanotoday.it/eventi/da/${today}/a/${today}/`,
    `https://www.milanotoday.it/eventi/da/${tomorrow}/a/${tomorrow}/`,
    'https://www.milanotoday.it/eventi/'
  ];

  const events = [];
  const seenIds = new Set();

  for (const url of targetUrls) {
    try {
      const html = await fetcher(url);

      // Match c-card blocks
      const cardMatches = [...html.matchAll(/<div\b[^>]*class="[^"]*c-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];

      for (const cm of cardMatches) {
        const chunk = cm[1];
        const headingMatch = chunk.match(/<(?:h2|h3)\b[^>]*class="[^"]*c-card__heading[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|h3)>/i);
        if (!headingMatch) continue;

        const title = decodeHtml(headingMatch[1].replace(/<[^>]+>/g, '')).trim();
        if (!title || title.length < 4) continue;

        const linkMatch = chunk.match(/<a\b[^>]*href="([^"]*\/eventi\/[^"]+)"[^>]*>/i);
        let sourceUrl = linkMatch ? linkMatch[1] : url;
        if (sourceUrl.startsWith('//')) sourceUrl = 'https:' + sourceUrl;
        else if (sourceUrl.startsWith('/')) sourceUrl = 'https://www.milanotoday.it' + sourceUrl;

        const id = `milanotoday-${hashString(sourceUrl + title)}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Description / excerpt
        const descMatch = chunk.match(/<p\b[^>]*class="[^"]*(?:c-card__description|c-card__text|o-text-lead)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
        const descRaw = descMatch ? descMatch[1] : '';
        const description = cleanDescription(descRaw) || `Evento in programma a Milano segnalato su MilanoToday.`;

        // Venue / Location info in card
        const locMatch = chunk.match(/class="[^"]*(?:c-card__place|c-card__location|u-color-secondary)[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/i);
        const venueName = locMatch ? decodeHtml(locMatch[1].replace(/<[^>]+>/g, '')).trim() : 'Milano';

        // Time slot: infer from text or set default
        const isFree = detectFreeEntry(`${title} ${chunk}`);
        const category = classifyMilanCategory(`${title} ${descRaw}`);

        // Extract hour if present (e.g. ore 21:00)
        const hourMatch = chunk.match(/ore\s+(\d{1,2})[.:](\d{2})/i) || title.match(/ore\s+(\d{1,2})[.:](\d{2})/i);
        const startHour = hourMatch ? parseInt(hourMatch[1], 10) : (category === 'mostre' ? 10 : 20);
        const startMin = hourMatch ? parseInt(hourMatch[2], 10) : 30;

        const eventDate = new Date(nowMs);
        if (url.includes(tomorrow)) {
          eventDate.setDate(eventDate.getDate() + 1);
        }
        eventDate.setHours(startHour, startMin, 0, 0);

        const startMs = eventDate.getTime();
        const endMs = startMs + (category === 'mostre' ? 7 * 3600 * 1000 : 2 * 3600 * 1000);

        events.push({
          id,
          source: 'MilanoToday',
          sourceName: 'MilanoToday Eventi',
          title,
          description,
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          venueName,
          address: `${venueName}, Milano`,
          neighborhood: 'Milano',
          isFree,
          isSoldOut: false,
          priceDetails: isFree ? 'GRATIS' : (chunk.includes('Gratuito') ? 'GRATIS' : 'A Pagamento'),
          category,
          eventType: 'SPECIAL_EVENT',
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' Milano')}`,
          instagramUrl: resolveVenueInstagram(venueName),
          facebookUrl: null,
          sourceUrl,
          origin: 'milanotoday_crawler',
          sourceBadge: 'MILANOTODAY'
        });
      }

      if (events.length >= 10) break;
    } catch (err) {
      // Continue to next URL
    }
  }

  return events;
}

export default { crawlMilanoToday };
