# Flight Alert ✈️

Monitora i prezzi dei voli **Torino (TRN) → Catania (CTA)**, con notifiche Telegram sia per le date fisse **20 dicembre → 6 gennaio** (riepilogo serale) sia per **ricerche con date personalizzate**.

## Come funziona

1. **GitHub Actions** esegue lo scraper 3 volte al giorno (6:00, 15:00, 22:00 ora italiana)
2. **HTTP fetch** scarica la pagina Google Flights ed estrae i dati JSON embedded (`AF_initDataCallback`)
3. I dati vengono salvati in `data/prices.json` per lo storico
4. **Alle 22:00** ricevi un riepilogo Telegram con la top 3 prezzi per andata e ritorno
5. **React dashboard** su Vercel mostra storico e offerte
6. Con **date personalizzate** puoi cercare voli e inviare i risultati su Telegram con un click

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

## Ricerca con date personalizzate

Dalla dashboard puoi cercare voli per date specifiche:

1. Inserisci andata e ritorno nel form
2. **Cerca voli** → avvia lo scrape su GitHub Actions con quelle date
3. Dopo la ricerca, clicca **Send to Telegram 📨** per ricevere i risultati su Telegram
4. Il messaggio mostra la top 3 andata/ritorno per le tue date

Puoi anche usare GitHub Actions direttamente:

1. Vai su **Actions** → **Flight Alert Scraper** → **Run workflow**
2. Inserisci `departure_date` e/o `return_date`, imposta `send_telegram: true` per la notifica

I cron regolari (3x/giorno) restano invariati — cercano con le date fisse 20/12 → 6/1 e inviano il riepilogo serale.

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
- **Notifica serale:** alle 22:00 — top 3 voli più economici per tratta (date fisse)
- **Notifica su richiesta:** bottone "Send to Telegram" per risultati con date personalizzate
- **Frontend:** React + Vite + Recharts
- **Hosting:** Vercel (static + serverless)
- **Cron:** GitHub Actions (2000 min/mese gratis)
- **Notifiche:** Telegram Bot API
