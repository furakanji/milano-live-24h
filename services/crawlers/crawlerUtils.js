/**
 * Crawler Shared Utilities & Helpers (`services/crawlers/crawlerUtils.js`)
 */

export const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

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
export function cleanDescription(html = '', maxLen = 220) {
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
 * Classifies categories based on title, description and tags
 */
export function classifyMilanCategory(haystack = '') {
  const text = haystack.toLowerCase();
  if (/mostr[ae]|esposizion|vernissage|collezione|padiglione|quadr|scultur|museo|pinacoteca|triennale|mudec|palazzo\s*reale|hangar\s*bicocca/i.test(text)) {
    return 'mostre';
  }
  if (/cinem[ae]|proiezion|film|rassegna\s*cinematografic|cortometraggi|regista|sala\s*cinema/i.test(text)) {
    return 'cinema';
  }
  if (/teatr[oe]|spettacol[oe]|drammaturg|prosa|musical|commedia|stand\s*up|monolog|attore|attrice/i.test(text)) {
    return 'teatro';
  }
  if (/libr[oi]|presentazion|incontr[oi]|talk|conferenz|dibattit|dialogo|poesi|autore|autrice|festival\s*letterar/i.test(text)) {
    return 'libri';
  }
  if (/apertur[ae]\s*straordinari|visita\s*guidat|fai|dimora|palazzo\s*aperto|segret[oi]/i.test(text)) {
    return 'aperture';
  }
  if (/assemble[ae]|attivismo|cittadin|diritti|sciopero|territorio|politica/i.test(text)) {
    return 'politica';
  }
  // Default to Concerti & Club for music, gigs, live shows
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
  // 1. Direct fetch (always succeeds in Node.js / GitHub Actions and on same-origin)
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
    // If running in browser and CORS failed, proceed to CORS proxies
  }

  // 2. Proxies fallback (for GitHub Pages static client-side)
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
