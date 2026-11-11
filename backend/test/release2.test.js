import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySelfHealingRetention,
  promoteScheduledEventsInto24h,
  areEventsDuplicates,
  deduplicateEventsList
} from '../../services/crawlers/multiSourceOrchestrator.js';

import {
  routeOcrEvent
} from '../../src/features/visionOcrService.js';

test('Self-Healing Telemetry: Retains cached source events when a crawler fails or times out', () => {
  const baseNowMs = new Date('2026-11-12T12:00:00+01:00').getTime();

  const previousSnapshotEvents = [
    {
      id: 'milanotoday-ev1',
      title: 'Festival del Cinema all\'Anteo',
      venueName: 'Anteo Palazzo del Cinema',
      startTime: '2026-11-12T19:30:00+01:00', // within 24h
      source: 'MilanoToday',
      sourceBadge: 'MILANOTODAY'
    },
    {
      id: 'milanotoday-ev2',
      title: 'Spettacolo Teatrale Franco Parenti',
      venueName: 'Teatro Franco Parenti',
      startTime: '2026-11-12T21:00:00+01:00', // within 24h
      source: 'MilanoToday',
      sourceBadge: 'MILANOTODAY'
    },
    {
      id: 'milanotoday-ev3',
      title: 'Mostra Triennale Design',
      venueName: 'Triennale Milano',
      startTime: '2026-11-13T10:00:00+01:00', // within 24h
      source: 'MilanoToday',
      sourceBadge: 'MILANOTODAY'
    },
    {
      id: 'milanotoday-old',
      title: 'Evento di ieri sera',
      venueName: 'BASE',
      startTime: '2026-11-11T18:00:00+01:00', // Expired (>24h in past)
      source: 'MilanoToday',
      sourceBadge: 'MILANOTODAY'
    }
  ];

  // Simulate MilanoToday crawler network failure
  const networkError = new Error('ETIMEDOUT: Connection to milanotoday.it timed out');
  const healed = applySelfHealingRetention({
    crawlerId: 'milanotoday',
    crawlerBadge: 'MILANOTODAY',
    freshEvents: [],
    previousEvents: previousSnapshotEvents,
    error: networkError,
    latencyMs: 4500,
    nowMs: baseNowMs
  });

  // Assert status is DEGRADED, not completely down
  assert.equal(healed.telemetry.status, 'DEGRADED');
  assert.equal(healed.telemetry.retainedFromCache, true);
  // Assert expired events from yesterday are discarded while valid 24h events are kept
  assert.equal(healed.events.length, 3);
  assert.ok(healed.events.some(e => e.id === 'milanotoday-ev1'));
  assert.ok(!healed.events.some(e => e.id === 'milanotoday-old'));
});

test('Self-Healing Telemetry: Returns HEALTHY when scraper succeeds with fresh events', () => {
  const baseNowMs = new Date('2026-11-12T12:00:00+01:00').getTime();

  const freshEvents = [
    {
      id: 'zero-ev1',
      title: 'Club Night al Magnolia',
      venueName: 'Circolo Magnolia',
      startTime: '2026-11-12T23:00:00+01:00',
      source: 'Zero'
    }
  ];

  const healed = applySelfHealingRetention({
    crawlerId: 'zero',
    crawlerBadge: 'ZERO',
    freshEvents,
    previousEvents: [],
    error: null,
    latencyMs: 320,
    nowMs: baseNowMs
  });

  assert.equal(healed.telemetry.status, 'HEALTHY');
  assert.equal(healed.telemetry.retainedFromCache, false);
  assert.equal(healed.events.length, 1);
});

test('Vision OCR Dual-Routing: Routes immediate event (<24h) to live_24h timeline', () => {
  const nowMs = new Date('2026-11-12T12:00:00+01:00').getTime();

  const immediateEvent = {
    title: 'Talk pubblico alla Casa della Cultura',
    venueName: 'Casa della Cultura',
    address: 'Via Borgogna 3, Milano',
    startTime: '2026-11-12T18:30:00+01:00', // +6.5h from now
    isFree: true,
    category: 'politica',
    sourceUrl: 'https://www.casadellacultura.it/evento-oggi'
  };

  const decision = routeOcrEvent(immediateEvent, nowMs);
  assert.equal(decision.destination, 'live_24h');
  assert.ok(decision.message.includes('immediatamente'));
});

test('Vision OCR Dual-Routing: Routes future flyer event (>24h) to scheduled_events queue', () => {
  const nowMs = new Date('2026-11-12T12:00:00+01:00').getTime();

  const futureFlyerEvent = {
    title: 'Festival del Teatro Indipendente',
    venueName: 'Teatro Elfo Puccini',
    address: 'Corso Buenos Aires 33, Milano',
    startTime: '2026-11-15T20:45:00+01:00', // 3 days in future (>24h)
    isFree: false,
    category: 'teatro',
    sourceUrl: 'https://www.elfo.org/stagione-2026/festival'
  };

  const decision = routeOcrEvent(futureFlyerEvent, nowMs);
  assert.equal(decision.destination, 'scheduled_events');
  assert.ok(decision.scheduledInHours > 24);
  assert.ok(decision.message.includes('Apparirà automaticamente'));
});

test('Scheduled Events Promotion: Automatically promotes queued community events entering 24h window', () => {
  const nowMs = new Date('2026-11-12T12:00:00+01:00').getTime();

  const queue = [
    {
      event: {
        id: 'scheduled-soon',
        title: 'Presentazione Libro Verso',
        venueName: 'Libreria Verso',
        startTime: '2026-11-12T19:00:00+01:00' // +7h (enters 24h window)
      }
    },
    {
      event: {
        id: 'scheduled-far',
        title: 'Concerto Jazz Blue Note',
        venueName: 'Blue Note Milano',
        startTime: '2026-11-18T21:00:00+01:00' // +6 days (stays in queue)
      }
    }
  ];

  const { promoted, remaining } = promoteScheduledEventsInto24h(queue, nowMs);

  assert.equal(promoted.length, 1);
  assert.equal(promoted[0].id, 'scheduled-soon');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].event.id, 'scheduled-far');
});
