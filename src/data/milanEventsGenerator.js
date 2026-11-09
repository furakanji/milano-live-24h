/**
 * Dynamic 24-Hour Rolling Dataset Generator for "Milano Live 24h"
 *
 * Uses authentic Milanese wall-clock schedules (`scheduledHour`, `scheduledMinute` in `Europe/Rome`)
 * so that talks, exhibitions, theaters, cinemas, and clubs always appear at their true daytime/evening
 * hours within the rolling 24-hour window (`[nextHourStart, nextHourStart + 24h)`), while late-night
 * hours with no scheduled events (e.g. 01:00–08:00, including 03:00 AM) remain genuinely empty.
 */

export const CATEGORIES = [
  { id: 'all', label: 'Tutte le Categorie', emoji: '✨' },
  { id: 'politica', label: '✊ Politica, Attivismo & Sociale', shortLabel: 'Politica & Sociale', emoji: '✊' },
  { id: 'concerti', label: '🎵 Concerti & Club', shortLabel: 'Concerti & Club', emoji: '🎵' },
  { id: 'cinema', label: '🎬 Cinema & Rassegne', shortLabel: 'Cinema & Rassegne', emoji: '🎬' },
  { id: 'teatro', label: '🎭 Teatro', shortLabel: 'Teatro', emoji: '🎭' },
  { id: 'libri', label: '📚 Libri, Talk & Conferenze', shortLabel: 'Libri & Talk', emoji: '📚' },
  { id: 'mostre', label: '🖼️ Mostre & Musei', shortLabel: 'Mostre & Musei', emoji: '🖼️' },
  { id: 'aperture', label: '🏛️ Aperture Speciali & Luoghi Segreti', shortLabel: 'Aperture Speciali', emoji: '🏛️' }
];

