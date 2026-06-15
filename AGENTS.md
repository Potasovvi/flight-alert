# Flight Alert — Agent Instructions

## Push rule

I commit faccio io (Potasovvi), non l'AI. Mai eseguire `git push`. Limitarsi a preparare i file e segnalare che sono pronti per il push.

## Scraper

- `cd scraper && npm start` — scraper manuale
- `scraper/src/scraper.ts` — cuore: HTTP fetch → estrae `ds:1` JSON block → parse → walk flights
- Nessun browser/Playwright
- I dati finiscono in `data/prices.json`

## Workflow

`.github/workflows/scrape.yml` — GitHub Actions 3x/giorno + `workflow_dispatch`
