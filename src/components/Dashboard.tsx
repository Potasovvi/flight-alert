import { usePrices } from '../hooks/usePrices.js'
import { DealCard } from './DealCard.js'
import { PriceChart } from './PriceChart.js'
import type { Flight } from '../types.js'

interface Deal {
  flight: Flight
  previousPrice: number
  priceDrop: number
  percentageDrop: number
}

function computeDeals(snapshots: { timestamp: string; flights: Flight[] }[]): Deal[] {
  if (snapshots.length < 2) return []

  const sorted = [...snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const current = sorted[0]
  const previous = sorted[1]

  const prevMap = new Map<string, number>()
  for (const f of previous.flights) {
    const key = `${f.airline}|${f.departureTime}`
    if (!prevMap.has(key) || f.price < prevMap.get(key)!) {
      prevMap.set(key, f.price)
    }
  }

  const deals: Deal[] = []
  for (const flight of current.flights) {
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

function getLatestUpdate(snapshots: { timestamp: string }[]): string {
  if (snapshots.length === 0) return ''
  const sorted = [...snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const ts = new Date(sorted[0].timestamp)
  return ts.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function Dashboard() {
  const { data, loading, error } = usePrices()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#64748b' }}>Caricamento dati...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#dc2626' }}>Errore: {error}</p>
      </div>
    )
  }

  if (!data || data.snapshots.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#64748b' }}>Nessun dato disponibile. Lo scraper non ha ancora raccolto prezzi.</p>
      </div>
    )
  }

  const deals = computeDeals(data.snapshots)
  const topDeals = deals.slice(0, 3)
  const lastUpdate = getLatestUpdate(data.snapshots)

  return (
    <div style={{
      maxWidth: 960,
      margin: '0 auto',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#0f172a' }}>
          ✈️ Flight Alert
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', margin: '4px 0 0' }}>
          Torino → Catania
          {lastUpdate && <span style={{ marginLeft: 12, fontSize: 13, color: '#94a3b8' }}>
            Ultimo aggiornamento: {lastUpdate}
          </span>}
        </p>
      </header>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#0f172a' }}>
          {topDeals.length > 0 ? '💰 Offerte del giorno' : '📊 Panoramica prezzi'}
        </h2>

        {topDeals.length > 0 ? (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {topDeals.map((deal, i) => (
              <DealCard key={i} {...deal} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8' }}>
            {deals.length === 0
              ? 'Nessuna offerta rispetto al giorno precedente.'
              : `Solo ${deals.length} tratte in calo — serve il confronto con almeno 3.`}
          </p>
        )}
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#0f172a' }}>
          📈 Andamento prezzi
        </h2>
        <PriceChart history={data} />
      </section>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#0f172a' }}>
          📋 Ultimi rilevamenti
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            const sorted = [...data.snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            const latest = sorted[0]
            if (!latest) return null
            const flights = [...latest.flights].sort((a, b) => a.price - b.price)
            return flights.map((f, i) => (
              <a key={i}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: i % 2 === 0 ? '#f8fafc' : '#fff',
                  borderRadius: 8,
                  fontSize: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid #e2e8f0',
                  transition: 'box-shadow 0.15s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a', minWidth: 80 }}>{f.airline}</span>
                  <span style={{ color: '#64748b' }}>
                    {f.departureTime || '··'}→{f.arrivalTime || '··'}
                  </span>
                  {f.date && <span style={{ color: '#94a3b8', fontSize: 12 }}>{f.date}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>€{f.price}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>↗</span>
                </div>
              </a>
            ))
          })()}
        </div>
      </section>

      <footer style={{ marginTop: 48, padding: '16px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Flight Alert — Prezzi aggiornati 3 volte al giorno (6:00, 15:00, 21:00)
      </footer>
    </div>
  )
}
