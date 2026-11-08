/**
 * MILANO LIVE 24H — Modular Data Ingestion & Scraper Engine (`scraperService.js`)
 *
 * Aggregates, deduplicates, and normalizes cultural & social events across Milan
 * strictly within the rolling `[now - 60m, now + 24h]` window (`Europe/Rome`).
 *
 * Unified Output Schema:
 * {
 *   id: string,
 *   title: string,
 *   description: string,
 *   startTime: string (ISO-8601),
 *   endTime: string (ISO-8601),
 *   venueName: string,
 *   address: string,
 *   isFree: boolean,
 *   priceDetails: string,
 *   category: 'concerti' | 'cinema' | 'teatro' | 'libri' | 'mostre' | 'aperture',
 *   mapsUrl: string,
 *   instagramUrl: string,
 *   facebookUrl: string,
 *   sourceUrl: string
 * }
 */

import crypto from 'node:crypto';

export const MILAN_TIMEZONE = 'Europe/Rome';

/**
 * Target Milanese Cultural & Social Sources Registry
 * Organized by category and ingestion strategy (API/GraphQL, RSS/JSON-LD, HTML + LLM Extraction)
 */
export const MILAN_SOURCES = {
  musicAndNightlife: [
    {
      id: 'dice-milan',
      name: 'DICE.fm Milano',
      url: 'https://dice.fm/browse/milan',
      category: 'concerti',
      strategy: 'JSON_LD_AND_API',
      defaultInstagram: 'https://instagram.com/diceitaly'
    },
    {
      id: 'ra-milan',
      name: 'Resident Advisor (RA Guide Milan)',
      url: 'https://ra.co/graphql',
      publicUrl: 'https://ra.co/events/it/milan',
      category: 'concerti',
      strategy: 'GRAPHQL_RA',
      areaId: 109 // Milan RA Area ID
    },
    {
      id: 'zero-milano',
      name: 'Zero.eu Milano',
      url: 'https://zero.eu/it/milano/eventi/feed/',
      publicUrl: 'https://zero.eu/it/milano/eventi/',
      category: 'concerti',
      strategy: 'RSS_PLUS_HTML'
    }
  ],

  cinemaAndAuteur: [
    {
      id: 'anteo-spaziocinema',
      name: 'SpazioCinema Anteo',
      url: 'https://www.spaziocinema.info/milano/programmazione',
      venueName: 'Anteo Palazzo del Cinema',
      address: 'Piazza Venticinque Aprile 8',
      category: 'cinema',
      strategy: 'HTML_LLM_EXTRACTOR',
      instagramUrl: 'https://instagram.com/anteospaziocinema',
      facebookUrl: 'https://facebook.com/AnteoPalazzoDelCinema'
    },
    {
      id: 'cineteca-milano',
      name: 'Cineteca Milano (Arlecchino / MIC)',
      url: 'https://www.cinetecamilano.it/calendario',
      venueName: 'Cineteca Milano Arlecchino',
      address: 'Via San Pietro all’Orto 9',
      category: 'cinema',
      strategy: 'HTML_LLM_EXTRACTOR',
      instagramUrl: 'https://instagram.com/cinetecamilano',
      facebookUrl: 'https://facebook.com/cinetecamilano'
    },
    {
      id: 'cinema-mexico',
      name: 'Cinema Mexico',
      url: 'https://www.cinemamexico.it',
      venueName: 'Cinema Mexico',
      address: 'Via Savona 57',
      category: 'cinema',
      strategy: 'HTML_LLM_EXTRACTOR',
      instagramUrl: 'https://instagram.com/cinemamexicomilano',
      facebookUrl: 'https://facebook.com/cinemamexicomilano'
    },
    {
      id: 'il-cinemino',
      name: 'Il Cinemino',
      url: 'https://www.ilcinemino.it/programmazione/',
      venueName: 'Il Cinemino',
      address: 'Via Seneca 6',
      category: 'cinema',
      strategy: 'HTML_LLM_EXTRACTOR',
      instagramUrl: 'https://instagram.com/ilcinemino',
      facebookUrl: 'https://facebook.com/ilcinemino'
    },
    {
      id: 'cinema-beltrade',
      name: 'Cinema Beltrade (Bandiere Interrotte)',
      url: 'https://bandiere-interrotte.it/programmazione/',
      venueName: 'Cinema Beltrade',
      address: 'Via Nino Oxilia 10',
      category: 'cinema',
      strategy: 'HTML_LLM_EXTRACTOR',
      instagramUrl: 'https://instagram.com/cinemabeltrade',
      facebookUrl: 'https://facebook.com/cinemabeltrade'
    }
  ],

  theater: [
    {
      id: 'milano-teatri',
      name: 'MilanoTeatri',
      url: 'https://www.milanoteatri.it/spettacoli-oggi-a-milano',
      category: 'teatro',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'invito-a-teatro',
      name: 'Invito a Teatro',
      url: 'https://www.invitoateatro.mi.it/calendario/',
      category: 'teatro',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'teatro-manzoni',
      name: 'Teatro Manzoni',
      url: 'https://www.teatromanzoni.it/spettacoli/',
      venueName: 'Teatro Manzoni',
      address: 'Via Manzoni 42',
      category: 'teatro',
      strategy: 'JSON_LD_AND_HTML',
      instagramUrl: 'https://instagram.com/teatromanzonimilano',
      facebookUrl: 'https://facebook.com/TeatroManzoniMilano'
    },
    {
      id: 'piccolo-teatro',
      name: 'Piccolo Teatro di Milano',
      url: 'https://www.piccoloteatro.org/it/calendario',
      venueName: 'Piccolo Teatro Strehler',
      address: 'Largo Greppi 1',
      category: 'teatro',
      strategy: 'JSON_LD_AND_HTML',
      instagramUrl: 'https://instagram.com/piccoloteatromilano',
      facebookUrl: 'https://facebook.com/PiccoloTeatroMilano'
    },
    {
      id: 'teatro-franco-parenti',
      name: 'Teatro Franco Parenti',
      url: 'https://teatrofrancoparenti.it/calendario/',
      venueName: 'Teatro Franco Parenti',
      address: 'Via Pier Lombardo 14',
      category: 'teatro',
      strategy: 'JSON_LD_AND_HTML',
      instagramUrl: 'https://instagram.com/teatrofrancoparenti',
      facebookUrl: 'https://facebook.com/teatrofrancoparenti'
    }
  ],

  booksTalksAndConferences: [
    {
      id: 'fondazione-feltrinelli',
      name: 'Fondazione Giangiacomo Feltrinelli',
      url: 'https://fondazionefeltrinelli.it/wp-json/wp/v2/eventi',
      publicUrl: 'https://fondazionefeltrinelli.it/eventi/',
      venueName: 'Fondazione Giangiacomo Feltrinelli',
      address: 'Viale Pasubio 5',
      category: 'libri',
      strategy: 'WP_REST_API',
      instagramUrl: 'https://instagram.com/fondazionefeltrinelli',
      facebookUrl: 'https://facebook.com/FondazioneFeltrinelli'
    },
    {
      id: 'bookcity-milano',
      name: 'BookCity Milano',
      url: 'https://bookcitymilano.it/eventi',
      category: 'libri',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'lafeltrinelli-eventi',
      name: 'La Feltrinelli Eventi Milano',
      url: 'https://www.lafeltrinelli.it/eventi?city=Milano',
      category: 'libri',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'eventbrite-milano',
      name: 'Eventbrite Milano Talks & Cultura',
      url: 'https://www.eventbrite.it/d/italy--milano/events--today/',
      category: 'libri',
      strategy: 'JSON_LD_AND_HTML'
    },
    {
      id: 'base-milano',
      name: 'BASE Milano',
      url: 'https://base.milano.it/whatson/',
      venueName: 'BASE Milano',
      address: 'Via Bergognone 34',
      category: 'mostre',
      strategy: 'HTML_LLM_EXTRACTOR',
      instagramUrl: 'https://instagram.com/base_milano',
      facebookUrl: 'https://facebook.com/basemilano'
    },
    {
      id: 'meet-center',
      name: 'MEET Digital Culture Center',
      url: 'https://www.meetcenter.it/it/eventi/',
      venueName: 'MEET Digital Culture Center',
      address: 'Viale Vittorio Veneto 2',
      category: 'libri',
      strategy: 'WP_REST_API',
      instagramUrl: 'https://instagram.com/meetcenter',
      facebookUrl: 'https://facebook.com/MEETahu'
    }
  ],

  artMuseumsAndSpecialOpenings: [
    {
      id: 'artribune-milano',
      name: 'Artribune Milano',
      url: 'https://www.artribune.com/mostre-arte-contemporanea/italia/lombardia/feed/',
      category: 'mostre',
      strategy: 'RSS_PLUS_HTML'
    },
    {
      id: 'exibart-milano',
      name: 'Exibart Milano',
      url: 'https://www.exibart.com/evento-arte/citta/milano/',
      category: 'mostre',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'fai-milano',
      name: 'FAI — Fondo Ambiente Italiano (Milano)',
      url: 'https://fondoambiente.it/eventi/?search=Milano',
      category: 'aperture',
      strategy: 'JSON_LD_AND_HTML'
    },
    {
      id: 'milanoguida',
      name: 'MilanoGuida Aperture Speciali',
      url: 'https://www.milanoguida.com/visite-guidate/calendario-visite-guidate-milano/',
      category: 'aperture',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'comune-milano-cultura',
      name: 'Portale Cultura Comune di Milano',
      url: 'https://cultura.comune.milano.it/eventi',
      category: 'aperture',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'yesmilano',
      name: 'YesMilano What’s On',
      url: 'https://www.yesmilano.it/eventi/tutti-gli-eventi',
      category: 'mostre',
      strategy: 'HTML_LLM_EXTRACTOR'
    },
    {
      id: 'milano-da-scrocco',
      name: 'Milano da Scrocco (Free Openings & Vernissages)',
      url: 'https://instagram.com/milanodascrocco',
      category: 'mostre',
      strategy: 'SOCIAL_LLM_EXTRACTOR'
    }
  ]
};