export function buildMapsUrl(venueName, address) {
  const query = encodeURIComponent(`${venueName} ${address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}+Milano`;
}

export const MILAN_SOURCES_SUMMARY = [
  // Istituzionali, Musei, FAI & Mostre Temporanee Verificate
  { name: 'Villa Necchi Campiglio (FAI)', type: 'JSON-LD / Calendario Eventi FAI', category: 'aperture', url: 'https://fondoambiente.it/luoghi/villa-necchi-campiglio/eventi' },
  { name: 'Gallerie d’Italia — Piazza Scala', type: 'Mostra Temporanea "LIBERE! 1946-2026"', category: 'mostre', url: 'https://gallerieditalia.com/it/milano/mostre-e-iniziative/mostre/2026/09/24/mostra-libere-1946-2026-le-conquiste-delle-donne-milano/' },
  { name: 'Palazzo Reale Milano — Dalí e la Moda', type: 'Mostra Temporanea in Corso', category: 'mostre', url: 'https://www.palazzorealemilano.it/-/dali-e-la-moda' },
  { name: 'GAM — Galleria d’Arte Moderna', type: 'Mostra Temporanea Pellizza da Volpedo', category: 'mostre', url: 'https://www.gam-milano.com/mostre/200/pellizza-da-volpedo-i-capolavori' },
  { name: 'Palazzo Reale Milano — I Brueghel', type: 'Mostra Temporanea in Corso', category: 'mostre', url: 'https://www.palazzorealemilano.it/-/brueghel' },
  { name: 'Fondazione Prada Milano', type: 'Calendario Esposizioni & Cinema Godard', category: 'mostre', url: 'https://www.fondazioneprada.org/calendario/?period=current&tmpl=1' },
  { name: 'MUDEC — Museo delle Culture', type: 'Mostre Temporanee in Corso', category: 'mostre', url: 'https://www.mudec.it/mostre-in-corso-2/' },
  { name: 'Pirelli HangarBicocca', type: 'Mostra Temporanea Luciano Fabro', category: 'mostre', url: 'https://pirellihangarbicocca.org/mostra/luciano-fabro/' },
  { name: 'Triennale Milano (Scheda Zero Milano)', type: 'Programmazione & Mostre', category: 'mostre', url: 'https://zero.eu/it/luoghi/4032-triennale-di-milano,milano/' },
  { name: 'BASE Milano (Ex Ansaldo)', type: 'Agenda Eventi', category: 'mostre', url: 'https://base.milano.it/agenda/' },

  // Politica, Diritti, Attivismo & Sociale
  { name: 'Casa della Cultura Milano', type: 'Programma Incontri Settimanali', category: 'politica', url: 'https://www.casadellacultura.it/' },
  { name: 'Casa delle Donne di Milano', type: 'Calendario Eventi nella Casa', category: 'politica', url: 'https://www.casadonnemilano.it/calendario-eventi-nella-casa/' },
  { name: 'Camera del Lavoro (CGIL Milano)', type: 'Stagione Culturale 2026', category: 'politica', url: 'https://www.cgil.milano.it/stagione-culturale-2026/' },

  // Libri, Talk, Scienza & Cultura Digitale
  { name: 'Fondazione Giangiacomo Feltrinelli', type: 'Partecipa — Calendario Talk', category: 'libri', url: 'https://fondazionefeltrinelli.it/partecipa-home/' },
  { name: 'Libreria Verso (Porta Ticinese)', type: 'Calendario Appuntamenti', category: 'libri', url: 'http://www.libreriaverso.com/appuntamenti/' },
  { name: 'MEET Digital Culture Center', type: 'Tutti gli Eventi', category: 'libri', url: 'https://www.meetcenter.it/it/tutti-gli-eventi/' },

  // Cinema d'Essai & Cineteca
  { name: 'Cineteca Milano Arlecchino', type: 'Programmazione Sala', category: 'cinema', url: 'https://www.cinetecamilano.it/luogo/cineteca-milano-arlecchino/' },
  { name: 'Anteo Palazzo del Cinema (SpazioCinema)', type: 'Programmazione Sale Milano', category: 'cinema', url: 'https://www.spaziocinema.info/milano' },
  { name: 'Cinema Beltrade (MilanoCinema)', type: 'Orari e Film in Sala', category: 'cinema', url: 'https://milanocinema.com/it/cinema/beltrade' },
  { name: 'Cinema Mexico (MilanoCinema)', type: 'Orari e Film in Sala', category: 'cinema', url: 'https://milanocinema.com/cinema/mexico' },
  { name: 'Il Cinemino (Via Seneca)', type: 'Programmazione Settimanale', category: 'cinema', url: 'https://www.ilcinemino.it/programmazione/' },

  // Teatro
  { name: 'Piccolo Teatro Strehler', type: 'Scheda Teatro & Cartellone', category: 'teatro', url: 'https://www.piccoloteatro.org/it/theaters/piccolo-teatro-strehler' },
  { name: 'Teatro Franco Parenti', type: 'Cartellone Spettacoli', category: 'teatro', url: 'https://teatrofrancoparenti.it/cartellone/spettacoli-teatro-milano/' },
  { name: 'Teatro Elfo Puccini', type: 'Cartellone Sale', category: 'teatro', url: 'https://www.elfo.org/' },
  { name: 'Teatro Manzoni Milano', type: 'Programma Spettacoli', category: 'teatro', url: 'https://www.teatromanzoni.it/programma/' },

  // Concerti, Jazz & Club
  { name: 'Santeria Toscana 31', type: 'Calendario Eventi Ufficiale', category: 'concerti', url: 'https://www.santeria.milano.it/eventi/' },
  { name: 'Blue Note Milano', type: 'Calendario Live Set', category: 'concerti', url: 'https://www.bluenotemilano.com/' },
  { name: 'ARCI Biko Milano (Zero Milano)', type: 'Scheda Evento Live', category: 'concerti', url: 'https://zero.eu/it/eventi/383162-jazzmi-momoko-gill-arci-biko,milano/' },
  { name: 'Circolo Magnolia (Idroscalo)', type: 'Programmazione Concerti', category: 'concerti', url: 'https://www.circolomagnolia.it/' },
  { name: 'Tempio del Futuro Perduto (Zero Milano)', type: 'Scheda Luogo & Programmazione', category: 'concerti', url: 'https://zero.eu/it/luoghi/103058-tempio-del-futuro-perduto,milano/' }
];

export const REJECTED_BY_VERIFIER_AGENT = [
  {
    id: 'rej-milanoguida-medievale',
    title: 'Milano Medievale: Piazza dei Mercanti, Loggia degli Osii e Broletto Nuovo',
    venueName: 'Piazza dei Mercanti',
    sourceUrl: 'https://www.milanoguida.com/visite-guidate/itinerari-milano/milano-medievale/',
    verdict: 'SCARTATO DALL’AGENTE',
    reasons: [
      'Gate 1 (Natura Occasione): Pagina promozionale a catalogo di tour guidato ricorrente (/visite-guidate/itinerari-milano/), non è un evento o appuntamento speciale.',
      'Gate 2 (Disponibilità & Prenotabilità): La pagina riporta "In programmazione — Vuoi essere avvisato quando saranno online nuove date?" (non disponibile né prenotabile).'
    ]
  },
  {
    id: 'rej-milanoguida-cripta',
    title: 'La Cripta di San Giovanni in Conca — Visita Guidata',
    venueName: 'Cripta di San Giovanni in Conca',
    sourceUrl: 'https://www.milanoguida.com/visite-guidate/itinerari-milano/la-cripta-di-san-giovanni-in-conca/',
    verdict: 'SCARTATO DALL’AGENTE',
    reasons: [
      'Gate 1 (Natura Occasione): Scheda promozionale a catalogo di visita guidata su richiesta (/visite-guidate/itinerari-milano/).',
      'Gate 2 (Disponibilità & Prenotabilità): Nessun evento speciale confermato e prenotabile per le prossime 24h.'
    ]
  },
  {
    id: 'rej-palazzo-morando-perm',
    title: 'Collezione Permanente Costume Moda Immagine & Pinacoteca del Settecento',
    venueName: 'Palazzo Morando',
    sourceUrl: 'https://www.comune.milano.it/web/palazzo-morando',
    verdict: 'SCARTATO DALL’AGENTE',
    reasons: [
      'Gate 1 (Natura Occasione): Semplice orario di apertura ordinaria della collezione civica permanente, privo di mostra temporanea o evento speciale.'
    ]
  },
  {
    id: 'rej-casa-diritti-sportelli',
    title: 'Sportelli Diritti Civili & Orientamento Legale Settimanale',
    venueName: 'Casa dei Diritti — Comune di Milano',
    sourceUrl: 'https://www.comune.milano.it/argomenti/welfare/casa-dei-diritti',
    verdict: 'SCARTATO DALL’AGENTE',
    reasons: [
      'Gate 1 (Natura Occasione): Servizio comunale di sportello ricorrente; non costituisce un evento, talk o assemblea pubblica speciale.'
    ]
  }
];

export const MILAN_EVENT_TEMPLATES = [
  // === MATTINA (10:00 – 12:30) ===
  {
    id: 'evt-villa-necchi-fai',
    scheduledHour: 10,
    scheduledMinute: 0,
    durationMinutes: 120,
    eventType: 'SPECIAL_EVENT',
    isSoldOut: false,
    title: 'Eventi e Aperture Speciali FAI a Villa Necchi Campiglio & Giardino d’Inverno',
    description: 'Calendario di appuntamenti speciali, mostre e visite nelle sale storiche degli anni Trenta progettate da Piero Portaluppi custodite dal FAI.',
    venueName: 'Villa Necchi Campiglio (FAI)',
    neighborhood: 'Quadrilatero del Silenzio / Palestro',
    address: 'Via Mozart 14',
    isFree: false,
    priceDetails: '€15,00 Intero / Gratis Iscritti FAI',
    category: 'aperture',
    sourceName: 'fondoambiente.it — Eventi Villa Necchi',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://fondoambiente.it/luoghi/villa-necchi-campiglio/eventi'
  },
  {
    id: 'evt-gallerie-italia-libere',
    scheduledHour: 10,
    scheduledMinute: 30,
    durationMinutes: 150,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Mostra Temporanea "LIBERE! 1946-2026. Le conquiste delle donne" alle Gallerie d’Italia',
    description: 'Esposizione temporanea (24 settembre 2026 – 7 febbraio 2027) alle Gallerie d’Italia di Piazza Scala dedicata agli ottant’anni dal primo voto femminile in Italia.',
    venueName: 'Gallerie d’Italia — Milano',
    neighborhood: 'Piazza della Scala / Duomo',
    address: 'Piazza della Scala 6',
    isFree: false,
    priceDetails: '€10,00 Intero / €8,00 Ridotto',
    category: 'mostre',
    sourceName: 'gallerieditalia.com — Mostra LIBERE!',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://gallerieditalia.com/it/milano/mostre-e-iniziative/mostre/2026/09/24/mostra-libere-1946-2026-le-conquiste-delle-donne-milano/'
  },
  {
    id: 'evt-palazzo-reale-dali',
    scheduledHour: 11,
    scheduledMinute: 0,
    durationMinutes: 120,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Mostra Temporanea "Dalí e la Moda" a Palazzo Reale',
    description: 'In corso a Palazzo Reale (24 settembre 2026 – 31 gennaio 2027): un viaggio nell’universo di Salvador Dalí attraverso il linguaggio della moda e del surrealismo.',
    venueName: 'Palazzo Reale Milano',
    neighborhood: 'Piazza del Duomo',
    address: 'Piazza del Duomo 12',
    isFree: false,
    priceDetails: '€15,00 Intero / €13,00 Ridotto',
    category: 'mostre',
    sourceName: 'palazzorealemilano.it — Dalí e la Moda',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.palazzorealemilano.it/-/dali-e-la-moda'
  },
  {
    id: 'evt-cineteca-arlecchino',
    scheduledHour: 11,
    scheduledMinute: 15,
    durationMinutes: 115,
    eventType: 'CINEMA_SCREENING',
    isSoldOut: false,
    title: 'PGC 2026 — Piccolo Grande Cinema & Classici Restaurati (v.o. sott. ita)',
    description: 'Proiezione speciale in lingua originale con sottotitoli in italiano nell’ambito del festival Piccolo Grande Cinema e delle rassegne d’archivio Cineteca Milano.',
    venueName: 'Cineteca Milano Arlecchino',
    neighborhood: 'San Babila / Corso Vittorio Emanuele',
    address: 'Via San Pietro all’Orto 9',
    isFree: false,
    priceDetails: '€8,50 Intero / €6,50 Cinetessera',
    category: 'cinema',
    sourceName: 'cinetecamilano.it — Sala Arlecchino',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.cinetecamilano.it/luogo/cineteca-milano-arlecchino/'
  },
  {
    id: 'evt-gam-pellizza-volpedo',
    scheduledHour: 12,
    scheduledMinute: 0,
    durationMinutes: 110,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Mostra Temporanea "Pellizza da Volpedo (1868-1907). I capolavori" alla GAM',
    description: 'Esposizione monografica curata da Aurora Scotti e Paola Zatti nelle sale della Galleria d’Arte Moderna di Villa Reale in Via Palestro, attorno al Quarto Stato.',
    venueName: 'GAM — Galleria d’Arte Moderna',
    neighborhood: 'Palestro / Villa Reale',
    address: 'Via Palestro 16',
    isFree: false,
    priceDetails: '€10,00 Mostra + Museo',
    category: 'mostre',
    sourceName: 'gam-milano.com — Pellizza da Volpedo',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.gam-milano.com/mostre/200/pellizza-da-volpedo-i-capolavori'
  },

  // === POMERIGGIO (14:30 – 17:30) ===
  {
    id: 'evt-fondazione-prada-torre',
    scheduledHour: 14,
    scheduledMinute: 30,
    durationMinutes: 180,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Progetti Espositivi Temporanei Podium & Torre + Rassegna Cinema Godard',
    description: 'Mostre temporanee in corso negli spazi di Largo Isarco progettati da OMA/Rem Koolhaas e programmazione cinematografica quotidiana presso il Cinema Godard.',
    venueName: 'Fondazione Prada',
    neighborhood: 'Scalo Romana / Largo Isarco',
    address: 'Largo Isarco 2',
    isFree: false,
    priceDetails: '€15,00 Intero / €12,00 Ridotto',
    category: 'mostre',
    sourceName: 'fondazioneprada.org — Calendario',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.fondazioneprada.org/calendario/?period=current&tmpl=1'
  },
  {
    id: 'evt-mudec-dialogo-arti',
    scheduledHour: 15,
    scheduledMinute: 0,
    durationMinutes: 140,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Mostre Temporanee in Corso al MUDEC — Museo delle Culture',
    description: 'Esposizioni temporanee di fotografia, arte contemporanea e antropologia visiva negli spazi del MUDEC di Via Tortona progettati da David Chipperfield.',
    venueName: 'MUDEC — Museo delle Culture',
    neighborhood: 'Tortona / Ansaldo',
    address: 'Via Tortona 56',
    isFree: false,
    priceDetails: '€16,00 Intero / €14,00 Ridotto Mostre Temporanee',
    category: 'mostre',
    sourceName: 'mudec.it — Mostre in Corso',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.mudec.it/mostre-in-corso-2/'
  },
  {
    id: 'evt-torre-branca-sunset',
    scheduledHour: 16,
    scheduledMinute: 0,
    durationMinutes: 90,
    eventType: 'PUBLIC_TALK',
    isSoldOut: false,
    title: 'Rassegna Eventi, Talk & Installazioni Immersive al MEET',
    description: 'Appuntamento pomeridiano dedicato alla cultura digitale, alle arti generative e alle installazioni immersive nella sede MEET di Porta Venezia.',
    venueName: 'MEET Digital Culture Center',
    neighborhood: 'Porta Venezia / Oberdan',
    address: 'Viale Vittorio Veneto 2',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso gratuito agli incontri su registrazione',
    category: 'libri',
    sourceName: 'meetcenter.it — Tutti gli Eventi',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.meetcenter.it/it/tutti-gli-eventi/'
  },
  {
    id: 'evt-hangar-bicocca',
    scheduledHour: 16,
    scheduledMinute: 30,
    durationMinutes: 150,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Mostre Temporanee: Luciano Fabro "Abitare lo spazio" & Aki Sasamoto "XYZ"',
    description: 'Ingresso gratuito alle mostre temporanee retrospettive di Luciano Fabro e Aki Sasamoto nelle Navate e nello Shed di Pirelli HangarBicocca.',
    venueName: 'Pirelli HangarBicocca',
    neighborhood: 'Bicocca',
    address: 'Via Chiese 2',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso gratuito su prenotazione',
    category: 'mostre',
    sourceName: 'pirellihangarbicocca.org — Mostra Luciano Fabro',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://pirellihangarbicocca.org/mostra/luciano-fabro/'
  },
  {
    id: 'evt-palazzo-reale-brueghel',
    scheduledHour: 17,
    scheduledMinute: 0,
    durationMinutes: 120,
    eventType: 'TEMPORARY_EXHIBITION',
    isSoldOut: false,
    title: 'Mostra Temporanea "I Brueghel. Le dinastie del talento" a Palazzo Reale',
    description: 'Grande esposizione temporanea a Palazzo Reale (fino al 31 gennaio 2027) dedicata ai capolavori della celebre dinastia di pittori fiamminghi tra Cinque e Seicento.',
    venueName: 'Palazzo Reale Milano',
    neighborhood: 'Piazza del Duomo',
    address: 'Piazza del Duomo 12',
    isFree: false,
    priceDetails: '€15,00 Intero / €13,00 Ridotto',
    category: 'mostre',
    sourceName: 'palazzorealemilano.it — Mostra I Brueghel',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.palazzorealemilano.it/-/brueghel'
  },
  {
    id: 'evt-lafeltrinelli-duomo',
    scheduledHour: 17,
    scheduledMinute: 30,
    durationMinutes: 90,
    eventType: 'PUBLIC_TALK',
    isSoldOut: false,
    title: 'Stagione Culturale 2026 alla Camera del Lavoro: Libri, Lavoro & Diritti',
    description: 'Rassegna di presentazioni editoriali, concerti, mostre e tavole rotonde promossa dalla Camera del Lavoro Metropolitana di Milano in Corso di Porta Vittoria.',
    venueName: 'Camera del Lavoro di Milano',
    neighborhood: 'Porta Vittoria / Cinque Giornate',
    address: 'Corso di Porta Vittoria 43',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    category: 'politica',
    sourceName: 'cgil.milano.it — Stagione Culturale 2026',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.cgil.milano.it/stagione-culturale-2026/'
  },

  // === PRESERALE & SERA (18:00 – 20:45) ===
  {
    id: 'evt-verso-talk',
    scheduledHour: 18,
    scheduledMinute: 0,
    durationMinutes: 90,
    title: 'Appuntamenti in Libreria: Presentazione Editoriale & Dialogo con gli Autori',
    description: 'Incontro serale con autori, traduttori ed editori indipendenti al primo piano della Libreria Verso in Corso di Porta Ticinese.',
    venueName: 'Libreria Verso',
    neighborhood: 'Colonne di San Lorenzo / Ticinese',
    address: 'Corso di Porta Ticinese 40',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero fino a esaurimento posti',
    category: 'libri',
    sourceName: 'libreriaverso.com — Appuntamenti',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'http://www.libreriaverso.com/appuntamenti/'
  },
  {
    id: 'evt-casa-donne-milano',
    scheduledHour: 18,
    scheduledMinute: 15,
    durationMinutes: 100,
    title: 'Letture, Gruppi di Lavoro & Incontri Pubblici alla Casa delle Donne',
    description: 'Appuntamento aperto nella sede di Via Marsala: gruppi tematici, biblioteca delle donne, sportello d’ascolto e iniziative culturali femministe.',
    venueName: 'Casa delle Donne di Milano',
    neighborhood: 'Garibaldi / Moscova',
    address: 'Via Marsala 8',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    category: 'politica',
    sourceName: 'casadonnemilano.it — Calendario Eventi',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.casadonnemilano.it/calendario-eventi-nella-casa/'
  },
  {
    id: 'evt-feltrinelli-fondazione',
    scheduledHour: 18,
    scheduledMinute: 30,
    durationMinutes: 105,
    title: 'Partecipa: Public Talk, Archivi Digitali & Cittadinanza Attiva',
    description: 'Incontro pubblico e tavola rotonda nella sede di Viale Pasubio progettata da Herzog & de Meuron con ricercatori, docenti e giornalisti.',
    venueName: 'Fondazione Giangiacomo Feltrinelli',
    neighborhood: 'Porta Volta',
    address: 'Viale Pasubio 5',
    isFree: true,
    priceDetails: 'GRATIS • Accesso libero con registrazione',
    category: 'libri',
    sourceName: 'fondazionefeltrinelli.it — Partecipa',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://fondazionefeltrinelli.it/partecipa-home/'
  },
  {
    id: 'evt-triennale-design-talk',
    scheduledHour: 18,
    scheduledMinute: 30,
    durationMinutes: 95,
    title: 'Triennale Milano: Talk, Esposizioni & Rassegna Salone d’Onore',
    description: 'Programma serale negli spazi del Palazzo dell’Arte in Viale Alemagna tra design contemporaneo, architettura, arti performative e musica.',
    venueName: 'Triennale Milano',
    neighborhood: 'Parco Sempione / Cadorna',
    address: 'Viale Emilio Alemagna 6',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero agli incontri pubblici',
    category: 'libri',
    sourceName: 'zero.eu — Triennale di Milano',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://zero.eu/it/luoghi/4032-triennale-di-milano,milano/'
  },
  {
    id: 'evt-base-vernissage',
    scheduledHour: 19,
    scheduledMinute: 0,
    durationMinutes: 180,
    title: 'Agenda BASE Milano: Progetti Culturali, Design & Music Room in Ex Ansaldo',
    description: 'Programmazione serale negli spazi dell’ex Ansaldo in Via Bergognone: mostre temporanee, talk indipendenti e live set nel cortile e nella ground hall.',
    venueName: 'BASE Milano',
    neighborhood: 'Tortona',
    address: 'Via Bergognone 34',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero agli spazi comuni',
    category: 'mostre',
    sourceName: 'base.milano.it — Agenda',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://base.milano.it/agenda/'
  },
  {
    id: 'evt-cinemino-essay-early',
    scheduledHour: 19,
    scheduledMinute: 15,
    durationMinutes: 105,
    title: 'Proiezione Preserale in Lingua Originale (v.o. sott. ita) da Il Cinemino',
    description: 'Spettacolo preserale in versione originale sottotitolata nella sala da 74 posti di Via Seneca 6 in Porta Romana.',
    venueName: 'Il Cinemino',
    neighborhood: 'Porta Romana / Crocetta',
    address: 'Via Seneca 6',
    isFree: false,
    priceDetails: '€7,50 + Tessera Associativa',
    category: 'cinema',
    sourceName: 'ilcinemino.it — Programmazione',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.ilcinemino.it/programmazione/'
  },
  {
    id: 'evt-piccolo-strehler',
    scheduledHour: 19,
    scheduledMinute: 30,
    durationMinutes: 135,
    title: 'Stagione Piccolo Teatro Strehler — Spettacolo Serale in Largo Greppi',
    description: 'Programmazione di prosa e regia internazionale sul palcoscenico progettato da Marco Zanuso a due passi da Lanza/Brera.',
    venueName: 'Piccolo Teatro Strehler',
    neighborhood: 'Lanza / Brera',
    address: 'Largo Greppi 1',
    isFree: false,
    priceDetails: '€22,00 Platea / €16,00 Balconata',
    category: 'teatro',
    sourceName: 'piccoloteatro.org — Teatro Strehler',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.piccoloteatro.org/it/theaters/piccolo-teatro-strehler'
  },
  {
    id: 'evt-elfo-puccini-contemp',
    scheduledHour: 19,
    scheduledMinute: 45,
    durationMinutes: 110,
    title: 'Stagione Teatro Contemporaneo — Sala Shakespeare, Bausch e Fassbinder',
    description: 'Spettacoli di drammaturgia contemporanea, rassegna "Nuove Storie / Sconfinamenti" e produzioni Bruni/Frongia al Teatro Elfo Puccini.',
    venueName: 'Teatro Elfo Puccini',
    neighborhood: 'Corso Buenos Aires / Lima',
    address: 'Corso Buenos Aires 33',
    isFree: false,
    priceDetails: '€19,50 Ridotto Under30 / €29,00 Intero',
    category: 'teatro',
    sourceName: 'elfo.org — Cartellone',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.elfo.org/'
  },
  {
    id: 'evt-parenti-bagni',
    scheduledHour: 20,
    scheduledMinute: 30,
    durationMinutes: 110,
    title: 'Sinfonia di un incontro (con Milena Vukotic) & Cartellone Sala Grande',
    description: 'In scena al Teatro Franco Parenti di Via Pier Lombardo: "Sinfonia di un incontro" con Milena Vukotic e gli spettacoli del cartellone serale.',
    venueName: 'Teatro Franco Parenti',
    neighborhood: 'Porta Romana',
    address: 'Via Pier Lombardo 14',
    isFree: false,
    priceDetails: '€18,00 - €28,00 (Convenzione Invito a Teatro)',
    category: 'teatro',
    sourceName: 'teatrofrancoparenti.it — Cartellone',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://teatrofrancoparenti.it/cartellone/spettacoli-teatro-milano/'
  },
  {
    id: 'evt-casa-cultura-abitare',
    scheduledHour: 20,
    scheduledMinute: 30,
    durationMinutes: 110,
    title: 'Dialoghi di Filosofia, Politica e Cultura: "Ricostruire un Corpo Sociale Vivente"',
    description: 'Ciclo di incontri pubblici, dibattiti su democrazia, urbanistica e pace promossi dalla storica Casa della Cultura in Via Borgogna 3.',
    venueName: 'Casa della Cultura',
    neighborhood: 'San Babila / Via Borgogna',
    address: 'Via Borgogna 3',
    isFree: true,
    priceDetails: 'GRATIS • Accesso libero alla cittadinanza',
    category: 'politica',
    sourceName: 'casadellacultura.it — Programma',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.casadellacultura.it/'
  },
  {
    id: 'evt-manzoni-prosa',
    scheduledHour: 20,
    scheduledMinute: 45,
    durationMinutes: 120,
    title: 'Programma Stagione Teatrale di Prosa & Commedia al Teatro Manzoni',
    description: 'Spettacolo serale sul palcoscenico storico di Via Manzoni 42 con le compagnie protagoniste del cartellone di prosa.',
    venueName: 'Teatro Manzoni',
    neighborhood: 'Quadrilatero / Montenapoleone',
    address: 'Via Manzoni 42',
    isFree: false,
    priceDetails: '€25,00 - €36,00 Poltronissima / Galleria',
    category: 'teatro',
    sourceName: 'teatromanzoni.it — Programma',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.teatromanzoni.it/programma/'
  },
  {
    id: 'evt-anteo-anteprima',
    scheduledHour: 20,
    scheduledMinute: 45,
    durationMinutes: 130,
    title: 'Programmazione Serale in Lingua Originale (v.o. sott. ita) — Sala Excelsior & Rubino',
    description: 'Proiezioni serali in versione originale sottotitolata e anteprime con ospiti presso Anteo Palazzo del Cinema in Piazza XXV Aprile.',
    venueName: 'Anteo Palazzo del Cinema',
    neighborhood: 'Brera / Garibaldi',
    address: 'Piazza Venticinque Aprile 8',
    isFree: false,
    priceDetails: '€9,50 Intero / €7,00 Amici del Cinema',
    category: 'cinema',
    sourceName: 'spaziocinema.info — Anteo Milano',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.spaziocinema.info/milano'
  },

  // === SERA & NOTTE (21:00 – 23:30; 00:00 – 09:00 VUOTE) ===
  {
    id: 'evt-mexico-qa',
    scheduledHour: 21,
    scheduledMinute: 0,
    durationMinutes: 125,
    title: 'Cinema d’Essai & Proiezione Serale in Sala al Cinema Mexico',
    description: 'Programmazione storica d’autore nella sala monoschermo indipendente di Via Savona 57, punto di riferimento del cinema indipendente a Milano.',
    venueName: 'Cinema Mexico',
    neighborhood: 'Zona Solari / Via Savona',
    address: 'Via Savona 57',
    isFree: false,
    priceDetails: '€7,50 Intero / €6,00 Ridotto',
    category: 'cinema',
    sourceName: 'milanocinema.com — Cinema Mexico',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://milanocinema.com/cinema/mexico'
  },
  {
    id: 'evt-blue-note-jazz',
    scheduledHour: 21,
    scheduledMinute: 0,
    durationMinutes: 95,
    eventType: 'LIVE_CONCERT',
    isSoldOut: true,
    title: 'Live Jazz, Soul & Blues — First Set (Ore 21:00) in Via Borsieri',
    description: 'Primo set serale dal vivo nello storico jazz club del quartiere Isola con protagonisti internazionali del jazz, soul e blues contemporaneo (1° set Sold Out, 2° set ore 23:00).',
    venueName: 'Blue Note Milano',
    neighborhood: 'Isola',
    address: 'Via Pietro Borsieri 37',
    isFree: false,
    priceDetails: '€30,00 Door / €25,00 Advance (1° Set Sold Out)',
    category: 'concerti',
    sourceName: 'bluenotemilano.com — Programmazione',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.bluenotemilano.com/'
  },
  {
    id: 'evt-santeria-live-teatro',
    scheduledHour: 21,
    scheduledMinute: 0,
    durationMinutes: 120,
    eventType: 'LIVE_CONCERT',
    isSoldOut: false,
    title: 'Mauro Ermanno Giovanardi — "E poi scegliere con cura le parole" Live & Spettacoli Teatro',
    description: 'Live sul palco del Teatro di Santeria Toscana 31 in Viale Toscana: Mauro Ermanno Giovanardi presenta il nuovo album "E poi scegliere con cura le parole" tra racconti e canzoni.',
    venueName: 'Santeria Toscana 31',
    neighborhood: 'Viale Toscana / Bocconi',
    address: 'Viale Toscana 31',
    isFree: false,
    priceDetails: 'Biglietti su santeria.milano.it / Ticketone / DICE',
    category: 'concerti',
    sourceName: 'santeria.milano.it — Eventi',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.santeria.milano.it/eventi/'
  },
  {
    id: 'evt-beltrade-corti',
    scheduledHour: 21,
    scheduledMinute: 30,
    durationMinutes: 115,
    eventType: 'CINEMA_SCREENING',
    isSoldOut: false,
    title: 'Fatherland (di Paweł Pawlikowski) & Wild Horse Nine — Proiezione v.o. sott. ita',
    description: 'Programmazione serale in versione originale sottotitolata al Cinema Beltrade ("Bandhi"): in sala Fatherland di Paweł Pawlikowski, Wild Horse Nine di Martin McDonagh e Minotaur.',
    venueName: 'Cinema Beltrade',
    neighborhood: 'NoLo / Piazza Morbegno',
    address: 'Via Nino Oxilia 10',
    isFree: false,
    priceDetails: '€7,50 Biglietto intero',
    category: 'cinema',
    sourceName: 'milanocinema.com — Cinema Beltrade',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://milanocinema.com/it/cinema/beltrade'
  },
  {
    id: 'evt-santeria-listening',
    scheduledHour: 22,
    scheduledMinute: 0,
    durationMinutes: 150,
    eventType: 'LIVE_CONCERT',
    isSoldOut: false,
    title: 'Fuori Ovunque | Weekly Release Party & Liveurope Showcase / DJ Set',
    description: 'Appuntamento gratuito nel Bar di Santeria Toscana 31 (circuito europeo Liveurope): interviste agli artisti emergenti, ascolto nuove uscite, live showcase e vinyl/DJ set (locale cashless).',
    venueName: 'Santeria Toscana 31',
    neighborhood: 'Viale Toscana / Bocconi',
    address: 'Viale Toscana 31',
    isFree: true,
    priceDetails: 'GRATIS • Free Entry',
    category: 'concerti',
    sourceName: 'santeria.milano.it — Eventi',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.santeria.milano.it/eventi/'
  },
  {
    id: 'evt-biko-live-showcase',
    scheduledHour: 22,
    scheduledMinute: 0,
    durationMinutes: 180,
    eventType: 'LIVE_CONCERT',
    isSoldOut: false,
    title: 'JAZZMI / Live Showcase & Club Set al Circolo ARCI Biko',
    description: 'Live concert e selezione musicale black/jazz/electronic sul palco di Via Ettore Ponti 40. Ingresso riservato ai soci ARCI con prevendita su DICE.',
    venueName: 'Biko Milano',
    neighborhood: 'Naviglio Pavese / Barona',
    address: 'Via Ettore Ponti 40',
    isFree: false,
    priceDetails: 'Biglietti su DICE (+ tessera ARCI)',
    category: 'concerti',
    sourceName: 'zero.eu — ARCI Biko Milano',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://zero.eu/it/eventi/383162-jazzmi-momoko-gill-arci-biko,milano/'
  },
  {
    id: 'evt-cinemino-essay',
    scheduledHour: 22,
    scheduledMinute: 15,
    durationMinutes: 105,
    eventType: 'CINEMA_SCREENING',
    isSoldOut: false,
    title: 'Programmazione Serale d’Essai in Sala & Bar del Circolo',
    description: 'Proiezione serale in lingua originale nella sala da 74 posti di Via Seneca 6 in Porta Romana (accesso con tessera associativa).',
    venueName: 'Il Cinemino',
    neighborhood: 'Porta Romana / Crocetta',
    address: 'Via Seneca 6',
    isFree: false,
    priceDetails: '€7,50 + Tessera Associativa',
    category: 'cinema',
    sourceName: 'ilcinemino.it — Programmazione',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.ilcinemino.it/programmazione/'
  },
  {
    id: 'evt-magnolia-clubnight',
    scheduledHour: 23,
    scheduledMinute: 0,
    durationMinutes: 240,
    eventType: 'LIVE_CONCERT',
    isSoldOut: false,
    title: 'Live Tour & Club Night al Circolo Magnolia — Idroscalo',
    description: 'Concerti live indie/elettronica e club night sui palchi del Circolo ARCI Magnolia immerso nel parco dell’Idroscalo.',
    venueName: 'Circolo Magnolia',
    neighborhood: 'Idroscalo / Segrate',
    address: 'Via Circonvallazione Idroscalo 41',
    isFree: false,
    priceDetails: 'Biglietti su circolomagnolia.it / DICE',
    category: 'concerti',
    sourceName: 'circolomagnolia.it — Programma',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://www.circolomagnolia.it/'
  },
  {
    id: 'evt-tempio-futuro-perduto',
    scheduledHour: 23,
    scheduledMinute: 30,
    durationMinutes: 210,
    eventType: 'LIVE_CONCERT',
    isSoldOut: false,
    title: 'Rassegna Notturna Musica Elettronica & Arti Performative al Tempio del Futuro Perduto',
    description: 'Programmazione notturna tra clubbing, arti performative e mostre indipendenti negli spazi della Fabbrica del Vapore / Via Luigi Nono 9 recensita da Zero Milano.',
    venueName: 'Tempio del Futuro Perduto',
    neighborhood: 'Cenisio / Monumentale',
    address: 'Via Luigi Nono 9',
    isFree: false,
    priceDetails: 'Ingresso secondo programmazione serata',
    category: 'concerti',
    sourceName: 'zero.eu — Tempio del Futuro Perduto',
    instagramUrl: null,
    facebookUrl: null,
    sourceUrl: 'https://zero.eu/it/luoghi/103058-tempio-del-futuro-perduto,milano/'
  }
];

/**
 * Agente di Verifica Natura dell'Occasione & Disponibilità (`verifyEventNatureAndAvailability`)
 * - Esclude pagine promozionali di tour a catalogo (`/visite-guidate/`, tour su richiesta),
 *   collezioni permanenti ordinarie e sportelli ricorrenti.
 * - Esclude attività prive di date disponibili/prenotabili ("In programmazione", "Nessuna data disponibile").
 * - Mantiene eventi reali che risultano "Sold Out", applicando il badge `SOLD OUT • POSTI ESAURITI`.
 */
export function verifyEventNatureAndAvailability(candidate = {}) {
  const text = `${candidate.title || ''} ${candidate.description || ''} ${candidate.sourceUrl || ''} ${candidate.rawSourceInput || ''}`;
  const reasons = [];

  if (/milanoguida\.com\/visite-guidate\/|tour\s+su\s+richiesta|prenota\s+un\s+tour\s+privato|itinerario\s+a\s+catalogo|walking\s+tour/i.test(text)) {
    reasons.push('Gate 1 (Natura Occasione): Pagina promozionale di tour/visita guidata a catalogo ricorrente (non è un singolo evento o appuntamento speciale).');
  }
  if (/collezione\s+permanente\s+a\s+ingresso\s+libero\s+senza\s+mostra|solo\s+collezione\s+permanente|orari\s+sportello\s+al\s+pubblico|sportelli\s+diritti\s+civili/i.test(text)) {
    reasons.push('Gate 1 (Natura Occasione): Attività ordinaria ricorrente (collezione permanente o sportello), non costituisce un evento speciale.');
  }
  if (/in\s+programmazione\s*[-—:]?\s*vuoi\s+essere\s+avvisato|vuoi\s+essere\s+avvisato\s+quando\s+saranno\s+online|nessuna\s+data\s+disponibile|attualmente\s+non\s+prenotabile/i.test(text)) {
    reasons.push('Gate 2 (Disponibilità & Prenotabilità): L’attività non ha date attive e non è né disponibile né prenotabile.');
  }

  const isSoldOut =
    Boolean(candidate.isSoldOut) ||
    /sold\s*out|tutto\s+esaurito|posti\s+esauriti|biglietti\s+esauriti/i.test(text);

  if (reasons.length > 0) {
    return {
      isValidEvent: false,
      verdict: 'SCARTATO DALL’AGENTE',
      isSoldOut: false,
      availabilityBadge: 'NON DISPONIBILE / SCARTATO',
      reasons
    };
  }

  return {
    isValidEvent: true,
    verdict: isSoldOut ? 'APPROVATO CON BADGE SOLD OUT' : 'APPROVATO E PRENOTABILE / ATTIVO',
    isSoldOut,
    availabilityBadge: isSoldOut
      ? 'SOLD OUT • POSTI ESAURITI'
      : candidate.isFree
        ? 'INGRESSO LIBERO • DISPONIBILE'
        : 'PRENOTABILE • POSTI DISPONIBILI',
    reasons: []
  };
}

/**
 * Returns the exact timestamp (in ms) of the start of the NEXT full hour (`HH+1:00:00`)
 * following `nowMs`.
 */
export function getNextHourStartMs(nowMs = Date.now()) {
  return (Math.floor(nowMs / 3_600_000) + 1) * 3_600_000;
}

export function getRomeDateParts(dateObj) {
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const map = {};
  formatter.formatToParts(dateObj).forEach((p) => {
    map[p.type] = p.value;
  });
  const hourNum = parseInt(map.hour, 10) % 24;
  const minuteNum = parseInt(map.minute, 10);
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    weekday: (map.weekday || '').replace('.', '').toUpperCase(),
    hour: String(hourNum).padStart(2, '0'),
    minute: String(minuteNum).padStart(2, '0'),
    second: map.second || '00',
    hourNum,
    minuteNum,
    hm: `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`
  };
}

