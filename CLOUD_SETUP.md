# Guida Attivazione Cloud Persistence & Gemini Vision OCR (`CLOUD_SETUP.md`)

Questa guida descrive le variabili d'ambiente necessarie per attivare la **persistenza cloud** (Firebase Firestore), il **proxy Serverless/Edge proprietario**, e l'estrazione strutturata tramite **Gemini 2.5 Flash API** per le locandine fotografate a Milano.

---

## 1. Architettura a Tolleranza di Guasto (Zero-Downtime Provider Pattern)
L'applicazione è progettata per funzionare **immediatamente anche in assenza di chiavi cloud**:
- Se le variabili non sono configurate o il dispositivo è offline, l'app usa in automatico `public/live-events.json` + `localStorage` come fallback senza interruzioni né errori a runtime.
- Appena le chiavi vengono impostate nei Secrets del repository (o nel file `.env`), l'applicazione passa istantaneamente alla persistenza cloud condivisa tra tutti gli utenti.

---

## 2. Le 3 Variabili d'Ambiente Principali

| Variabile | Descrizione | Dove Impostarla |
| :--- | :--- | :--- |
| `VITE_FIREBASE_PROJECT_ID` | ID del progetto Google Cloud / Firebase (es. `milano-live-24h`) per Firestore REST API | GitHub Secrets / `.env` |
| `VITE_FIREBASE_API_KEY` | Web API Key pubblica generata nelle impostazioni progetto Firebase | GitHub Secrets / `.env` |
| `VITE_GEMINI_API_KEY` | API Key per **Gemini 2.5 Flash** (Google AI Studio) per l'analisi visiva delle locandine | GitHub Secrets / `.env` |

### Variabili Opzionali Avanzate:
- `VITE_CUSTOM_PROXY_URL`: URL del worker serverless (`backend/proxy/corsProxyWorker.js`) distribuito su Cloudflare Workers o Cloud Functions (es. `https://cors-proxy.milano-live.workers.dev`).
- `CLOUD_SYNC_URL` & `CLOUD_SYNC_SECRET`: Endpoint webhook server-side alternativo a Firebase per sincronizzare il feed dalle GitHub Actions.

---

## 3. Configurazione Passo-Passo

### A. Attivazione Firebase Firestore
1. Accedi alla [Firebase Console](https://console.firebase.google.com/) e crea un progetto (o seleziona un progetto esistente).
2. Nel menu laterale, seleziona **Firestore Database** e clicca **Crea database** (in modalità produzione, regione `europe-west1` o `europe-west3`).
3. Vai in **Impostazioni Progetto** (icona ingranaggio) $\rightarrow$ Scheda **Generali** per copiare:
   - **ID progetto** $\rightarrow$ `VITE_FIREBASE_PROJECT_ID`
   - **Chiave API Web** $\rightarrow$ `VITE_FIREBASE_API_KEY`
4. Regole di sicurezza consigliate per Firestore (`firestore.rules`):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Permette lettura pubblica degli snapshot 24h e della telemetria
       match /snapshots/live_24h {
         allow read: if true;
         allow write: if request.auth != null || request.resource.data.keys().hasAll(['events', 'generatedAt']);
       }
       match /telemetry/{doc} {
         allow read: if true;
         allow write: if true;
       }
       // Coda eventi programmati e community
       match /scheduled_events/{eventId} {
         allow read: if true;
         allow write: if true;
       }
     }
   }
   ```

### B. Attivazione Gemini 2.5 Flash Vision OCR
1. Genera una chiave API gratuita da [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Salva la chiave come `VITE_GEMINI_API_KEY` nei tuoi GitHub Repository Secrets e in `.env`.
3. Quando un utente carica una locandina o scatta una foto, il servizio `visionOcrService.js` invia l'immagine direttamente all'endpoint multimodale con lo schema JSON `UnifiedEvent` (estraendo orari, titolo, luogo, prezzi e gestendo date multiple/future).

### C. Distribuzione Proxy Serverless (`corsProxyWorker.js`)
- **Cloudflare Workers**:
  ```bash
  npx wrangler deploy backend/proxy/corsProxyWorker.js --name milano-cors-proxy
  ```
  Imposta l'URL generato come `VITE_CUSTOM_PROXY_URL`.
- **Firebase Functions (Node.js)**:
  Puoi esportare `handleProxyRequest` all'interno di `onRequest` in `functions/index.js`.

---

## 4. Disaccoppiamento Git Commits in GitHub Actions
In `.github/workflows/update-events.yml`, il workflow esegue `node scripts/crawl-milan-sources.mjs` ogni 2 ore:
- Se `FIREBASE_PROJECT_ID` o `CLOUD_SYNC_URL` è configurato, i dati vengono scritti **direttamente nel cloud database**, evitando di intasare la cronologia dei commit Git di repository.
- Viene effettuato solo un commit snapshot di salvataggio giornaliero alle ore 00:00 UTC (o su esecuzione manuale `workflow_dispatch`).
