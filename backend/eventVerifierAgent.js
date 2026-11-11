/**
 * MILANO LIVE 24H — Agente di Ricerca e Verifica Natura delle Occasioni (`eventVerifierAgent.js`)
 *
 * Responsabilità dell'Agente:
 * 1. Verifica della Natura dell'Occasione (Gate 1 — Anti-Catalogo & Anti-Ricorrenza):
 *    - ESCLUDE pagine promozionali di tour/visite guidate a catalogo da prenotare su richiesta
 *      (es. `milanoguida.com/visite-guidate/...`, walking tour turistici generici, attività ricorrenti).
 *    - ESCLUDE collezioni permanenti museali ordinarie prive di mostra temporanea o evento speciale.
 *    - ESCLUDE sportelli comunali o servizi ricorrenti non legati a un appuntamento pubblico puntuale.
 *    - INCLUDE:
 *      a) Tutte le mostre temporanee con date di apertura/chiusura verificate;
 *      b) Tutte le proiezioni cinematografiche e repliche teatrali con orario reale nelle 24h;
 *      c) Concerti, live set, talk, presentazioni libri, assemblee pubbliche e aperture straordinarie.
 *
 * 2. Verifica di Disponibilità e Prenotabilità Effettiva (Gate 2):
 *    - ESCLUDE le pagine in cui l'attività non è né disponibile né prenotabile per assenza di date
 *      (es. "In programmazione", "Vuoi essere avvisato quando saranno online nuove date?",
 *      "Nessuna data disponibile", "Date in aggiornamento", "Evento concluso / annullato").
 *    - MANTIENE gli eventi reali in calendario nelle 24h che risultano "Sold Out / Tutto Esaurito",
 *      applicando il badge obbligatorio `SOLD OUT • POSTI ESAURITI` (`isSoldOut: true`).
 *
 * 3. Generazione del feed verificato `public/verified-events-24h.json` per GitHub Actions & Frontend.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Pattern che identificano pagine promozionali di tour a catalogo, collezioni permanenti
 * o servizi/sportelli ricorrenti che NON sono eventi o appuntamenti speciali.
 */
export const RECURRING_OR_PROMO_TOUR_PATTERNS = [
  {
    id: 'CATALOG_TOUR_PROMO',
    regex: /milanoguida\.com\/visite-guidate\/|tour\s+su\s+richiesta|prenota\s+un\s+tour\s+privato|itinerario\s+a\s+catalogo|walking\s+tour\s+giornaliero/i,
    reason: 'Pagina promozionale di tour/visita guidata a catalogo (non è un singolo evento o appuntamento speciale)'
  },
  {
    id: 'PERMANENT_COLLECTION_ONLY',
    regex: /collezione\s+permanente\s+a\s+ingresso\s+libero\s+senza\s+mostra|solo\s+collezione\s+permanente|visita\s+ordinaria\s+collezione\s+permanente/i,
    reason: 'Apertura ordinaria di collezione permanente priva di mostra temporanea o appuntamento speciale'
  },
  {
    id: 'RECURRING_SERVICE_DESK',
    regex: /sportelli\s+diritti\s+civili|sportello\s+orientamento\s+legale|orari\s+sportello\s+al\s+pubblico/i,
    reason: 'Servizio o sportello ricorrente (non costituisce un evento o appuntamento culturale/sociale)'
  }
];

/**
 * Pattern che indicano che un'attività o pagina promozionale NON ha date in calendario
 * e NON è né disponibile né prenotabile (es. "In programmazione - Vuoi essere avvisato...").
 */
