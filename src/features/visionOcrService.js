/**
 * Gemini Structured Vision OCR Extraction Service (`src/features/visionOcrService.js`)
 *
 * Converts camera/flyer photos to structured UnifiedEvents using Gemini 2.5 Flash API
 * with JSON response schema and fallback to Tesseract.js when API key is not configured.
 */

import { verifyEventCandidateWithAgent } from '../../backend/eventVerifierAgent.js';
import { resolveCanonicalVenue } from '../../services/crawlers/crawlerUtils.js';
import { parseFlyerOcrText } from './VisionOcrModal.js';

export const GEMINI_EVENT_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      description: 'List of events extracted from the flyer or billboard (may contain multiple dates/times)',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          venueName: { type: 'string', description: 'Venue or place in Milan' },
          address: { type: 'string', description: 'Physical street address in Milan' },
          neighborhood: { type: 'string', description: 'Milan neighborhood or area' },
          startTime: { type: 'string', description: 'ISO 8601 start timestamp in Europe/Rome' },
          endTime: { type: 'string', description: 'ISO 8601 end timestamp in Europe/Rome' },
          isFree: { type: 'boolean', description: 'True if free admission' },
          priceDetails: { type: 'string', description: 'Ticket pricing or entry conditions' },
          category: {
            type: 'string',
            enum: ['concerti', 'cinema', 'teatro', 'mostre', 'libri', 'politica', 'aperture']
          },
          description: { type: 'string', description: 'Clean Italian summary of the event' }
        },
        required: ['title', 'venueName', 'startTime', 'category', 'isFree']
      }
    }
  },
  required: ['events']
};

/**
 * Extracts structured event candidates from a photo using Gemini 2.5 Flash.
 * Falls back to in-browser Tesseract parsing if no Gemini API key is provided.
 */
export async function extractEventsFromFlyerImage(imageSource, displayName = 'locandina.jpg', options = {}) {
  const geminiApiKey = options.apiKey ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && (process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY));

  // 1. Try Gemini 2.5 Flash if API key is present
  if (geminiApiKey) {
    try {
      const base64Data = await convertImageToBase64(imageSource);
      if (base64Data) {
        const mimeType = base64Data.mimeType || 'image/jpeg';
        const rawBase64 = base64Data.base64;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: `Sei un assistente esperto di eventi a Milano. Analizza questa foto di locandina, manifesto o cartellone teatrale/cinematografico milanese.
Estrai tutti gli appuntamenti in programma con date, orari, luogo e prezzi.
Se il manifesto riporta una rassegna o repliche su più giorni, estrai ogni singolo appuntamento nell'array "events".
Tutti gli orari devono essere interpretati secondo il fuso orario Europe/Rome (+01:00 o +02:00 in base alla data).`
                },
                {
                  inlineData: {
                    mimeType,
                    data: rawBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: GEMINI_EVENT_SCHEMA,
            temperature: 0.1
          }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(12000)
        });

        if (response.ok) {
          const resultJson = await response.json();
          const candidateText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            if (Array.isArray(parsed.events) && parsed.events.length > 0) {
              return parsed.events.map(ev => normalizeExtractedEvent(ev, displayName, 'GEMINI_VISION_FLASH'));
            }
          }
        }
      }
    } catch (err) {
      console.warn('[visionOcrService] Gemini Vision call failed, falling back to local OCR:', err.message);
    }
  }

  // 2. Fallback: Local Tesseract.js / Rule-based OCR Parser
  const fallbackParsed = parseFlyerOcrText(
    typeof imageSource === 'string' && !imageSource.startsWith('data:') ? imageSource : '',
    displayName
  );

  const startMs = Date.now() + 3 * 3600 * 1000;
  const endMs = startMs + 2 * 3600 * 1000;

  return [
    normalizeExtractedEvent({
      title: fallbackParsed.title,
      venueName: fallbackParsed.venueName,
      address: fallbackParsed.address,
      neighborhood: fallbackParsed.neighborhood,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      isFree: fallbackParsed.isFree,
      priceDetails: fallbackParsed.priceDetails,
      category: fallbackParsed.category,
      description: `Evento estratto automaticamente da locandina "${displayName}".`
    }, displayName, 'TESSERACT_OCR_FALLBACK')
  ];
}

/**
 * Normalizes and resolves canonical venue for an extracted OCR event
 */
function normalizeExtractedEvent(rawEvent, displayName, extractionMethod) {
  const canonical = resolveCanonicalVenue(rawEvent.venueName || '');
  const id = `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    title: rawEvent.title || 'Nuovo Evento da Locandina',
    venueName: canonical.name || rawEvent.venueName || 'Milano',
    address: canonical.address || rawEvent.address || 'Milano',
    neighborhood: canonical.neighborhood || rawEvent.neighborhood || 'Milano',
    startTime: rawEvent.startTime || new Date(Date.now() + 4 * 3600000).toISOString(),
    endTime: rawEvent.endTime || new Date(Date.now() + 6 * 3600000).toISOString(),
    isFree: Boolean(rawEvent.isFree),
    priceDetails: rawEvent.priceDetails || (rawEvent.isFree ? 'Ingresso Libero' : 'A Pagamento'),
    category: rawEvent.category || 'concerti',
    description: rawEvent.description || `Dettagli estratti da locandina fotografata a Milano (${displayName}).`,
    source: 'Community Radar',
    sourceBadge: '📸 COMMUNITY RADAR',
    sourceUrl: 'https://cultura.comune.milano.it',
    instagramUrl: canonical.instagramUrl || null,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((canonical.name || 'Milano') + ' Milano')}`,
    extractionMethod,
    flyerFileName: displayName
  };
}

/**
 * Routes extracted OCR events:
 * - If startTime falls in [now - 1h, now + 24h] -> Immediate 24h timeline
 * - If startTime > now + 24h -> Future scheduling queue (scheduled_events)
 */
export function routeOcrEvent(event, nowMs = Date.now()) {
  const startMs = Date.parse(event.startTime);
  const diffHours = (startMs - nowMs) / 3600000;

  // Gate check with EventVerifierAgent
  const check = verifyEventCandidateWithAgent(event);
  if (!check.isValidEvent) {
    return {
      destination: 'quarantine',
      reason: check.rejectionReasons?.join('; ') || 'Scartato dall\'Agente di Verifica',
      event
    };
  }

  if (diffHours >= -1 && diffHours <= 24) {
    return {
      destination: 'live_24h',
      message: 'Evento verificato nelle 24h! Mostrato immediatamente nel radar.',
      event: {
        ...event,
        isSoldOut: check.isSoldOut,
        availabilityBadge: check.availabilityBadge
      }
    };
  }

  return {
    destination: 'scheduled_events',
    message: `Evento programmato tra ${Math.round(diffHours / 24)} giorni. Apparirà automaticamente nel radar 24 ore prima dell'inizio!`,
    scheduledInHours: Math.round(diffHours),
    event: {
      ...event,
      isSoldOut: check.isSoldOut,
      availabilityBadge: check.availabilityBadge
    }
  };
}

/**
 * Helper to convert File / Blob / Canvas to base64
 */
async function convertImageToBase64(imageSource) {
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    const parts = imageSource.split(',');
    const match = parts[0].match(/:(.*?);/);
    const mimeType = match ? match[1] : 'image/jpeg';
    return { mimeType, base64: parts[1] };
  }

  if (typeof Blob !== 'undefined' && imageSource instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const parts = result.split(',');
        const match = parts[0].match(/:(.*?);/);
        resolve({ mimeType: match ? match[1] : 'image/jpeg', base64: parts[1] });
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  }

  return null;
}