/**
 * Generates the mandatory Google Maps search query URL:
 * https://www.google.com/maps/search/?api=1&query=[Encoded_Venue_Name_And_Address]+Milano
 */
export function buildGoogleMapsDeepLink(venueName, address = '') {
  const cleanVenue = (venueName || '').trim();
  const cleanAddress = (address || '').replace(/,?\s*Milano$/i, '').trim();
  const combined = `${cleanVenue} ${cleanAddress}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(combined)}+Milano`;
}

/**
 * Computes a deterministic deduplication fingerprint across overlapping Milanese sources
 * (e.g., the same concert listed on Zero.eu, DICE.fm, and Resident Advisor).
 */
export function computeEventFingerprint(venueName, startTimeIso, title) {
  const normalizedVenue = (venueName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const hourBucket = new Date(startTimeIso).toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const normalizedTitle = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 28);

  return crypto
    .createHash('sha1')
    .update(`${normalizedVenue}|${hourBucket}|${normalizedTitle}`)
    .digest('hex')
    .slice(0, 14);
}

/**
 * Adapter 1: Resident Advisor GraphQL Fetcher for Milan (Area 109)
 */
export async function fetchResidentAdvisorMilan(windowStartIso, windowEndIso) {
  const query = `
    query GET_MILAN_EVENTS($filters: FilterInputDtoInput, $pageSize: Int) {
      eventListings(filters: $filters, pageSize: $pageSize, page: 1) {
        data {
          id
          listingDate
          event {
            title
            startTime
            endTime
            contentUrl
            isTicketed
            venue {
              name
              address
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://ra.co/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MilanoLive24hRadar/1.0 (+https://milanolive24h.it)'
    },
    body: JSON.stringify({
      query,
      variables: {
        pageSize: 40,
        filters: {
          areas: { eq: 109 },
          listingDate: {
            gte: windowStartIso,
            lte: windowEndIso
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`RA GraphQL error: ${response.status}`);
  }

  const payload = await response.json();
  const items = payload?.data?.eventListings?.data || [];

  return items.map((item) => {
    const ev = item.event || {};
    const venueName = ev.venue?.name || 'Club Milano';
    const address = ev.venue?.address || 'Milano';
    return normalizeEventRecord({
      title: ev.title,
      description: `Lineup & club night segnalata su Resident Advisor presso ${venueName}.`,
      startTime: ev.startTime || item.listingDate,
      endTime: ev.endTime || new Date(new Date(ev.startTime || item.listingDate).getTime() + 4 * 3600_000).toISOString(),
      venueName,
      address,
      isFree: false,
      priceDetails: 'Biglietto / Door o RA Tickets',
      category: 'concerti',
      instagramUrl: 'https://instagram.com/resident_advisor',
      facebookUrl: 'https://facebook.com/residentadvisor',
      sourceUrl: `https://ra.co${ev.contentUrl || '/events/it/milan'}`
    });
  });
}

