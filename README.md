# Flight Alert ✈️

Monitora i prezzi dei voli **Torino (TRN) → Catania (CTA)** e ti avvisa via Telegram quando conviene comprare.

## Come funziona

1. **GitHub Actions** esegue Playwright 3 volte al giorno (6:00, 15:00, 21:00 ora italiana)
2. **Playwright** apre Google Flights, cerca voli TRN→CTA per i prossimi 30 giorni
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

## Comandi

```sh
npm run dev          # Dev frontend :5173
npm run build        # Build produzione
cd scraper && npm start   # Esecuzione scraper manuale
npm run scrape:dry   # Scraper senza inviare notifiche
```

## Dati

Gli snapshot dei prezzi sono in `data/prices.json` e vengono committati automaticamente da GitHub Actions.

## Tech

- **Scraper:** Playwright + TypeScript
- **Frontend:** React + Vite + Recharts
- **Hosting:** Vercel (static + serverless)
- **Cron:** GitHub Actions (2000 min/mese gratis)
- **Notifiche:** Telegram Bot API
