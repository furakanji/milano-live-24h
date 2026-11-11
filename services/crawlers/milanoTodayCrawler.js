/**
 * MilanoToday Eventi Crawler (`services/crawlers/milanoTodayCrawler.js`)
 * Targets:
 * - https://www.milanotoday.it/eventi/dal/${today}/al/${today}/
 * - https://www.milanotoday.it/eventi/dal/${tomorrow}/al/${tomorrow}/
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
    `https://www.milanotoday.it/eventi/dal/${today}/al/${today}/`,
    `https://www.milanotoday.it/eventi/dal/${tomorrow}/al/${tomorrow}/`,
    'https://www.milanotoday.it/eventi/'
  ];

  const events = [];
  const seenIds = new Set();
  const windowEndMs = nowMs + 24 * 3600 * 1000;

  for (const url of targetUrls) {
    try {
      const html = await fetcher(url);

      // Match <article class="...c-card...">
      const cardMatches = [...html.matchAll(/<article\b[^>]*class="[^"]*c-card[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)];

      for (const cm of cardMatches) {
        const chunk = cm[1];
        const headingMatch = chunk.match(/<(?:h2|h3)\b[^>]*class="[^"]*c-card__heading[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|h3)>/i)
          || chunk.match(/<(?:h2|h3)\b[^>]*>([\s\S]*?)<\/(?:h2|h3)>/i);
        if (!headingMatch) continue;

        const title = decodeHtml(headingMatch[1].replace(/<[^>]+>/g, '')).trim();
        if (!title || title.length < 3) continue;

        const linkMatch = chunk.match(/href="(\/eventi\/[^"]+)"/i) || chunk.match(/href="([^"*]+\/eventi\/[^"]+)"/i);
        let sourceUrl = linkMatch ? linkMatch[1] : url;
        if (sourceUrl.startsWith('//')) sourceUrl = 'https:' + sourceUrl;
        else if (sourceUrl.startsWith('/')) sourceUrl = 'https://www.milanotoday.it' + sourceUrl;

        const id = `milanotoday-${hashString(sourceUrl + title)}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Venue from #icon-map-pin
        const venuePinMatch = chunk.match(/#icon-map-pin[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/i);
        const venueName = venuePinMatch ? decodeHtml(venuePinMatch[1].replace(/<[^>]+>/g, '')).trim() : 'Milano';

        // Date / calendar details
        const calMatch = chunk.match(/#icon-calendar[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/i);
        const calText = calMatch ? decodeHtml(calMatch[1].replace(/<[^>]+>/g, '')).trim() : '';

        // Category from kicker
        const kickerMatch = chunk.match(/class="[^"]*c-card__kicker[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        const kicker = kickerMatch ? decodeHtml(kickerMatch[1].replace(/<[^>]+>/g, '')).trim() : '';

        // Pricing badge
        const isFree = detectFreeEntry(`${title} ${chunk}`) || /gratis|gratuito/i.test(chunk);
        const priceDetails = isFree ? 'GRATIS' : 'A Pagamento / Consulta MilanoToday';

        const category = classifyMilanCategory(`${title} ${kicker} ${venueName}`);

        // Extract hour if explicitly mentioned (e.g. ore 21:00)
        const hourMatch = chunk.match(/ore\s+(\d{1,2})[.:](\d{2})/i) || title.match(/ore\s+(\d{1,2})[.:](\d{2})/i);
        const startHour = hourMatch ? parseInt(hourMatch[1], 10) : (category === 'mostre' ? 10 : 20);
        const startMin = hourMatch ? parseInt(hourMatch[2], 10) : 0;

        const isTomorrow = url.includes(tomorrow) || /solo domani|domani/i.test(chunk);
        const targetDate = isTomorrow ? tomorrow : today;
        const startMs = Date.parse(`${targetDate}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00+01:00`);
        const durationHours = category === 'mostre' ? 8 : 2.5;
        const endMs = startMs + durationHours * 3600 * 1000;

        // Strict 24h rolling window check
        if (endMs <= nowMs || startMs > windowEndMs) continue;

        const description = `Evento a Milano (${calText || 'oggi/domani'}) segnalato da MilanoToday presso ${venueName}.`;

        events.push({
          id,
          source: 'MilanoToday',
          sourceName: 'MilanoToday Eventi',
          title,
          description,
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          venueName,
          address: /milano/i.test(venueName) ? venueName : `${venueName}, Milano`,
          neighborhood: 'Milano',
          isFree,
          isSoldOut: false,
          priceDetails,
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
    } catch {
      // Continue to next URL
    }
  }

  return events;
}

export default { crawlMilanoToday };
