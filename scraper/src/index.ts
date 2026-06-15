import { scrapeGoogleFlights, loadPriceHistory, savePriceSnapshot } from './scraper.js'
import { findBestDeals } from './compare.js'
import { sendTelegramNotification } from './notify.js'

async function main() {
  console.log('=== Flight Alert Scraper ===')
  console.log(`Time: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`)

  const departureDate = process.env.DEPARTURE_DATE || undefined
  const returnDate = process.env.RETURN_DATE || undefined

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

  if (departureDate && returnDate) {
    console.log(`Search: ${departureDate} → ${returnDate} (round trip)`)
  } else if (departureDate) {
    console.log(`Search: ${departureDate} (one way)`)
  } else {
    console.log('Search: generic (no specific dates)')
  }

  const flights = await scrapeGoogleFlights(departureDate, returnDate)
  console.log(`Scraped ${flights.length} flights`)

  if (flights.length === 0) {
    console.log('No flights found — skipping')
    return
  }

  const history = await loadPriceHistory()
  const deals = findBestDeals(flights, history)

  console.log(`Found ${deals.length} deals (cheaper than yesterday)`)
  await sendTelegramNotification(flights, deals)

  await savePriceSnapshot({
    timestamp: new Date().toISOString(),
    flights
  })

  console.log('Done')
}

main().catch(console.error)
