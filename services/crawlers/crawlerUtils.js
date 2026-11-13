/**
 * Crawler Shared Utilities & Helpers (`services/crawlers/crawlerUtils.js`)
 */

export const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

/**
 * Stop words in Italian commonly found in event listings
 */
export const ITALIAN_STOP_WORDS = new Set([
  'concerto', 'concerti', 'live', 'milano', 'spettacolo', 'spettacoli',
  'presentazione', 'rassegna', 'serata', 'ingresso', 'al', 'del', 'con',
  'dei', 'delle', 'della', 'degli', 'sul', 'sulla', 'per', 'tra', 'fra',
  'nel', 'nella', 'e', 'ed', 'ediz', 'show', 'tour', 'special', 'evento',
  'eventi', 'città', 'programma', 'blitz', 'quando', 'come', 'dove',
  'grande', 'grandi', 'nuovo', 'nuova', 'nuovi', 'nuove'
]);

/**
 * CANONICAL VENUES DICTIONARY
 * Maps aliases of Milan's top 60+ venues to canonical ID, verified name, address, neighborhood and IG url.
 */
export const CANONICAL_VENUES = {
  magnolia: {
    id: 'circolo-magnolia',
    name: 'Circolo Magnolia',
    address: 'Circonvallazione Idroscalo 41, Segrate (MI)',
    neighborhood: 'Idroscalo',
    instagramUrl: 'https://www.instagram.com/circolomagnolia/',
    aliases: ['circolo magnolia', 'magnolia', 'magnolia club', 'parco idroscalo magnolia']
  },
  anteo: {
    id: 'anteo-palazzo-del-cinema',
    name: 'Anteo Palazzo del Cinema',
    address: 'Piazza Ventiquattro Maggio 8 / Via Milazzo 9, Milano',
    neighborhood: 'Brera / Garibaldi',
    instagramUrl: 'https://www.instagram.com/anteospaziocinema/',
    aliases: ['anteo', 'anteo palazzo del cinema', 'spaziocinema anteo', 'cinema anteo', 'anteo milano']
  },
  mexico: {
    id: 'cinema-mexico',
    name: 'Cinema Mexico',
    address: 'Via Savona 57, Milano',
    neighborhood: 'Tortona / Savona',
    instagramUrl: 'https://www.instagram.com/cinemamexicomilano/',
    aliases: ['cinema mexico', 'mexico', 'mexico milano']
  },
  cinemino: {
    id: 'il-cinemino',
    name: 'Il Cinemino',
    address: 'Via Seneca 6, Milano',
    neighborhood: 'Porta Romana',
    instagramUrl: 'https://www.instagram.com/ilcinemino/',
    aliases: ['il cinemino', 'cinemino', 'cinemino milano']
  },
  beltrade: {
    id: 'cinema-beltrade',
    name: 'Cinema Beltrade',
    address: 'Via Nino Oxilia 10, Milano',
    neighborhood: 'NoLo / Pasteur',
    instagramUrl: 'https://www.instagram.com/cinemabeltrade/',
    aliases: ['cinema beltrade', 'beltrade', 'beltrade milano']
  },
  manzoni: {
    id: 'teatro-manzoni',
    name: 'Teatro Manzoni',
    address: 'Via Manzoni 42, Milano',
    neighborhood: 'Centro / Montenapoleone',
    instagramUrl: 'https://www.instagram.com/teatromanzonimilano/',
    aliases: ['teatro manzoni', 'manzoni milano', 'il manzoni']
  },
  strehler: {
    id: 'piccolo-teatro-strehler',
    name: 'Piccolo Teatro Strehler',
    address: 'Largo Greppi 1, Milano',
    neighborhood: 'Brera / Lanza',
    instagramUrl: 'https://www.instagram.com/piccoloteatromilano/',
    aliases: ['piccolo teatro strehler', 'teatro strehler', 'strehler', 'piccolo strehler']
  },
  grassi: {
    id: 'piccolo-teatro-grassi',
    name: 'Piccolo Teatro Grassi',
    address: 'Via Rovello 2, Milano',
    neighborhood: 'Cordusio / Cairoli',
    instagramUrl: 'https://www.instagram.com/piccoloteatromilano/',
    aliases: ['piccolo teatro grassi', 'teatro grassi', 'grassi', 'piccolo grassi']
  },
  melato: {
    id: 'teatro-studio-melato',
    name: 'Piccolo Teatro Studio Melato',
    address: 'Via Rivoli 6, Milano',
    neighborhood: 'Lanza',
    instagramUrl: 'https://www.instagram.com/piccoloteatromilano/',
    aliases: ['piccolo teatro studio melato', 'teatro studio melato', 'studio melato', 'melato']
  },
  parenti: {
    id: 'teatro-franco-parenti',
    name: 'Teatro Franco Parenti',
    address: 'Via Pier Lombardo 14, Milano',
    neighborhood: 'Porta Romana',
    instagramUrl: 'https://www.instagram.com/teatrofrancoparenti/',
    aliases: ['teatro franco parenti', 'franco parenti', 'parenti', 'bagni misteriosi']
  },
  carcano: {
    id: 'teatro-carcano',
    name: 'Teatro Carcano',
    address: 'Corso di Porta Romana 63, Milano',
    neighborhood: 'Porta Romana / Crocetta',
    instagramUrl: 'https://www.instagram.com/teatrocarcano/',
    aliases: ['teatro carcano', 'carcano milano', 'carcano']
  },
  elfopuccini: {
    id: 'teatro-elfo-puccini',
    name: 'Teatro Elfo Puccini',
    address: 'Corso Buenos Aires 33, Milano',
    neighborhood: 'Buenos Aires / Lima',
    instagramUrl: 'https://www.instagram.com/elfopuccini/',
    aliases: ['teatro elfo puccini', 'elfo puccini', 'elfo', 'puccini']
  },
  santeria: {
    id: 'santeria-toscana-31',
    name: 'Santeria Toscana 31',
    address: 'Viale Toscana 31, Milano',
    neighborhood: 'Bocconi / Ripamonti',
    instagramUrl: 'https://www.instagram.com/santeriamilano/',
    aliases: ['santeria toscana 31', 'santeria toscana31', 'santeria', 'santeria milano', 'santeria paladini']
  },
  base: {
    id: 'base-milano',
    name: 'BASE Milano',
    address: 'Via Bergognone 34, Milano',
    neighborhood: 'Tortona',
    instagramUrl: 'https://www.instagram.com/base_milano/',
    aliases: ['base milano', 'base', 'base via bergognone']
  },
  bellezza: {
    id: 'arci-bellezza',
    name: 'Arci Bellezza',
    address: 'Via Giovanni Bellezza 16, Milano',
    neighborhood: 'Porta Romana',
    instagramUrl: 'https://www.instagram.com/arcibellezza/',
    aliases: ['arci bellezza', 'bellezza', 'palestra visconti', 'circolo arci bellezza']
  },
  biko: {
    id: 'arci-biko',
    name: 'Arci Biko',
    address: 'Via Ettore Ponti 40, Milano',
    neighborhood: 'Barona / Romolo',
    instagramUrl: 'https://www.instagram.com/bikoclubmilano/',
    aliases: ['arci biko', 'biko', 'biko club', 'circolo biko']
  },
  alcatraz: {
    id: 'alcatraz-milano',
    name: 'Alcatraz Milano',
    address: 'Via Valtellina 25, Milano',
    neighborhood: 'Maciachini / Farini',
    instagramUrl: 'https://www.instagram.com/alcatrazmilano/',
    aliases: ['alcatraz milano', 'alcatraz']
  },
  fabrique: {
    id: 'fabrique-milano',
    name: 'Fabrique Milano',
    address: 'Via Fantoli 9, Milano',
    neighborhood: 'Mecenate / Forlanini',
    instagramUrl: 'https://www.instagram.com/fabrique_milano/',
    aliases: ['fabrique milano', 'fabrique']
  },
  magazzini: {
    id: 'magazzini-generali',
    name: 'Magazzini Generali',
    address: 'Via Pietrasanta 16, Milano',
    neighborhood: 'Ripamonti',
    instagramUrl: 'https://www.instagram.com/magazzinigeneralimilano/',
    aliases: ['magazzini generali', 'magazzini', 'magazzinigenerali']
  },
  tunnel: {
    id: 'tunnel-club',
    name: 'Tunnel Club',
    address: 'Via Sammartini 30, Milano',
    neighborhood: 'Centrale / Greco',
    instagramUrl: 'https://www.instagram.com/tunnelclubmilano/',
    aliases: ['tunnel club', 'tunnel', 'tunnel milano']
  },
  palazzoreale: {
    id: 'palazzo-reale',
    name: 'Palazzo Reale di Milano',
    address: 'Piazza del Duomo 12, Milano',
    neighborhood: 'Duomo / Centro',
    instagramUrl: 'https://www.instagram.com/palazzorealemilano/',
    aliases: ['palazzo reale', 'palazzo reale di milano', 'palazzo reale milano']
  },
  mudec: {
    id: 'mudec',
    name: 'MUDEC - Museo delle Culture',
    address: 'Via Tortona 56, Milano',
    neighborhood: 'Tortona',
    instagramUrl: 'https://www.instagram.com/mudecmi/',
    aliases: ['mudec', 'mudec milano', 'museo delle culture', 'mudec - museo delle culture']
  },
  triennale: {
    id: 'triennale-milano',
    name: 'Triennale Milano',
    address: 'Viale Emilio Alemagna 6, Milano',
    neighborhood: 'Parco Sempione / Cadorna',
    instagramUrl: 'https://www.instagram.com/triennalemilano/',
    aliases: ['triennale milano', 'triennale', 'palazzo dell arte triennale']
  },
  hangarbicocca: {
    id: 'pirelli-hangarbicocca',
    name: 'Pirelli HangarBicocca',
    address: 'Via Chiese 2, Milano',
    neighborhood: 'Bicocca / Greco',
    instagramUrl: 'https://www.instagram.com/pirelli_hangarbicocca/',
    aliases: ['pirelli hangarbicocca', 'hangarbicocca', 'hangar bicocca', 'hangar']
  },
  fondazioneprada: {
    id: 'fondazione-prada',
    name: 'Fondazione Prada',
    address: 'Largo Isarco 2, Milano',
    neighborhood: 'Ripamonti / Scalo Romana',
    instagramUrl: 'https://www.instagram.com/fondazioneprada/',
    aliases: ['fondazione prada', 'cinema godard - fondazione prada', 'cinema godard', 'prada milano']
  },
  feltrinelli: {
    id: 'fondazione-feltrinelli',
    name: 'Fondazione Giangiacomo Feltrinelli',
    address: 'Viale Pasubio 5, Milano',
    neighborhood: 'Porta Volta / Moscova',
    instagramUrl: 'https://www.instagram.com/fondazionefeltrinelli/',
    aliases: ['fondazione feltrinelli', 'fondazione giangiacomo feltrinelli', 'feltrinelli pasubio']
  },
  castellosforzesco: {
    id: 'castello-sforzesco',
    name: 'Castello Sforzesco',
    address: 'Piazza Castello, Milano',
    neighborhood: 'Cairoli / Centro',
    instagramUrl: 'https://www.instagram.com/comune_milano/',
    aliases: ['castello sforzesco', 'musei del castello sforzesco', 'cortile delle armi castello']
  },
  fabbricadelvapore: {
    id: 'fabbrica-del-vapore',
    name: 'Fabbrica del Vapore',
    address: 'Via Giulio Cesare Procaccini 4, Milano',
    neighborhood: 'Monumentale / Cenisio',
    instagramUrl: 'https://www.instagram.com/fabbricadelvapore/',
    aliases: ['fabbrica del vapore', 'fabbrica vapore']
  },
  pac: {
    id: 'pac-milano',
    name: 'PAC - Padiglione d\'Arte Contemporanea',
    address: 'Via Palestro 14, Milano',
    neighborhood: 'Palestro / Porta Venezia',
    instagramUrl: 'https://www.instagram.com/pacmilano/',
    aliases: ['pac', 'pac milano', 'padiglione d arte contemporanea']
  },
  arcimboldi: {
    id: 'teatro-arcimboldi',
    name: 'Teatro degli Arcimboldi',
    address: 'Viale Sarca 336, Milano',
    neighborhood: 'Bicocca',
    instagramUrl: 'https://www.instagram.com/teatrodegliarcimboldi/',
    aliases: ['teatro arcimboldi', 'teatro degli arcimboldi', 'arcimboldi']
  },
  dude: {
    id: 'dude-club',
    name: 'Dude Club / Detune',
    address: 'Via Carlo Boncompagni 44, Milano',
    neighborhood: 'Corvetto',
    instagramUrl: 'https://www.instagram.com/dudemilano/',
    aliases: ['dude', 'dude club', 'detune', 'detune milano']
  },
  apollo: {
    id: 'apollo-milano',
    name: 'Apollo Milano',
    address: 'Via Giosuè Borsi 9, Milano',
    neighborhood: 'Navigli',
    instagramUrl: 'https://www.instagram.com/apollomilano/',
    aliases: ['apollo milano', 'apollo club', 'apollo']
  },
  gallerieditalia: {
    id: 'gallerie-d-italia',
    name: 'Gallerie d\'Italia - Piazza Scala',
    address: 'Piazza della Scala 6, Milano',
    neighborhood: 'Centro / Scala',
    instagramUrl: 'https://www.instagram.com/gallerieditalia/',
    aliases: ['gallerie d italia', 'piazza scala gallerie', 'gallerie d italia milano']
  },
  verso: {
    id: 'libreria-verso',
    name: 'Libreria Verso',
    address: 'Corso di Porta Ticinese 54, Milano',
    neighborhood: 'Ticinese / Colonne',
    instagramUrl: 'https://www.instagram.com/libreriaverso/',
    aliases: ['libreria verso', 'verso libri', 'verso milano']
  },
  casadellacultura: {
    id: 'casa-della-cultura',
    name: 'Casa della Cultura',
    address: 'Via Borgogna 3, Milano',
    neighborhood: 'San Babila / Centro',
    instagramUrl: 'https://www.instagram.com/casadellacultura/',
    aliases: ['casa della cultura', 'casadellacultura', 'casa della cultura milano']
  }
};

