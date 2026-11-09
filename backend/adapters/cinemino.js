import { romeToUtcMs, romeParts } from '../romeTime.js';

export const CINEMINO = {
  id: 'cinemino',
  venueName: 'Il Cinemino',
  url: 'https://www.ilcinemino.it/programmazione/',
  address: 'Via Seneca 6, Milano',
  neighborhood: 'Porta Romana / Via Seneca'
};

const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

/** Converte HTML in righe di testo non vuote. */
export function htmlToLines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|tr|td|h\d|a|span|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&#8217;/g, "'").replace(/&nbsp;/g, ' ')
    .split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * Estrae UNA proiezione per ogni orario dalla tabella calendario del Cinemino.
 * Ritorna { events, rawTimeCount } (rawTimeCount serve al gate di completezza).
 */
export function parseCinemino(lines) {
  const head = lines.find((l) => /^(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}$/i.test(l));
  if (!head) throw new Error('Intestazione mese/anno non trovata (struttura pagina cambiata)');
  const [mName, yStr] = head.toLowerCase().split(/\s+/);
  let month = MONTHS.indexOf(mName) + 1;
  let year = +yStr;
  let lastDay = 0;
  let curDay = null;
  let pendingTitle = null;
  const events = [];
  let rawTimeCount = 0;

  for (const line of lines) {
    const dm = line.match(/^(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\s+(\d{1,2})$/);
    if (dm) {
      const day = +dm[2];
      if (day < lastDay) { month += 1; if (month > 12) { month = 1; year += 1; } }
      lastDay = day; curDay = { y: year, mo: month, d: day }; pendingTitle = null;
      continue;
    }
    const tm = line.match(/^(.*?)(\d{1,2}):(\d{2})$/);
    if (tm && curDay && /^[^A-Za-zÀ-ÿ0-9]*$/.test(tm[1])) {
      rawTimeCount += 1;
      if (!pendingTitle) continue;
      const h = +tm[2], mi = +tm[3];
      const flags = tm[1];
      const startMs = romeToUtcMs(curDay.y, curDay.mo, curDay.d, h, mi);
      events.push({
        title: pendingTitle,
        startMs,
        dubbed: flags.includes('🇮🇹'),
        subtitled: flags.includes('🌍'),
        dogFriendly: flags.includes('🐶')
      });
      pendingTitle = null;
      continue;
    }
    if (curDay && !/^(L|M|G|V|S|D)(\s+(L|M|G|V|S|D))*$/.test(line)) pendingTitle = line;
  }
  return { events, rawTimeCount };
}

/** Normalizza nello schema evento atomico del feed. */
export function toFeedEvents(parsed) {
  return parsed.map((p) => {
    const p0 = romeParts(p.startMs);
    const lang = p.dubbed ? 'doppiato ITA' : p.subtitled ? 'v.o. sott. ITA' : '';
    const tags = [lang, p.dogFriendly ? 'Cinebau (ammessi i cani)' : ''].filter(Boolean).join(' • ');
    const stamp = `${p0.y}${String(p0.mo).padStart(2, '0')}${String(p0.d).padStart(2, '0')}-${String(p0.h).padStart(2, '0')}${String(p0.mi).padStart(2, '0')}`;
    return {
      id: `cinemino-${stamp}-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
      title: p.title,
      description: `Proiezione al Cinemino (${CINEMINO.address})${tags ? ` — ${tags}` : ''}.`,
      startTime: new Date(p.startMs).toISOString(),
      endTime: new Date(p.startMs + 100 * 60000).toISOString(),
      venueName: CINEMINO.venueName,
      neighborhood: CINEMINO.neighborhood,
      address: CINEMINO.address,
      isFree: false,
      priceDetails: '€9,00 Intero / €7,00 Ridotto + Tessera',
      category: 'cinema',
      eventType: 'CINEMA_SCREENING',
      sourceName: 'ilcinemino.it/programmazione',
      sourceUrl: CINEMINO.url,
      instagramUrl: null,
      facebookUrl: null
    };
  });
}

export async function fetchCinemino() {
  const res = await fetch(CINEMINO.url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'MilanoLive24hBot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return htmlToLines(await res.text());
}

export default { ...CINEMINO, fetch: fetchCinemino, parse: parseCinemino, toFeedEvents };
