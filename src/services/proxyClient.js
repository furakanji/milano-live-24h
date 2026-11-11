/**
 * Client Proxy Manager (`src/services/proxyClient.js`)
 *
 * Routes client-side HTTP calls through proprietary Serverless proxy (`VITE_CUSTOM_PROXY_URL`)
 * with a 4500ms circuit breaker timeout before falling back to public CORS proxies.
 */

const PUBLIC_CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

export class ProxyClient {
  constructor() {
    this.customProxyUrl = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_CUSTOM_PROXY_URL || '')
      : (typeof process !== 'undefined' && process.env ? process.env.VITE_CUSTOM_PROXY_URL : '');
  }

  /**
   * Safe fetch prioritizing proprietary serverless proxy
   */
  async fetch(targetUrl, options = {}) {
    const timeoutMs = options.timeout || 10000;

    // 1. If in Node.js or direct fetch works (no CORS restrictions)
    if (typeof window === 'undefined') {
      try {
        const res = await fetch(targetUrl, {
          ...options,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
            ...(options.headers || {})
          },
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (res.ok) return await res.text();
      } catch {
        // Continue to fallback
      }
    }

    // 2. Try proprietary serverless proxy first (4500ms circuit breaker)
    if (this.customProxyUrl) {
      try {
        const proxyEndpoint = `${this.customProxyUrl}?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyEndpoint, {
          signal: AbortSignal.timeout(4500)
        });
        if (res.ok) {
          return await res.text();
        }
      } catch (err) {
        console.warn('[proxyClient] Custom edge proxy timed out / failed, falling back:', err.message);
      }
    }

    // 3. Fallback: try direct fetch in browser (works if endpoint supports CORS, e.g. Zero.eu REST API)
    try {
      const res = await fetch(targetUrl, {
        ...options,
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // CORS block or network failure
    }

    // 4. Public CORS Proxy fallback
    for (const proxyFn of PUBLIC_CORS_PROXIES) {
      const pUrl = proxyFn(targetUrl);
      try {
        const res = await fetch(pUrl, {
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
          return await res.text();
        }
      } catch {
        // Try next proxy
      }
    }

    throw new Error(`[proxyClient] Failed to fetch ${targetUrl} via all available proxies`);
  }
}

export const proxyClient = new ProxyClient();
export default proxyClient;