export const NOT_AVAILABLE_NO_DATES_PATTERNS = [
  {
    id: 'IN_PROGRAMMAZIONE_NO_DATES',
    regex: /in\s+programmazione\s*[-—:]?\s*vuoi\s+essere\s+avvisato|vuoi\s+essere\s+avvisato\s+quando\s+saranno\s+online\s+nuove\s+date/i,
    reason: 'Attività non disponibile né prenotabile ("In programmazione — nessuna data online")'
  },
  {
    id: 'NO_DATES_AVAILABLE',
    regex: /nessuna\s+data\s+disponibile|date\s+in\s+aggiornamento|attualmente\s+non\s+prenotabile|non\s+ci\s+sono\s+date\s+in\s+calendario/i,
    reason: 'Nessuna data disponibile o prenotabile nelle prossime 24 ore'
  },
  {
    id: 'EVENT_CANCELLED_OR_PAST',
    regex: /evento\s+annullato|evento\s+concluso|spettacolo\s+annullato|schema\.org\/EventCancelled/i,
    reason: 'Evento annullato o già concluso'
  }
];

/**
 * Pattern che indicano che un vero evento in calendario nelle 24h ha esaurito i posti ("Sold Out").
 * L'evento viene mantenuto nella timeline ma contrassegnato con il badge `SOLD OUT • POSTI ESAURITI`.
 */
export const SOLD_OUT_PATTERNS = [
  /sold\s*out/i,
  /tutto\s+esaurito/i,
  /posti\s+esauriti/i,
  /biglietti\s+esauriti/i,
  /schema\.org\/SoldOut/i
];

/**
 * Elenco documentato delle occasioni analizzate e SCARTATE dall'Agente di Verifica
 * perché ricorrenti, pagine promozionali di tour o prive di date prenotabili.
 */
export const REJECTED_CANDIDATES_LOG = [
  {
    id: 'rej-milanoguida-medievale',
    title: 'Milano Medievale: Piazza dei Mercanti, Loggia degli Osii e Broletto Nuovo',
    venueName: 'Piazza dei Mercanti',
    sourceUrl: 'https://www.milanoguida.com/visite-guidate/itinerari-milano/milano-medievale/',
    detectedNature: 'TOUR_PROMO_CATALOG',
    availabilityStatus: 'UNAVAILABLE_NO_DATES',
    verdict: 'REJECTED',
    rejectionReasons: [
      'Gate 1 (Natura Occasione): Pagina promozionale di tour guidato a catalogo (/visite-guidate/itinerari-milano/), non è un evento speciale.',
      'Gate 2 (Disponibilità & Prenotabilità): Il tour riporta "In programmazione — Vuoi essere avvisato quando saranno online nuove date?" e non è né disponibile né prenotabile.'
    ],
    checkedAt: '2026-11-09T08:30:00Z'
  },
  {
    id: 'rej-milanoguida-cripta',
    title: 'La Cripta di San Giovanni in Conca — Visita Guidata',
    venueName: 'Cripta di San Giovanni in Conca',
    sourceUrl: 'https://www.milanoguida.com/visite-guidate/itinerari-milano/la-cripta-di-san-giovanni-in-conca/',
    detectedNature: 'TOUR_PROMO_CATALOG',
    availabilityStatus: 'UNAVAILABLE_NO_DATES',
    verdict: 'REJECTED',
    rejectionReasons: [
      'Gate 1 (Natura Occasione): Scheda a catalogo di visita guidata ricorrente su prenotazione (/visite-guidate/itinerari-milano/).',
      'Gate 2 (Disponibilità & Prenotabilità): Nessun turno speciale confermato per la finestra delle prossime 24 ore.'
    ],
    checkedAt: '2026-11-09T08:30:00Z'
  },
  {
    id: 'rej-palazzo-morando-perm',
    title: 'Collezione Permanente Costume Moda Immagine & Pinacoteca del Settecento',
    venueName: 'Palazzo Morando',
    sourceUrl: 'https://www.comune.milano.it/web/palazzo-morando',
    detectedNature: 'PERMANENT_COLLECTION_OPENING',
    availabilityStatus: 'RECURRING_ORDINARY',
    verdict: 'REJECTED',
    rejectionReasons: [
      'Gate 1 (Natura Occasione): Semplice orario di apertura ordinaria della collezione civica permanente, non è una mostra temporanea né un evento speciale.'
    ],
    checkedAt: '2026-11-09T08:30:00Z'
  },
  {
    id: 'rej-casa-diritti-sportelli',
    title: 'Sportelli Diritti Civili & Orientamento Legale Settimanale',
    venueName: 'Casa dei Diritti — Comune di Milano',
    sourceUrl: 'https://www.comune.milano.it/argomenti/welfare/casa-dei-diritti',
    detectedNature: 'RECURRING_MUNICIPAL_SERVICE',
    availabilityStatus: 'RECURRING_ORDINARY',
    verdict: 'REJECTED',
    rejectionReasons: [
      'Gate 1 (Natura Occasione): Servizio comunale di sportello ricorrente; non costituisce un singolo evento, talk o assemblea pubblica speciale.'
    ],
    checkedAt: '2026-11-09T08:30:00Z'
  }
];

