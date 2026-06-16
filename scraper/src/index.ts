import { scrapeGoogleFlights, savePriceSnapshot } from './scraper.js'
import { sendDailySummary } from './notify.js'

function isEveningInRome(): boolean {
  const hour = new Date().toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    hour12: false
  })
  return hour === '22'
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
    flights
  })

  if (sendTelegram) {
    console.log('Send to Telegram requested — sending notification')
    await sendDailySummary(flights, departureDate, returnDate, true)
  } else if (isEveningInRome()) {
    console.log('Evening run — sending daily summary')
    await sendDailySummary(flights, departureDate, returnDate, false)
  } else {
    console.log('Skipping notification (not 22:00 Rome time)')
  }

  console.log('Done')
}

main().catch(console.error)
