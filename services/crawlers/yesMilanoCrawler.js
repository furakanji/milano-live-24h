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
  resolveCanonicalVenue
} from './crawlerUtils.js';

export async function crawlYesMilano({ nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const targetUrl = 'https://www.yesmilano.it/eventi/tutti-gli-eventi';
  const html = await fetcher(targetUrl);
  const events = [];
  const seenIds = new Set();

  // Match article cards in YesMilano
  const cardMatches = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)];
  const candidateCards = [];

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
      const slug = sourceUrl.split('/').pop().replace(/-/g, ' ');
      title = slug.replace(/\b\w/g, l => l.toUpperCase());
    }

    // Skip generic weekly roundup articles like "Questa settimana a Milano"
    if (/questa settimana a milano|weekend a milano|cosa fare a milano/i.test(title)) {
      continue;
    }

    const id = `yesmilano-${hashString(sourceUrl + title)}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    candidateCards.push({ id, sourceUrl, title, chunk });
  }

  // Concurrently fetch detail pages (batch size 4)
  const detailBatches = [];
  const batchSize = 4;
  for (let i = 0; i < candidateCards.length; i += batchSize) {
    detailBatches.push(candidateCards.slice(i, i + batchSize));
  }

  for (const batch of detailBatches) {
    const detailResults = await Promise.allSettled(
      batch.map(async card => {
        try {
          const detailHtml = await fetcher(card.sourceUrl);
          return { card, detailHtml };
        } catch {
          return { card, detailHtml: '' };
        }
      })
    );

    for (const res of detailResults) {
      if (res.status !== 'fulfilled') continue;
      const { card, detailHtml } = res.value;
      const { id, sourceUrl, title, chunk } = card;

      // Extract Venue from detail page (field--name-field-location) or fallback
      const locMatch = detailHtml.match(/class="[^"]*field--name-field-location[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const indMatch = detailHtml.match(/class="[^"]*field--name-field-indirizzo[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const descDetailMatch = detailHtml.match(/class="[^"]*field--name-field-descrizione[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const otherInfoMatch = detailHtml.match(/class="[^"]*field--name-field-other-information[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

      const rawVenue = locMatch
        ? decodeHtml(locMatch[1].replace(/<[^>]+>/g, '')).trim()
        : 'Milano';

      const canonical = resolveCanonicalVenue(rawVenue);
      if (indMatch) {
        const rawAddress = decodeHtml(indMatch[1].replace(/<[^>]+>/g, '')).trim();
        if (rawAddress && canonical.address === 'Milano, Italia') {
          canonical.address = rawAddress;
        }
      }

      // Description
      const descDetail = descDetailMatch ? decodeHtml(descDetailMatch[1].replace(/<[^>]+>/g, ' ')).trim() : '';
      const descRaw = chunk.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      const description = cleanDescription(descDetail || (descRaw ? descRaw[1] : '')) ||
        `Evento in programma a Milano presso ${canonical.name}. Informazioni sul sito ufficiale YesMilano.`;

      // Free Entry & Category
      const isFree = detectFreeEntry(`${title} ${chunk} ${detailHtml.slice(0, 4000)}`);
      let category = classifyMilanCategory(`${title} ${rawVenue} ${description}`);

      // Time & Date Parsing
      const fullText = `${title} ${description} ${otherInfoMatch ? otherInfoMatch[1] : ''}`;
      const isContinuous = category === 'mostre' || category === 'aperture';

      // Detect explicit hour if mentioned in description (e.g. "ore 20.00" or "ore 19:30")
      const timeMatch = fullText.match(/\bore\s*([0-2]?[0-9])[:.]([0-5][0-9])\b/i);
      let eventHour = isContinuous ? 10 : 19;
      let eventMin = 0;
      if (timeMatch) {
        eventHour = parseInt(timeMatch[1], 10);
        eventMin = parseInt(timeMatch[2], 10);
      }

      // Check if event is scheduled for today/tomorrow or future
      const dateMatch = (otherInfoMatch ? otherInfoMatch[1] : '').match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
      let eventStartMs;
      if (dateMatch) {
        const d = parseInt(dateMatch[1], 10);
        const m = parseInt(dateMatch[2], 10) - 1;
        const y = parseInt(dateMatch[3], 10);
        const parsedDate = new Date(y, m, d, eventHour, eventMin, 0);
        eventStartMs = parsedDate.getTime();
      } else {
        const eventDate = new Date(nowMs);
        eventDate.setHours(eventHour, eventMin, 0, 0);
        eventStartMs = eventDate.getTime();
      }

      // Filter events outside rolling 24-hour window (+ 12h grace for daytime museum hours)
      const maxWindowMs = nowMs + 36 * 3600 * 1000;
      if (eventStartMs < (nowMs - 3600000) || eventStartMs > maxWindowMs) {
        continue;
      }

      const endMs = eventStartMs + (isContinuous ? 9.5 * 3600 * 1000 : 2 * 3600 * 1000);

      events.push({
        id,
        source: 'YesMilano',
        sourceName: 'YesMilano.it',
        title,
        description,
        startTime: new Date(eventStartMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        venueName: canonical.name,
        address: canonical.address,
        neighborhood: canonical.neighborhood,
        isFree,
        isSoldOut: false,
        priceDetails: isFree ? 'GRATIS' : 'Consulta YesMilano.it',
        category,
        isContinuous,
        openHour: isContinuous ? '10:00' : `${String(eventHour).padStart(2, '0')}:${String(eventMin).padStart(2, '0')}`,
        closeHour: isContinuous ? '19:30' : `${String((eventHour + 2) % 24).padStart(2, '0')}:${String(eventMin).padStart(2, '0')}`,
        eventType: isContinuous ? 'TEMPORARY_EXHIBITION' : (category === 'cinema' ? 'CINEMA_SCREENING' : 'SPECIAL_EVENT'),
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(canonical.name + ' Milano')}`,
        instagramUrl: canonical.instagramUrl,
        facebookUrl: null,
        sourceUrl,
        origin: 'yesmilano_crawler',
        sourceBadge: 'YESMILANO'
      });
    }
  }

  return events;
}

export default { crawlYesMilano };