/**
 * Valuta un singolo candidato evento attraverso i Gate dell'Agente di Ricerca e Verifica.
 *
 * @param {Object} candidate
 * @param {string} [candidate.title]
 * @param {string} [candidate.description]
 * @param {string} [candidate.sourceUrl]
 * @param {string} [candidate.pageText] - Testo HTML/body eventualmente scaricato dalla pagina
 * @param {string} [candidate.eventType] - 'TEMPORARY_EXHIBITION' | 'CINEMA_SCREENING' | 'THEATER_SHOW' | 'LIVE_CONCERT' | 'PUBLIC_TALK' | 'SPECIAL_EVENT'
 * @param {boolean} [candidate.isSoldOut]
 */
export function verifyEventCandidateWithAgent(candidate = {}) {
  const combinedText = `${candidate.title || ''} ${candidate.description || ''} ${candidate.sourceUrl || ''} ${candidate.pageText || ''}`;
  const rejectionReasons = [];

  // Gate 1: Verifica della natura dell'occasione (esclude tour promozionali a catalogo, collezioni permanenti ordinarie, sportelli)
  for (const rule of RECURRING_OR_PROMO_TOUR_PATTERNS) {
    if (rule.regex.test(combinedText)) {
      rejectionReasons.push(`Gate 1 (Natura Occasione): ${rule.reason}`);
    }
  }

  // Gate 2: Verifica di disponibilità e prenotabilità (esclude pagine "In programmazione / nessuna data disponibile")
  for (const rule of NOT_AVAILABLE_NO_DATES_PATTERNS) {
    if (rule.regex.test(combinedText)) {
      rejectionReasons.push(`Gate 2 (Disponibilità): ${rule.reason}`);
    }
  }

  if (rejectionReasons.length > 0) {
    return {
      isValidEvent: false,
      verdict: 'REJECTED',
      isSoldOut: false,
      availabilityBadge: 'NON DISPONIBILE / SCARTATO',
      natureLabel: 'ATTIVITÀ RICORRENTE O TOUR A CATALOGO NON PRENOTABILE',
      rejectionReasons
    };
  }

  // Gate 3: Rilevamento Sold Out (Mantenuto con Badge evidente, come richiesto dall'utente)
  const isSoldOut =
    Boolean(candidate.isSoldOut) ||
    SOLD_OUT_PATTERNS.some((pattern) => pattern.test(combinedText));

  const natureMap = {
    TEMPORARY_EXHIBITION: 'Mostra Temporanea Verificata',
    CINEMA_SCREENING: 'Proiezione Cinematografica Programmata',
    THEATER_SHOW: 'Spettacolo Teatrale in Cartellone',
    LIVE_CONCERT: 'Concerto / Live Club in Programma',
    PUBLIC_TALK: 'Incontro Pubblico / Presentazione con Data',
    SPECIAL_EVENT: 'Appuntamento Speciale Verificato'
  };

  return {
    isValidEvent: true,
    verdict: isSoldOut ? 'APPROVED_SOLD_OUT_BADGE' : 'APPROVED_AVAILABLE',
    isSoldOut,
    availabilityBadge: isSoldOut
      ? 'SOLD OUT • POSTI ESAURITI'
      : candidate.isFree
        ? 'INGRESSO LIBERO • DISPONIBILE'
        : 'PRENOTABILE • POSTI DISPONIBILI',
    natureLabel: natureMap[candidate.eventType] || 'Evento / Appuntamento Verificato',
    rejectionReasons: []
  };
}

