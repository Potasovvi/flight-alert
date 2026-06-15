# Flight Alert — Date personalizzate per la ricerca

## Obiettivo
L'utente può scegliere date di andata (TRN→CTA) e ritorno (CTA→TRN) e lanciare GitHub Actions con quelle date. Lo scraper esegue la ricerca su Google Flights per le date specificate e salva i risultati.

## Attivazione
GitHub Actions UI: l'utente va su Actions → Run workflow → inserisce date.

## Cosa cambia

### 1. `.github/workflows/scrape.yml`
- `workflow_dispatch` accetta due input: `departure_date` e `return_date`
- Passati come env `DEPARTURE_DATE` / `RETURN_DATE` allo scraper
- Cron rimane invariato (senza date = ricerca generica)

### 2. `scraper/src/scraper.ts`
- `scrapeGoogleFlights(departureDate?, returnDate?)` accetta date opzionali
- Costruisce URL tipo:
  - Senza date: `?q=Flights+to+CTA+from+TRN&...` (come ora)
  - Solo andata: `?q=Flights+to+CTA+from+TRN+on+2026-10-01&...`
  - Andata+ritorno: `?q=Flights+from+TRN+to+CTA+on+2026-10-01+return+on+2026-10-07&...`
- Il parsing JSON dopo resta identico (cambia solo l'URL)
- Le date nei link dei voli (`url`) usano le date specificate

### 3. `scraper/src/index.ts`
- Legge `DEPARTURE_DATE` e `RETURN_DATE` da env
- Valida che `return_date > departure_date` (se entrambe presenti)
- Le passa a `scrapeGoogleFlights(departureDate, returnDate)`

### 4. Dashboard
- Nessuna modifica diretta (i voli hanno già i campi `date` e `url`)

## Come si usa
1. Vai su GitHub → Actions → Flight Alert Scraper → Run workflow
2. Inserisci `2026-10-01` (andata) e `2026-10-07` (ritorno)
3. Lo scraper esegue la ricerca con quelle date
4. I voli trovati finiscono in `data/prices.json`
5. La dashboard li mostra

## Formato date
`YYYY-MM-DD`. Se `return_date` < `departure_date`, errore e skip.
