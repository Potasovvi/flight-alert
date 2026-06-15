const GITHUB_RAW = 'https://raw.githubusercontent.com/Potasovvi/flight-alert/main/data/prices.json'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    const response = await fetch(GITHUB_RAW)
    if (!response.ok) throw new Error(`GitHub raw returned ${response.status}`)
    const data = await response.json()
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json(data)
  } catch {
    // Fallback: leggi da file locale
    try {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.default.join(process.cwd(), 'data', 'prices.json')
      const raw = fs.default.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json(data)
    } catch {
      res.status(200).json({ snapshots: [] })
    }
  }
}