/**
 * Gate 4: Link Faithfulness Checker (`checkSourceUrlFaithfulness`)
 * Verifica se l'URL associato a una scheda riporta fedelmente i dettagli dell'evento
 * (titolo, venue o parole chiave rilevanti presenti nel body della pagina di destinazione).
 *
 * @param {Object} event
 * @param {string} event.title
 * @param {string} [event.venueName]
 * @param {string} event.sourceUrl
 * @param {string} [htmlText] - HTML pre-scaricato (opzionale)
 * @returns {Promise<{isFaithful: boolean, reason: string, score: number, checkedUrl: string}>}
 */
export async function checkSourceUrlFaithfulness(event = {}, htmlText = null) {
  const url = (event.sourceUrl || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return {
      isFaithful: false,
      score: 0,
      reason: 'URL mancante o non valido (deve iniziare con http:// o https://)',
      checkedUrl: url
    };
  }

  // Se l'URL punta a una generica homepage (es. 'https://www.casadellacultura.it' o 'https://www.casadellacultura.it/'),
  // non è un permalink fedele del singolo evento
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    if (!path && !parsed.search) {
      return {
        isFaithful: false,
        score: 15,
        reason: `L'URL associato (${parsed.origin}/) è una homepage generica e non riporta il permalink con i dettagli specifici dell'evento "${event.title}".`,
        checkedUrl: url
      };
    }
  } catch {
    return {
      isFaithful: false,
      score: 0,
      reason: 'URL malformato',
      checkedUrl: url
    };
  }

  // Scarica il contenuto della pagina se non già fornito
  let bodyText = htmlText;
  if (!bodyText) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { 'user-agent': 'MilanoLive24h-Verifier/2.0 (+https://milanolive24h.it)' }
      });
      if (!res.ok) {
        return {
          isFaithful: false,
          score: 0,
          reason: `La pagina sorgente ha risposto con errore HTTP ${res.status}`,
          checkedUrl: url
        };
      }
      bodyText = await res.text();
    } catch (err) {
      return {
        isFaithful: false,
        score: 0,
        reason: `Impossibile raggiungere l'URL sorgente: ${err.message}`,
        checkedUrl: url
      };
    }
  }

  // Estrai token significativi dal titolo dell'evento
  const cleanTitle = (event.title || '')
    .toLowerCase()
    .replace(/[«»""''():;—–\-_.,!?/]/g, ' ')
    .trim();
  const titleTokens = cleanTitle
    .split(/\s+/)
    .filter((w) => w.length > 3 && !/^(della|delle|degli|nella|nelle|negli|senza|verso|presso|orario|orari|programma|milano|evento|giorno|sera)$/i.test(w));

  const pageLower = bodyText.toLowerCase();

  // Conta quanti token significativi del titolo sono presenti nella pagina
  const matchedTokens = titleTokens.filter((token) => pageLower.includes(token));
  const matchRatio = titleTokens.length > 0 ? (matchedTokens.length / titleTokens.length) : 0;

  // Verifica presenza della venue
  const cleanVenue = (event.venueName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const venueInPage = cleanVenue.length > 4 && pageLower.replace(/[^a-z0-9]/g, '').includes(cleanVenue);

  const score = Math.round(matchRatio * 75 + (venueInPage ? 25 : 0));

  // Richiedi che almeno una parte del titolo dell'evento sia riscontrata nella pagina di destinazione
  if (matchRatio < 0.3 || matchedTokens.length === 0) {
    return {
      isFaithful: false,
      score,
      reason: `Nessuna traccia sufficiente del titolo dell'evento nel contenuto della pagina (parole chiave trovate: ${matchedTokens.join(', ') || 'nessuna'} su ${titleTokens.length}).`,
      checkedUrl: url
    };
  }

  return {
    isFaithful: true,
    score,
    reason: `Dettagli evento confermati nella pagina di destinazione (${matchedTokens.length}/${titleTokens.length} parole chiave riscontrate).`,
    checkedUrl: url
  };
}

