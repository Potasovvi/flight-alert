import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { scrapeGoogleFlights, savePriceSnapshot } from './scraper.js'
import { sendDailySummary } from './notify.js'
import { appendToCsv } from './csv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LAST_NOTIFIED_FILE = path.resolve(__dirname, '../../data/.last-notification')

async function hasNotifiedToday(): Promise<boolean> {
  try {
    const lastDate = await fs.readFile(LAST_NOTIFIED_FILE, 'utf-8')
    const today = new Date().toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
    return lastDate.trim() === today
  } catch {
    return false
  }
}

async function markNotifiedToday(): Promise<void> {
  const today = new Date().toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
  await fs.writeFile(LAST_NOTIFIED_FILE, today, 'utf-8')
}

function isEveningInRome(): boolean {
  const romeHour = new Date().toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: 'numeric',
    hour12: false,
  })
  const hour = parseInt(romeHour, 10)
  const match = hour >= 18 && hour <= 23
  console.log(`isEveningInRome: romeHour=${romeHour}, hour=${hour}, match=${match}`)
  return match
}

async function main() {
  console.log('=== Flight Alert Scraper ===')
  console.log(`Time: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`)

  const FIXED_DEPARTURE = '2026-12-20'
  const FIXED_RETURN = '2027-01-06'

  const sendTelegram = process.env.SEND_TELEGRAM === 'true'

  const departureDate = process.env.DEPARTURE_DATE || FIXED_DEPARTURE
  const returnDate = process.env.RETURN_DATE || FIXED_RETURN

  if (departureDate && !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    console.error(`Invalid DEPARTURE_DATE format: ${departureDate} (expected YYYY-MM-DD)`)
    process.exit(1)
  }
  if (returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
    console.error(`Invalid RETURN_DATE format: ${returnDate} (expected YYYY-MM-DD)`)
    process.exit(1)
  }
  if (departureDate && returnDate && returnDate <= departureDate) {
    console.error('RETURN_DATE must be after DEPARTURE_DATE')
    process.exit(1)
  }

  const isDefault = departureDate === FIXED_DEPARTURE && returnDate === FIXED_RETURN
  console.log(`Search: ${departureDate} → ${returnDate} (round trip)${isDefault ? ' [date fisse di default 20/12 → 6/1]' : ''}`)

  const flights = await scrapeGoogleFlights(departureDate, returnDate)
  console.log(`Scraped ${flights.length} flights`)

  if (flights.length === 0) {
    console.log('No flights found — skipping')
    return
  }

  await savePriceSnapshot({
    timestamp: new Date().toISOString(),
    flights,
    source: isDefault ? 'scheduled' : 'manual'
  })

  await appendToCsv({
    timestamp: new Date().toISOString(),
    flights
  })

  const eveningInRome = isEveningInRome()

  if (sendTelegram) {
    console.log('Send to Telegram requested — sending notification')
    await sendDailySummary(flights, departureDate, returnDate, true)
    await markNotifiedToday()
  } else if (eveningInRome && await hasNotifiedToday()) {
    console.log('Already notified today — skipping')
  } else if (eveningInRome) {
    console.log('Evening run — sending daily summary')
    await sendDailySummary(flights, departureDate, returnDate, false)
    await markNotifiedToday()
  } else {
    console.log('Skipping notification (not evening in Rome)')
  }

  console.log('Done')
}

main().catch(console.error)
