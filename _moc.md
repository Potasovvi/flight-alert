# flight-alert

Monitoraggio prezzi voli **Torino → Catania**. Scraping Google Flights 3x/giorno (6, 15, 21 IT) con Playwright. Notifiche Telegram quando 3 tratte calano di prezzo. Dashboard React.

## Stack

Playwright · GitHub Actions · React · Vite · Vercel · Telegram Bot

## Struttura rapida

| Path | Cosa |
|------|------|
| `scraper/` | Playwright → Google Flights, confronto, notifica Telegram |
| `src/` | Dashboard React (Vite) |
| `api/prices.js` | Vercel serverless → serve `data/prices.json` |
| `.github/workflows/scrape.yml` | Cron 6/15/21 ora IT, installa Chromium |

## Comandi

```sh
npm run dev           # Vite frontend :5173
npm run build         # Build produzione
cd scraper && npm start  # Esecuzione scraper manuale
```

## Setup secrets (GitHub → Settings → Secrets)

- `TELEGRAM_BOT_TOKEN` — da @BotFather
- `TELEGRAM_CHAT_ID` — chat ID del bot

## Vedi anche

- [[README]]
