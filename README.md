# Flight Alert ✈️

Monitora i prezzi dei voli **Torino (TRN) → Catania (CTA)**, con notifiche Telegram sia per le date fisse **20 dicembre → 6 gennaio** (riepilogo serale) sia per **ricerche con date personalizzate**.

## Come funziona

1. **GitHub Actions** esegue lo scraper 4 volte al giorno (7:00, 16:00, 22:00, 23:00 ora italiana)
2. **HTTP fetch** scarica la pagina Google Flights ed estrae i dati JSON embedded (`AF_initDataCallback`)
3. I dati vengono salvati in `data/prices.json` (storico completo) e `data/prices.csv` (miglior prezzo per tratta, committato solo la sera)
4. **In serata (18-23)** ricevi un riepilogo Telegram con la top 3 prezzi per andata e ritorno (massimo 1 notifica al giorno)
5. **React dashboard** su Vercel mostra in primo piano il **volo più economico** per tratta, con indicatore di tendenza (↑ prezzo salito, ↓ sceso) rispetto allo scan precedente
6. Con **date personalizzate** (in fondo alla pagina) puoi cercare voli e inviare i risultati su Telegram con un click

## Dashboard

La dashboard è pensata per utenti che arrivano dopo una notifica Telegram:

- **Hero section** — il volo più economico per andata e ritorno, con badge "💰 Miglior prezzo" e trend (↓/↑) rispetto allo scan precedente
- **Tabella voli** — tutti i voli disponibili ordinati per prezzo, con colonna Trend che mostra la variazione rispetto al rilevamento precedente
- **Grafico prezzi** — storico prezzi per tratta con linea per compagnia (Recharts), selezionabile su N giorni
- **Deal card** — badge sconto percentuale per voli in calo significativo
- **Ricerca date** — form collassabile in fondo alla pagina per cercare voli su date personalizzate e inviarli su Telegram

## Setup

### 1. Telegram Bot

```sh
# Con @BotFather su Telegram:
/newbot → FlightAlertBot → ottieni TOKEN
# Scrivi al bot, poi:
curl https://api.telegram.org/bot<TOKEN>/getUpdates
# Prendi il chat_id dalla risposta
```

### 2. GitHub Secrets

Vai su Settings → Secrets and variables → Actions:

| Secret | Valore |
|--------|--------|
| `TELEGRAM_BOT_TOKEN` | Token di @BotFather |
| `TELEGRAM_CHAT_ID` | La tua chat ID |
| `GITHUB_PAT` | Personal Access Token (per trigger-scrape via API) |

### 3. Vercel (dashboard)

Collega il repo su [vercel.com](https://vercel.com) — si configura da solo con `vercel.json`.
Aggiungi le stesse env var (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GITHUB_PAT`) su Vercel → Settings → Environment Variables.

## Ricerca con date personalizzate

Dalla dashboard puoi cercare voli per date specifiche (form in fondo alla pagina):

1. Inserisci andata e ritorno
2. **Cerca voli** → chiama `/api/trigger-scrape` che avvia GitHub Actions con quelle date
3. Dopo la ricerca, i risultati appaiono in una sezione dedicata con i soli voli "custom"
4. Clicca **Invia su Telegram 📨** per ricevere la top 3 andata/ritorno

Puoi anche usare GitHub Actions direttamente:

1. Vai su **Actions** → **Flight Alert Scraper** → **Run workflow**
2. Inserisci `departure_date` e/o `return_date`, imposta `send_telegram: true` per la notifica, `commit_csv: true` per forzare il commit del CSV
3. I cron regolari restano invariati — cercano con le date fisse 20/12 → 6/1 e inviano il riepilogo serale

## API endpoints (Vercel serverless)

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/prices` | Restituisce `data/prices.json` (da GitHub raw, fallback locale) |
| `GET /api/csv` | Restituisce `data/prices.csv` come file CSV |
| `GET /api/trigger-scrape` | Avvia GitHub Actions workflow con date opzionali |

## Comandi

```sh
npm run dev                    # Dev frontend :5173
npm run build                  # Build produzione
npm run typecheck              # TypeScript strict check
cd scraper && npm start        # Scraper manuale (HTTP + JSON parsing)
cd scraper && npm run start:dry# Scraper senza inviare notifiche Telegram
```

## Dati

Gli snapshot dei prezzi sono in `data/prices.json` (storico completo) e `data/prices.csv` (miglior prezzo per tratta, una riga per rilevamento — committato solo negli slot serali).

La dashboard legge i dati da `/api/prices` (Vercel serverless → GitHub raw → sempre fresh).

Colonne CSV:

```
scrape_timestamp,andata_tratta,andata_data,andata_compagnia,andata_orario,andata_prezzo,ritorno_tratta,ritorno_data,ritorno_compagnia,ritorno_orario,ritorno_prezzo
```

## Tech

- **Scraper:** HTTP fetch + parsing JSON embedded (nessun browser), TypeScript con `tsx`
- **Notifica serale:** finestra 18-23 Roma, max 1 notifica/giorno (tracciato via `.last-notification`), top 3 voli più economici per tratta (date fisse)
- **Notifica su richiesta:** bottone "Invia su Telegram" per risultati con date personalizzate
- **Frontend:** React 19 + Vite 6 + Recharts (grafico storico prezzi)
- **Hosting:** Vercel (static + serverless functions in `api/`)
- **Cron:** GitHub Actions (4x/giorno, 2000 min/mese gratis)
- **Notifiche:** Telegram Bot API
- **TypeScript:** Strict mode, ES2022, bundler module resolution