/**
 * Resolves a venue name to its canonical venue object or normalized representation
 */
export function resolveCanonicalVenue(venueName = '') {
  if (!venueName) {
    return {
      canonicalId: 'milano-generic',
      name: 'Milano',
      address: 'Milano, Italia',
      neighborhood: 'Milano',
      instagramUrl: null
    };
  }

  const clean = venueName.toLowerCase().replace(/['"“”’]/g, '').trim();

  const GENERIC_VENUE_WORDS = new Set(['milano', 'milano mi', 'italia', 'lombardia', 'centro', 'spazio', 'teatro', 'cinema', 'via', 'viale', 'corso', 'piazza', 'club', 'circolo', 'sala', 'bar']);

  // 1. Direct alias match in CANONICAL_VENUES
  for (const [key, venue] of Object.entries(CANONICAL_VENUES)) {
    for (const alias of venue.aliases) {
      const isExact = clean === alias;
      const isCleanContainsAlias = clean.includes(alias) && !GENERIC_VENUE_WORDS.has(alias) && alias.length >= 4;
      const isAliasContainsClean = alias.includes(clean) && !GENERIC_VENUE_WORDS.has(clean) && clean.length >= 4;

      if (isExact || isCleanContainsAlias || isAliasContainsClean) {
        return {
          canonicalId: venue.id,
          name: venue.name,
          address: venue.address,
          neighborhood: venue.neighborhood,
          instagramUrl: venue.instagramUrl
        };
      }
    }
  }

  const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');

  // 2. Fallback normalization
  return {
    canonicalId: `venue-${hashString(cleanAlpha || clean)}`,
    name: venueName.trim(),
    address: /milano/i.test(venueName) ? venueName.trim() : `${venueName.trim()}, Milano`,
    neighborhood: 'Milano',
    instagramUrl: resolveVenueInstagram(venueName)
  };
}

export const TOP_50_MILAN_VENUES_INSTAGRAM = {
  magnolia: 'https://www.instagram.com/circolomagnolia/',
  santeria: 'https://www.instagram.com/santeriamilano/',
  bellezza: 'https://www.instagram.com/arcibellezza/',
  biko: 'https://www.instagram.com/bikoclubmilano/',
  base: 'https://www.instagram.com/base_milano/',
  alcatraz: 'https://www.instagram.com/alcatrazmilano/',
  magazzini: 'https://www.instagram.com/magazzinigeneralimilano/',
  dude: 'https://www.instagram.com/dudemilano/',
  detune: 'https://www.instagram.com/detunemilano/',
  tunnel: 'https://www.instagram.com/tunnelclubmilano/',
  apollo: 'https://www.instagram.com/apollomilano/',
  yellowsquare: 'https://www.instagram.com/yellowsquaremilano/',
  beltrade: 'https://www.instagram.com/cinemabeltrade/',
  anteo: 'https://www.instagram.com/anteospaziocinema/',
  cineteca: 'https://www.instagram.com/cinetecamilano/',
  mexico: 'https://www.instagram.com/cinemamexicomilano/',
  cinemino: 'https://www.instagram.com/ilcinemino/',
  strehler: 'https://www.instagram.com/piccoloteatromilano/',
  piccolo: 'https://www.instagram.com/piccoloteatromilano/',
  parenti: 'https://www.instagram.com/teatrofrancoparenti/',
  manzoni: 'https://www.instagram.com/teatromanzonimilano/',
  carcano: 'https://www.instagram.com/teatrocarcano/',
  arcimboldi: 'https://www.instagram.com/teatrodegliarcimboldi/',
  elena: 'https://www.instagram.com/teatro_elena_milano/',
  triennale: 'https://www.instagram.com/triennalemilano/',
  mudec: 'https://www.instagram.com/mudecmi/',
  reale: 'https://www.instagram.com/palazzorealemilano/',
  hangar: 'https://www.instagram.com/pirelli_hangarbicocca/',
  gallerie: 'https://www.instagram.com/gallerieditalia/',
  verso: 'https://www.instagram.com/libreriaverso/',
  feltrinelli: 'https://www.instagram.com/fondazionefeltrinelli/',
  fabbrica: 'https://www.instagram.com/fabbricadelvapore/',
  pac: 'https://www.instagram.com/pacmilano/',
  nama: 'https://www.instagram.com/nama.milano/',
  ragoo: 'https://www.instagram.com/ragoomilano/',
  bachelite: 'https://www.instagram.com/bacheliteclab/',
  circolodiritti: 'https://www.instagram.com/casadellacultura/',
  casacultura: 'https://www.instagram.com/casadellacultura/'
};

/**
 * Returns today and tomorrow in YYYY-MM-DD in Europe/Rome fuso
 */
export function getRomeDateStrings(baseMs = Date.now()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const today = fmt.format(new Date(baseMs));
  const tomorrow = fmt.format(new Date(baseMs + 24 * 3600 * 1000));
  return { today, tomorrow };
}

/**
 * Decodes standard HTML entities
 */
export function decodeHtml(html = '') {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&rsquo;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&hellip;|&#8230;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips HTML tags and limits to 2-3 sentences / max chars
 */
export function cleanDescription(html = '', maxLen = 240) {
  if (!html) return '';
  const text = decodeHtml(html.replace(/<[^>]+>/g, ' '));
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim().replace(/[,.:; -]+$/, '') + '...';
}

/**
 * Generates an MD5 or hash string for slug/ID deduplication
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Tokenize a title string stripping common Italian stop words
 */
export function tokenizeTitle(title = '') {
  const words = decodeHtml(title)
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòù]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !ITALIAN_STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Compute Jaccard Similarity between two token sets
 */
export function computeJaccardSimilarity(setA, setB) {
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
  let intersectionSize = 0;
  for (const elem of setA) {
    if (setB.has(elem)) intersectionSize++;
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Classifies categories based on title, description and tags
 */
export function classifyMilanCategory(haystack = '') {
  const text = haystack.toLowerCase();

  // 1. Cinema & Screenings (strict priority)
  if (/\b(?:cinem[ae]|proiezion[ei]|film|rassegna\s*cinematografic[ae]|cortometraggi?|regista|sala\s*cinema|cineforum)\b/i.test(text)) {
    return 'cinema';
  }

  // 2. Theater, Plays & Stand-up
  if (/\b(?:teatr[oei]|spettacol[oei]|drammaturg(?:ia|ico)?|prosa|musical|commedi[ae]|stand[\s\-]*up|monolog(?:o|hi)|attor[ei]|attric[ei]|palcoscenico)\b/i.test(text)) {
    return 'teatro';
  }

  // 3. Books, Talks & Culture
  if (/\b(?:libr[oi]|presentazion[ei]|incontr[oi]|talk|conferenz[ae]|dibattit[oi]|dialog[hoi]|poesi[ae]|autor[ei]|autric[ei]|festival\s*letterar[io])\b/i.test(text)) {
    return 'libri';
  }

  // 4. Exhibitions, Museums & Vernissage
  if (/\b(?:mostr[ae]|esposizion[ei]|vernissage|collezion[ei]|padiglion[ei]|quadr[io]|scultur[ae]|muse[oi]|pinacoteca|triennale|mudec|palazzo\s*reale|hangar\s*bicocca)\b/i.test(text)) {
    return 'mostre';
  }

  // 5. Special Openings & Tours
  if (/\b(?:apertur[ae]\s*straordinari[ae]|visit[ae]\s*guidat[ae]|fai|dimor[ae]|palazz[oi]\s*apert[oi]|segret[oi])\b/i.test(text)) {
    return 'aperture';
  }

  // 6. Politics & Social
  if (/\b(?:assembl[eae]|attivismo|cittadin|diritti|sciopero|territorio|politica)\b/i.test(text)) {
    return 'politica';
  }

  // 7. Concerts, Clubbing & Music (default for live events)
  return 'concerti';
}

/**
 * Detects if event is free
 */
export function detectFreeEntry(haystack = '') {
  return /gratuit[oa]|ingresso libero|free entry|a ingresso gratuito|senza costi|accesso libero|0\s*€/i.test(haystack);
}

/**
 * Resolves Instagram profile url
 */
export function resolveVenueInstagram(venueName = '') {
  const clean = venueName.toLowerCase();
  for (const [needle, igUrl] of Object.entries(TOP_50_MILAN_VENUES_INSTAGRAM)) {
    if (clean.includes(needle)) {
      return igUrl;
    }
  }
  const tag = clean.replace(/[^a-z0-9]/g, '');
  if (tag.length >= 3) {
    return `https://www.instagram.com/explore/tags/${tag}/`;
  }
  return null;
}

/**
 * Universal safe fetch with CORS proxy fallback for in-browser client calls
 */
export async function universalFetch(targetUrl, options = {}) {
  // 1. Direct fetch (server-side Node or CORS-enabled endpoints)
  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/json',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(options.timeout || 10000)
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    // Try custom proxy or CORS proxies if in browser
  }

  // 2. Proprietary Serverless / Edge Proxy priority (4500ms circuit breaker)
  const customProxy = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CUSTOM_PROXY_URL) ||
    (typeof process !== 'undefined' && (process.env?.VITE_CUSTOM_PROXY_URL || process.env?.CUSTOM_PROXY_URL));

  if (customProxy) {
    try {
      const pUrl = `${customProxy}?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(pUrl, { signal: AbortSignal.timeout(4500) });
      if (res.ok) return await res.text();
    } catch {
      // Fallback to public proxies
    }
  }

  // 3. Fallback to public CORS proxies
  for (const proxyFn of CORS_PROXIES) {
    const proxyUrl = proxyFn(targetUrl);
    try {
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(options.timeout || 12000)
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Try next proxy
    }
  }

  throw new Error(`Unable to fetch ${targetUrl} directly or through CORS proxies`);
}

/**
 * Check if a continuous exhibition/museum event is currently open
 */
export function checkContinuousExhibitionStatus(event, nowMs = Date.now()) {
  if (!event || !event.isContinuous) {
    return { isOpenNow: false, statusText: null };
  }

  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date(nowMs));
  const pMap = {};
  parts.forEach(p => { pMap[p.type] = p.value; });
  const currentMinutes = parseInt(pMap.hour, 10) * 60 + parseInt(pMap.minute, 10);

  const [openH, openM] = (event.openHour || '10:00').split(':').map(n => parseInt(n, 10));
  const [closeH, closeM] = (event.closeHour || '19:30').split(':').map(n => parseInt(n, 10));
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Open if current time is between openHour and closeHour - 45min (last entry)
  const isOpen = currentMinutes >= openMinutes && currentMinutes <= (closeMinutes - 45);

  return {
    isOpenNow: isOpen,
    statusText: isOpen
      ? `🟢 APERTO ORA • Fino alle ${event.closeHour || '19:30'}`
      : `Domani ore ${event.openHour || '10:00'}`
  };
}

/**
 * Detects whether an event is located outside Milan ("Fuori Porta" / Fuori Milano)
 * Identifies events in other provinces or towns (e.g. Bergamo, Brescia, Monza, Como, Varese, Busto Arsizio, Pavia, etc.)
 *
 * @param {Object} event
 * @returns {{ isOutOfTown: boolean, locationName: string | null }}
 */
export function detectOutofTownMilanEvent(event = {}) {
  if (!event) return { isOutOfTown: false, locationName: null };

  const OUT_OF_TOWN_PROVINCES = [
    { name: 'Bergamo', cityRegex: /\b(?:bergamo)\b/i, venueRegex: /\b(?:spazio\s+volta)\b/i },
    { name: 'Brescia', cityRegex: /\b(?:brescia)\b/i, venueRegex: /\b(?:c\.ar\.m\.e\.?)\b/i },
    { name: 'Monza & Brianza', cityRegex: /\b(?:monza|lissone|seregno|desio)\b/i, venueRegex: /\b(?:autodromo\s+di\s+monza)\b/i },
    { name: 'Como', cityRegex: /\b(?:como|cant[uù]|cernobbio)\b/i, venueRegex: /\b(?:villa\s+erba)\b/i },
    { name: 'Varese & Busto Arsizio', cityRegex: /\b(?:busto\s+arsizio|varese|gallarate)\b/i, venueRegex: /\b(?:circolo\s+gagarin)\b/i },
    { name: 'Pavia', cityRegex: /\b(?:pavia|vigevano|voghera)\b/i, venueRegex: null },
    { name: 'Lecco', cityRegex: /\b(?:lecco)\b/i, venueRegex: null },
    { name: 'Cremona', cityRegex: /\b(?:cremona|crema)\b/i, venueRegex: null },
    { name: 'Mantova', cityRegex: /\b(?:mantova)\b/i, venueRegex: null },
    { name: 'Lodi', cityRegex: /\b(?:lodi|codogno)\b/i, venueRegex: null },
    { name: 'Sondrio', cityRegex: /\b(?:sondrio|bormio)\b/i, venueRegex: null }
  ];

  // 1. Check URL slug (e.g. zero.eu/it/eventi/...-...,bergamo/ or dice.fm/...-busto-arsizio-tickets)
  const url = (event.sourceUrl || '').toLowerCase();
  for (const prov of OUT_OF_TOWN_PROVINCES) {
    const slugKey = prov.name.toLowerCase().split(/[\s&]+/)[0];
    const urlPattern = new RegExp(`(?:[,/_\\-]${slugKey}(?:[,/_\\-]|\\/|$)|${slugKey}-tickets)`, 'i');
    if (urlPattern.test(url)) {
      return { isOutOfTown: true, locationName: prov.name };
    }
  }

  // 2. Check verified out-of-town venues
  const venueLower = (event.venueName || '').toLowerCase();
  for (const prov of OUT_OF_TOWN_PROVINCES) {
    if (prov.venueRegex && prov.venueRegex.test(venueLower)) {
      return { isOutOfTown: true, locationName: prov.name };
    }
  }

  // 3. Check address: strip street names named after cities (e.g. "Via Varese", "Corso Como", "Via Bergamo")
  const rawAddress = (event.address || '');
  const cleanAddress = rawAddress.replace(/\b(?:via|viale|corso|piazza|largo|vicolo|strada)\s+(?:bergamo|como|monza|varese|brescia|pavia|cremona|mantova|lodi)\b/gi, '');

  for (const prov of OUT_OF_TOWN_PROVINCES) {
    // Check province code in address e.g. "(VA)", "(BG)", "(BS)"
    const provCodePattern = new RegExp(`\\(${prov.name.toLowerCase().split(/[\s&]+/)[0]}\\)|\\b${prov.name.toLowerCase().split(/[\s&]+/)[0]}\\s+(?:VA|BG|BS|CO|MB|PV|LC|CR|MN|LO|SO)\\b`, 'i');
    if (provCodePattern.test(rawAddress) || provCodePattern.test(cleanAddress)) {
      return { isOutOfTown: true, locationName: prov.name };
    }

    // Check city in address if not in Milan
    if (prov.cityRegex.test(cleanAddress)) {
      const withoutMilan = cleanAddress.replace(/\bmilano\b/gi, '').trim();
      if (prov.cityRegex.test(withoutMilan) || !/milano/i.test(rawAddress)) {
        return { isOutOfTown: true, locationName: prov.name };
      }
    }
  }

  // 4. Check description only if explicitly mentioning "Arriva a Bergamo", "A Brescia", "A Monza", etc.
  const cleanDesc = (event.description || '').replace(/\b(?:via|viale|corso|piazza|largo|vicolo|strada)\s+(?:bergamo|como|monza|varese|brescia|pavia|cremona|mantova|lodi)\b/gi, '');
  for (const prov of OUT_OF_TOWN_PROVINCES) {
    const cityName = prov.name.split(/[\s&]+/)[0];
    const descPattern = new RegExp(`\\b(?:arriva a|si tiene a|ospitato a|presso .+ a|al teatro .+ a)\\s+${cityName}\\b`, 'i');
    if (descPattern.test(cleanDesc)) {
      return { isOutOfTown: true, locationName: prov.name };
    }
  }

  return { isOutOfTown: false, locationName: null };
}

/**
 * Gate 5: Temporal Consistency & Weekday Verification (`verifyEventTemporalConsistency`)
 * Analyzes event title, description, and source text to verify:
 * 1. Specific day recurrence (e.g. "Ogni mercoledì", "Tutti i giovedì", "Solo il martedì")
 *    If an event is only held on Wednesday but scheduled for Thursday, it is flagged/excluded.
 * 2. Explicit showtime extraction (e.g. "inizio show dalle 20:30", "dalle 21:00", "ore 19:30")
 *    Corrects default/approximate start time (e.g. 18:00 or 19:00) with the verified explicit hour.
 */
export function verifyEventTemporalConsistency(event = {}, nowMs = Date.now()) {
  if (!event || !event.startTime) {
    return { isValidForScheduledDate: true, event, issues: [] };
  }

  const text = `${event.title || ''} ${event.description || ''} ${event.pageText || ''}`;
  const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const WEEKDAYS = {
    'lunedi': 1, 'martedi': 2, 'mercoledi': 3, 'giovedi': 4, 'venerdi': 5, 'sabato': 6, 'domenica': 0
  };

  const issues = [];
  let isValidForScheduledDate = true;
  let updatedEvent = { ...event };

  const startMs = Date.parse(event.startTime);
  if (isNaN(startMs)) {
    return { isValidForScheduledDate: true, event: updatedEvent, issues };
  }

  const eventDate = new Date(startMs);

  // Determine day of week in Europe/Rome fuso
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' });
  const weekdayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  const eventRomeDay = weekdayMap[fmt.format(eventDate)];

  // 1. Check for specific weekday recurrence (e.g. "Ogni mercoledì", "Tutti i lunedì", "Solo la domenica")
  const recurrenceMatch = norm.match(/\b(?:ogni|tutti\s+i|tutte\s+le|solo\s+il|solo\s+la|il|la)\s+(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)(?:\s+sera|\s+notte|\s+pomeriggio)?\b/i);

  if (recurrenceMatch) {
    const requiredDayName = recurrenceMatch[1];
    const requiredDayOfWeek = WEEKDAYS[requiredDayName];

    if (typeof requiredDayOfWeek === 'number' && eventRomeDay !== requiredDayOfWeek) {
      isValidForScheduledDate = false;
      issues.push(`Giorno della settimana non corrispondente: evento previsto solo il ${requiredDayName} (la data analizzata corrisponde a ${fmt.format(eventDate)}).`);
    }
  }

  // 2. Check for explicit showtime extraction
  const hourMatch = norm.match(/(?:inizio\s+(?:show|spettacolo|concerto|live)?\s*(?:dalle|ore)?|dalle\s+ore|dalle|ore|h)\s*([0-2]?[0-9])[:.]([0-5][0-9])/i);

  if (hourMatch) {
    const explicitHour = parseInt(hourMatch[1], 10);
    const explicitMin = parseInt(hourMatch[2], 10);

    const fmtHour = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hour: 'numeric', minute: 'numeric', hour12: false });
    const parts = fmtHour.formatToParts(eventDate);
    const currentRomeHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const currentRomeMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    // If explicit hour differs from current hour by 1+ hours or min by 15+ minutes
    if (Math.abs(currentRomeHour - explicitHour) >= 1 || Math.abs(currentRomeMin - explicitMin) >= 15) {
      const diffHours = explicitHour - currentRomeHour;
      const diffMin = explicitMin - currentRomeMin;
      const correctedStartMs = startMs + (diffHours * 3600000) + (diffMin * 60000);
      const originalDurationMs = event.endTime ? (Date.parse(event.endTime) - startMs) : (2 * 3600000);
      const correctedDuration = isNaN(originalDurationMs) || originalDurationMs <= 0 ? 2 * 3600000 : originalDurationMs;

      updatedEvent.startTime = new Date(correctedStartMs).toISOString();
      updatedEvent.endTime = new Date(correctedStartMs + correctedDuration).toISOString();
      issues.push(`Orario di inizio corretto in base al testo: impostato alle ${String(explicitHour).padStart(2, '0')}:${String(explicitMin).padStart(2, '0')} (era ${String(currentRomeHour).padStart(2, '0')}:${String(currentRomeMin).padStart(2, '0')}).`);
    }
  }

  return {
    isValidForScheduledDate,
    event: updatedEvent,
    issues
  };
}

