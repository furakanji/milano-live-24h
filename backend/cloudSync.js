/**
 * Backend Cloud Sync Helper (`backend/cloudSync.js`)
 * Used by scripts/crawl-milan-sources.mjs and GitHub Actions
 * Pushes live feed snapshot to Firebase Firestore or custom cloud endpoint.
 */

export async function syncSnapshotToCloud(payload, options = {}) {
  const projectId = options.projectId || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = options.apiKey || process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const cloudSyncUrl = options.cloudSyncUrl || process.env.CLOUD_SYNC_URL;

  if (cloudSyncUrl) {
    try {
      console.log(`[cloudSync] Pushing live events to custom CLOUD_SYNC_URL (${cloudSyncUrl})...`);
      const res = await fetch(cloudSyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CLOUD_SYNC_SECRET ? { 'Authorization': `Bearer ${process.env.CLOUD_SYNC_SECRET}` } : {})
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        console.log('[cloudSync] Successfully synchronized payload to CLOUD_SYNC_URL');
        return { success: true, target: 'custom-url' };
      }
      console.warn(`[cloudSync] Custom sync returned HTTP ${res.status}`);
    } catch (err) {
      console.warn('[cloudSync] Error pushing to CLOUD_SYNC_URL:', err.message);
    }
  }

  if (projectId) {
    try {
      console.log(`[cloudSync] Pushing live snapshot to Firebase Firestore (project: ${projectId})...`);
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/snapshots/live_24h${apiKey ? `?key=${apiKey}` : ''}`;
      
      const firestoreDoc = {
        fields: {
          generatedAt: { stringValue: payload.generatedAt || new Date().toISOString() },
          stats: {
            mapValue: {
              fields: {
                total: { integerValue: String(payload.stats?.total || payload.events?.length || 0) }
              }
            }
          },
          events: {
            arrayValue: {
              values: (payload.events || []).map(ev => ({
                mapValue: {
                  fields: {
                    id: { stringValue: ev.id || '' },
                    title: { stringValue: ev.title || '' },
                    description: { stringValue: ev.description || '' },
                    venueName: { stringValue: ev.venueName || '' },
                    address: { stringValue: ev.address || '' },
                    neighborhood: { stringValue: ev.neighborhood || '' },
                    startTime: { stringValue: ev.startTime || '' },
                    endTime: { stringValue: ev.endTime || '' },
                    isFree: { booleanValue: Boolean(ev.isFree) },
                    priceDetails: { stringValue: ev.priceDetails || '' },
                    category: { stringValue: ev.category || 'concerti' },
                    source: { stringValue: ev.source || '' },
                    sourceBadge: { stringValue: ev.sourceBadge || ev.source || '' },
                    sourceUrl: { stringValue: ev.sourceUrl || '' },
                    mapsUrl: { stringValue: ev.mapsUrl || '' },
                    instagramUrl: { stringValue: ev.instagramUrl || '' },
                    isSoldOut: { booleanValue: Boolean(ev.isSoldOut) },
                    isOutOfTown: { booleanValue: Boolean(ev.isOutOfTown) },
                    outOfTownLocation: { stringValue: ev.outOfTownLocation || '' },
                    isContinuous: { booleanValue: Boolean(ev.isContinuous) },
                    openHour: { stringValue: ev.openHour || '' },
                    closeHour: { stringValue: ev.closeHour || '' }
                  }
                }
              }))
            }
          }
        }
      };

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreDoc),
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        console.log('[cloudSync] Successfully synchronized snapshot to Firestore');
        return { success: true, target: 'firestore' };
      }
      console.warn(`[cloudSync] Firestore returned HTTP ${res.status}`);
    } catch (err) {
      console.warn('[cloudSync] Error pushing to Firestore:', err.message);
    }
  }

  return { success: false, reason: 'No cloud provider configured or reachable' };
}
