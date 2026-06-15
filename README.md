# Flight Alert ✈️

Monitora i prezzi dei voli **Torino (TRN) → Catania (CTA)** e ti avvisa via Telegram quando conviene comprare.

## Come funziona

1. **GitHub Actions** esegue lo scraper 3 volte al giorno (6:00, 15:00, 21:00 ora italiana)
2. **HTTP fetch** scarica la pagina Google Flights ed estrae i dati JSON embedded (`AF_initDataCallback`)
3. **Confronta** i prezzi con lo snapshot del giorno prima
4. **Telegram** ti notifica se 3+ tratte sono più economiche
5. **React dashboard** su Vercel mostra storico e offerte

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

### 3. Vercel (dashboard)

Collega il repo su [vercel.com](https://vercel.com) — si configura da solo con `vercel.json`.

## Workflow con date personalizzate

Puoi cercare voli per date specifiche direttamente da GitHub Actions:

1. Vai su **Actions** → **Flight Alert Scraper** → **Run workflow**
2. Inserisci `departure_date` (es. `2026-10-01`) e `return_date` (es. `2026-10-07`)
3. Lo scraper cerca TRN→CTA per quelle date e salva i risultati

I cron regolari (3x/giorno) restano invariati — cercano senza date specifiche.

## Comandi

```sh
npm run dev                # Dev frontend :5173
npm run build              # Build produzione
cd scraper && npm start    # Scraper manuale (HTTP + JSON parsing)
cd scraper && npm start:dry# Scraper senza inviare notifiche Telegram
```

## Dati

Gli snapshot dei prezzi sono in `data/prices.json` e vengono committati automaticamente da GitHub Actions. La dashboard li legge da **GitHub raw** (sempre fresh, nessun redeploy necessario).

## Tech

- **Scraper:** HTTP fetch + parsing JSON embedded (nessun browser)
- **Frontend:** React + Vite + Recharts
- **Hosting:** Vercel (static + serverless)
- **Cron:** GitHub Actions (2000 min/mese gratis)
- **Notifiche:** Telegram Bot API
