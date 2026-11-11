import { crawlDiceMilanEvents } from '../../backend/diceMilanCrawler.js';

/**
 * Serverless / Edge Route Handler for DICE Milan Real-Time Crawler
 * GET /api/crawl/dice
 *
 * Query parameters:
 * - refresh: '1' or 'true' to force cache bypass
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true';
    const crawlResult = await crawlDiceMilanEvents({
      nowMs: Date.now(),
      forceRefresh,
      concurrencyLimit: 5
    });

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({
      success: true,
      service: 'dice-milan-crawler',
      city: 'Milano',
      ...crawlResult
    });
  } catch (err) {
    console.error('[/api/crawl/dice] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to crawl DICE Milan events',
      message: err.message,
      events: []
    });
  }
}
