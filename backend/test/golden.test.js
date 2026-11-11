import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cinemino from '../adapters/cinemino.js';
import { runAdapter } from '../liveFeed.js';
import { romeParts } from '../romeTime.js';
import { verifyEventCandidateWithAgent } from '../eventVerifierAgent.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const lines = async () => (await fs.readFile(path.join(dir, '../fixtures/cinemino-2026-11.txt'), 'utf8')).split('\n').map((s) => s.trim()).filter(Boolean);
const hm = (e) => { const p = romeParts(Date.parse(e.startTime)); return `${p.d}/${p.mo} ${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; };

test('Cinemino lunedì 9 novembre: 4 proiezioni (15:00, 17:00, 19:30, 21:30)', async () => {
  const evs = await runAdapter(cinemino, await lines());
  const day = evs.filter((e) => hm(e).startsWith('9/11 ')).map(hm);
  assert.deepEqual(day, ['9/11 15:00', '9/11 17:00', '9/11 19:30', '9/11 21:30']);
});

test('Cinemino: cambio mese corretto (Mar 1 dopo Lun 30)', async () => {
  const { events } = cinemino.parse(await lines());
  assert.ok(events.length >= 10);
});

test('Gate completezza: pagina con orario non parsabile fa fallire', async () => {
  const bad = [...(await lines()), 'Mer 2', '20:00'];
  await assert.rejects(() => runAdapter(cinemino, bad), /Completezza fallita/);
});

test('Milanoguida (tour a catalogo / In programmazione) viene scartato', () => {
  const v = verifyEventCandidateWithAgent({ title: 'Milano Medievale', sourceUrl: 'https://www.milanoguida.com/visite-guidate/itinerari-milano/milano-medievale/', pageText: 'In programmazione — Vuoi essere avvisato quando saranno online nuove date?' });
  assert.equal(v.isValidEvent, false);
});

test('milanocinema: Il Cinemino 9/11 = 4 proiezioni e solo cinema di Milano città', async () => {
  const { default: mc } = await import('../adapters/milanocinema.js');
  const rows = JSON.parse(await fs.readFile(path.join(dir, '../fixtures/milanocinema-2026-11-09.json'), 'utf8'));
  const evs = await runAdapter(mc, rows);
  const cin = evs.filter((e) => e._cinemaSlug === 'ilcinemino').map(hm);
  assert.deepEqual(cin, ['9/11 15:00', '9/11 17:00', '9/11 19:30', '9/11 21:30']);
  assert.ok(!evs.some((e) => e._cinemaSlug === 'uci-lissone'), 'cinema fuori Milano esclusi');
});

test('Verso: estrae gli eventi specifici dal listing WordPress con URL dedicate', async () => {
  const { default: verso } = await import('../adapters/verso.js');
  const html = await fs.readFile(path.join(dir, '../fixtures/verso-sample.html'), 'utf8');
  const { events } = verso.parse(html);
  assert.ok(events.length > 0, 'Eventi Verso estratti con successo');
  const ev = events.find((e) => e.url.includes('libreriaverso.com/appuntamenti/'));
  assert.ok(ev, 'Evento Verso con URL specifica trovato');
  assert.ok(ev.title.length > 3, 'Titolo evento presente');
  assert.match(ev.url, /^https?:\/\/(www\.)?libreriaverso\.com\/appuntamenti\/.+/i);
});

test('diceMilanCrawler: normalizza correttamente evento DICE, calcola fuso Rome e applica schema unificato', async () => {
  const { normalizeDiceEvent, getRomeDateStrings, mapDiceCategory, resolveVenueInstagram } = await import('../diceMilanCrawler.js');
  const dates = getRomeDateStrings(Date.parse('2026-11-11T12:00:00Z'));
  assert.equal(dates.today, '2026-11-11');
  assert.equal(dates.tomorrow, '2026-11-12');

  const rawSample = {
    id: 'sample-event-123',
    name: 'Live Showcase @ Circolo Magnolia',
    dates: {
      event_start_date: '2026-11-11T21:00:00+01:00',
      event_end_date: '2026-11-12T01:00:00+01:00'
    },
    venues: [
      {
        name: 'Circolo Magnolia',
        address: 'Circonvallazione Idroscalo 41, Segrate / Milano MI',
        space_name: 'Segrate'
      }
    ],
    price: { currency: 'EUR', amount: 1500 }
  };

  const normalized = normalizeDiceEvent({
    rawEvent: rawSample,
    targetUrl: 'https://dice.fm/event/sample-event-123',
    enriched: null
  });

  assert.equal(normalized.id, 'dice-sample-event-123');
  assert.equal(normalized.venueName, 'Circolo Magnolia');
  assert.equal(normalized.category, 'concerti');
  assert.equal(normalized.isFree, false);
  assert.equal(normalized.priceDetails, '€15.00');
  assert.equal(normalized.sourceName, 'DICE.fm Milano');
  assert.equal(normalized.sourceBadge, 'DICE Live');
  assert.match(normalized.mapsUrl, /google\.com\/maps/);
  assert.equal(resolveVenueInstagram('Circolo Magnolia'), 'https://www.instagram.com/circolomagnolia/');
});
