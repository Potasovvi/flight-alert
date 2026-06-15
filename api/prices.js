import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  const filePath = path.join(process.cwd(), 'data', 'prices.json')

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)

    res.setHeader('Content-Type', 'application/json')
    res.status(200).json(data)
  } catch {
    res.status(200).json({ snapshots: [] })
  }
}
