/**
 * Dynamic 24-Hour Rolling Dataset Generator for "Milano Live 24h"
 *
 * Shifts 28 authentic Milanese cultural & social events dynamically to the user's
 * current `now` timestamp (`Europe/Rome` timezone) so the 24-hour rolling feed
 * is immediately populated hour-by-hour whenever the app is opened.
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

export const MILAN_EVENT_TEMPLATES = [
  {
    id: 'evt-mexico-qa',
    offsetMinutes: 0,
    durationMinutes: 125,
    title: 'Il Tempo che Ci Vuole — Proiezione + Q&A con Ospiti in Sala',
    description: 'Proiezione speciale in pellicola restaurata seguita da dibattito in sala con la critica cinematografica e gli autori ospiti della rassegna serale.',
    venueName: 'Cinema Mexico',
    neighborhood: 'Zona Solari / Via Savona',
    address: 'Via Savona 57',
    isFree: false,
    priceDetails: '€7,50 Intero / €6,00 Ridotto',
    category: 'cinema',
    sourceName: 'cinemamexico.it',
    instagramUrl: 'https://instagram.com/cinemamexicomilano',
    facebookUrl: 'https://facebook.com/cinemamexicomilano',
    sourceUrl: 'https://www.cinemamexico.it'
  },
  {
    id: 'evt-base-vernissage',
    offsetMinutes: 15,
    durationMinutes: 180,
    title: 'We Will Design: Vernissage & Live Modular Listening Session',
    description: 'Opening ad accesso libero negli spazi dell’ex Ansaldo: installazioni di design radicale, archivi sonori indipendenti e talk nel cortile coperto.',
    venueName: 'BASE Milano',
    neighborhood: 'Tortona',
    address: 'Via Bergognone 34',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero con accredito',
    category: 'mostre',
    sourceName: 'Zero.eu / BASE Milano',
    instagramUrl: 'https://instagram.com/base_milano',
    facebookUrl: 'https://facebook.com/basemilano',
    sourceUrl: 'https://base.milano.it'
  },
  {
    id: 'evt-casa-cultura-abitare',
    offsetMinutes: 35,
    durationMinutes: 110,
    title: 'Assemblea Cittadina: Diritto all’Abitare, Affitti Brevi e Rigenerazione Urbana',
    description: 'Confronto pubblico tra comitati di quartiere, urbanisti del Politecnico e reti civiche sul caro-affitti e sul piano straordinario per la casa pubblica a Milano.',
    venueName: 'Casa della Cultura',
    neighborhood: 'San Babila / Via Borgogna',
    address: 'Via Borgogna 3',
    isFree: true,
    priceDetails: 'GRATIS • Accesso libero alla cittadinanza',
    category: 'politica',
    sourceName: 'casadellacultura.it',
    instagramUrl: 'https://instagram.com/casadellaculturamilano',
    facebookUrl: 'https://facebook.com/casadellaculturamilano',
    sourceUrl: 'https://www.casadellacultura.it'
  },
  {
    id: 'evt-camera-lavoro-diritti',
    offsetMinutes: 260,
    durationMinutes: 115,
    title: 'Forum Lavoro Digitale, Rider & Intelligenza Artificiale — Sindacato e Territorio',
    description: 'Assemblea metropolitana nel Salone Di Vittorio con delegati, ricercatori e collettivi del lavoro digitale su algoritmi, salario minimo e sicurezza.',
    venueName: 'Camera del Lavoro di Milano',
    neighborhood: 'Porta Vittoria / Cinque Giornate',
    address: 'Corso di Porta Vittoria 43',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso aperto al pubblico',
    category: 'politica',
    sourceName: 'cgil.milano.it',
    instagramUrl: 'https://instagram.com/cgilmilano',
    facebookUrl: 'https://facebook.com/cgilmilano',
    sourceUrl: 'https://www.cgil.milano.it'
  },
  {
    id: 'evt-casa-diritti-transfem',
    offsetMinutes: 690,
    durationMinutes: 120,
    title: 'Tavolo Permanente Diritti Civili, Welfare di Prossimità & Spazi Sicuri',
    description: 'Incontro pubblico aperto alla cittadinanza con sportelli sociali, reti associative e mediatori culturali dei 9 municipi milanesi.',
    venueName: 'Casa dei Diritti — Comune di Milano',
    neighborhood: 'Sant’Ambrogio / De Amicis',
    address: 'Via Edmondo De Amicis 10',
    isFree: true,
    priceDetails: 'GRATIS • Partecipazione libera',
    category: 'politica',
    sourceName: 'Comune di Milano — Welfare',
    instagramUrl: 'https://instagram.com/comunedimilano',
    facebookUrl: 'https://facebook.com/comunedimilano',
    sourceUrl: 'https://www.comune.milano.it'
  },
  {
    id: 'evt-mutuo-soccorso-ecologia',
    offsetMinutes: 1030,
    durationMinutes: 100,
    title: 'Assemblea Ecologista & Mobilità Ciclabile: "Città 30, Alberate e Aria Pulita"',
    description: 'Tavolo cittadino promosso da associazioni ambientaliste, comitati genitori per le strade scolastiche e collettivi di quartiere.',
    venueName: 'Ri-Make / Spazio di Mutuo Soccorso',
    neighborhood: 'Piazza Stuparich / Certosa',
    address: 'Piazza Stuparich 18',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    category: 'politica',
    sourceName: 'Rete Civica Ecologista Milano',
    instagramUrl: 'https://instagram.com/legambientelombardia',
    facebookUrl: 'https://facebook.com/legambientelombardia',
    sourceUrl: 'https://www.legambiente.it'
  },
  {
    id: 'evt-verso-talk',
    offsetMinutes: 30,
    durationMinutes: 90,
    title: 'Milano Verticale e Città Invisibili — Presentazione Libro con l’Autore',
    description: 'Incontro con l’autore e dialogo aperto sul futuro urbanistico dei quartieri milanesi. Calice di benvenuto offerto al primo piano della libreria.',
    venueName: 'Libreria Verso',
    neighborhood: 'Colonne di San Lorenzo / Ticinese',
    address: 'Corso di Porta Ticinese 40',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero fino a esaurimento posti',
    category: 'libri',
    sourceName: 'BookCity / Libreria Verso',
    instagramUrl: 'https://instagram.com/libreriaverso',
    facebookUrl: 'https://facebook.com/libreriaverso',
    sourceUrl: 'https://www.libreriaverso.com'
  },
  {
    id: 'evt-vigna-leonardo-secret',
    offsetMinutes: 45,
    durationMinutes: 75,
    title: 'Apertura Straordinaria Casa degli Atellani & Vigna di Leonardo',
    description: 'Visita guidata speciale tra i chiostri rinascimentali di Portaluppi e i filari storici di Malvasia di Candia donati da Ludovico il Moro a Leonardo nel 1498.',
    venueName: 'Casa degli Atellani — Vigna di Leonardo',
    neighborhood: 'Corso Magenta / Santa Maria delle Grazie',
    address: 'Corso Magenta 65',
    isFree: false,
    priceDetails: '€12,00 Biglietto con audioguida',
    category: 'aperture',
    sourceName: 'MilanoGuida / FAI',
    instagramUrl: 'https://instagram.com/lavignadileonardo',
    facebookUrl: 'https://facebook.com/vignadileonardo',
    sourceUrl: 'https://www.vignadileonardo.com'
  },
  {
    id: 'evt-anteo-anteprima',
    offsetMinutes: 60,
    durationMinutes: 130,
    title: 'Rassegna Lingua Originale (v.o. sott. ita) + Introduzione Critica',
    description: 'Anteprima cittadina in Sala Excelsior con introduzione a cura della redazione di Lungo Corso Cinema. Audio Dolby Atmos in versione originale.',
    venueName: 'Anteo Palazzo del Cinema',
    neighborhood: 'Brera / Garibaldi',
    address: 'Piazza Venticinque Aprile 8',
    isFree: false,
    priceDetails: '€9,50 Intero / €7,00 Amici del Cinema',
    category: 'cinema',
    sourceName: 'spaziocinema.info',
    instagramUrl: 'https://instagram.com/anteospaziocinema',
    facebookUrl: 'https://facebook.com/AnteoPalazzoDelCinema',
    sourceUrl: 'https://www.spaziocinema.info/milano'
  },
  {
    id: 'evt-feltrinelli-fondazione',
    offsetMinutes: 85,
    durationMinutes: 105,
    title: 'Public Talk: Intelligenza Collettiva, Archivi Digitali e Democrazia',
    description: 'Tavola rotonda al quinto piano della piramide di Herzog & de Meuron con ricercatori internazionali, filosofi dei media e giornalisti.',
    venueName: 'Fondazione Giangiacomo Feltrinelli',
    neighborhood: 'Porta Volta',
    address: 'Viale Pasubio 5',
    isFree: true,
    priceDetails: 'GRATIS • Accesso libero con registrazione',
    category: 'libri',
    sourceName: 'fondazionefeltrinelli.it',
    instagramUrl: 'https://instagram.com/fondazionefeltrinelli',
    facebookUrl: 'https://facebook.com/FondazioneFeltrinelli',
    sourceUrl: 'https://fondazionefeltrinelli.it'
  },
  {
    id: 'evt-parenti-bagni',
    offsetMinutes: 120,
    durationMinutes: 110,
    title: 'Drammaturgia Contemporanea in Sala Grande + Incontro nel Foyer',
    description: 'Nuova produzione del Teatro Franco Parenti con drammaturgia originale e scenografia immersiva affacciata sui Bagni Misteriosi.',
    venueName: 'Teatro Franco Parenti',
    neighborhood: 'Porta Romana',
    address: 'Via Pier Lombardo 14',
    isFree: false,
    priceDetails: '€18,00 - €28,00 (Convenzione Invito a Teatro)',
    category: 'teatro',
    sourceName: 'teatrofrancoparenti.it',
    instagramUrl: 'https://instagram.com/teatrofrancoparenti',
    facebookUrl: 'https://facebook.com/teatrofrancoparenti',
    sourceUrl: 'https://teatrofrancoparenti.it'
  },
  {
    id: 'evt-hangar-bicocca',
    offsetMinutes: 145,
    durationMinutes: 150,
    title: 'Visita Serale Gratuita alle Navate & I Sette Palazzi Celesti',
    description: 'Ingresso gratuito alle monumentali installazioni site-specific nelle ex officine industriali Breda, con mediatori culturali presenti in sala.',
    venueName: 'Pirelli HangarBicocca',
    neighborhood: 'Bicocca',
    address: 'Via Chiese 2',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso gratuito',
    category: 'mostre',
    sourceName: 'Artribune / HangarBicocca',
    instagramUrl: 'https://instagram.com/pirellihangarbicocca',
    facebookUrl: 'https://facebook.com/PirelliHangarBicocca',
    sourceUrl: 'https://pirellihangarbicocca.org'
  },
  {
    id: 'evt-beltrade-corti',
    offsetMinutes: 185,
    durationMinutes: 115,
    title: 'La Notte dei Corti Indipendenti — Registi Presenti in Sala',
    description: 'Selezione di cortometraggi d’autore italiani ed europei con collegamento live e microfono aperto tra pubblico in sala e troupe.',
    venueName: 'Cinema Beltrade',
    neighborhood: 'NoLo / Piazza Morbegno',
    address: 'Via Nino Oxilia 10',
    isFree: false,
    priceDetails: '€7,50 Biglietto unico',
    category: 'cinema',
    sourceName: 'bandiere-interrotte.it',
    instagramUrl: 'https://instagram.com/cinemabeltrade',
    facebookUrl: 'https://facebook.com/cinemabeltrade',
    sourceUrl: 'https://bandiere-interrotte.it'
  },
  {
    id: 'evt-manzoni-prosa',
    offsetMinutes: 215,
    durationMinutes: 120,
    title: 'Serata d’Autore al Manzoni — Commedia Brillante in Due Atti',
    description: 'Storico sipario di Via Manzoni per una serata dedicata al grande teatro di prosa contemporaneo con compagnia stabile in tournée nazionale.',
    venueName: 'Teatro Manzoni',
    neighborhood: 'Quadrilatero / Montenapoleone',
    address: 'Via Manzoni 42',
    isFree: false,
    priceDetails: '€25,00 - €36,00 Poltronissima / Galleria',
    category: 'teatro',
    sourceName: 'milanoteatri.it / Teatro Manzoni',
    instagramUrl: 'https://instagram.com/teatromanzonimilano',
    facebookUrl: 'https://facebook.com/TeatroManzoniMilano',
    sourceUrl: 'https://www.teatromanzoni.it'
  },
  {
    id: 'evt-san-maurizio-organo',
    offsetMinutes: 240,
    durationMinutes: 70,
    title: 'Concerto d’Organo Antegnati (1554) nella "Cappella Sistina" di Milano',
    description: 'Apertura straordinaria del Coro delle Monache con esecuzione dal vivo di musiche rinascimentali sull’organo storico cinquecentesco.',
    venueName: 'Chiesa di San Maurizio al Monastero Maggiore',
    neighborhood: 'Cinque Vie / Corso Magenta',
    address: 'Corso Magenta 15',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero fino a capienza',
    category: 'aperture',
    sourceName: 'Comune di Milano Cultura / FAI',
    instagramUrl: 'https://instagram.com/comunedimilano',
    facebookUrl: 'https://facebook.com/comunedimilano',
    sourceUrl: 'https://cultura.comune.milano.it'
  },
  {
    id: 'evt-piccolo-strehler',
    offsetMinutes: 300,
    durationMinutes: 135,
    title: 'Regia Internazionale al Piccolo Teatro Strehler',
    description: 'Allestimento monumentale sul palco di Largo Greppi con sovratitoli in italiano e inglese. Precede lo spettacolo un focus drammaturgico nel ridotto.',
    venueName: 'Piccolo Teatro Strehler',
    neighborhood: 'Lanza / Brera',
    address: 'Largo Greppi 1',
    isFree: false,
    priceDetails: '€22,00 Platea / €16,00 Balconata',
    category: 'teatro',
    sourceName: 'piccoloteatro.org',
    instagramUrl: 'https://instagram.com/piccoloteatromilano',
    facebookUrl: 'https://facebook.com/PiccoloTeatroMilano',
    sourceUrl: 'https://www.piccoloteatro.org'
  },
  {
    id: 'evt-blue-note-jazz',
    offsetMinutes: 330,
    durationMinutes: 95,
    title: 'Contemporary Jazz Quintet — First & Second Set Live',
    description: 'Quintetto jazz internazionale sul palco storico dell’Isola. Acustica intima, repertorio hard-bop originale e jam session finale.',
    venueName: 'Blue Note Milano',
    neighborhood: 'Isola',
    address: 'Via Pietro Borsieri 37',
    isFree: false,
    priceDetails: '€30,00 Door / €25,00 Advance',
    category: 'concerti',
    sourceName: 'Zero.eu / Blue Note',
    instagramUrl: 'https://instagram.com/bluenotemilano',
    facebookUrl: 'https://facebook.com/bluenotemilano',
    sourceUrl: 'https://www.bluenotemilano.com'
  },
  {
    id: 'evt-cinemino-essay',
    offsetMinutes: 365,
    durationMinutes: 105,
    title: 'Rassegna Mezzanotte d’Essai + Discussione al Bar del Circolo',
    description: 'Cult movie restaurato in 4K nella sala segreta da 74 posti in Porta Romana. Richiesta tessera associativa annuale.',
    venueName: 'Il Cinemino',
    neighborhood: 'Porta Romana / Crocetta',
    address: 'Via Seneca 6',
    isFree: false,
    priceDetails: '€7,00 + Tessera Associativa',
    category: 'cinema',
    sourceName: 'ilcinemino.it',
    instagramUrl: 'https://instagram.com/ilcinemino',
    facebookUrl: 'https://facebook.com/ilcinemino',
    sourceUrl: 'https://www.ilcinemino.it'
  },
  {
    id: 'evt-biko-live-showcase',
    offsetMinutes: 420,
    durationMinutes: 180,
    title: 'NuJazz, Afrobeat & Electronic Showcase Live Set',
    description: 'Live band di 6 elementi seguita da selezione vinile funk/broken-beat sul dancefloor del circolo ARCI lungo il Naviglio Pavese.',
    venueName: 'Biko Milano',
    neighborhood: 'Naviglio Pavese / Barona',
    address: 'Via Ettore Ponti 40',
    isFree: false,
    priceDetails: '€12,00 su DICE (+ tessera ARCI)',
    category: 'concerti',
    sourceName: 'DICE.fm Milano',
    instagramUrl: 'https://instagram.com/bikomilano',
    facebookUrl: 'https://facebook.com/bikoclub',
    sourceUrl: 'https://dice.fm/browse/milan'
  },
  {
    id: 'evt-santeria-listening',
    offsetMinutes: 465,
    durationMinutes: 140,
    title: 'Listening Club & Vinyl Talk: L’Elettronica Italiana 1978–1992',
    description: 'Ascolto integrale su impianto hi-fi analogico di rarità discografiche milanesi, commentato da collezionisti e produttori.',
    venueName: 'Santeria Toscana 31',
    neighborhood: 'Viale Toscana / Bocconi',
    address: 'Viale Toscana 31',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    category: 'concerti',
    sourceName: 'Milano da Scrocco / Zero.eu',
    instagramUrl: 'https://instagram.com/santeriamilano',
    facebookUrl: 'https://facebook.com/santeriamilano',
    sourceUrl: 'https://www.santeriamilano.it'
  },
  {
    id: 'evt-magnolia-clubnight',
    offsetMinutes: 525,
    durationMinutes: 240,
    title: 'Electro / Post-Punk Live & Warehouse Club Night',
    description: 'Doppio palco immerso nel parco dell’Idroscalo: live act internazionale alle prime ore seguito da resident DJ set fino a tardi.',
    venueName: 'Circolo Magnolia',
    neighborhood: 'Idroscalo / Segrate',
    address: 'Via Circonvallazione Idroscalo 41',
    isFree: false,
    priceDetails: '€15,00 Early Bird su DICE.fm',
    category: 'concerti',
    sourceName: 'DICE.fm / Resident Advisor',
    instagramUrl: 'https://instagram.com/circolomagnolia',
    facebookUrl: 'https://facebook.com/circolomagnolia',
    sourceUrl: 'https://www.circolomagnolia.it'
  },
  {
    id: 'evt-tempio-futuro-perduto',
    offsetMinutes: 585,
    durationMinutes: 210,
    title: 'Ambient & Techno Vinyl Session + Mostra Fotografica Notturna',
    description: 'Spazio multidisciplinare indipendente alla Fabbrica del Vapore: sala vinile, installazione luminosa nel cortile e raccolta solidale.',
    venueName: 'Tempio del Futuro Perduto',
    neighborhood: 'Cenisio / Monumentale',
    address: 'Via Luigi Nono 9',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso gratuito per under 25 / Up to you',
    category: 'concerti',
    sourceName: 'Resident Advisor Milan',
    instagramUrl: 'https://instagram.com/tempiodelfuturoperduto',
    facebookUrl: 'https://facebook.com/tempiodelfuturoperduto',
    sourceUrl: 'https://ra.co/events/it/milan'
  },
  {
    id: 'evt-brera-cripta-san-giovanni',
    offsetMinutes: 660,
    durationMinutes: 90,
    title: 'Discesa nella Cripta Ipogea di San Giovanni in Conca',
    description: 'Apertura straordinaria dell’unica cripta romanica originale sopravvissuta nel centro di Milano, normalmente chiusa al pubblico.',
    venueName: 'Cripta di San Giovanni in Conca',
    neighborhood: 'Missori / Centro Storico',
    address: 'Piazza Giuseppe Missori',
    isFree: true,
    priceDetails: 'GRATIS • Prenotazione gratuita',
    category: 'aperture',
    sourceName: 'Milano da Scrocco / Comune di Milano',
    instagramUrl: 'https://instagram.com/milanodascrocco',
    facebookUrl: 'https://facebook.com/comunedimilano',
    sourceUrl: 'https://cultura.comune.milano.it'
  },
  {
    id: 'evt-villa-necchi-fai',
    offsetMinutes: 735,
    durationMinutes: 120,
    title: 'Mattinata FAI nel Giardino d’Inverno di Piero Portaluppi',
    description: 'Percorso speciale dedicato alle arti decorative degli anni Trenta e ai disegni d’archivio custoditi a Villa Necchi Campiglio.',
    venueName: 'Villa Necchi Campiglio (FAI)',
    neighborhood: 'Quadrilatero del Silenzio / Palestro',
    address: 'Via Mozart 14',
    isFree: false,
    priceDetails: '€15,00 Intero / Gratis Iscritti FAI',
    category: 'aperture',
    sourceName: 'FAI — Fondo Ambiente Italiano',
    instagramUrl: 'https://instagram.com/fondoambiente',
    facebookUrl: 'https://facebook.com/FondoAmbiente',
    sourceUrl: 'https://fondoambiente.it/luoghi/villa-necchi-campiglio'
  },
  {
    id: 'evt-fondazione-prada-torre',
    offsetMinutes: 800,
    durationMinutes: 180,
    title: 'Retrospettiva Multimediale nel Podium & Torre Bianca',
    description: 'Esposizione monografica curata per gli spazi di Largo Isarco progettati da OMA/Rem Koolhaas, con focus sul cinema sperimentale al Cinema Godard.',
    venueName: 'Fondazione Prada',
    neighborhood: 'Scalo Romana / Largo Isarco',
    address: 'Largo Isarco 2',
    isFree: false,
    priceDetails: '€15,00 Intero / €12,00 Studenti',
    category: 'mostre',
    sourceName: 'Exibart / Fondazione Prada',
    instagramUrl: 'https://instagram.com/fondazioneprada',
    facebookUrl: 'https://facebook.com/fondazioneprada',
    sourceUrl: 'https://www.fondazioneprada.org'
  },
  {
    id: 'evt-cineteca-arlecchino',
    offsetMinutes: 860,
    durationMinutes: 115,
    title: 'Matinée Cineteca: Classici Restaurati in 35mm',
    description: 'Proiezione su copia in pellicola 35mm proveniente dall’archivio storico della Cineteca Italiana, preceduta da cinegiornali d’epoca su Milano.',
    venueName: 'Cineteca Milano Arlecchino',
    neighborhood: 'San Babila / Corso Vittorio Emanuele',
    address: 'Via San Pietro all’Orto 9',
    isFree: false,
    priceDetails: '€8,50 Intero / €6,50 Cinetessera',
    category: 'cinema',
    sourceName: 'cinetecamilano.it',
    instagramUrl: 'https://instagram.com/cinetecamilano',
    facebookUrl: 'https://facebook.com/cinetecamilano',
    sourceUrl: 'https://www.cinetecamilano.it'
  },
  {
    id: 'evt-palazzo-morando-free',
    offsetMinutes: 930,
    durationMinutes: 150,
    title: 'Collezione Costume Moda Immagine & Pinacoteca Civica del Settecento',
    description: 'Ingresso gratuito alle sale storiche del palazzo settecentesco che raccontano l’evoluzione urbanistica e sociale di Milano tra ’700 e ’900.',
    venueName: 'Palazzo Morando',
    neighborhood: 'Sant’Andrea / Montenapoleone',
    address: 'Via Sant’Andrea 6',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso gratuito collezione permanente',
    category: 'mostre',
    sourceName: 'YesMilano / Comune di Milano',
    instagramUrl: 'https://instagram.com/palazzomorando',
    facebookUrl: 'https://facebook.com/PalazzoMorando',
    sourceUrl: 'https://www.costumemodaimmagine.mi.it'
  },
  {
    id: 'evt-triennale-design-talk',
    offsetMinutes: 995,
    durationMinutes: 95,
    title: 'Architettura Radicale & Nuove Ecologie Urbane — Public Lecture',
    description: 'Incontro aperto al Salone d’Onore della Triennale con curatori, paesaggisti e progettisti europei sul futuro degli spazi pubblici.',
    venueName: 'Triennale Milano',
    neighborhood: 'Parco Sempione / Cadorna',
    address: 'Viale Emilio Alemagna 6',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero su registrazione',
    category: 'libri',
    sourceName: 'Zero.eu / Triennale Milano',
    instagramUrl: 'https://instagram.com/triennalemilano',
    facebookUrl: 'https://facebook.com/triennalemilano',
    sourceUrl: 'https://triennale.org'
  },
  {
    id: 'evt-meet-digital-culture',
    offsetMinutes: 1080,
    durationMinutes: 90,
    title: 'Meet the Media Guru: Immersive Storytelling & VR Room',
    description: 'Masterclass e dimostrazione immersiva nella sala VR di Porta Venezia dedicata alle arti generative e alla cultura digitale.',
    venueName: 'MEET Digital Culture Center',
    neighborhood: 'Porta Venezia / Oberdan',
    address: 'Viale Vittorio Veneto 2',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso gratuito con prenotazione Eventbrite',
    category: 'libri',
    sourceName: 'Eventbrite / MEET Center',
    instagramUrl: 'https://instagram.com/meetcenter',
    facebookUrl: 'https://facebook.com/MEETahu',
    sourceUrl: 'https://www.meetcenter.it'
  },
  {
    id: 'evt-mudec-dialogo-arti',
    offsetMinutes: 1150,
    durationMinutes: 140,
    title: 'Focus Curatori nell’Agorà di David Chipperfield + Collezione Permanente',
    description: 'Approfondimento guidato gratuito nella collezione permanente del Museo delle Culture con focus sui nuclei storici precolombiani e africani.',
    venueName: 'MUDEC — Museo delle Culture',
    neighborhood: 'Tortona / Ansaldo',
    address: 'Via Tortona 56',
    isFree: true,
    priceDetails: 'GRATIS • Collezione permanente a ingresso libero',
    category: 'mostre',
    sourceName: 'Artribune / MUDEC',
    instagramUrl: 'https://instagram.com/mudec_official',
    facebookUrl: 'https://facebook.com/Mudec.MuseodelleCulture',
    sourceUrl: 'https://www.mudec.it'
  },
  {
    id: 'evt-alcatraz-live-tour',
    offsetMinutes: 1220,
    durationMinutes: 165,
    title: 'Indie & Alternative Rock European Tour — Main Stage Live',
    description: 'Tappa unica italiana sul palco principale di Via Valtellina. Apertura porte con opening act milanese.',
    venueName: 'Alcatraz Milano',
    neighborhood: 'Farini / Isola',
    address: 'Via Valtellina 25',
    isFree: false,
    priceDetails: '€28,00 + d.p. Biglietti disponibili',
    category: 'concerti',
    sourceName: 'DICE.fm / Zero.eu',
    instagramUrl: 'https://instagram.com/alcatrazmilano',
    facebookUrl: 'https://facebook.com/alcatrazmilano',
    sourceUrl: 'https://www.alcatrazmilano.it'
  },
  {
    id: 'evt-elfo-puccini-contemp',
    offsetMinutes: 1290,
    durationMinutes: 110,
    title: 'Nuove Scritture Sceniche in Sala Shakespeare',
    description: 'Spettacolo di teatro contemporaneo pluripremiato ai premi Ubu, seguito da breve conversazione con gli attori della compagnia.',
    venueName: 'Teatro Elfo Puccini',
    neighborhood: 'Corso Buenos Aires / Lima',
    address: 'Corso Buenos Aires 33',
    isFree: false,
    priceDetails: '€19,50 Ridotto Under30 / €29,00 Intero',
    category: 'teatro',
    sourceName: 'Invito a Teatro / Elfo Puccini',
    instagramUrl: 'https://instagram.com/teatroelfopuccini',
    facebookUrl: 'https://facebook.com/teatroelfopuccini',
    sourceUrl: 'https://www.elfo.org'
  },
  {
    id: 'evt-torre-branca-sunset',
    offsetMinutes: 1365,
    durationMinutes: 85,
    title: 'Salita Panoramica sulla Torre Branca di Giò Ponti (108m)',
    description: 'Accesso in ascensore rapido fino al belvedere esagonale progettato da Giò Ponti nel 1933 con vista a 360° sullo skyline di Milano e sulle Alpi.',
    venueName: 'Torre Branca — Parco Sempione',
    neighborhood: 'Parco Sempione',
    address: 'Viale Luigi Camoens 2',
    isFree: false,
    priceDetails: '€6,00 Salita Panoramica',
    category: 'aperture',
    sourceName: 'YesMilano / MilanoGuida',
    instagramUrl: 'https://instagram.com/yesmilano',
    facebookUrl: 'https://facebook.com/visitmilanoofficial',
    sourceUrl: 'https://www.yesmilano.it'
  },
  {
    id: 'evt-lafeltrinelli-duomo',
    offsetMinutes: 1410,
    durationMinutes: 75,
    title: 'Incontro con la Redazione & Presentazione Saggio sull’Editoria Indipendente',
    description: 'Appuntamento aperto al pubblico nella storica libreria di Galleria Vittorio Emanuele II con autori, editor e firmacopie finale.',
    venueName: 'laFeltrinelli Duomo',
    neighborhood: 'Piazza del Duomo / Galleria',
    address: 'Galleria Vittorio Emanuele II 82',
    isFree: true,
    priceDetails: 'GRATIS • Ingresso libero',
    category: 'libri',
    sourceName: 'lafeltrinelli.it/eventi',
    instagramUrl: 'https://instagram.com/lafeltrinelli_milano',
    facebookUrl: 'https://facebook.com/laFeltrinelli',
    sourceUrl: 'https://www.lafeltrinelli.it/eventi'
  }
];

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
    return { id: isTomorrow ? 'domani-sera' : 'stasera', label: isTomorrow ? 'Domani Sera' : 'Stasera' };
  }
  if (hourNum === 23 || (hourNum >= 0 && hourNum <= 5)) {
    return { id: 'stanotte', label: 'Stanotte' };
  }
  if (hourNum >= 6 && hourNum <= 12) {
    return { id: isTomorrow ? 'domani-mattina' : 'mattina', label: isTomorrow ? 'Domani Mattina' : 'Questa Mattina' };
  }
  return { id: isTomorrow ? 'domani-pomeriggio' : 'pomeriggio', label: isTomorrow ? 'Domani Pomeriggio' : 'Oggi Pomeriggio' };
}

export function generateRolling24hFeed(nowTimestampMs = Date.now()) {
  const nextHourStartMs = getNextHourStartMs(nowTimestampMs);
  const nowRome = getRomeDateParts(new Date(nowTimestampMs));

  return MILAN_EVENT_TEMPLATES.map((tpl) => {
    const rawStartMs = nextHourStartMs + tpl.offsetMinutes * 60_000;
    const roundedStartMs = Math.round(rawStartMs / (5 * 60_000)) * (5 * 60_000);
    const endMs = roundedStartMs + tpl.durationMinutes * 60_000;

    const startRome = getRomeDateParts(new Date(roundedStartMs));
    const endRome = getRomeDateParts(new Date(endMs));

    const diffMinutes = Math.max(1, Math.round((roundedStartMs - nowTimestampMs) / 60_000));
    const isHappeningNow = tpl.offsetMinutes < 60 || diffMinutes <= 30;
    const isTomorrow = startRome.day !== nowRome.day;

    return {
      id: tpl.id,
      title: tpl.title,
      description: tpl.description,
      startTime: new Date(roundedStartMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      venueName: tpl.venueName,
      neighborhood: tpl.neighborhood,
      address: `${tpl.address}, Milano`,
      isFree: tpl.isFree,
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
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
