import { romeToUtcMs } from '../romeTime.js';

export const VERSO = {
  id: 'verso',
  venueName: 'Libreria Verso',
  url: 'http://www.libreriaverso.com/appuntamenti/',
  address: 'Corso di Porta Ticinese 40, Milano',
  neighborhood: 'Porta Ticinese / Colonne'
};

const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

export async function fetchVerso() {
  const res = await fetch(VERSO.url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'MilanoLive24hBot/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/**
 * Estrae gli appuntamenti con data/ora/titolo specifici dal listing WordPress di Verso.
 */
export function parseVerso(html) {
  const articles = html.split(/<article\b[^>]*>/i).slice(1);
  const events = [];
  let rawEventCount = 0;

  for (const art of articles) {
    const chunk = art.split(/<\/article>/i)[0];
    const linkMatch = chunk.match(/<a\b[^>]*href="([^"]*libreriaverso\.com\/appuntamenti\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const dateMatch = chunk.match(/(\d{1,2})\s+(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+(\d{4})(?:[\s\S]*?ore\s+(\d{1,2})[.:](\d{2}))?/i);

    if (linkMatch && dateMatch) {
      rawEventCount++;
      const url = linkMatch[1];
      let titleRaw = linkMatch[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/\s+/g, ' ').trim();
      // Se il titolo inizia con tag di categoria tipo "PRESENTAZIONE", puliscilo se necessario
      titleRaw = titleRaw.replace(/^(PRESENTAZIONE|LABORATORIO|INIZIATIVE|MILANESISSIMO BOOK CLUB|VERSO CINEMA|OMAGGIO|VERSATILE BOOK CLUB|IL BOOKCLUB DI SENZA ROSSETTO|SPETTROGRAMMA BOOK CLUB)\s+/i, '');
      const day = parseInt(dateMatch[1], 10);
      const month = MONTHS.indexOf(dateMatch[2].toLowerCase()) + 1;
      const year = parseInt(dateMatch[3], 10);
      const hour = dateMatch[4] ? parseInt(dateMatch[4], 10) : 19;
      const min = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;

      const descMatch = chunk.match(/<p\b[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                        chunk.match(/<p>([\s\S]*?)<\/p>/i);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      const startMs = romeToUtcMs(year, month, day, hour, min);

      events.push({
        title: titleRaw,
        url,
        desc,
        startMs,
        isSpecificEvent: true
      });
    }
  }

  return { events, rawTimeCount: rawEventCount };
}

export function toFeedEvents(parsed) {
  return parsed.map((p) => {
    return {
      id: `verso-${p.startMs}-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
      title: p.title,
      description: p.desc || `Incontro e presentazione presso ${VERSO.venueName} in ${VERSO.address}.`,
      startTime: new Date(p.startMs).toISOString(),
      endTime: new Date(p.startMs + 90 * 60000).toISOString(),
      venueName: VERSO.venueName,
      neighborhood: VERSO.neighborhood,
      address: VERSO.address,
      isFree: true,
      isSoldOut: false,
      priceDetails: 'GRATIS • Ingresso libero',
      category: 'libri',
      eventType: 'PUBLIC_TALK',
      sourceName: 'libreriaverso.com',
      sourceUrl: p.url,
      instagramUrl: null,
      facebookUrl: null
    };
  });
}

export default {
  ...VERSO,
  fetch: fetchVerso,
  parse: parseVerso,
  toFeedEvents
};