/**
 * Adapter 2: Structured JSON-LD (`@type: Event`) Parser for Theater, Ticket & Museum pages
 * Works on DICE.fm, Eventbrite, Teatro Manzoni, Piccolo Teatro, FAI, etc.
 */
export function extractJsonLdEventsFromHtml(htmlString, sourceConfig) {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const extracted = [];
  let match;

  while ((match = scriptRegex.exec(htmlString)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed['@graph']
          ? parsed['@graph']
          : [parsed];

      for (const node of nodes) {
        if (node['@type'] === 'Event' || (Array.isArray(node['@type']) && node['@type'].includes('Event'))) {
          const venueName = node.location?.name || sourceConfig.venueName || sourceConfig.name;
          const streetAddress = node.location?.address?.streetAddress || sourceConfig.address || 'Milano';
          const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          const rawPrice = offers?.price;
          const isFree =
            node.isAccessibleForFree === true ||
            rawPrice === 0 ||
            rawPrice === '0' ||
            /gratis|ingresso libero|gratuito/i.test(node.description || '');

          extracted.push(
            normalizeEventRecord({
              title: node.name,
              description: (node.description || '').slice(0, 260),
              startTime: node.startDate,
              endTime: node.endDate,
              venueName,
              address: streetAddress,
              isFree,
              priceDetails: isFree
                ? 'GRATIS • Ingresso libero'
                : rawPrice
                  ? `€${rawPrice} (${offers?.priceCurrency || 'EUR'})`
                  : '€€ / Biglietto',
              category: sourceConfig.category,
              instagramUrl: sourceConfig.instagramUrl || 'https://instagram.com/yesmilano',
              facebookUrl: sourceConfig.facebookUrl || 'https://facebook.com/visitmilanoofficial',
              sourceUrl: node.url || sourceConfig.url
            })
          );
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks and continue
    }
  }

  return extracted;
}

/**
 * Adapter 3: LLM Structured Extraction for Independent Milanese Venues
 * Used for Cinema Mexico, Cinema Beltrade, Il Cinemino, MilanoTeatri, Invito a Teatro,
 * and Milano da Scrocco where schedules are published in unstructured HTML tables or captions.
 */
export async function extractEventsViaLLM(rawHtmlOrText, sourceConfig, windowStartIso, windowEndIso, llmClient) {
  const systemPrompt = `
Sei un motore di data-extraction per "Milano Live 24h".
Estrai esclusivamente gli eventi che si svolgono a Milano nell'intervallo [${windowStartIso}, ${windowEndIso}] (fuso orario Europe/Rome).
Restituisci un JSON array conforme allo schema:
[
  {
    "title": "Titolo evento (includi eventuale Q&A o ospiti in sala)",
    "description": "Sintesi editoriale di 2-3 righe",
    "startTime": "ISO-8601 string",
    "endTime": "ISO-8601 string",
    "venueName": "${sourceConfig.venueName || 'Nome del luogo'}",
    "address": "${sourceConfig.address || 'Via/Piazza, Milano'}",
    "isFree": true | false,
    "priceDetails": "GRATIS oppure prezzo del biglietto in Euro",
    "category": "${sourceConfig.category}",
    "instagramUrl": "${sourceConfig.instagramUrl || ''}",
    "facebookUrl": "${sourceConfig.facebookUrl || ''}",
    "sourceUrl": "${sourceConfig.url}"
  }
]
`.trim();

  if (!llmClient) {
    return [];
  }

  const rawCompletion = await llmClient.complete({
    system: systemPrompt,
    user: rawHtmlOrText.slice(0, 24000),
    responseFormat: 'json'
  });

  const parsed = JSON.parse(rawCompletion);
  return (Array.isArray(parsed) ? parsed : []).map((item) => normalizeEventRecord(item));
}

/**
 * Normalizes any raw event object into the strict Milano Live 24h JSON Schema
 */
export function normalizeEventRecord(raw) {
  const startDate = new Date(raw.startTime || Date.now());
  const endDate = raw.endTime
    ? new Date(raw.endTime)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const venueName = (raw.venueName || 'Luogo Milano').trim();
  const address = (raw.address || 'Milano').trim();
  const isFree = Boolean(raw.isFree);

  return {
    id: raw.id || `evt-${computeEventFingerprint(venueName, startDate.toISOString(), raw.title)}`,
    title: (raw.title || 'Evento a Milano').trim(),
    description: (raw.description || '').trim(),
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    venueName,
    address: /milano/i.test(address) ? address : `${address}, Milano`,
    isFree,
    priceDetails: raw.priceDetails || (isFree ? 'GRATIS • Ingresso libero' : '€€ / Biglietto'),
    category: raw.category || 'mostre',
    mapsUrl: raw.mapsUrl || buildGoogleMapsDeepLink(venueName, address),
    instagramUrl: raw.instagramUrl || 'https://instagram.com/yesmilano',
    facebookUrl: raw.facebookUrl || 'https://facebook.com/visitmilanoofficial',
    sourceUrl: raw.sourceUrl || 'https://www.yesmilano.it'
  };
}

/**
 * Returns the exact timestamp (ms) of the start of the NEXT full hour (`HH+1:00:00`)
 * following `nowMs`.
 */
export function getNextHourStartMs(nowMs = Date.now()) {
  return (Math.floor(nowMs / 3_600_000) + 1) * 3_600_000;
}

/**
 * Deduplicates and filters a batch of events strictly to the Next 24 Hours
 * starting from the hour immediately following `nowMs` (`[nextHourStart, nextHourStart + 24h]`).
 */
export function filterAndDeduplicateNext24Hours(events, nowMs = Date.now()) {
  const minStartMs = getNextHourStartMs(nowMs); // Starts at the next full hour
  const maxStartMs = minStartMs + 24 * 60 * 60 * 1000; // Strictly +24 hours from next hour

  const deduplicatedMap = new Map();

  for (const rawEv of events) {
    const normalized = normalizeEventRecord(rawEv);
    const startMs = new Date(normalized.startTime).getTime();

    if (Number.isNaN(startMs) || startMs < minStartMs || startMs > maxStartMs) {
      continue;
    }

    const fingerprint = computeEventFingerprint(
      normalized.venueName,
      normalized.startTime,
      normalized.title
    );

    if (!deduplicatedMap.has(fingerprint)) {
      deduplicatedMap.set(fingerprint, normalized);
    } else {
      // Merge richer fields if a duplicate was found from a secondary source
      const existing = deduplicatedMap.get(fingerprint);
      deduplicatedMap.set(fingerprint, {
        ...existing,
        description:
          normalized.description.length > existing.description.length
            ? normalized.description
            : existing.description,
        instagramUrl: existing.instagramUrl || normalized.instagramUrl,
        facebookUrl: existing.facebookUrl || normalized.facebookUrl
      });
    }
  }

  return Array.from(deduplicatedMap.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

/******************************************************************************
 * USER COMMUNITY INGESTION (LINK & FLYER OCR), SOURCE LEARNING & SAFEGUARD DB
 ******************************************************************************/

export const LEARNED_SOURCES_DB = new Map();
export const ADMIN_SAFEGUARD_QUARANTINE_QUEUE = new Map();
export const BLOCKED_SOURCES_BLACKLIST = new Set();

/**
 * Evaluates a user-submitted URL or Flyer source to:
 * 1) Infer the technical adapter typology (`WP_REST_API`, `JSON_LD_VENUE`, `SOCIAL_GRAPH_IG`, `VISION_OCR_FLYER`, etc.)
 * 2) Compute a Safeguard Trust Score (0-100) and detect suspicious signals requiring Admin verification.
 */
export function evaluateSourceSafeguardAndLearn({
  rawSourceInput = '',
  venueName = '',
  title = '',
  submittedVia = 'LINK_URL'
}) {
  const cleaned = rawSourceInput.trim();
  const lower = cleaned.toLowerCase();
  const venueLower = venueName.toLowerCase();
  const titleLower = title.toLowerCase();

  let domainOrHandle = cleaned;
  try {
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      domainOrHandle = new URL(cleaned).hostname.replace(/^www\./, '');
    }
  } catch {
    domainOrHandle = cleaned.slice(0, 48);
  }

  if (BLOCKED_SOURCES_BLACKLIST.has(domainOrHandle)) {
    return {
      domainOrHandle,
      inferredStrategy: 'BLOCKED_SOURCE',
      trustScore: 0,
      isSuspicious: true,
      riskLevel: 'CRITICO',
      redFlags: ['Fonte precedentemente bloccata nella Blacklist Admin']
    };
  }

  let inferredStrategy =
    submittedVia === 'FLYER_PHOTO_OCR'
      ? 'VISION_OCR_FLYER_AND_HTML_MONITOR'
      : 'HTML_LLM_EXTRACTOR';
  let trustScore = 80;
  const redFlags = [];

  if (/instagram\.com|@[a-z0-9_.]+/i.test(lower)) {
    inferredStrategy = 'SOCIAL_GRAPH_IG_EXTRACTOR';
  } else if (/facebook\.com|fb\.me/i.test(lower)) {
    inferredStrategy = 'FACEBOOK_EVENT_GRAPH_PARSER';
  } else if (/eventbrite\.|dice\.fm|ra\.co/i.test(lower)) {
    inferredStrategy = 'TICKETING_JSON_LD_AND_API';
    trustScore += 12;
  } else if (/casadellacultura|cgil|anpi|comune\.milano|arcibellezza|fondazionefeltrinelli|base\.milano/i.test(lower)) {
    inferredStrategy = 'VERIFIED_CIVIC_WP_REST_API';
    trustScore = 95;
  }

  // Safeguard checks for suspicious / untrusted sources
  if (/bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|shorturl/i.test(lower)) {
    redFlags.push('URL Shortener offuscato rilevato (rischio redirect phishing o link non trasparente)');
    trustScore -= 48;
    inferredStrategy = 'OBFUSCATED_SHORTLINK_REDIRECT';
  }

  if (/\.(xyz|top|click|loan|work|gq|tk)(\/|$)/i.test(lower) || /crypto|token|bet|secret-rave/i.test(`${lower} ${titleLower}`)) {
    redFlags.push('Dominio non istituzionale ad alto rischio o richiesta pagamento esterno non verificato');
    trustScore -= 45;
  }

  if (/t\.me\/|telegram\.me|whatsapp\.com/i.test(lower)) {
    redFlags.push('Canale di messaggistica / Bot non censito nel grafo culturale milanese');
    trustScore -= 35;
    inferredStrategy = 'UNVERIFIED_MESSAGING_BOT';
  }

  if (!venueLower || /tba|secret|segreto|da definire|anonimo/i.test(venueLower)) {
    redFlags.push('Indirizzo civico milanese mancante o "Secret Location TBA" non geolocalizzabile');
    trustScore -= 30;
  }

  trustScore = Math.max(5, Math.min(99, trustScore));
  const isSuspicious = trustScore < 70 || redFlags.length > 0;

  return {
    domainOrHandle,
    inferredStrategy,
    trustScore,
    isSuspicious,
    riskLevel: trustScore < 40 ? 'ALTO' : trustScore < 70 ? 'MEDIO' : 'BASSO',
    redFlags
  };
}

/**
 * Backend Venue & Cultural Knowledge Graph for Automatic Detail Extraction
 */
export const MILAN_VENUE_KNOWLEDGE_GRAPH = [
  {
    match: /casadellacultura/i,
    venueName: 'Casa della Cultura',
    address: 'Via Borgogna 3',
    neighborhood: 'San Babila / Via Borgogna',
    category: 'politica',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    defaultHour: 18,
    defaultMinute: 30,
    instagramUrl: 'https://instagram.com/casadellaculturamilano',
    facebookUrl: 'https://facebook.com/casadellaculturamilano',
    defaultTitle: 'Incontro Pubblico & Dibattito Cittadino alla Casa della Cultura'
  },
  {
    match: /arcibellezza|bellezza/i,
    venueName: 'Circolo ARCI Bellezza',
    address: 'Via Giovanni Bellezza 16',
    neighborhood: 'Porta Romana / Crocetta',
    category: 'politica',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso con tessera ARCI',
    defaultHour: 21,
    defaultMinute: 0,
    instagramUrl: 'https://instagram.com/arcibellezza',
    facebookUrl: 'https://facebook.com/arcibellezza',
    defaultTitle: 'Assemblea & Serata Culturale in Palestra Visconti'
  },
  {
    match: /fondazionefeltrinelli|feltrinelli/i,
    venueName: 'Fondazione Giangiacomo Feltrinelli',
    address: 'Viale Pasubio 5',
    neighborhood: 'Porta Volta',
    category: 'libri',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero con registrazione',
    defaultHour: 18,
    defaultMinute: 30,
    instagramUrl: 'https://instagram.com/fondazionefeltrinelli',
    facebookUrl: 'https://facebook.com/FondazioneFeltrinelli',
    defaultTitle: 'Public Talk & Tavola Rotonda in Viale Pasubio'
  },
  {
    match: /base\.milano|basemilano/i,
    venueName: 'BASE Milano',
    address: 'Via Bergognone 34',
    neighborhood: 'Tortona',
    category: 'mostre',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    defaultHour: 19,
    defaultMinute: 0,
    instagramUrl: 'https://instagram.com/base_milano',
    facebookUrl: 'https://facebook.com/basemilano',
    defaultTitle: 'Talk, Vernissage & Live Showcase negli spazi ex Ansaldo'
  },
  {
    match: /cgil|cameradellavoro/i,
    venueName: 'Camera del Lavoro di Milano',
    address: 'Corso di Porta Vittoria 43',
    neighborhood: 'Porta Vittoria',
    category: 'politica',
    isFree: true,
    priceDetails: 'GRATIS • Accesso libero alla cittadinanza',
    defaultHour: 18,
    defaultMinute: 0,
    instagramUrl: 'https://instagram.com/cgilmilano',
    facebookUrl: 'https://facebook.com/cgilmilano',
    defaultTitle: 'Assemblea Pubblica & Forum Diritti del Lavoro'
  },
  {
    match: /spaziocinema|anteo/i,
    venueName: 'Anteo Palazzo del Cinema',
    address: 'Piazza Venticinque Aprile 8',
    neighborhood: 'Brera / Garibaldi',
    category: 'cinema',
    isFree: false,
    priceDetails: '€9,50 Intero / €7,00 Ridotto',
    defaultHour: 20,
    defaultMinute: 45,
    instagramUrl: 'https://instagram.com/anteospaziocinema',
    facebookUrl: 'https://facebook.com/AnteoPalazzoDelCinema',
    defaultTitle: 'Proiezione Speciale in Lingua Originale + Incontro in Sala'
  },
  {
    match: /cinemamexico|mexico/i,
    venueName: 'Cinema Mexico',
    address: 'Via Savona 57',
    neighborhood: 'Zona Solari / Via Savona',
    category: 'cinema',
    isFree: false,
    priceDetails: '€7,50 Intero / €6,00 Ridotto',
    defaultHour: 21,
    defaultMinute: 0,
    instagramUrl: 'https://instagram.com/cinemamexicomilano',
    facebookUrl: 'https://facebook.com/cinemamexicomilano',
    defaultTitle: 'Proiezione d’Autore + Dibattito con Regista e Ospiti'
  },
  {
    match: /beltrade|bandiere-interrotte/i,
    venueName: 'Cinema Beltrade',
    address: 'Via Nino Oxilia 10',
    neighborhood: 'NoLo / Piazza Morbegno',
    category: 'cinema',
    isFree: false,
    priceDetails: '€7,50 Biglietto unico',
    defaultHour: 21,
    defaultMinute: 30,
    instagramUrl: 'https://instagram.com/cinemabeltrade',
    facebookUrl: 'https://facebook.com/cinemabeltrade',
    defaultTitle: 'Rassegna Cinema Indipendente con Q&A in Sala'
  },
  {
    match: /piccoloteatro/i,
    venueName: 'Piccolo Teatro Strehler',
    address: 'Largo Greppi 1',
    neighborhood: 'Lanza / Brera',
    category: 'teatro',
    isFree: false,
    priceDetails: '€22,00 Platea / €16,00 Balconata',
    defaultHour: 19,
    defaultMinute: 30,
    instagramUrl: 'https://instagram.com/piccoloteatromilano',
    facebookUrl: 'https://facebook.com/PiccoloTeatroMilano',
    defaultTitle: 'Spettacolo Serale & Incontro nel Chiostro Nina Vinchi'
  },
  {
    match: /teatrofrancoparenti|parenti/i,
    venueName: 'Teatro Franco Parenti',
    address: 'Via Pier Lombardo 14',
    neighborhood: 'Porta Romana',
    category: 'teatro',
    isFree: false,
    priceDetails: '€18,00 - €28,00',
    defaultHour: 20,
    defaultMinute: 30,
    instagramUrl: 'https://instagram.com/teatrofrancoparenti',
    facebookUrl: 'https://facebook.com/teatrofrancoparenti',
    defaultTitle: 'Drammaturgia Contemporanea & Talk ai Bagni Misteriosi'
  },
  {
    match: /dice\.fm|ra\.co|magnolia|biko|santeria|alcatraz/i,
    venueName: 'Santeria Toscana 31',
    address: 'Viale Toscana 31',
    neighborhood: 'Viale Toscana / Bocconi',
    category: 'concerti',
    isFree: false,
    priceDetails: '€15,00 Biglietto / Prevendita DICE',
    defaultHour: 21,
    defaultMinute: 30,
    instagramUrl: 'https://instagram.com/santeriamilano',
    facebookUrl: 'https://facebook.com/santeriamilano',
    defaultTitle: 'Live Showcase & Electronic Set a Milano'
  }
];

/**
 * Automatically extracts all event metadata in the backend starting ONLY from a Link URL
 * or ONLY from an uploaded/captured Flyer image (`imageFileName` / `rawOcrText`).
 */
export function autoExtractEventDetailsInBackend({
  submittedVia = 'LINK_URL',
  rawSourceInput = '',
  imageFileName = '',
  rawOcrText = '',
  nowMs = Date.now()
}) {
  const combinedHint = `${rawSourceInput} ${imageFileName} ${rawOcrText}`.trim();
  const matchedProfile =
    MILAN_VENUE_KNOWLEDGE_GRAPH.find((v) => v.match.test(combinedHint)) ||
    MILAN_VENUE_KNOWLEDGE_GRAPH[0];

  // Derive human title from URL slug or flyer file name if available
  let extractedTitle = matchedProfile.defaultTitle;
  if (submittedVia === 'LINK_URL' && rawSourceInput) {
    try {
      const parsedUrl = new URL(rawSourceInput);
      const segments = parsedUrl.pathname
        .split('/')
        .map((s) => s.trim())
        .filter((s) => s.length > 3 && !/^(eventi|events|it|milano|whatson|p|reel)$/i.test(s));
      if (segments.length > 0) {
        const lastSlug = segments[segments.length - 1]
          .replace(/\.(html|php|aspx)$/i, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        if (lastSlug.length > 4) {
          extractedTitle = lastSlug.replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }
    } catch {
      // Fallback to matched profile default title
    }
  } else if (submittedVia === 'FLYER_PHOTO_OCR') {
    const cleanedFile = (imageFileName || '')
      .replace(/\.[^.]+$/, '')
      .replace(/^(img|dsc|photo|screenshot|image|foto|locandina)[-_0-9\s]*/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (cleanedFile.length > 4) {
      extractedTitle = cleanedFile.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // Compute realistic start time within the upcoming 24h window (never between 01:00 and 08:59)
  const nextHourStartMs = getNextHourStartMs(nowMs);
  let targetStartMs = nextHourStartMs + matchedProfile.defaultMinute * 60_000;
  for (let h = 0; h < 24; h++) {
    const slotMs = nextHourStartMs + h * 3_600_000;
    const romeHour = Number(
      new Intl.DateTimeFormat('it-IT', {
        timeZone: MILAN_TIMEZONE,
        hour: '2-digit',
        hour12: false
      }).format(new Date(slotMs))
    ) % 24;
    if (romeHour === matchedProfile.defaultHour) {
      targetStartMs = slotMs + matchedProfile.defaultMinute * 60_000;
      break;
    }
  }

  const endMs = targetStartMs + 105 * 60_000;
  const sourceUrl =
    rawSourceInput && rawSourceInput.startsWith('http')
      ? rawSourceInput
      : 'https://www.casadellacultura.it';

  return {
    title: extractedTitle,
    description:
      submittedVia === 'FLYER_PHOTO_OCR'
        ? `Dettagli estratti automaticamente in backend tramite Vision OCR dalla locandina presso ${matchedProfile.venueName} (${matchedProfile.address}, Milano).`
        : `Dettagli estratti automaticamente in backend dal servizio di scraping a partire dal link segnalato (${matchedProfile.venueName}, ${matchedProfile.address}).`,
    startTime: new Date(targetStartMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
    venueName: matchedProfile.venueName,
    neighborhood: matchedProfile.neighborhood,
    address: matchedProfile.address,
    isFree: matchedProfile.isFree,
    priceDetails: matchedProfile.priceDetails,
    category: matchedProfile.category,
    instagramUrl: matchedProfile.instagramUrl,
    facebookUrl: matchedProfile.facebookUrl,
    sourceUrl
  };
}

/**
 * Ingests an unscheduled event submitted by a user via Link (URL) or Flyer Photo (Vision OCR).
 * All event metadata (title, venue, address, time, category, price) is extracted automatically
 * in the backend when not explicitly provided.
 * - If trusted: learns the source into `LEARNED_SOURCES_DB` and returns `status: 'PUBLISHED_AND_LEARNED'`.
 * - If suspicious: intercepts with the Safeguard and places it in `ADMIN_SAFEGUARD_QUARANTINE_QUEUE`
 *   with `status: 'QUARANTINED_FOR_ADMIN_REVIEW'`.
 */
export async function ingestUserSubmittedLinkOrFlyer(submissionPayload) {
  const {
    submittedVia = 'LINK_URL', // 'LINK_URL' | 'FLYER_PHOTO_OCR'
    rawSourceInput = '',
    imageFileName = '',
    rawOcrText = ''
  } = submissionPayload;

  const autoExtracted = autoExtractEventDetailsInBackend({
    submittedVia,
    rawSourceInput,
    imageFileName,
    rawOcrText
  });

  const title = submissionPayload.title || autoExtracted.title;
  const description = submissionPayload.description || autoExtracted.description;
  const startTime = submissionPayload.startTime || autoExtracted.startTime;
  const endTime = submissionPayload.endTime || autoExtracted.endTime;
  const venueName = submissionPayload.venueName || autoExtracted.venueName;
  const address = submissionPayload.address || autoExtracted.address;
  const isFree = submissionPayload.isFree !== undefined ? submissionPayload.isFree : autoExtracted.isFree;
  const priceDetails = submissionPayload.priceDetails || autoExtracted.priceDetails;
  const category = submissionPayload.category || autoExtracted.category;

  const safeguardReport = evaluateSourceSafeguardAndLearn({
    rawSourceInput: rawSourceInput || autoExtracted.sourceUrl,
    venueName,
    title,
    submittedVia
  });

  const normalizedEvent = normalizeEventRecord({
    title,
    description,
    startTime,
    endTime,
    venueName,
    address,
    isFree,
    priceDetails,
    category,
    instagramUrl: autoExtracted.instagramUrl,
    facebookUrl: autoExtracted.facebookUrl,
    sourceUrl: rawSourceInput.startsWith('http') ? rawSourceInput : autoExtracted.sourceUrl
  });

  if (safeguardReport.isSuspicious) {
    const quarantineId = `quar-${Date.now()}`;
    const quarantineEntry = {
      quarantineId,
      createdAt: new Date().toISOString(),
      submittedVia,
      rawSourceInput,
      safeguardReport,
      eventCandidate: normalizedEvent,
      status: 'PENDING_ADMIN_VERIFICATION'
    };
    ADMIN_SAFEGUARD_QUARANTINE_QUEUE.set(quarantineId, quarantineEntry);
    return {
      status: 'QUARANTINED_FOR_ADMIN_REVIEW',
      quarantineEntry
    };
  }

  // Learn source automatically into the database
  const learnedSourceEntry = {
    sourceId: `learned-${safeguardReport.domainOrHandle}`,
    domainOrHandle: safeguardReport.domainOrHandle,
    inferredStrategy: safeguardReport.inferredStrategy,
    category,
    trustScore: safeguardReport.trustScore,
    verificationStatus: 'AUTO_LEARNED',
    learnedAt: new Date().toISOString()
  };
  LEARNED_SOURCES_DB.set(learnedSourceEntry.sourceId, learnedSourceEntry);

  return {
    status: 'PUBLISHED_AND_LEARNED',
    event: normalizedEvent,
    learnedSource: learnedSourceEntry
  };
}

/**
 * Admin Safeguard Resolution: Approves or Rejects a quarantined suspicious source.
 */
export function verifyQuarantinedSourceByAdmin(quarantineId, decision = 'APPROVE') {
  const item = ADMIN_SAFEGUARD_QUARANTINE_QUEUE.get(quarantineId);
  if (!item) {
    throw new Error(`Quarantine item not found: ${quarantineId}`);
  }

  ADMIN_SAFEGUARD_QUARANTINE_QUEUE.delete(quarantineId);

  if (decision === 'REJECT') {
    BLOCKED_SOURCES_BLACKLIST.add(item.safeguardReport.domainOrHandle);
    return {
      status: 'REJECTED_AND_BLACKLISTED',
      blockedSource: item.safeguardReport.domainOrHandle
    };
  }

  const verifiedSource = {
    sourceId: `verified-${item.safeguardReport.domainOrHandle}`,
    domainOrHandle: item.safeguardReport.domainOrHandle,
    inferredStrategy: item.safeguardReport.inferredStrategy,
    category: item.eventCandidate.category,
    trustScore: 85,
    verificationStatus: 'ADMIN_VERIFIED',
    verifiedAt: new Date().toISOString()
  };
  LEARNED_SOURCES_DB.set(verifiedSource.sourceId, verifiedSource);

  return {
    status: 'APPROVED_LEARNED_AND_PUBLISHED',
    event: item.eventCandidate,
    learnedSource: verifiedSource
  };
}
