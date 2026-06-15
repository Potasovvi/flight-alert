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
  return d.toISOString().split('T')[0]
}

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function scrapeGoogleFlights(): Promise<Flight[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  })

  const page = await context.newPage()

  const flights: Flight[] = []
  const today = new Date()
  const todayStr = formatDate(today)

  try {
    const url = `https://www.google.com/travel/flights?q=Flights+to+CTA+from+TRN`
    console.log(`Navigating to ${url}`)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

    await delay(3000)

    const acceptButton = page.locator('button:has-text("Accetta"), button:has-text("Accept"), button:has-text("Accetta tutto"), [aria-label*="Accetta"]').first()
    if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptButton.click()
      await delay(1000)
    }

    try {
      await page.waitForSelector('[role="listitem"]', { timeout: 15000 })
    } catch {
      await page.waitForSelector('[role="heading"]', { timeout: 10000 })
    }

    await delay(2000)

    const flightCards = page.locator('[role="listitem"]').filter({ has: page.locator('[role="heading"]') })

    const count = await flightCards.count()
    console.log(`Found ${count} flight cards`)

    for (let i = 0; i < Math.min(count, 15); i++) {
      try {
        const card = flightCards.nth(i)
        const ariaLabel = await card.getAttribute('aria-label').catch(() => null)

        const heading = card.locator('[role="heading"]').first()
        const priceText = await heading.textContent().catch(() => null)

        const timeElements = card.locator('[role="text"]').filter({ hasText: /^\d{1,2}:\d{2}/ })
        const times = await timeElements.allTextContents().catch(() => [] as string[])

        let departureTime = times[0]?.trim() ?? ''
        let arrivalTime = times[1]?.trim() ?? ''

        const airlineEl = card.locator('.Irl7Wc, .sSHqwe, span:has-text("Airline"), [data-airline]').first()
        let airline = await airlineEl.textContent().catch(() => null)
        if (!airline && ariaLabel) {
          const match = ariaLabel.match(/^(Volo|Flight)\s+(?:con|with)?\s*([A-Za-z\s]+?)\s+(?:da|from)/)
          if (match) airline = match[2].trim()
        }
        if (!airline) airline = 'Sconosciuto'

        const durationEl = card.locator('.gvkrdb, .AdWm1c, span:has-text("h")').first()
        let duration = await durationEl.textContent().catch(() => null)
        if (!duration) duration = ''

        let stops = 0
        if (ariaLabel && ariaLabel.toLowerCase().includes('scalo')) stops = 1
        if (ariaLabel && ariaLabel.toLowerCase().includes('2 scali')) stops = 2

        let price = 0
        let currency = 'EUR'
        if (priceText) {
          const pMatch = priceText.replace(/\./g, '').match(/(\d{1,6}(?:[\s,]\d{3})*(?:[,]\d{2})?)\s*(€|EUR|EUR\s)/)
          if (pMatch) {
            price = parseFloat(pMatch[1].replace(',', '.'))
            currency = 'EUR'
          }
        }

        if (price > 0) {
          flights.push({
            airline: airline.trim(),
            departureTime,
            arrivalTime,
            duration,
            stops,
            price,
            currency,
            date: todayStr
          })
        }
      } catch (e) {
        console.warn(`Error parsing card ${i}:`, e)
      }
    }

    if (flights.length === 0) {
      console.log('No flights found via listitem, trying fallback...')
      const body = await page.textContent('body').catch(() => '') ?? ''
      const priceMatches = body.matchAll(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€/g)
      let fallbackFlights = 0
      for (const match of priceMatches) {
        if (fallbackFlights >= 10) break
        const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
        if (val > 10 && val < 500) {
          flights.push({
            airline: 'Sconosciuto',
            departureTime: '',
            arrivalTime: '',
            duration: '',
            stops: 0,
            price: val,
            currency: 'EUR',
            date: todayStr
          })
          fallbackFlights++
        }
      }
    }
  } catch (e) {
    console.error('Scraping error:', e)
  } finally {
    await browser.close()
  }

  return flights
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
