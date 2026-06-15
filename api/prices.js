const GITHUB_RAW = 'https://raw.githubusercontent.com/potasovvi/flight-alert/main/data/prices.json'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    const response = await fetch(GITHUB_RAW, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`GitHub raw ${response.status}`)
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('GitHub raw fetch failed:', err?.message || err)

    try {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.default.join(process.cwd(), 'data', 'prices.json')
      const raw = fs.default.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      return res.status(200).json(data)
    } catch (err2) {
      console.error('Local fallback failed:', err2?.message || err2)
      return res.status(200).json({ snapshots: [] })
    }
  }
}
