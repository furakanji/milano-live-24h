/**
 * Pipeline "live" (eseguita 3 volte al giorno da GitHub Actions):
 *  1. adapter per fonte -> eventi atomici (1 record per proiezione/orario/data)
 *  2. gate di completezza (orari grezzi nella pagina == eventi estratti)
 *  3. gate di natura (EventVerifierAgent)
 *  4. fallback "curated" solo per le venue senza adapter (o con adapter fallito)
 *  5. scrive public/verified-events-24h.json con report per fonte
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cinemino from './adapters/cinemino.js';
import milanocinema from './adapters/milanocinema.js';
import { verifyEventCandidateWithAgent, REJECTED_CANDIDATES_LOG } from './eventVerifierAgent.js';

export const ADAPTERS = [cinemino, milanocinema];
const HOURS_WINDOW = 36; // margine oltre le 24h: il frontend ritaglia la finestra esatta

export async function runAdapter(adapter, lines) {
  const parsed = adapter.parse(lines);
  if (parsed.events.length !== parsed.rawTimeCount) {
    throw new Error(`Completezza fallita: ${parsed.rawTimeCount} orari nella pagina, ${parsed.events.length} eventi estratti`);
  }
  return adapter.toFeedEvents(parsed.events);
}

export async function buildFeed({ nowMs = Date.now(), loadLines = (a, now) => a.fetch(now) } = {}) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { generateRolling24hFeed, buildMapsUrl } = await import(path.join(repoRoot, 'src', 'data', 'milanEventsGenerator.js'));
  const to = nowMs + HOURS_WINDOW * 3600000;
  const sources = [];
  const events = [];
  const okVenues = new Set();
  const okCategories = new Set();
  const results = {};
  const rejected = [...REJECTED_CANDIDATES_LOG];

  for (const ad of ADAPTERS) {
    const rep = { id: ad.id, venueName: ad.venueName, url: ad.url, checkedAt: new Date(nowMs).toISOString() };
    try {
      const all = await runAdapter(ad, await loadLines(ad, nowMs));
      const inWin = all.filter((e) => Date.parse(e.endTime) > nowMs && Date.parse(e.startTime) < to);
      rep.status = 'ok'; rep.found = all.length; rep.published = inWin.length;
      results[ad.id] = inWin;
      for (const e of inWin) {
        // Il Cinemino è letto direttamente: le righe dell'aggregatore servono solo da controllo incrociato
        if (ad.id === 'milanocinema' && e._cinemaSlug === 'ilcinemino' && results.cinemino && sources.find((x) => x.id === 'cinemino' && x.status === 'ok')) { rep.crossCheckOnly = (rep.crossCheckOnly || 0) + 1; rep.published -= 1; continue; }
        const v = verifyEventCandidateWithAgent(e);
        if (!v.isValidEvent) { rejected.push({ id: e.id, title: e.title, venueName: e.venueName, sourceUrl: e.sourceUrl, verdict: v.verdict, rejectionReasons: v.rejectionReasons, checkedAt: rep.checkedAt }); rep.published -= 1; continue; }
        events.push({ ...e, mapsUrl: buildMapsUrl(e.venueName, e.address), isSoldOut: v.isSoldOut, availabilityBadge: v.availabilityBadge, origin: 'adapter' });
      }
      okVenues.add(ad.venueName);
      (ad.replacesCategories || []).forEach((c) => okCategories.add(c));
    } catch (err) {
      rep.status = 'error'; rep.error = String(err.message || err); rep.published = 0;
    }
    sources.push(rep);
  }

  // Controllo incrociato indipendente: Cinemino diretto vs aggregatore
  if (results.cinemino && results.milanocinema) {
    const direct = new Set(results.cinemino.map((e) => Date.parse(e.startTime)));
    const agg = new Set(results.milanocinema.filter((e) => e._cinemaSlug === 'ilcinemino').map((e) => Date.parse(e.startTime)));
    const inWin = (t) => t >= nowMs && t < nowMs + 24 * 3600000;
    const onlyDirect = [...direct].filter((t) => inWin(t) && !agg.has(t));
    const onlyAgg = [...agg].filter((t) => inWin(t) && !direct.has(t));
    const rep = { id: 'audit-cinemino', venueName: 'Controllo incrociato Cinemino (fonte diretta vs milanocinema.com)', status: onlyDirect.length + onlyAgg.length ? 'warning' : 'ok', published: 0, checkedAt: new Date(nowMs).toISOString() };
    if (rep.status === 'warning') rep.error = `Differenze: solo fonte diretta [${onlyDirect.map((t) => new Date(t).toISOString())}], solo aggregatore [${onlyAgg.map((t) => new Date(t).toISOString())}]`;
    sources.push(rep);
  }

  // Fallback curated (venue senza adapter): istanze per oggi e domani
  const seen = new Set();
  let curatedCount = 0;
  for (const base of [nowMs, nowMs + 24 * 3600000]) {
    for (const ev of generateRolling24hFeed(base)) {
      if (okVenues.has(ev.venueName) || okCategories.has(ev.category)) continue;
      const key = `${ev.id}|${ev.startTime}`;
      if (seen.has(key)) continue;
      const v = verifyEventCandidateWithAgent(ev);
      if (!v.isValidEvent) continue;
      seen.add(key);
      curatedCount += 1;
      events.push({
        id: ev.id, title: ev.title, description: ev.description, startTime: ev.startTime, endTime: ev.endTime,
        venueName: ev.venueName, neighborhood: ev.neighborhood, address: ev.address, isFree: ev.isFree,
        priceDetails: ev.priceDetails, category: ev.category, eventType: ev.eventType, mapsUrl: ev.mapsUrl,
        sourceName: ev.sourceName, sourceUrl: ev.sourceUrl, instagramUrl: ev.instagramUrl, facebookUrl: ev.facebookUrl,
        isSoldOut: v.isSoldOut, availabilityBadge: v.availabilityBadge, origin: 'curated'
      });
    }
  }
  sources.push({ id: 'curated', venueName: 'Venue senza adapter (dati curati)', status: 'curated', published: curatedCount, checkedAt: new Date(nowMs).toISOString() });

  events.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return {
    generatedAt: new Date(nowMs).toISOString(),
    agentVersion: '3.0.0-live-feed',
    schedule: '3 volte al giorno (05:00, 13:00, 19:00 UTC)',
    sources,
    stats: { approvedCount: events.length, adapterEvents: events.filter((e) => e.origin === 'adapter').length, curatedEvents: curatedCount, soldOutWithBadgeCount: events.filter((e) => e.isSoldOut).length, rejectedCount: rejected.length },
    verifiedEvents: events,
    rejectedCandidatesLog: rejected
  };
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const payload = await buildFeed();
  const out = path.join(repoRoot, 'public', 'verified-events-24h.json');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(payload, null, 2));
  console.log('[liveFeed]', JSON.stringify(payload.stats));
  payload.sources.forEach((s) => console.log(`  - ${s.id}: ${s.status} (${s.published ?? 0} eventi)${s.error ? ' ERR ' + s.error : ''}`));
  if (payload.sources.some((s) => s.status === 'error')) console.warn('[liveFeed] ATTENZIONE: almeno una fonte in errore, usato fallback curato');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
