import type { Flight, PriceSnapshot } from '../types.js'

export function getLatestSnapshot(snapshots: PriceSnapshot[]): PriceSnapshot | null {
  const sorted = [...snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return sorted[0] ?? null
}

export function getPreviousSnapshot(snapshots: PriceSnapshot[]): PriceSnapshot | null {
  const sorted = [...snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return sorted[1] ?? null
}

export function getCheapestPerRoute(flights: Flight[], route: string): Flight | null {
  const routeFlights = flights.filter(f => f.route === route)
  if (routeFlights.length === 0) return null
  return routeFlights.reduce((a, b) => a.price < b.price ? a : b)
}

export function getPriceChange(
  flight: Flight,
  previousFlights: Flight[]
): { diff: number; previousPrice: number | null } {
  const match = previousFlights.find(
    f => f.airline === flight.airline && f.route === flight.route && f.date === flight.date
  )
  if (!match) return { diff: 0, previousPrice: null }
  return {
    diff: flight.price - match.price,
    previousPrice: match.price
  }
}

export function getPriceChangeForRoute(
  latestFlights: Flight[],
  previousFlights: Flight[],
  route: string
): { diff: number; previousPrice: number | null } {
  const best = getCheapestPerRoute(latestFlights, route)
  if (!best) return { diff: 0, previousPrice: null }
  return getPriceChange(best, previousFlights)
}
