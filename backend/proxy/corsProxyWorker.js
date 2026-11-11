/**
 * Serverless / Edge CORS Proxy Worker (`backend/proxy/corsProxyWorker.js`)
 *
 * Deployable to Cloudflare Workers or Firebase Cloud Functions v2.
 * - Restricts requests to authorized origins (GitHub Pages + Localhost).
 * - Rotates Desktop User-Agent & Italian localization headers.
 * - Caches target responses at Edge (`s-maxage=900, stale-while-revalidate=1800`)
 *   to avoid repeated requests against Milan event portals.
 */

const ALLOWED_ORIGINS = [
  'https://furakanji.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
];

const ROTATING_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
];

function getRandomUserAgent() {
  return ROTATING_USER_AGENTS[Math.floor(Math.random() * ROTATING_USER_AGENTS.length)];
}

export async function handleProxyRequest(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith('http://localhost:'));

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://furakanji.github.io',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  };

  // Handle preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target "url" query parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Security: Prevent SSRF / local network probing
  try {
    const parsedTarget = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
      return new Response(JSON.stringify({ error: 'Invalid protocol' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const hostname = parsedTarget.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'].includes(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return new Response(JSON.stringify({ error: 'Prohibited target host' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed target URL' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Fetch target upstream
  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(10000)
    });

    const responseBody = await upstreamRes.arrayBuffer();
    const contentType = upstreamRes.headers.get('content-type') || 'text/html; charset=utf-8';

    return new Response(responseBody, {
      status: upstreamRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Proxied-By': 'milano-live-24h-edge-proxy'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', message: err.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Export default for Cloudflare Workers / V8 Edge functions
export default {
  async fetch(request) {
    return handleProxyRequest(request);
  }
};
