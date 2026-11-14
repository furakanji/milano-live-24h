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

test('Gate 5: verifyEventTemporalConsistency rejects weekday mismatch and corrects explicit showtime', async () => {
  const { verifyEventTemporalConsistency } = await import('../../services/crawlers/crawlerUtils.js');
  const { verifyEventCandidateWithAgent } = await import('../eventVerifierAgent.js');

  // Event held only on Wednesdays, but ingested for a Thursday (2026-11-12)
  const wrongDayEvent = {
    title: 'L\'Ambrata rooftop comedy: openmic di stand up comedy a Milano',
    description: 'Ogni mercoledì a Milano, nel cuore di Lambrate... Inizio show dalle 20:30',
    startTime: '2026-11-12T18:00:00.000Z', // Thursday
    venueName: 'L\'Ambrata'
  };

  const checkWrongDay = verifyEventTemporalConsistency(wrongDayEvent);
  assert.equal(checkWrongDay.isValidForScheduledDate, false);
  assert.ok(checkWrongDay.issues.some(i => i.includes('Giorno della settimana non corrispondente')));

  // Agent rejection
  const agentVerdict = verifyEventCandidateWithAgent(wrongDayEvent);
  assert.equal(agentVerdict.isValidEvent, false);
  assert.equal(agentVerdict.verdict, 'REJECTED');
  assert.ok(agentVerdict.rejectionReasons.some(r => r.includes('Gate 5 (Consistenza Temporale)')));

  // Event on correct Wednesday (2026-11-11) with explicit showtime "dalle 20:30"
  const correctDayEvent = {
    title: 'L\'Ambrata rooftop comedy: openmic di stand up comedy a Milano',
    description: 'Ogni mercoledì a Milano, nel cuore di Lambrate... Inizio show dalle 20:30',
    startTime: '2026-11-11T18:00:00.000Z', // Wednesday (19:00 Rome)
    endTime: '2026-11-11T20:30:00.000Z',
    venueName: 'L\'Ambrata'
  };

  const checkCorrectDay = verifyEventTemporalConsistency(correctDayEvent);
  assert.equal(checkCorrectDay.isValidForScheduledDate, true);
  // Corrected to 20:30 Rome (= 19:30 UTC)
  assert.equal(checkCorrectDay.event.startTime, '2026-11-11T19:30:00.000Z');
});

test('Fuori Porta: detectOutofTownMilanEvent identifies out-of-town events (Bergamo, Brescia, Busto) without false positives on Milan streets', async () => {
  const { detectOutofTownMilanEvent } = await import('../../services/crawlers/crawlerUtils.js');

  // 1. Spazio Volta, Bergamo
  const bergamoEv = {
    title: 'Helena Hladilová + Leonor Fini: Il filo della metamorfosi',
    description: 'Arriva a Bergamo una mostra che intreccia i disegni di Leonor Fini e le sculture di Helena Hladilová.',
    venueName: 'Spazio Volta',
    sourceUrl: 'https://zero.eu/it/eventi/383915-helena-hladilova-leonor-fini-il-filo-della-metamorfosi,bergamo/'
  };
  const checkBergamo = detectOutofTownMilanEvent(bergamoEv);
  assert.equal(checkBergamo.isOutOfTown, true);
  assert.equal(checkBergamo.locationName, 'Bergamo');

  // 2. C.AR.M.E., Brescia
  const bresciaEv = {
    title: 'Ivan Macera + Belia Winnewisser',
    venueName: 'C.AR.M.E.',
    sourceUrl: 'https://zero.eu/it/eventi/383777-ivan-macera-belia-winnewisser,brescia/'
  };
  const checkBrescia = detectOutofTownMilanEvent(bresciaEv);
  assert.equal(checkBrescia.isOutOfTown, true);
  assert.equal(checkBrescia.locationName, 'Brescia');

  // 3. Circolo Gagarin, Busto Arsizio
  const bustoEv = {
    title: 'Brigade Loco + Azione Diretta',
    venueName: 'Circolo Gagarin',
    address: 'Via Luigi Galvani, 2, 21052 Busto Arsizio VA, Italy',
    sourceUrl: 'https://dice.fm/event/g5qem5-brigade-loco-azione-diretta-13th-nov-circolo-gagarin-busto-arsizio-tickets'
  };
  const checkBusto = detectOutofTownMilanEvent(bustoEv);
  assert.equal(checkBusto.isOutOfTown, true);
  assert.equal(checkBusto.locationName, 'Varese & Busto Arsizio');

  // 4. False positive protection: Via Bergamo in Milan, Corso Como in Milan, Via Varese in Milan
  const milanStreetEv = {
    title: 'Aperitivo Elettronico',
    venueName: 'Bar Varese',
    address: 'Via Varese 13, Milano',
    description: 'Serata cocktail e musica in via Varese a Milano.',
    sourceUrl: 'https://zero.eu/it/milano/eventi/aperitivo/'
  };
  const checkMilanStreet = detectOutofTownMilanEvent(milanStreetEv);
  assert.equal(checkMilanStreet.isOutOfTown, false);
});

