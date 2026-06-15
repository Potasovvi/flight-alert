import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

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
}

export interface PriceSnapshot {
  timestamp: string
  flights: Flight[]
}

export interface PriceHistory {
  snapshots: PriceSnapshot[]
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function extractPrice(text: string): number | null {
  const cleaned = text.replace(/\./g, '').replace(/,/g, '.').trim()
  const m = cleaned.match(/(\d+[\d.]*)/)
  if (!m) return null
  const val = parseFloat(m[1])
  return isNaN(val) ? null : val
}

interface RawFlight {
  airline: string
  departure: string
  arrival: string
  duration: string
  stops: number
  price: number
}

function parseGoogleApiResponse(text: string): RawFlight[] {
  const results: RawFlight[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const parts = line.split('["')
    for (let i = 0; i < parts.length; i++) {
      const chunk = parts[i]
      if (!chunk.includes('€') && !chunk.includes('EUR')) continue

      const priceM = chunk.match(/(\d{1,3}(?:[.\s]?\d{3})*(?:,\d{2})?)\s*[€]/)
      if (!priceM) continue

      const price = extractPrice(priceM[1])
      if (!price || price < 10 || price > 2000) continue

      let airline = ''
      const airlineM = chunk.match(/(Ryanair|ITA\s*Airways|Wizz\s*Air|Volotea|EasyJet|Aeroitalia|[A-Z][a-z]+\s*(?:Air|Airlines|Airways|Aviation)?)/)
      if (airlineM) airline = airlineM[1].trim()

      let departure = ''
      let arrival = ''
      const timeM = chunk.match(/(\d{1,2}[:.]\d{2})\s*(?:[-→])\s*(\d{1,2}[:.]\d{2})/)
      if (timeM) {
        departure = timeM[1].replace('.', ':')
        arrival = timeM[2].replace('.', ':')
      }

      let stops = 0
      if (chunk.match(/scalo|stop|via/i)) stops = 1
      if (chunk.match(/2\s*scali|2\s*stop/i)) stops = 2

      let duration = ''
      const durM = chunk.match(/(\d{1,2})\s*h[.\s]*(\d{1,2})\s*m/)
      if (durM) duration = `${durM[1]}h ${durM[2]}m`

      results.push({ airline: airline || 'Sconosciuto', departure, arrival, duration, stops, price })
    }
  }

  return results
}

export async function scrapeGoogleFlights(): Promise<Flight[]> {
  const flights: Flight[] = []
  const today = new Date()
  const todayStr = formatDate(today)

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  })

  const context = await browser.newContext({
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light'
  })

  const page = await context.newPage()

  let apiResponses: string[] = []

  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('TravelFrontendService') || url.includes('batchexecute') || url.includes('travel.flights')) {
      try {
        const text = await response.text()
        if (text.length < 50000 && (text.includes('€') || text.includes('EUR') || text.includes('PRICE'))) {
          apiResponses.push(text)
        }
      } catch { }
    }
  })

  try {
    const dates: string[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      dates.push(formatDate(d))
    }

    const foundPrices = new Set<number>()

    for (let day = 0; day < Math.min(14, dates.length); day++) {
      const dateStr = dates[day]
      const url = `https://www.google.com/travel/flights?q=Flights+from+TRN+to+CTA+on+${dateStr}`

      console.log(`Searching: ${dateStr}`)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => { })
      await sleep(4000)

      try {
        const acceptBtn = page.locator('button:has-text("Accetta"), button:has-text("Accept all"), [aria-label*="cookie"], [aria-label*="consent"]').first()
        if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await acceptBtn.click()
          await sleep(1000)
        }
      } catch { }

      await sleep(2000)

      const bodyText = await page.textContent('body').catch(() => '') ?? ''

      const priceMatches = bodyText.matchAll(/(\d{1,3}(?:[.\s]?\d{3})*(?:,\d{2})?)\s*€/g)
      for (const m of priceMatches) {
        const price = extractPrice(m[1])
        if (!price || price < 10 || price > 2000 || foundPrices.has(price)) continue
        foundPrices.add(price)

        let airline = 'Sconosciuto'
        let departure = ''
        let arrival = ''
        let duration = ''
        let stops = 0

        const contextStart = Math.max(0, (m.index ?? 0) - 200)
        const contextEnd = Math.min(bodyText.length, (m.index ?? 0) + 100)
        const context = bodyText.slice(contextStart, contextEnd)

        const airlineM = context.match(/(Ryanair|ITA\s*Airways|Wizz\s*[Aa]ir|WizzAir|Volotea|EasyJet|Aeroitalia)/)
        if (airlineM) airline = airlineM[1].trim()

        const timeM = context.match(/(\d{1,2}[:.]\d{2})\s*(?:[-→])\s*(\d{1,2}[:.]\d{2})/)
        if (timeM) {
          departure = timeM[1].replace('.', ':')
          arrival = timeM[2].replace('.', ':')
        }

        const durM = context.match(/(\d{1,2})\s*h/)
        if (durM) duration = `${durM[1]}h`

        if (context.match(/scalo|stop/i)) stops = 1

        flights.push({ airline, departureTime: departure, arrivalTime: arrival, duration, stops, price, currency: 'EUR', date: dateStr })
        console.log(`  Found: ${airline} €${price} ${departure}→${arrival}`)
      }

      await sleep(1000)
    }

    if (flights.length === 0 && apiResponses.length > 0) {
      console.log('DOM extraction gave 0 results, trying API response parsing...')
      for (const resp of apiResponses) {
        const parsed = parseGoogleApiResponse(resp)
        for (const f of parsed) {
          if (!foundPrices.has(f.price)) {
            foundPrices.add(f.price)
            flights.push({ airline: f.airline, departureTime: f.departure, arrivalTime: f.arrival, duration: f.duration, stops: f.stops, price: f.price, currency: 'EUR', date: todayStr })
          }
        }
      }
    }

    if (flights.length === 0) {
      console.log('No flights found via text matching. Saving screenshot for debugging...')
      try {
        await page.screenshot({ path: '/tmp/flight-alert-debug.png', fullPage: true })
        console.log('Screenshot saved to /tmp/flight-alert-debug.png')
      } catch { }
    }
  } catch (e) {
    console.error('Scraping error:', e)
  } finally {
    await browser.close()
  }

  flights.sort((a, b) => a.price - b.price)
  const unique = flights.filter((f, i, arr) => arr.findIndex(x => x.airline === f.airline && x.price === f.price) === i)
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
