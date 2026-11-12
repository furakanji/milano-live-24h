import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCanonicalVenue,
  tokenizeTitle,
  computeJaccardSimilarity,
  checkContinuousExhibitionStatus
} from '../../services/crawlers/crawlerUtils.js';

import {
  areEventsDuplicates,
  mergeDuplicateEvents
} from '../../services/crawlers/multiSourceOrchestrator.js';

test('Deduplication 2.0: Canonical Venue Resolution recognizes aliases and variations', () => {
  assert.equal(resolveCanonicalVenue('SpazioCinema Anteo').name, 'Anteo Palazzo del Cinema');
  assert.equal(resolveCanonicalVenue('Anteo Spazio Cinema').name, 'Anteo Palazzo del Cinema');
  assert.equal(resolveCanonicalVenue('Circolo Magnolia Idroscalo').name, 'Circolo Magnolia');
  assert.equal(resolveCanonicalVenue('BASE').name, 'BASE Milano');
  assert.equal(resolveCanonicalVenue('Triennale').name, 'Triennale Milano');
  assert.equal(resolveCanonicalVenue('Hangar Bicocca').name, 'Pirelli HangarBicocca');
  assert.equal(resolveCanonicalVenue('Santeria').name, 'Santeria Toscana 31');
  assert.equal(resolveCanonicalVenue('Il Cinemino').name, 'Il Cinemino');
});

test('Deduplication 2.0: Jaccard Token Similarity strips Italian stop words and computes overlap', () => {
  const tokens1 = tokenizeTitle('Concerto Live dei Fontaines D.C. a Milano');
  const tokens2 = tokenizeTitle('Fontaines D.C. dal vivo');
  
  assert.ok(tokens1.has('fontaines'));
  assert.ok(!tokens1.has('dei')); // Stop word removed
  assert.ok(!tokens1.has('a'));   // Stop word removed

  const similarity = computeJaccardSimilarity(
    tokenizeTitle('Messa da Requiem di Giuseppe Verdi'),
    tokenizeTitle('Giuseppe Verdi - Messa da Requiem')
  );
  assert.ok(similarity >= 0.70, `Expected similarity >= 0.70, got ${similarity}`);
});

test('Deduplication 2.0: areEventsDuplicates matches cross-source events with elastic time window and fuzzy title', () => {
  const eventDice = {
    title: 'The Smile - Live in Milan',
    venueName: 'Circolo Magnolia',
    startTime: '2026-11-12T21:00:00+01:00',
    endTime: '2026-11-12T23:30:00+01:00'
  };

  const eventZero = {
    title: 'The Smile in concerto',
    venueName: 'Magnolia Idroscalo', // Resolves to Circolo Magnolia
    startTime: '2026-11-12T21:30:00+01:00', // 30 min offset (within ±90 min window)
    endTime: '2026-11-12T23:45:00+01:00'
  };

  assert.equal(areEventsDuplicates(eventDice, eventZero), true);
});

test('Deduplication 2.0: mergeDuplicateEvents combines dual source badges, richest description and ticketing', () => {
  const eventDice = {
    id: 'dice-12345',
    title: 'The Smile - Live in Milan',
    venueName: 'Circolo Magnolia',
    address: 'Circonvallazione Idroscalo 41',
    description: 'Concerto speciale del trio The Smile al Circolo Magnolia.',
    startTime: '2026-11-12T21:00:00+01:00',
    endTime: '2026-11-12T23:30:00+01:00',
    isFree: false,
    priceDetails: '€35,00 + d.p.',
    source: 'DICE',
    sourceBadge: 'DICE',
    ticketUrl: 'https://dice.fm/event/the-smile'
  };

  const eventZero = {
    id: 'zero-98765',
    title: 'The Smile in concerto',
    venueName: 'Circolo Magnolia',
    description: 'The Smile tornano a Milano per una data imperdibile all\'Idroscalo. Thom Yorke e Jonny Greenwood presentano il nuovo album.',
    startTime: '2026-11-12T21:00:00+01:00',
    isFree: false,
    priceDetails: 'Prevendita attiva',
    source: 'Zero',
    sourceBadge: 'ZERO',
    sourceUrl: 'https://zero.eu/it/eventi/the-smile'
  };

  const merged = mergeDuplicateEvents(eventDice, eventZero);

  // Dual source badge
  assert.equal(merged.sourceBadge, 'DICE + ZERO');
  // Longest/Richest description
  assert.ok(merged.description.includes('Thom Yorke'));
  // Preserves ticketing URL
  assert.equal(merged.ticketUrl, 'https://dice.fm/event/the-smile');
  // Both sources recorded in mergedSources
  assert.deepEqual(merged.mergedSources, ['DICE', 'Zero']);
});

