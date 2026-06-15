import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../data')
const DATA_FILE = path.join(DATA_DIR, 'prices.json')

export interface Flight {
  airline: string
  departureTime: string
  arrivalTime: string
  duration: string
  stops: number
  price: number
  currency: string
  date: string
  url: string
}

export interface PriceSnapshot {
  timestamp: string
  flights: Flight[]
}

export interface PriceHistory {
  snapshots: PriceSnapshot[]
}

function pad(n: number): string {
  if (typeof n !== 'number') return '00'
  return n.toString().padStart(2, '0')
}

function extractDataBlock(html: string, key: string): string | null {
  const marker = `AF_initDataCallback({key: '${key}'`
  const start = html.indexOf(marker)
  if (start === -1) return null

  const dataPos = html.indexOf('data:', start + marker.length)
  if (dataPos === -1) return null

  let i = dataPos + 5
  while (i < html.length && html[i] === ' ') i++

  const first = html[i]
  if (first !== '[' && first !== '{') return null

  let depth = 0
  let inStr = false
  let esc = false
  const begin = i

  for (; i < html.length; i++) {
    const ch = html[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === first && depth === 0) { depth = 1; continue }
    if (ch === '[' || ch === '{') depth++
    if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) return html.substring(begin, i + 1)
    }
  }
  return null
}

function extractTime(arr: unknown[] | undefined): string {
  if (!Array.isArray(arr)) return ''
  const h = typeof arr[0] === 'number' ? arr[0] : -1
  const m = typeof arr[1] === 'number' ? arr[1] : 0
  if (h >= 0 && h < 24) return `${pad(h)}:${pad(m)}`
  return ''
}

function extractFlights(data: unknown): Flight[] {
  const flights: Flight[] = []

  function scan(arr: unknown[]) {
    if (!Array.isArray(arr)) return

    if (arr.length === 11) {
      const a0 = arr[0]
      const a1 = arr[1]

      if (
        Array.isArray(a0) && a0.length >= 9 &&
        Array.isArray(a1) && Array.isArray(a1[0]) && a1[0][0] === null
      ) {
        const airlineArr = a0[1]
        const airline = Array.isArray(airlineArr) && typeof airlineArr[0] === 'string' ? airlineArr[0] : ''
        const price = a1[0]?.[1]

        if (airline && typeof price === 'number' && price > 10 && price < 2000) {
          const d = a0[4]
          const date = Array.isArray(d) && typeof d[0] === 'number' && d[0] >= 2020
            ? `${d[0]}-${pad(d[1])}-${pad(d[2])}` : ''

          const dateParam = date ? `+on+${date}` : ''
          const url = `https://www.google.com/travel/flights?q=Flights+to+CTA+from+TRN${dateParam}&hl=en&gl=IT&curr=EUR`

          flights.push({
            airline,
            departureTime: extractTime(a0[5]),
            arrivalTime: extractTime(a0[8]),
            duration: '',
            stops: 0,
            price: Math.round(price),
            currency: 'EUR',
            date,
            url
          })
        }
      }
    }

    for (const el of arr) {
      if (Array.isArray(el)) scan(el)
    }
  }

  scan(data)
  return flights
}

export async function scrapeGoogleFlights(): Promise<Flight[]> {
  const url = 'https://www.google.com/travel/flights?q=Flights+to+CTA+from+TRN&hl=en&gl=IT&curr=EUR'

  console.log(`Fetching ${url}`)

  let html = ''
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
      }
    })
    html = await resp.text()
    console.log(`Downloaded ${(html.length / 1024).toFixed(0)} KB`)
  } catch (e) {
    console.error('Failed to fetch:', e)
    return []
  }

  const rawData = extractDataBlock(html, 'ds:1')
  if (!rawData) {
    console.error('Could not extract ds:1 data block from HTML')
    return []
  }
  console.log(`Extracted ds:1 block (${rawData.length} chars)`)

  let parsed: unknown
  try {
    parsed = JSON.parse(rawData)
  } catch (e) {
    console.error('Failed to parse JSON:', e)
    return []
  }

  const flights = extractFlights(parsed)
  const unique = flights.filter((f, i, a) =>
    i === a.findIndex(x => x.airline === f.airline && x.price === f.price && x.departureTime === f.departureTime)
  )

  unique.sort((a, b) => a.price - b.price)
  console.log(`Found ${unique.length} flights`)
  unique.forEach(f => console.log(`  ${f.airline}: €${f.price} ${f.date} ${f.departureTime}→${f.arrivalTime}`))

  return unique.slice(0, 20)
}

export async function loadPriceHistory(): Promise<PriceHistory> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as PriceHistory
  } catch {
    return { snapshots: [] }
  }
}

export async function savePriceSnapshot(snapshot: PriceSnapshot): Promise<void> {
  const history = await loadPriceHistory()
  history.snapshots.push(snapshot)
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(history, null, 2), 'utf-8')
  console.log(`Saved snapshot with ${snapshot.flights.length} flights`)
}
