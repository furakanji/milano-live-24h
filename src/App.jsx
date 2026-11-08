import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  MapPin,
  Instagram,
  Facebook,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  Database,
  Sparkles,
  ShieldAlert,
  Link2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Ban,
  X
} from 'lucide-react';
import {
  CATEGORIES,
  buildMapsUrl,
  generateRolling24hFeed,
  buildFull24HourlySlots,
  resolveScheduledTimeInRolling24h,
  autoExtractCommunitySubmissionBackend,
  getNextHourStartMs,
  getRomeDateParts,
  getTimeBlockLabel
} from './data/milanEventsGenerator';

export default function App() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [priceFilter, setPriceFilter] = useState('all'); // 'all' | 'free' | 'paid'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyLiveNow, setOnlyLiveNow] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set(['evt-mexico-qa', 'evt-base-vernissage']));

  // Public Community Radar State (Only 2 functions: Link or Flyer Photo)
  const [userAddedEvents, setUserAddedEvents] = useState([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFlyerName, setSelectedFlyerName] = useState('');
  const [publicFeedbackBanner, setPublicFeedbackBanner] = useState(null);

  // Camera Modal state for "Scatta Foto"
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileChooseInputRef = useRef(null);
  const fileCameraInputRef = useRef(null);

  // Hidden Admin Route (`/#admin`) & Auth State (Never exposed in public UI)
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash === '#admin');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('milano-admin-24h');
  const [adminLoginError, setAdminLoginError] = useState(false);
  const [adminFeedbackBanner, setAdminFeedbackBanner] = useState(null);

  // Backend Source Learning & Safeguard Quarantine State (Visible ONLY in #admin)
  const [learnedSources, setLearnedSources] = useState([
    {
      id: 'src-arcibellezza',
      name: 'Circolo ARCI Bellezza Milano',
      domain: 'arcibellezza.it',
      inferredType: 'JSON_LD_VENUE + WP_REST_API',
      category: 'politica',
      trustScore: 94,
      status: 'AUTO_LEARNED'
    }
  ]);
  const [quarantineQueue, setQuarantineQueue] = useState([
    {
      qId: 'quar-crypto-01',
      submittedVia: 'LINK_URL',
      rawSource: 'https://bit.ly/milano-secret-warehouse-crypto-rave',
      inferredType: 'OBFUSCATED_SHORTLINK_REDIRECT',
      trustScore: 22,
      riskLevel: 'ALTO',
      redFlags: [
        'URL Shortener offuscato (bit.ly) verso dominio esterno non censito',
        'Indirizzo civico milanese mancante ("Secret Location TBA")'
      ],
      eventCandidate: {
        title: 'Secret Industrial Warehouse Night — Prevendita Token',
        venueName: 'Ex Magazzini Scalo Farini (Da Verificare)',
        address: 'Via Valtellina',
        neighborhood: 'Farini / Bovisa',
        category: 'concerti',
        isFree: false,
        priceDetails: '€25,00 (Link esterno non verificato)',
        scheduledHour: 23,
        scheduledMinute: 15,
        durationMinutes: 180,
        description: 'Segnalazione utente intercettata dal Safeguard backend per dominio esterno non verificato.'
      }
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onHashChange = () => setIsAdminRoute(window.location.hash === '#admin');
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        window.location.hash = window.location.hash === '#admin' ? '' : '#admin';
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Always start from the full hour immediately following the current hour
  const nextHourStartMs = useMemo(() => getNextHourStartMs(nowMs), [Math.floor(nowMs / 3_600_000)]);
  const baseEvents = useMemo(() => generateRolling24hFeed(nowMs), [nextHourStartMs]);
  const romeNow = useMemo(() => getRomeDateParts(new Date(nowMs)), [nowMs]);
  const romeNextHour = useMemo(() => getRomeDateParts(new Date(nextHourStartMs)), [nextHourStartMs]);
  const romePlus24 = useMemo(
    () => getRomeDateParts(new Date(nextHourStartMs + 24 * 60 * 60 * 1000)),
    [nextHourStartMs]
  );

  const events = useMemo(() => {
    return [...baseEvents, ...userAddedEvents].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [baseEvents, userAddedEvents]);

  const evaluateSourceSafeguard = (rawSourceInput, venueText, titleText, submittedVia) => {
    const lower = (rawSourceInput || '').toLowerCase();
    const venueLower = (venueText || '').toLowerCase();
    const redFlags = [];
    let trustScore = 88;
    let inferredType =
      submittedVia === 'FLYER_PHOTO_OCR'
        ? 'VISION_OCR + VENUE_HTML_MONITOR'
        : 'STRUCTURED_HTML + LLM_EXTRACTOR';

    if (/bit\.ly|tinyurl\.com|t\.co|shorturl/i.test(lower)) {
      redFlags.push('URL Shortener offuscato rilevato (rischio phishing / redirect esterno)');
      trustScore -= 50;
      inferredType = 'OBFUSCATED_SHORTLINK_REDIRECT';
    }
    if (/\.(xyz|top|click)(\/|$)|crypto|token/i.test(`${lower} ${(titleText || '').toLowerCase()}`)) {
      redFlags.push('Dominio non verificato ad alto rischio (.xyz / pagamento esterno)');
      trustScore -= 45;
    }
    if (/t\.me\/|telegram/i.test(lower)) {
      redFlags.push('Canale bot Telegram non censito nel registro culturale milanese');
      trustScore -= 35;
      inferredType = 'UNVERIFIED_TELEGRAM_BOT';
    }
    if (!venueLower || /tba|secret|segreto/i.test(venueLower)) {
      redFlags.push('Indirizzo civico milanese mancante o "Secret Location TBA"');
      trustScore -= 30;
    }

    return {
      trustScore: Math.max(5, trustScore),
      inferredType,
      isSuspicious: trustScore < 70 || redFlags.length > 0,
      riskLevel: trustScore < 40 ? 'ALTO' : 'MEDIO',
      redFlags
    };
  };

  const buildDynamicUserEvent = ({
    title,
    venueName,
    address,
    neighborhood = 'Milano (Community)',
    category,
    isFree,
    priceDetails,
    scheduledHour = 18,
    scheduledMinute = 30,
    durationMinutes = 105,
    sourceName,
    sourceUrl,
    instagramUrl,
    facebookUrl,
    description
  }) => {
    const startMs = resolveScheduledTimeInRolling24h(scheduledHour, scheduledMinute, nextHourStartMs);
    const endMs = startMs + durationMinutes * 60_000;
    const startRome = getRomeDateParts(new Date(startMs));
    const endRome = getRomeDateParts(new Date(endMs));
    const isTomorrow = startRome.day !== romeNow.day;
    const diffMinutes = Math.max(1, Math.round((startMs - nowMs) / 60_000));

    return {
      id: `evt-community-${Date.now()}`,
      title,
      description,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      venueName,
      neighborhood,
      address: /milano/i.test(address) ? address : `${address}, Milano`,
      isFree,
      priceDetails: priceDetails || (isFree ? 'GRATIS • Ingresso libero' : '€€ / Biglietto'),
      category,
      mapsUrl: buildMapsUrl(venueName, address),
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      sourceUrl: sourceUrl || 'https://www.casadellacultura.it/',
      sourceName,
      startHM: startRome.hm,
      endHM: endRome.hm,
      slotHour: `${startRome.hour}:00`,
      slotKey: `${startRome.year}-${startRome.month}-${startRome.day}-${startRome.hour}`,
      diffMinutes,
      isHappeningNow: diffMinutes <= 90,
      isTomorrow,
      weekday: startRome.weekday,
      dayMonth: `${startRome.day}/${startRome.month}`,
      timeBlock: getTimeBlockLabel(startRome.hourNum, isTomorrow)
    };
  };

  // Automatic Backend Extraction + Silent Safeguard Evaluation
  const handleAutomaticCommunitySubmission = ({ submittedVia, rawSource = '', imageFileName = '' }) => {
    const extracted = autoExtractCommunitySubmissionBackend({
      submittedVia,
      rawSourceInput: rawSource,
      imageFileName
    });

    const check = evaluateSourceSafeguard(
      rawSource || extracted.sourceUrl,
      extracted.venueName,
      extracted.title,
      submittedVia
    );

    if (check.isSuspicious) {
      setQuarantineQueue((prev) => [
        {
          qId: `quar-${Date.now()}`,
          submittedVia,
          rawSource: rawSource || imageFileName,
          inferredType: check.inferredType,
          trustScore: check.trustScore,
          riskLevel: check.riskLevel,
          redFlags: check.redFlags,
          eventCandidate: extracted
        },
        ...prev
      ]);
      setPublicFeedbackBanner({
        type: 'pending',
        message: `⏳ Ricevuto! Il servizio backend ha preso in carico la segnalazione per la verifica redazionale prima della pubblicazione.`
      });
      return;
    }

    const newEv = buildDynamicUserEvent(extracted);
    setUserAddedEvents((prev) => [...prev, newEv]);
    setExpandedIds((prev) => new Set([...prev, newEv.id]));

    setLearnedSources((prev) => [
      {
        id: `src-${Date.now()}`,
        name: extracted.venueName,
        domain: extracted.sourceName,
        inferredType: check.inferredType,
        category: extracted.category,
        trustScore: check.trustScore,
        status: 'AUTO_LEARNED'
      },
      ...prev
    ]);

    setPublicFeedbackBanner({
      type: 'success',
      message: `✅ Dettagli estratti automaticamente in backend: "${newEv.title}" presso ${newEv.venueName} (ore ${newEv.startHM} – ${newEv.endHM}, ${newEv.priceDetails}). Aggiunto alla programmazione 24h!`
    });
  };

  // Open WebRTC camera modal or fallback to native mobile camera capture
  const handleOpenCameraCapture = async () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      fileCameraInputRef.current?.click();
      return;
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        streamRef.current = stream;
        setIsCameraOpen(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 50);
        return;
      } catch {
        // Fallback to native file input with capture attribute
      }
    }
    fileCameraInputRef.current?.click();
  };

  const closeCameraModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhotoFromVideo = () => {
    closeCameraModal();
    const snapName = `locandina-scatto-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.jpg`;
    setSelectedFlyerName(snapName);
    handleAutomaticCommunitySubmission({
      submittedVia: 'FLYER_PHOTO_OCR',
      imageFileName: snapName
    });
  };

  const approveQuarantineItem = (qId) => {
    const item = quarantineQueue.find((q) => q.qId === qId);
    if (!item) return;
    setQuarantineQueue((prev) => prev.filter((q) => q.qId !== qId));
    const newEv = buildDynamicUserEvent({
      ...item.eventCandidate,
      sourceName: `${item.rawSource} [Verificata Admin]`,
      sourceUrl: 'https://www.casadellacultura.it'
    });
    setUserAddedEvents((prev) => [...prev, newEv]);
    setLearnedSources((prev) => [
      {
        id: `src-admin-${Date.now()}`,
        name: item.eventCandidate.venueName,
        domain: item.rawSource,
        inferredType: item.inferredType,
        category: item.eventCandidate.category,
        trustScore: 85,
        status: 'ADMIN_VERIFIED'
      },
      ...prev
    ]);
    setAdminFeedbackBanner({
      type: 'success',
      message: `🛡️ Fonte approvata dall'Admin, aggiunta al Database Backend e pubblicata nella timeline 24h!`
    });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (priceFilter === 'free' && !ev.isFree) return false;
      if (priceFilter === 'paid' && ev.isFree) return false;
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
      if (onlyLiveNow && !ev.isHappeningNow) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const text = `${ev.title} ${ev.venueName} ${ev.neighborhood} ${ev.address} ${ev.description}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [events, priceFilter, categoryFilter, onlyLiveNow, searchQuery]);

  // Build all 24 hourly slots so hours without events (e.g. 03:00 AM) are left empty
  const hourlyGroups = useMemo(() => {
    const all24Slots = buildFull24HourlySlots(filteredEvents, nowMs);
    if (onlyLiveNow || searchQuery.trim() !== '') {
      return all24Slots.filter((slot) => slot.events.length > 0);
    }
    return all24Slots;
  }, [filteredEvents, nowMs, onlyLiveNow, searchQuery]);

  // Time block quick-jump links ("Stasera", "Stanotte", "Domani Mattina", "Domani Pomeriggio")
  const timeBlockJumps = useMemo(() => {
    const seen = new Map();
    for (const group of hourlyGroups) {
      if (!seen.has(group.timeBlock.id)) {
        seen.set(group.timeBlock.id, {
          id: group.timeBlock.id,
          label: `${group.timeBlock.icon || ''} ${group.timeBlock.label} (${group.slotHour})`,
          targetSlotKey: group.slotKey
        });
      }
    }
    return Array.from(seen.values());
  }, [hourlyGroups]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToSlot = (slotKey) => {
    const el = document.getElementById(`slot-${slotKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const freeCount = events.filter((e) => e.isFree).length;
  const happeningNowCount = events.filter((e) => e.isHappeningNow).length;

  // ============================================================================
  // HIDDEN ADMIN PAGE (`/#admin`) — NOT EXPOSED IN PUBLIC VIEW
  // ============================================================================
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#0b0c0e] text-zinc-100 antialiased px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-extrabold text-xs uppercase font-mono">
                🔒 BACKEND ADMIN ROUTE • /#admin
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Safeguard &amp; Source Learning Engine (Non esposto al pubblico)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAdminAuthenticated && (
                <button
                  type="button"
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-semibold"
                >
                  Blocca Sessione Admin
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '';
                  setIsAdminRoute(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-bold text-xs"
              >
                ← Torna alla Vista Pubblica
              </button>
            </div>
          </div>

          {!isAdminAuthenticated ? (
            <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-[#111318] border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-red-400" />
                <div>
                  <div className="text-xs font-bold uppercase text-red-400 font-mono">ACCESSO RISERVATO ADMIN</div>
                  <h2 className="text-lg font-black text-white">Console Backend Safeguard</h2>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Le funzioni di verifica delle fonti sospette e il database delle fonti apprese lavorano lato backend e sono visibili solo in questa pagina riservata.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPassword === 'milano-admin-24h' || adminPassword === 'admin') {
                    setIsAdminAuthenticated(true);
                    setAdminLoginError(false);
                  } else {
                    setAdminLoginError(true);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Chiave Admin..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono"
                />
                {adminLoginError && (
                  <div className="text-red-400 text-xs">Chiave non valida (usa milano-admin-24h)</div>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-extrabold uppercase"
                >
                  Accedi alla Console Admin →
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6 text-xs">
              {adminFeedbackBanner && (
                <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">
                  {adminFeedbackBanner.message}
                </div>
              )}

              <div className="p-5 rounded-xl bg-[#111318] border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-red-400 uppercase flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  1. Coda Quarantena Safeguard Backend ({quarantineQueue.length})
                </h3>
                {quarantineQueue.map((q) => (
                  <div
                    key={q.qId}
                    className="p-3.5 rounded-lg bg-zinc-950 border border-red-500/40 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-red-300">
                        RISCHIO {q.riskLevel} (Trust {q.trustScore}/100) — {q.eventCandidate.title}
                      </div>
                      <div className="text-zinc-400 font-mono mt-0.5">
                        Fonte sospetta: {q.rawSource} ({q.inferredType})
                      </div>
                      <ul className="list-disc list-inside text-zinc-300 mt-1">
                        {q.redFlags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuarantineQueue((prev) => prev.filter((x) => x.qId !== q.qId))}
                        className="px-3 py-1.5 rounded bg-zinc-800 text-red-300 font-bold flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" /> Rifiuta &amp; Blocca
                      </button>
                      <button
                        type="button"
                        onClick={() => approveQuarantineItem(q.qId)}
                        className="px-3 py-1.5 rounded bg-emerald-500 text-black font-extrabold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approva &amp; Insegna al DB
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-[#111318] border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  2. Database Fonti Apprese dal Backend ({learnedSources.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {learnedSources.map((src) => (
                    <div key={src.id} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="font-bold text-white">{src.name}</div>
                      <div className="text-zinc-400 font-mono mt-0.5">
                        {src.domain} • {src.inferredType} ({src.status})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-zinc-100 antialiased">
      {/* Top Status Bar */}
      <div className="border-b border-zinc-800 bg-[#08090b] px-4 py-2 text-xs">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              LIVE RADAR
            </span>
            <span className="text-zinc-400 font-mono">
              Dalle {romeNextHour.hm} (prossima ora) → Domani {romePlus24.hm} (+24h)
            </span>
          </div>
          <div className="font-mono text-zinc-400">
            Europe/Rome {romeNow.hm}:{romeNow.second}
          </div>
        </div>
      </div>

      {/* Editorial Header */}
      <header className="border-b border-zinc-800 px-4 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              MILANO METROPOLITANA • STRICT NEXT 24 HOURS
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase mt-1">
              MILANO LIVE <span className="text-orange-500 font-mono">24H</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Cosa succede a Milano nelle prossime 24 ore a partire dalle{' '}
              <span className="text-zinc-200 font-mono font-semibold">
                ore {romeNextHour.hm} (ora successiva alle {romeNow.hm})
              </span>
              : assemblee politiche e sociali, concerti, cinema con Q&amp;A, teatro, talk, mostre e aperture straordinarie.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              <div className="text-zinc-400">PROSSIME ORE</div>
              <div className="font-bold text-orange-400 font-mono mt-0.5">
                {happeningNowCount} eventi in partenza
              </div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              <div className="text-zinc-400">INGRESSO LIBERO</div>
              <div className="font-bold text-emerald-400 font-mono mt-0.5">
                {freeCount} eventi gratis
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Smart Filtering Bar */}
      <section className="sticky top-0 z-30 bg-[#0b0c0e]/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="max-w-5xl mx-auto space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Mandatory Pricing Filter */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setPriceFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  priceFilter === 'all' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                }`}
              >
                Tutti ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setPriceFilter('free')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                  priceFilter === 'free' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Gratis / Ingresso Libero ({freeCount})
              </button>
              <button
                type="button"
                onClick={() => setPriceFilter('paid')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  priceFilter === 'paid' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                }`}
              >
                A Pagamento ({events.length - freeCount})
              </button>
            </div>

            {/* Search & Happening Now Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca luogo, evento, quartiere..."
                  className="pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOnlyLiveNow((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  onlyLiveNow
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                Solo In Partenza
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  categoryFilter === cat.id
                    ? 'bg-zinc-100 text-black border-zinc-100'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Time-Block Jump Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              Salta a:
            </span>
            {timeBlockJumps.map((jump) => (
              <button
                key={jump.id}
                type="button"
                onClick={() => scrollToSlot(jump.targetSlotKey)}
                className="shrink-0 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition"
              >
                {jump.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main 24-Hour Rolling Timeline */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* =================================================================== */}
        {/* REDESIGNED COMMUNITY RADAR — ONLY 2 FUNCTIONS:                      */}
        {/* 1. Invia Link  |  2. Invia Locandina (Scegli Foto o Scatta Foto)    */}
        {/* All details extracted automatically in backend by the service.      */}
        {/* =================================================================== */}
        <section className="rounded-xl bg-[#111318] border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-extrabold uppercase font-mono">
                COMMUNITY RADAR
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                  Segnala un Evento a Milano: Invia Link o Locandina
                </h2>
                <p className="text-xs text-zinc-400">
                  Tutti i dettagli (titolo, luogo, indirizzo, orario, prezzo e categoria) vengono estratti e aggiunti in automatico in backend dal servizio.
                </p>
              </div>
            </div>
          </div>

          {publicFeedbackBanner && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                publicFeedbackBanner.type === 'pending'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {publicFeedbackBanner.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* FUNCTION 1: INVIA LINK */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!linkUrl.trim()) return;
                handleAutomaticCommunitySubmission({
                  submittedVia: 'LINK_URL',
                  rawSource: linkUrl.trim()
                });
                setLinkUrl('');
              }}
              className="p-4 rounded-xl bg-[#0b0c0e] border border-zinc-800 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-orange-400" />
                  <span>1. Invia Link Evento</span>
                </div>
                <p className="text-zinc-400">
                  Incolla l&apos;URL dell&apos;evento (sito web, post Instagram/Facebook, Eventbrite, DICE...). Il backend estrarrà tutti i dettagli automaticamente.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://www.casadellacultura.it/eventi/..."
                  className="flex-1 px-3 py-2.5 rounded-lg bg-[#131519] border border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-extrabold uppercase tracking-wider shrink-0 transition cursor-pointer"
                >
                  Invia Link →
                </button>
              </div>
            </form>

            {/* FUNCTION 2: INVIA LOCANDINA (SCEGLI FOTO O SCATTA FOTO) */}
            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-400" />
                  <span>2. Invia Locandina (Scegli Foto o Scatta Foto)</span>
                </div>
                <p className="text-zinc-400">
                  Carica un&apos;immagine dalla galleria o scatta una foto a un manifesto in città: il servizio Vision OCR in backend compilerà automaticamente l&apos;evento.
                </p>
              </div>

              {/* Hidden file inputs for Scegli Foto & Scatta Foto */}
              <input
                ref={fileChooseInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSelectedFlyerName(file.name);
                  handleAutomaticCommunitySubmission({
                    submittedVia: 'FLYER_PHOTO_OCR',
                    imageFileName: file.name
                  });
                  e.target.value = '';
                }}
              />
              <input
                ref={fileCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSelectedFlyerName(file.name);
                  handleAutomaticCommunitySubmission({
                    submittedVia: 'FLYER_PHOTO_OCR',
                    imageFileName: file.name
                  });
                  e.target.value = '';
                }}
              />

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => fileChooseInputRef.current?.click()}
                  className="px-3.5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span>Scegli Foto</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCameraCapture}
                  className="px-3.5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scatta Foto</span>
                </button>
              </div>

              {selectedFlyerName && (
                <div className="text-[11px] text-emerald-400 font-mono truncate">
                  ✓ Ultima locandina elaborata dal backend: {selectedFlyerName}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Camera Modal for Desktop "Scatta Foto" */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-[#111318] border border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-400" />
                  Scatta Foto alla Locandina
                </h3>
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={capturePhotoFromVideo}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs uppercase"
                >
                  📸 Scatta &amp; Invia al Backend
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 24-Hour Hourly Timeline (including empty hours left empty) */}
        {hourlyGroups.map((group) => {
          const isEmptyHour = group.events.length === 0;
          return (
            <section key={group.slotKey} id={`slot-${group.slotKey}`} className="space-y-3">
              <div
                className={`flex items-center justify-between border-b pb-2.5 ${
                  isEmptyHour ? 'border-zinc-900 opacity-60' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-lg font-mono font-black text-base ${
                      isEmptyHour
                        ? 'bg-zinc-900/50 border border-zinc-800/70 text-zinc-500'
                        : 'bg-zinc-900 border border-zinc-700 text-white'
                    }`}
                  >
                    {group.slotHour}
                  </span>
                  <span className={`text-sm font-bold ${isEmptyHour ? 'text-zinc-500' : 'text-zinc-200'}`}>
                    {group.timeBlock.icon} {group.timeBlock.label}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                    {group.isTomorrow ? 'DOMANI' : 'OGGI'} • {group.weekday} {group.dayMonth}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {isEmptyHour
                    ? 'Nessun evento in questa fascia oraria'
                    : `${group.events.length} ${group.events.length === 1 ? 'evento' : 'eventi'}`}
                </span>
              </div>

              {!isEmptyHour && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.events.map((ev) => {
                    const isExpanded = expandedIds.has(ev.id);
                    return (
                      <article
                        key={ev.id}
                        className={`rounded-xl p-4 sm:p-5 border transition ${
                          ev.isHappeningNow
                            ? 'bg-[#15181e] border-orange-500/60'
                            : 'bg-[#131519] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-white">
                              <Clock className="w-3.5 h-3.5 text-orange-400" />
                              {ev.startHM} – {ev.endHM}
                            </span>
                            {ev.isHappeningNow && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-black uppercase font-mono">
                                IN PARTENZA
                              </span>
                            )}
                          </div>

                          {ev.isFree ? (
                            <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-mono">
                              GRATIS
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
                              €€ / Biglietto • {ev.priceDetails}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                            {ev.title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => toggleExpand(ev.id)}
                            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            aria-label="Espandi scheda"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>{ev.venueName}</span>
                          <span className="text-zinc-500 font-normal">— {ev.address}</span>
                        </div>

                        <p className="mt-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          {ev.description}
                        </p>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 space-y-1">
                            <div>
                              <strong className="text-zinc-200">Ingresso:</strong> {ev.priceDetails}
                            </div>
                            <div>
                              <strong className="text-zinc-200">Quartiere:</strong> {ev.neighborhood}
                            </div>
                            <div>
                              <strong className="text-zinc-200">Fascia Oraria (Europe/Rome):</strong> {ev.weekday} {ev.dayMonth} • {ev.startHM} → {ev.endHM}
                            </div>
                          </div>
                        )}

                        {/* Mandatory Outbound Deep Links */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/90 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <a
                              href={ev.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-bold text-xs transition"
                            >
                              <MapPin className="w-3.5 h-3.5 text-orange-600" />
                              Google Maps
                            </a>
                            {ev.instagramUrl && (
                              <a
                                href={ev.instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-xs transition"
                              >
                                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                                IG
                              </a>
                            )}
                            {ev.facebookUrl && (
                              <a
                                href={ev.facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-xs transition"
                              >
                                <Facebook className="w-3.5 h-3.5 text-sky-400" />
                                FB
                              </a>
                            )}
                          </div>

                          <a
                            href={ev.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300"
                          >
                            <span>Fonte / Info</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>

      {/* Public Footer with discreet hidden #admin entry link */}
      <footer className="border-t border-zinc-800 bg-[#08090b] mt-16 py-8 px-4 text-xs text-zinc-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-black text-white uppercase">MILANO LIVE 24H — CULTURAL &amp; SOCIAL RADAR</div>
            <p className="mt-1 text-zinc-500">
              Finestra mobile rigorosa di 24 ore a partire dall&apos;ora successiva (fuso Europe/Rome).
            </p>
          </div>
          <a
            href="#admin"
            title="Pagina Nascosta Accesso Admin (#admin oppure Ctrl+Shift+A)"
            className="text-zinc-600 hover:text-zinc-400 font-mono text-xs"
          >
            🔒 /#admin
          </a>
        </div>
      </footer>
    </div>
  );
}
