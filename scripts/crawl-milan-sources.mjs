#!/usr/bin/env node
/**
 * Background / Cron Script: Crawl Milan Sources (`scripts/crawl-milan-sources.mjs`)
 *
 * Runs all crawlers (Zero, MilanoToday, YesMilano, Mentelocale, DICE)
 * Normalizes, deduplicates, and saves output to `public/live-events.json`
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMultiSourceCrawlers, deduplicateEventsList } from '../services/crawlers/multiSourceOrchestrator.js';
import { crawlDiceMilanEvents } from '../backend/diceMilanCrawler.js';
import { syncSnapshotToCloud } from '../backend/cloudSync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outPath = path.join(repoRoot, 'public', 'live-events.json');

async function main() {
  const nowMs = Date.now();
  console.log(`[crawl-milan-sources] Starting multi-crawler run at ${new Date(nowMs).toISOString()}...`);

  // Run multi-source crawlers (Zero, MilanoToday, YesMilano, Mentelocale)
  const multiResult = await runMultiSourceCrawlers({ nowMs, forceRefresh: true });

  // Run DICE crawler
  let diceEvents = [];
  try {
    const diceResult = await crawlDiceMilanEvents({ nowMs, forceRefresh: true, concurrencyLimit: 5 });
    diceEvents = (diceResult.events || []).map(e => ({
      ...e,
      source: e.source || 'DICE'
    }));
  } catch (err) {
    console.warn('[crawl-milan-sources] Warning crawling DICE:', err.message);
  }

  // Merge & Deduplicate all events across all sources (Zero, MilanoToday, YesMilano, Mentelocale, DICE)
  const combinedRawEvents = [...multiResult.events, ...diceEvents];
  const allEvents = deduplicateEventsList(combinedRawEvents);

  const payload = {
    generatedAt: new Date(nowMs).toISOString(),
    stats: {
      total: allEvents.length,
      crawlers: {
        ...multiResult.stats,
        dice: { count: diceEvents.length, status: 'ok' }
      }
    },
    events: allEvents
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`[crawl-milan-sources] Successfully wrote ${allEvents.length} events to ${outPath}`);
  console.log('[crawl-milan-sources] Breakdown:', JSON.stringify(payload.stats.crawlers, null, 2));

  // Push to cloud store if Firebase / cloud sync is configured
  const cloudRes = await syncSnapshotToCloud(payload);
  if (cloudRes.success) {
    console.log(`[crawl-milan-sources] Cloud sync completed (${cloudRes.target})`);
  }
}

main().catch(err => {
  console.error('[crawl-milan-sources] Fatal error:', err);
  process.exit(1);
});
