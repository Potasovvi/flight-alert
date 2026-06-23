const GITHUB_RAW = 'https://raw.githubusercontent.com/potasovvi/flight-alert/main/data/prices.csv'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="prices.csv"')

  try {
    const response = await fetch(GITHUB_RAW, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`GitHub raw ${response.status}`)
    const csv = await response.text()
    return res.status(200).send(csv)
  } catch (err) {
    console.error('GitHub raw fetch failed:', err?.message || err)

    try {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.default.join(process.cwd(), 'data', 'prices.csv')
      const csv = fs.default.readFileSync(filePath, 'utf-8')
      return res.status(200).send(csv)
    } catch (err2) {
      console.error('Local fallback failed:', err2?.message || err2)
      return res.status(200).send('scrape_timestamp,andata_tratta,andata_data,andata_compagnia,andata_orario,andata_prezzo,ritorno_tratta,ritorno_data,ritorno_compagnia,ritorno_orario,ritorno_prezzo\n')
    }
  }
}
