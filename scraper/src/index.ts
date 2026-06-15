import { scrapeGoogleFlights, loadPriceHistory, savePriceSnapshot } from './scraper.js'
import { findBestDeals } from './compare.js'
import { sendTelegramNotification } from './notify.js'

async function main() {
  console.log('=== Flight Alert Scraper ===')
  console.log(`Time: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`)

  const flights = await scrapeGoogleFlights()
  console.log(`Scraped ${flights.length} flights`)

  if (flights.length === 0) {
    console.log('No flights found — skipping')
    return
  }

  const history = await loadPriceHistory()
  const deals = findBestDeals(flights, history)

  console.log(`Found ${deals.length} deals (cheaper than yesterday)`)

  if (deals.length >= 3) {
    console.log('3+ cheaper routes found! Sending notification...')
    await sendTelegramNotification(deals)
  } else {
    console.log('Less than 3 cheaper routes — no notification needed')
  }

  await savePriceSnapshot({
    timestamp: new Date().toISOString(),
    flights
  })

  console.log('Done')
}

main().catch(console.error)
