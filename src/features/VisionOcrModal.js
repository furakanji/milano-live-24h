/**
 * Vision OCR Flyer Scanner Module (`src/features/VisionOcrModal.js`)
 * Handles camera preview capture, local file uploads, and in-browser OCR parsing.
 */

let activeCameraStream = null;

export const BACKEND_VENUE_PROFILES = [
  {
    match: /casadellacultura/i,
    venueName: 'Casa della Cultura',
    address: 'Via Borgogna 3',
    neighborhood: 'San Babila / Via Borgogna',
    category: 'politica',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    scheduledHour: 18,
    scheduledMinute: 30,
    defaultUrl: 'https://www.casadellacultura.it/',
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
    scheduledHour: 21,
    scheduledMinute: 0,
    defaultUrl: 'https://www.arcibellezza.it/',
    defaultTitle: 'Assemblea & Serata Culturale in Palestra Visconti'
  },
  {
    match: /fondazionefeltrinelli|feltrinelli/i,
    venueName: 'Fondazione Giangiacomo Feltrinelli',
    address: 'Viale Pasubio 5',
    neighborhood: 'Porta Volta',
    category: 'libri',
    isFree: true,
    priceDetails: 'GRATIS • Accesso libero con registrazione',
    scheduledHour: 18,
    scheduledMinute: 30,
    defaultUrl: 'https://fondazionefeltrinelli.it/partecipa-home/',
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
    scheduledHour: 19,
    scheduledMinute: 0,
    defaultUrl: 'https://base.milano.it/',
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
    scheduledHour: 18,
    scheduledMinute: 0,
    defaultUrl: 'https://www.cgil.milano.it/',
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
    scheduledHour: 20,
    scheduledMinute: 45,
    defaultUrl: 'https://www.spaziocinema.info/milano',
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
    scheduledHour: 21,
    scheduledMinute: 0,
    defaultUrl: 'https://www.cinemamexico.it/',
    defaultTitle: 'Proiezione d’Autore + Dibattito con Regista e Ospiti'
  },
  {
    match: /beltrade|bandhi|milanocinema/i,
    venueName: 'Cinema Beltrade',
    address: 'Via Nino Oxilia 10',
    neighborhood: 'NoLo / Piazza Morbegno',
    category: 'cinema',
    isFree: false,
    priceDetails: '€7,50 Biglietto intero',
    scheduledHour: 21,
    scheduledMinute: 30,
    defaultUrl: 'https://milanocinema.com/it/cinema/beltrade',
    defaultTitle: 'Rassegna Cinema Indipendente in Versione Originale'
  },
  {
    match: /piccoloteatro/i,
    venueName: 'Piccolo Teatro Strehler',
    address: 'Largo Greppi 1',
    neighborhood: 'Lanza / Brera',
    category: 'teatro',
    isFree: false,
    priceDetails: '€22,00 Platea / €16,00 Balconata',
    scheduledHour: 19,
    scheduledMinute: 30,
    defaultUrl: 'https://www.piccoloteatro.org/it/theaters/piccolo-teatro-strehler',
    defaultTitle: 'Spettacolo Serale & Incontro al Piccolo Teatro Strehler'
  },
  {
    match: /teatrofrancoparenti|parenti/i,
    venueName: 'Teatro Franco Parenti',
    address: 'Via Pier Lombardo 14',
    neighborhood: 'Porta Romana',
    category: 'teatro',
    isFree: false,
    priceDetails: '€18,00 - €28,00',
    scheduledHour: 20,
    scheduledMinute: 30,
    defaultUrl: 'https://teatrofrancoparenti.it/cartellone/spettacoli-teatro-milano/',
    defaultTitle: 'Drammaturgia Contemporanea & Talk al Teatro Franco Parenti'
  },
  {
    match: /dice\.fm|ra\.co|magnolia|biko|santeria|alcatraz/i,
    venueName: 'Santeria Toscana 31',
    address: 'Viale Toscana 31',
    neighborhood: 'Viale Toscana / Bocconi',
    category: 'concerti',
    isFree: false,
    priceDetails: 'Biglietti su santeria.milano.it / DICE',
    scheduledHour: 21,
    scheduledMinute: 0,
    defaultUrl: 'https://www.santeria.milano.it/eventi/',
    defaultTitle: 'Live Showcase & Concerti in Santeria Toscana 31'
  }
];