test('Seen Events: normalizePhoneNumber, isValidPhoneNumber, and hashPhoneNumber produce deterministic encrypted hashes', async () => {
  const { normalizePhoneNumber, isValidPhoneNumber, hashPhoneNumber } = await import('../../src/services/seenEventsService.js');

  assert.equal(normalizePhoneNumber('340 123 4567'), '+393401234567');
  assert.equal(normalizePhoneNumber('+39 340-123-4567'), '+393401234567');
  assert.equal(normalizePhoneNumber('0039 340 123 4567'), '+393401234567');

  assert.equal(isValidPhoneNumber('340 123 4567'), true);
  assert.equal(isValidPhoneNumber('+393401234567'), true);
  assert.equal(isValidPhoneNumber('123'), false);
  assert.equal(isValidPhoneNumber('abc'), false);

  const hash1 = await hashPhoneNumber('340 123 4567');
  const hash2 = await hashPhoneNumber('+39 340-123-4567');
  assert.ok(hash1.length >= 16);
  assert.equal(hash1, hash2); // Deterministic matching
});

test('Domain Crawler: extracts events via JSON-LD and HTML, automatically categorizing without user manual choice', async () => {
  const { extractJsonLdEvents, scanDomainForMilanEvents } = await import('../../src/services/domainCrawlerService.js');

  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cineteca Milano - Rassegna Capolavori</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ScreeningEvent",
          "name": "I 400 Colpi - François Truffaut in lingua originale",
          "description": "Proiezione speciale restaurata in 4K con introduzione critica in sala Arlecchino.",
          "startDate": "2026-11-14T20:30:00+01:00",
          "endDate": "2026-11-14T22:30:00+01:00",
          "location": {
            "@type": "Place",
            "name": "Cineteca Milano Arlecchino",
            "address": "Via San Pietro all'Orto 9, Milano"
          },
          "offers": {
            "@type": "Offer",
            "price": "8.50",
            "priceCurrency": "EUR"
          }
        }
        </script>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "TheaterEvent",
          "name": "La Locandiera di Goldoni - Spettacolo e regia contemporanea",
          "description": "Spettacolo teatrale di prosa sul palcoscenico del Piccolo Teatro.",
          "startDate": "2026-11-18T20:00:00+01:00",
          "location": {
            "@type": "Place",
            "name": "Piccolo Teatro Grassi",
            "address": "Via Rovello 2, Milano"
          }
        }
        </script>
      </head>
      <body>
        <h1>Cineteca Milano</h1>
      </body>
    </html>
  `;

  const extracted = extractJsonLdEvents(sampleHtml);
  assert.equal(extracted.length, 2);

  // Mock fetcher that returns sampleHtml
  const mockFetcher = async () => sampleHtml;
  const nowMs = Date.parse('2026-11-14T12:00:00+01:00');

  const domainObj = {
    domain: 'cinetecamilano.it',
    url: 'https://cinetecamilano.it',
    venueName: 'Cineteca Milano Arlecchino',
    neighborhood: 'Centro'
  };

  const result = await scanDomainForMilanEvents(domainObj, { nowMs, fetcher: mockFetcher });

  // 1. Automatic Category Detection (no manual user choice)
  assert.ok(result.categoriesFound.has('cinema'));
  assert.ok(result.categoriesFound.has('teatro'));

  // 2. Rolling 24h separation
  assert.equal(result.immediate24h.length, 1);
  assert.equal(result.immediate24h[0].title, 'I 400 Colpi - François Truffaut in lingua originale');
  assert.equal(result.immediate24h[0].category, 'cinema');
  assert.equal(result.immediate24h[0].isFree, false);
  assert.equal(result.immediate24h[0].priceDetails, '8.50 EUR');

  // 3. Scheduled future queue (> 24h)
  assert.equal(result.scheduledFuture.length, 1);
  assert.equal(result.scheduledFuture[0].title, 'La Locandiera di Goldoni - Spettacolo e regia contemporanea');
  assert.equal(result.scheduledFuture[0].category, 'teatro');
});

test('Gate 4 & Crawler: vivimilano.corriere.it is recognized as an active Milan event portal without generic homepage rejection', async () => {
  const { verifyEventCandidateWithAgent } = await import('../../src/admin/AdminStudio.js');
  const { extractHtmlEvents, scanDomainForMilanEvents } = await import('../../src/services/domainCrawlerService.js');

  // 1. Gate 4 should not reject vivimilano.corriere.it
  const candidate = {
    title: 'https://vivimilano.corriere.it',
    sourceUrl: 'https://vivimilano.corriere.it',
    rawText: 'https://vivimilano.corriere.it'
  };
  const verdict = verifyEventCandidateWithAgent(candidate);
  assert.equal(verdict.isValidEvent, true);
  assert.equal(verdict.verdict, 'APPROVATO E PRENOTABILE / ATTIVO');

  // 2. Mock HTML with ViviMilano article elements
  const mockVivimilanoHtml = `
    <html>
      <body>
        <article>
          <a href="https://vivimilano.corriere.it/concerti-e-spettacoli/joe-jackson-al-lirico-gaber/">
            <div class="tappo">
              <div class="tappoRectangle">
                <h2 class="tappoTitle">I mille stili di Joe Jackson</h2>
                <div class="tappoInfo">14/11/2026</div>
              </div>
            </div>
          </a>
        </article>
        <article>
          <a href="https://vivimilano.corriere.it/altri-eventi/fonderia-in-verde/">
            <div class="tappo">
              <div class="tappoRectangle">
                <h2 class="tappoTitle">Fonderia in verde: Giardini d’inverno</h2>
                <div class="tappoInfo">14/11/2026</div>
              </div>
            </div>
          </a>
        </article>
      </body>
    </html>
  `;

  const articles = extractHtmlEvents(mockVivimilanoHtml, 'https://vivimilano.corriere.it');
  assert.equal(articles.length, 2);
  assert.equal(articles[0].title, 'I mille stili di Joe Jackson');
  assert.equal(articles[0].url, 'https://vivimilano.corriere.it/concerti-e-spettacoli/joe-jackson-al-lirico-gaber/');

  const scan = await scanDomainForMilanEvents(
    { domain: 'vivimilano.corriere.it', url: 'https://vivimilano.corriere.it' },
    { nowMs: Date.parse('2026-11-14T12:00:00+01:00'), fetcher: async () => mockVivimilanoHtml }
  );
  assert.equal(scan.immediate24h.length, 2);
  assert.equal(scan.immediate24h[0].sourceUrl, 'https://vivimilano.corriere.it/concerti-e-spettacoli/joe-jackson-al-lirico-gaber/');
});