test('Continuous Exhibitions: checkContinuousExhibitionStatus accurately detects open vs closed daytime museum hours', () => {
  const continuousEvent = {
    isContinuous: true,
    openHour: '10:00',
    closeHour: '19:30'
  };

  // Create Date with Rome 14:00 (midday)
  const dateMidday = new Date('2026-11-12T14:00:00+01:00').getTime();
  const statusMidday = checkContinuousExhibitionStatus(continuousEvent, dateMidday);
  assert.equal(statusMidday.isOpenNow, true);
  assert.ok(statusMidday.statusText.includes('APERTO ORA'));

  // Create Date with Rome 22:00 (night)
  const dateNight = new Date('2026-11-12T22:00:00+01:00').getTime();
  const statusNight = checkContinuousExhibitionStatus(continuousEvent, dateNight);
  assert.equal(statusNight.isOpenNow, false);
  assert.ok(statusNight.statusText.includes('Domani'));

  // Create Date with Rome 08:00 (early morning)
  const dateMorning = new Date('2026-11-12T08:00:00+01:00').getTime();
  const statusMorning = checkContinuousExhibitionStatus(continuousEvent, dateMorning);
  assert.equal(statusMorning.isOpenNow, false);
});

test('Deduplication 2.0: cross-source duplicate detection across YesMilano, Mentelocale, Zero, DICE', () => {
  const evZero = {
    id: 'zero-1',
    source: 'Zero',
    sourceBadge: 'ZERO',
    title: 'BLITZ: La zona nuova',
    venueName: 'PiM OFF',
    startTime: '2026-11-12T19:00:00.000Z'
  };

  const evYesMilano = {
    id: 'yesmilano-1',
    source: 'YesMilano',
    sourceBadge: 'YESMILANO',
    title: 'La Zona Nuova',
    venueName: 'PimOff',
    startTime: '2026-11-12T19:00:00.000Z'
  };

  assert.equal(areEventsDuplicates(evZero, evYesMilano), true);

  const evMorando1 = {
    id: 'mt-1',
    source: 'MilanoToday',
    title: 'Dal Vivo a Milano, la mostra che racconta la musica rock che ha attraversato la città',
    venueName: 'Palazzo Morando',
    startTime: '2026-11-12T09:00:00.000Z',
    isContinuous: true
  };

  const evMorando2 = {
    id: 'mente-1',
    source: 'Mentelocale',
    title: 'Dal vivo a Milano, la mostra fotografica che racconta i live in città a Palazzo Morando',
    venueName: 'Palazzo Morando Costume Moda Immagine',
    startTime: '2026-11-12T10:30:00.000Z',
    isContinuous: true
  };

  assert.equal(areEventsDuplicates(evMorando1, evMorando2), true);
});

test('Classification: cinema and theater events are not misclassified as mostre/museums', async () => {
  const { classifyMilanCategory } = await import('../../services/crawlers/crawlerUtils.js');

  assert.equal(classifyMilanCategory('Proiezione del film Dune 2 al Cinema Anteo'), 'cinema');
  assert.equal(classifyMilanCategory('Rassegna cinematografica di cortometraggi con regista ospite in sala'), 'cinema');
  assert.equal(classifyMilanCategory('Spettacolo teatrale: La zona nuova al PimOff'), 'teatro');
  assert.equal(classifyMilanCategory('Commedia e stand-up show al Teatro Carcano'), 'teatro');
  assert.equal(classifyMilanCategory('Grande mostra d\'arte contemporanea a Palazzo Reale'), 'mostre');
});