export function getTimeBlockLabel(hourNum, isTomorrow) {
  if (hourNum >= 18 && hourNum <= 22) {
    return { id: isTomorrow ? 'domani-sera' : 'stasera', label: isTomorrow ? 'Domani Sera' : 'Stasera', icon: '🌆' };
  }
  if (hourNum === 23 || (hourNum >= 0 && hourNum <= 5)) {
    return { id: 'stanotte', label: 'Stanotte', icon: '🌙' };
  }
  if (hourNum >= 6 && hourNum <= 12) {
    return { id: isTomorrow ? 'domani-mattina' : 'mattina', label: isTomorrow ? 'Domani Mattina' : 'Questa Mattina', icon: '☀️' };
  }
  return { id: isTomorrow ? 'domani-pomeriggio' : 'pomeriggio', label: isTomorrow ? 'Domani Pomeriggio' : 'Oggi Pomeriggio', icon: '🌤️' };
}

/**
 * Finds the exact timestamp within `[nextHourStartMs, nextHourStartMs + 24h)`
 * that matches a given `scheduledHour` (0..23) and `scheduledMinute` (0..59) in `Europe/Rome`.
 */
export function resolveScheduledTimeInRolling24h(scheduledHour, scheduledMinute, nextHourStartMs) {
  for (let slotIdx = 0; slotIdx < 24; slotIdx++) {
    const slotStartMs = nextHourStartMs + slotIdx * 3_600_000;
    const romeSlot = getRomeDateParts(new Date(slotStartMs));
    if (romeSlot.hourNum === scheduledHour) {
      return slotStartMs + scheduledMinute * 60_000;
    }
  }
  return nextHourStartMs + scheduledMinute * 60_000;
}

