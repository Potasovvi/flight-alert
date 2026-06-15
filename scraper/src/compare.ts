import { Flight, PriceHistory } from './scraper.js'

export interface Deal {
  flight: Flight
  previousPrice: number
  priceDrop: number
  percentageDrop: number
}

function getDaySnapshots(history: PriceHistory): Map<string, Flight[]> {
  const byDay = new Map<string, Flight[]>()
  for (const snap of history.snapshots) {
    const day = snap.timestamp.split('T')[0]
    if (!byDay.has(day)) {
      byDay.set(day, snap.flights)
    }
  }
  return byDay
}

function topNDeals(current: Flight[], previous: Flight[]): Deal[] {
  const prevMap = new Map<string, number>()
  for (const f of previous) {
    const key = `${f.airline}|${f.departureTime}`
    if (!prevMap.has(key) || f.price < prevMap.get(key)!) {
      prevMap.set(key, f.price)
    }
  }

  const deals: Deal[] = []
  for (const flight of current) {
    const key = `${flight.airline}|${flight.departureTime}`
    const prevPrice = prevMap.get(key)
    if (prevPrice && prevPrice > flight.price) {
      deals.push({
        flight,
        previousPrice: prevPrice,
        priceDrop: prevPrice - flight.price,
        percentageDrop: Math.round(((prevPrice - flight.price) / prevPrice) * 100)
      })
    }
  }

  deals.sort((a, b) => b.percentageDrop - a.percentageDrop)
  return deals
}

export function findBestDeals(current: Flight[], history: PriceHistory): Deal[] {
  const byDay = getDaySnapshots(history)

  const sortedDays = [...byDay.keys()].sort().reverse()
  let previousFlights: Flight[] = []

  for (const day of sortedDays) {
    const dayFlights = byDay.get(day)!
    if (dayFlights.length > 0) {
      const currentDay = current.length > 0 ? current[0].date : ''
      if (day !== currentDay) {
        previousFlights = dayFlights
        break
      }
    }
  }

  if (previousFlights.length === 0) {
    return []
  }

  return topNDeals(current, previousFlights)
}

export function getTopDealsMessage(deals: Deal[]): string {
  if (deals.length === 0) return ''

  const top3 = deals.slice(0, 3)
  const lines = top3.map((d, i) =>
    `${i + 1}. ${d.flight.airline} ${d.flight.departureTime}-${d.flight.arrivalTime} ` +
    `€${d.flight.price} ↓€${d.priceDrop} (-${d.percentageDrop}%)`
  )

  return lines.join('\n')
}
