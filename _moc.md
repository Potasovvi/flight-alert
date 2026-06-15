# flight-alert

Monitoraggio prezzi voli **Torino → Catania**. Scraping Google Flights 3x/giorno. Notifiche Telegram quando 3+ tratte calano di prezzo. Dashboard React.

## Stack

HTTP fetch + JSON parsing embedded · GitHub Actions · React · Vite · Vercel · Telegram Bot

## Struttura

| Path | Cosa |
|------|------|
| `scraper/` | HTTP fetch → estrae JSON embedded (`AF_initDataCallback`), confronto, notifica Telegram |
| `src/` | Dashboard React (Vite) con tabella voli e link cliccabili |
| `api/prices.js` | Vercel serverless — fetcha dati da GitHub raw (sempre fresh) |
| `.github/workflows/scrape.yml` | Cron 3x/giorno + `workflow_dispatch` con date personalizzate |
| `data/prices.json` | Storico snapshot (committato dal workflow) |
| `plans/` | Plan delle feature |

## Workflow con date

Vai su **Actions** → **Run workflow** → inserisci `departure_date` e `return_date` (YYYY-MM-DD).

## Comandi

```sh
npm run dev               # Vite frontend :5173
npm run build             # Build produzione
cd scraper && npm start   # Scraper manuale
cd scraper && npm start:dry# Scraper senza notifiche Telegram
```

## Secrets (GitHub → Settings → Secrets)

| Secret | Valore |
|--------|--------|
| `TELEGRAM_BOT_TOKEN` | Token da @BotFather |
| `TELEGRAM_CHAT_ID` | Chat ID del bot |

## Vedi anche

- [[README]]