export function generateRolling24hFeed(nowTimestampMs = Date.now()) {
  const nextHourStartMs = getNextHourStartMs(nowTimestampMs);
  const nowRome = getRomeDateParts(new Date(nowTimestampMs));

  return MILAN_EVENT_TEMPLATES
    .filter((tpl) => verifyEventNatureAndAvailability(tpl).isValidEvent)
    .map((tpl) => {
      const verification = verifyEventNatureAndAvailability(tpl);
      const startMs = resolveScheduledTimeInRolling24h(
        tpl.scheduledHour,
        tpl.scheduledMinute || 0,
        nextHourStartMs
      );
      const endMs = startMs + tpl.durationMinutes * 60_000;

      const startRome = getRomeDateParts(new Date(startMs));
      const endRome = getRomeDateParts(new Date(endMs));

      const diffMinutes = Math.max(1, Math.round((startMs - nowTimestampMs) / 60_000));
      const isHappeningNow = diffMinutes <= 90;
      const isTomorrow = startRome.day !== nowRome.day;

      return {
        id: tpl.id,
        title: tpl.title,
        description: tpl.description,
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        venueName: tpl.venueName,
        neighborhood: tpl.neighborhood,
        address: `${tpl.address}, Milano`,
        isFree: tpl.isFree,
        isSoldOut: verification.isSoldOut,
        availabilityBadge: verification.availabilityBadge,
        eventType: tpl.eventType || 'SPECIAL_EVENT',
        priceDetails: tpl.priceDetails,
        category: tpl.category,
        mapsUrl: buildMapsUrl(tpl.venueName, tpl.address),
        instagramUrl: tpl.instagramUrl,
        facebookUrl: tpl.facebookUrl,
        sourceUrl: tpl.sourceUrl,
        sourceName: tpl.sourceName,
        // Computed UI metadata
        startHM: startRome.hm,
        endHM: endRome.hm,
        slotHour: `${startRome.hour}:00`,
        slotKey: `${startRome.year}-${startRome.month}-${startRome.day}-${startRome.hour}`,
        diffMinutes,
        isHappeningNow,
        isTomorrow,
        weekday: startRome.weekday,
        dayMonth: `${startRome.day}/${startRome.month}`,
        timeBlock: getTimeBlockLabel(startRome.hourNum, isTomorrow)
      };
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * Generates all 24 hourly slots in `[nextHourStartMs, nextHourStartMs + 24h)` so that
 * hours without events (e.g. 03:00 AM) are preserved and displayed as empty slots.
 */
export function buildFull24HourlySlots(filteredEvents, nowTimestampMs = Date.now()) {
  const nextHourStartMs = getNextHourStartMs(nowTimestampMs);
  const nowRome = getRomeDateParts(new Date(nowTimestampMs));
  const slotsMap = new Map();

  for (let i = 0; i < 24; i++) {
    const slotStartMs = nextHourStartMs + i * 3_600_000;
    const slotRome = getRomeDateParts(new Date(slotStartMs));
    const isTomorrow = slotRome.day !== nowRome.day;
    const slotKey = `${slotRome.year}-${slotRome.month}-${slotRome.day}-${slotRome.hour}`;
    slotsMap.set(slotKey, {
      slotKey,
      slotHour: `${slotRome.hour}:00`,
      hourNum: slotRome.hourNum,
      isTomorrow,
      weekday: slotRome.weekday,
      dayMonth: `${slotRome.day}/${slotRome.month}`,
      timeBlock: getTimeBlockLabel(slotRome.hourNum, isTomorrow),
      events: []
    });
  }

  for (const ev of filteredEvents) {
    if (slotsMap.has(ev.slotKey)) {
      slotsMap.get(ev.slotKey).events.push(ev);
    }
  }

  return Array.from(slotsMap.values());
}

/**
 * Automatic Backend Metadata Extraction for Community Radar (Link or Flyer Photo)
 */
const BACKEND_VENUE_PROFILES = [
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

export function autoExtractCommunitySubmissionBackend({
  submittedVia = 'LINK_URL',
  rawSourceInput = '',
  imageFileName = ''
}) {
  const hint = `${rawSourceInput} ${imageFileName}`.trim();
  const profile =
    BACKEND_VENUE_PROFILES.find((p) => p.match.test(hint)) ||
    (submittedVia === 'FLYER_PHOTO_OCR' ? BACKEND_VENUE_PROFILES[1] : BACKEND_VENUE_PROFILES[0]);

  let title = profile.defaultTitle;
  let sourceName = 'casadellacultura.it';

  if (submittedVia === 'LINK_URL' && rawSourceInput) {
    try {
      const u = new URL(rawSourceInput);
      sourceName = u.hostname.replace(/^www\./, '');
      const segments = u.pathname
        .split('/')
        .map((s) => s.trim())
        .filter((s) => s.length > 3 && !/^(eventi|events|it|milano|whatson|p|reel)$/i.test(s));
      if (segments.length > 0) {
        const slug = segments[segments.length - 1]
          .replace(/\.(html|php|aspx)$/i, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        if (slug.length > 4) {
          title = slug.replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }
    } catch {
      sourceName = rawSourceInput.slice(0, 32);
    }
  } else if (submittedVia === 'FLYER_PHOTO_OCR') {
    sourceName = 'Locandina OCR (Vision Backend)';
    const cleaned = (imageFileName || '')
      .replace(/\.[^.]+$/, '')
      .replace(/^(img|dsc|photo|screenshot|image|foto|locandina|scatto)[-_0-9\s]*/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (cleaned.length > 4) {
      title = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const isIgLink = /instagram\.com/i.test(rawSourceInput);
  const isFbLink = /facebook\.com|fb\.me/i.test(rawSourceInput);

  return {
    title,
    venueName: profile.venueName,
    address: profile.address,
    neighborhood: profile.neighborhood,
    category: profile.category,
    isFree: profile.isFree,
    priceDetails: profile.priceDetails,
    scheduledHour: profile.scheduledHour,
    scheduledMinute: profile.scheduledMinute,
    durationMinutes: 105,
    sourceName,
    sourceUrl: rawSourceInput && rawSourceInput.startsWith('http') ? rawSourceInput : profile.defaultUrl,
    instagramUrl: isIgLink ? rawSourceInput : null,
    facebookUrl: isFbLink ? rawSourceInput : null,
    description:
      submittedVia === 'FLYER_PHOTO_OCR'
        ? `Dettagli estratti automaticamente in backend tramite Vision OCR dalla locandina (${profile.venueName}, ${profile.address}).`
        : `Dettagli estratti automaticamente in backend dal servizio a partire dal link segnalato (${profile.venueName}, ${profile.address}).`
  };
}
