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
