const GITHUB_TOKEN = process.env.GITHUB_PAT
const REPO = 'potasovvi/flight-alert'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' })
  }

  const { departure_date, return_date, send_telegram } = req.query

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_PAT not configured' })
  }

  const body = { ref: 'main', inputs: {} }
  if (departure_date) body.inputs.departure_date = departure_date
  if (return_date) body.inputs.return_date = return_date
  if (send_telegram === 'true') body.inputs.send_telegram = true

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/scrape.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'flight-alert-webapp'
        },
        body: JSON.stringify(body)
      }
    )

    if (!resp.ok) {
      const text = await resp.text()
      return res.status(500).json({ error: `GitHub API error: ${resp.status}`, detail: text })
    }

    return res.status(200).json({ success: true, message: 'Scraping avviato. Controlla la dashboard tra ~1 minuto.' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