export function parseFlyerOcrText(text, fileName = '') {
  const lines = (text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2);

  let title = '';
  for (const line of lines) {
    if (!/^(milano|comune|ingresso|gratis|ore|h\.|sabato|domenica|venerdi|giovedi|mercoledi|martedi|lunedi)/i.test(line) && line.length > 4 && line.length < 80) {
      title = line;
      break;
    }
  }
  if (!title) {
    const cleaned = (fileName || '')
      .replace(/\.[^.]+$/, '')
      .replace(/^(img|dsc|photo|screenshot|image|foto|locandina|scatto)[-_0-9\s]*/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    title = cleaned.length > 4 ? cleaned.replace(/\b\w/g, c => c.toUpperCase()) : 'Nuovo Evento da Locandina';
  }

  let hour = 20;
  let minute = 30;
  const timeMatch = text.match(/(?:ore|h\.?|dalle|h)\s*([0-2]?[0-9])[:.]([0-5][0-9])/i) || text.match(/(?:ore|h\.?|dalle)\s*([0-2]?[0-9])\b/i);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    if (h >= 0 && h <= 23) {
      hour = h;
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    }
  }

  let venueName = 'Luogo segnalato in locandina';
  let address = 'Milano';
  let neighborhood = 'Milano';

  const matchedProfile = BACKEND_VENUE_PROFILES.find(p => p.match.test(text + ' ' + fileName));
  if (matchedProfile) {
    venueName = matchedProfile.venueName;
    address = matchedProfile.address;
    neighborhood = matchedProfile.neighborhood;
  } else {
    const viaMatch = text.match(/(via|viale|corso|piazza|piazzale|largo)\s+[A-Za-zÀ-ÿ0-9'\s]{4,30}/i);
    if (viaMatch) {
      address = viaMatch[0].trim() + ', Milano';
    }
  }

  let isFree = true;
  let priceDetails = 'GRATIS • Ingresso libero';
  if (/€\s*\d+|\d+\s*€|euro|ticket|bigliett|prevendita/i.test(text)) {
    isFree = false;
    const priceMatch = text.match(/€\s*(\d+(?:[.,]\d{2})?)|\b(\d+(?:[.,]\d{2})?)\s*€/i);
    priceDetails = priceMatch ? `€${(priceMatch[1] || priceMatch[2]).replace(',', '.')} Biglietto` : 'A Pagamento / Prevendita';
  }

  let category = 'politica';
  if (/concerto|live|dj|band|musica|sound|acoustic|rock|jazz|techno/i.test(text)) {
    category = 'concerti';
  } else if (/film|cinema|proiezione|regia|cortometragg/i.test(text)) {
    category = 'cinema';
  } else if (/teatro|spettacolo|recit|attor|palco|drammaturg/i.test(text)) {
    category = 'teatro';
  } else if (/mostra|vernissage|esposiz|arte|galleria|design|quadr/i.test(text)) {
    category = 'mostre';
  } else if (/libro|presentazione|talk|dibattito|autore|autrice|poesia|lettura/i.test(text)) {
    category = 'libri';
  } else if (/visita|tour|apertura|guidat|segret/i.test(text)) {
    category = 'aperture';
  }

  return {
    title,
    venueName,
    address,
    neighborhood,
    category,
    isFree,
    priceDetails,
    scheduledHour: hour,
    scheduledMinute: minute,
    rawOcrText: text
  };
}

export async function openCameraCaptureModal(onSnapshotCaptured) {
  const cameraFileInput = document.getElementById('input-flyer-camera');
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    cameraFileInput?.click();
    return;
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      activeCameraStream = stream;
      const modal = document.getElementById('camera-capture-modal');
      const videoEl = document.getElementById('camera-video-preview');
      if (videoEl) videoEl.srcObject = stream;
      modal?.classList.remove('hidden');

      // Bind snap button
      const snapBtn = document.getElementById('snap-camera-photo-btn');
      if (snapBtn) {
        snapBtn.onclick = async () => {
          const snapName = `locandina-scatto-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.jpg`;
          let snapSource = snapName;
          if (videoEl && videoEl.videoWidth > 0) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = videoEl.videoWidth;
              canvas.height = videoEl.videoHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              snapSource = canvas.toDataURL('image/jpeg', 0.85);
            } catch (e) {
              console.warn('Canvas capture fallback:', e);
            }
          }
          closeCameraCaptureModal();
          if (typeof onSnapshotCaptured === 'function') {
            await onSnapshotCaptured(snapSource, snapName);
          }
        };
      }
      return;
    } catch {
      // Fallback
    }
  }
  cameraFileInput?.click();
}

export function closeCameraCaptureModal() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach(track => track.stop());
    activeCameraStream = null;
  }
  const modal = document.getElementById('camera-capture-modal');
  modal?.classList.add('hidden');
}

export async function processFlyerWithTesseract(imageSource, displayName, statusCallback) {
  let recognizedText = '';
  try {
    if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
      const { data } = await window.Tesseract.recognize(
        imageSource,
        'ita+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress && typeof statusCallback === 'function') {
              statusCallback(Math.round(m.progress * 100));
            }
          }
        }
      );
      recognizedText = data?.text || '';
    }
  } catch (err) {
    console.warn('Tesseract OCR error/offline:', err);
  }
  return parseFlyerOcrText(recognizedText, displayName);
}
