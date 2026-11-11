/**
 * Zero Milano Crawler (`services/crawlers/zeroCrawler.js`)
 * Targets:
 * 1. Zero Direct API (official Backbone/WP endpoint):
 *    `https://zero.eu/api/v2/events?metro_area=milano&start_date=${date}&end_date=${date}&per_page=50`
 * 2. Static HTML / JSON-LD fallback:
 *    `https://zero.eu/it/milano/eventi/domani/` and `/oggi/`
 */

import {
  universalFetch,
  cleanDescription,
  decodeHtml,
  hashString,
  classifyMilanCategory,
  detectFreeEntry,
  resolveVenueInstagram,
  getRomeDateStrings
} from './crawlerUtils.js';

export async function crawlZeroMilano({ nowMs = Date.now(), fetcher = universalFetch } = {}) {
  const { today, tomorrow } = getRomeDateStrings(nowMs);
  const events = [];
  const seenIds = new Set();
  const windowEndMs = nowMs + 24 * 3600 * 1000;

  // 1. STRATEGY A: Official Zero Events API for today and tomorrow
  const datesToQuery = [today, tomorrow];
  for (const queryDate of datesToQuery) {
    const apiUrl = `https://zero.eu/api/v2/events?metro_area=milano&start_date=${queryDate}&end_date=${queryDate}&per_page=50`;
    try {
      const rawText = await fetcher(apiUrl);
      const items = JSON.parse(rawText);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item) continue;

          const titleRaw = item.name?.rendered || item.name?.plain || item.name || item.title?.rendered || item.title || '';
          const title = decodeHtml(typeof titleRaw === 'string' ? titleRaw : (titleRaw.rendered || titleRaw.plain || '')).trim();
          if (!title) continue;

          // Parse start and end time
          const dateStr = item.date_scope || item.start_date || queryDate;
          const timeStr = (item.start_time || '').trim();
          
          let startMs;
          if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
            const [hh, mm] = timeStr.split(':').map(n => parseInt(n, 10));
            // Create Date in Europe/Rome context
            const d = new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+01:00`);
            startMs = isNaN(d.getTime()) ? Date.parse(`${dateStr}T19:00:00+01:00`) : d.getTime();
          } else {
            // Sensible slot based on category
            const inferredHour = (item.category && item.category.some(c => /mostr|arte|museum/i.test(c))) ? 10 : 19;
            startMs = Date.parse(`${dateStr}T${String(inferredHour).padStart(2, '0')}:00:00+01:00`);
          }

          let endMs = startMs + 3 * 3600 * 1000;
          if (item.end_time && /^\d{1,2}:\d{2}/.test(item.end_time)) {
            const [ehh, emm] = item.end_time.split(':').map(n => parseInt(n, 10));
            const ed = new Date(`${dateStr}T${String(ehh).padStart(2, '0')}:${String(emm).padStart(2, '0')}:00+01:00`);
            if (!isNaN(ed.getTime()) && ed.getTime() > startMs) {
              endMs = ed.getTime();
            }
          }

          // Strict rolling window filter [nowMs, nowMs + 24h]
          if (endMs <= nowMs || startMs > windowEndMs) continue;

          const venueName = decodeHtml(item.venue_name || 'Milano').trim();
          const address = decodeHtml(item.venue_coords ? `${venueName}, Milano` : `${venueName}, Milano`).trim();
          const descRaw = item.excerpt?.plain || item.excerpt?.rendered || item.content?.plain || item.content?.rendered || '';
          const description = cleanDescription(descRaw, 240) || `Evento selezionato da Zero Milano presso ${venueName}.`;
          const sourceUrl = item.link || (item.slug ? `https://zero.eu/it/eventi/${item.id}-${item.slug},milano/` : 'https://zero.eu/it/milano/eventi/');
          const priceRaw = (item.price || '').trim();
          const isFree = detectFreeEntry(`${title} ${descRaw} ${priceRaw}`) || /^(free|gratis|0\s*€?)$/i.test(priceRaw);
          const priceDetails = isFree ? 'GRATIS' : (priceRaw || 'Verifica su Zero.eu');

          const categoryArray = Array.isArray(item.category) ? item.category.join(' ') : '';
          const category = classifyMilanCategory(`${title} ${descRaw} ${categoryArray}`);

          const id = `zero-${item.id || hashString(sourceUrl + title)}`;
          if (seenIds.has(id)) continue;
          seenIds.add(id);

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
            priceDetails,
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
    } catch {
      // Continue to next date or fallback
    }
  }

  // 2. STRATEGY B: Fallback to HTML / JSON-LD schema parsing if API returned 0
  if (events.length === 0) {
    const fallbackUrls = [
      'https://zero.eu/it/milano/eventi/domani/',
      'https://zero.eu/it/milano/eventi/oggi/',
      'https://zero.eu/it/milano/eventi/'
    ];

    for (const targetUrl of fallbackUrls) {
      try {
        const html = await fetcher(targetUrl);
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

              if (!startMs || isNaN(startMs)) {
                startMs = nowMs + 2 * 3600 * 1000;
              }
              if (!endMs || isNaN(endMs) || endMs <= startMs) {
                endMs = startMs + 3 * 3600 * 1000;
              }

              if (endMs <= nowMs || startMs > windowEndMs) continue;

              const venueName = decodeHtml(item.location?.name || 'Milano').trim();
              const address = decodeHtml(item.location?.address?.streetAddress || item.location?.address || `${venueName}, Milano`).trim();
              const descRaw = item.description || '';
              const description = cleanDescription(descRaw, 240) || `Evento segnalato da Zero Milano presso ${venueName}.`;
              const sourceUrl = item.url || targetUrl;
              const isFree = detectFreeEntry(`${title} ${descRaw}`);
              const category = classifyMilanCategory(`${title} ${descRaw}`);
              const id = `zero-${hashString(sourceUrl + title)}`;

              if (seenIds.has(id)) continue;
              seenIds.add(id);

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
      } catch {
        // Continue
      }
    }
  }

  return events;
}

export default { crawlZeroMilano };
