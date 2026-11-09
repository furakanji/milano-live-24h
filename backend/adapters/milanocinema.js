import { romeToUtcMs, romeParts } from '../romeTime.js';

/**
 * Aggregatore cinema di Milano (milanocinema.com): API JSON pubblica con una riga
 * per ogni proiezione (cinema + film + data + ora). Una riga = un evento.
 */
export const MILANOCINEMA = {
  id: 'milanocinema',
  venueName: 'Cinema di Milano (milanocinema.com)',
  url: 'https://milanocinema.com/',
  replacesCategories: ['cinema'],
  api: 'https://milanocinema.com/api/screenings?date='
};

const IS_MILAN = /Milano(?:\s+MI)?\s*$/i;

export function isMilanCity(row) {
  return IS_MILAN.test(String(row.cinema_address || '').trim());
}

/** Date (YYYY-MM-DD, Europe/Rome) coperte da una finestra [nowMs, nowMs+hours]. */
export function datesForWindow(nowMs, hours = 36) {
  const out = [];
  for (let t = nowMs; t <= nowMs + hours * 3600000; t += 3600000) {
    const p = romeParts(t);
    const k = `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

export async function fetchMilanoCinema(nowMs = Date.now()) {
  const rows = [];
  for (const date of datesForWindow(nowMs)) {
    const res = await fetch(MILANOCINEMA.api + date, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'MilanoLive24hBot/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} per ${date}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Risposta API non è una lista (struttura cambiata)');
    rows.push(...json);
  }
  return rows;
}

/** parse: valida le righe di Milano città; rawTimeCount = righe attese, events = righe valide. */
export function parseMilanoCinema(rows) {
  const city = rows.filter(isMilanCity);
  const events = [];
  for (const r of city) {
    const m = String(r.time || '').match(/^(\d{1,2}):(\d{2})/);
    const d = String(r.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m || !d || !r.movie_title) continue;
    events.push({ row: r, startMs: romeToUtcMs(+d[1], +d[2], +d[3], +m[1], +m[2]) });
  }
  return { events, rawTimeCount: city.length };
}

export function toFeedEvents(parsed) {
  const seen = new Set();
  const out = [];
  for (const { row: r, startMs } of parsed) {
    const key = `${r.cinema_slug}|${r.movie_title}|${startMs}|${r.room_name || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dur = Number(r.movie_duration_minutes) || 110;
    const lang = r.language === 'ITA' ? 'in italiano' : r.language ? `versione originale (${r.language})` : '';
    out.push({
      id: `cine-${r.cinema_slug}-${startMs}-${String(r.movie_title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
      title: `${r.movie_title}${r.language && r.language !== 'ITA' ? ` — ${r.language}` : ''}`,
      description: `Proiezione al ${r.cinema_name}${r.room_name ? ` (${r.room_name})` : ''}${lang ? `, ${lang}` : ''}${r.movie_director ? `. Regia di ${r.movie_director}` : ''}.`,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(startMs + dur * 60000).toISOString(),
      venueName: r.cinema_name,
      neighborhood: 'Milano',
      address: String(r.cinema_address).replace(/,?\s*\d{5}\s+Milano(\s+MI)?$/i, ', Milano'),
      isFree: false,
      isSoldOut: r.availability === 'sold_out',
      priceDetails: 'Biglietti in cassa o online',
      category: 'cinema',
      eventType: 'CINEMA_SCREENING',
      sourceName: 'milanocinema.com',
      sourceUrl: r.booking_url || r.cinema_website || MILANOCINEMA.url,
      instagramUrl: null,
      facebookUrl: null,
      _cinemaSlug: r.cinema_slug
    });
  }
  return out;
}

export default {
  ...MILANOCINEMA,
  fetch: fetchMilanoCinema,
  parse: parseMilanoCinema,
  toFeedEvents
};