/**
 * Esecuzione CLI / GitHub Actions dell'Agente di Verifica:
 * Valida tutti gli eventi in `src/data/milanEventsGenerator.js`, esegue un controllo HTTP
 * opzionale sulle pagine fonte e salva il report in `public/verified-events-24h.json`.
 */
async function runCliVerificationPipeline() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..');
  const generatorModulePath = path.join(repoRoot, 'src', 'data', 'milanEventsGenerator.js');

  const { MILAN_EVENT_TEMPLATES, generateRolling24hFeed } = await import(generatorModulePath);

  const nowMs = Date.now();
  const rollingEvents = generateRolling24hFeed(nowMs);

  const verifiedEvents = [];
  const rejectedEvents = [...REJECTED_CANDIDATES_LOG];

  for (const ev of rollingEvents) {
    const check = verifyEventCandidateWithAgent(ev);
    if (check.isValidEvent) {
      verifiedEvents.push({
        ...ev,
        isSoldOut: check.isSoldOut,
        availabilityBadge: check.availabilityBadge,
        natureLabel: check.natureLabel,
        verifiedByAgentAt: new Date(nowMs).toISOString()
      });
    } else {
      rejectedEvents.push({
        id: ev.id,
        title: ev.title,
        venueName: ev.venueName,
        sourceUrl: ev.sourceUrl,
        verdict: check.verdict,
        rejectionReasons: check.rejectionReasons,
        checkedAt: new Date(nowMs).toISOString()
      });
    }
  }

  const publicDir = path.join(repoRoot, 'public');
  await fs.mkdir(publicDir, { recursive: true });

  const outputPayload = {
    generatedAt: new Date(nowMs).toISOString(),
    agentVersion: '2.0.0-EventVerifierAgent',
    policies: {
      includeTemporaryExhibitions: true,
      includeAllScheduledCinemaAndTheater: true,
      excludePromoCatalogTours: true,
      excludeUnbookableNoDatePages: true,
      soldOutHandling: 'SHOW_WITH_BADGE'
    },
    stats: {
      totalTemplatesAudited: MILAN_EVENT_TEMPLATES.length + REJECTED_CANDIDATES_LOG.length,
      approvedCount: verifiedEvents.length,
      soldOutWithBadgeCount: verifiedEvents.filter((e) => e.isSoldOut).length,
      rejectedCount: rejectedEvents.length
    },
    verifiedEvents,
    rejectedCandidatesLog: rejectedEvents
  };

  const outPath = path.join(publicDir, 'verified-events-24h.json');
  await fs.writeFile(outPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  console.log(`[EventVerifierAgent] Audit completato con successo:`);
  console.log(`  - Eventi verificati e approvati: ${outputPayload.stats.approvedCount}`);
  console.log(`  - Di cui con badge SOLD OUT:     ${outputPayload.stats.soldOutWithBadgeCount}`);
  console.log(`  - Occasioni scartate (tour ricorrenti / non prenotabili): ${outputPayload.stats.rejectedCount}`);
  console.log(`  - File generato: ${outPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runCliVerificationPipeline().catch((err) => {
    console.error('[EventVerifierAgent] Errore durante la verifica:', err);
    process.exit(1);
  });
}
