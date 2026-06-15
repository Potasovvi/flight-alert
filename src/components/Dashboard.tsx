import { usePrices } from '../hooks/usePrices.js'
import { DealCard } from './DealCard.js'
import { PriceChart } from './PriceChart.js'
import { DateSearchForm } from './DateSearchForm.js'
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

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '10px 12px',
      textAlign: 'left',
      fontWeight: 600,
      color: '#64748b',
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      ...style
    }}>
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: '10px 12px',
      color: '#334155',
      ...style
    }}>
      {children}
    </td>
  )
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

      <DateSearchForm />

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
          🌤️ Miglior fascia oraria
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '-8px 0 16px' }}>
          Date fisse di default: <strong>20 dicembre 2026</strong> (andata) → <strong>6 gennaio 2027</strong> (ritorno)
        </p>
        {(() => {
          const sorted = [...data.snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          const latest = sorted[0]
          if (!latest) return null

          const slots = [
            { id: 'mattina', label: '🌅 Mattina (6-12)', min: 6, max: 12 },
            { id: 'pomeriggio', label: '☀️ Pomeriggio (12-18)', min: 12, max: 18 },
            { id: 'sera', label: '🌙 Sera (18-24)', min: 18, max: 24 },
          ] as const

          function getHour(time: string): number {
            const h = parseInt(time.split(':')[0], 10)
            return isNaN(h) ? -1 : h
          }

          function bestPerSlot(flights: Flight[]) {
            return slots.map(slot => {
              const inSlot = flights.filter(f => {
                const h = getHour(f.departureTime)
                return h >= slot.min && h < slot.max
              })
              const best = inSlot.length > 0 ? inSlot.reduce((a, b) => a.price < b.price ? a : b) : null
              return { slot, best }
            })
          }

          function cheapestSlot(items: { best: Flight | null }[]): number {
            let min = Infinity
            for (const item of items) {
              if (item.best && item.best.price < min) min = item.best.price
            }
            return min
          }

          const outbound = [...latest.flights].filter(f => f.route === 'TRN→CTA')
          const ret = [...latest.flights].filter(f => f.route === 'CTA→TRN')
          const outboundSlots = bestPerSlot(outbound)
          const returnSlots = bestPerSlot(ret)
          const cheapestOut = cheapestSlot(outboundSlots)
          const cheapestRet = cheapestSlot(returnSlots)

          function SlotRow({ item, cheapest }: { item: { slot: { label: string }; best: Flight | null }; cheapest: number }) {
            const isCheapest = item.best && item.best.price === cheapest
            return (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: 4,
                borderRadius: 6,
                background: isCheapest ? '#f0fdf4' : 'transparent',
                border: isCheapest ? '1px solid #bbf7d0' : '1px solid transparent'
              }}>
                <span style={{ fontSize: 14, color: '#334155' }}>{item.slot.label}</span>
                {item.best ? (
                  <span style={{ fontSize: 14, fontWeight: isCheapest ? 700 : 500, color: isCheapest ? '#16a34a' : '#334155' }}>
                    {item.best.airline} €{item.best.price} ({item.best.departureTime})
                    {isCheapest && <span style={{ marginLeft: 8, fontSize: 11, background: '#16a34a', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>PIÙ ECONOMICO</span>}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>—</span>
                )}
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: '#2563eb' }}>
                  ✈️ Andata — Torino → Catania
                </h3>
                {outboundSlots.map(item => <SlotRow key={item.slot.id} item={item} cheapest={cheapestOut} />)}
              </div>
              <div style={{ flex: '1 1 280px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: '#7c3aed' }}>
                  🔄 Ritorno — Catania → Torino
                </h3>
                {returnSlots.map(item => <SlotRow key={item.slot.id} item={item} cheapest={cheapestRet} />)}
              </div>
            </div>
          )
        })()}
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, marginBottom: 0 }}>
          Basato sull'ultimo rilevamento. I prezzi vengono aggiornati 3 volte al giorno (6:00, 15:00, 21:00).
        </p>
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
        {(() => {
          const sorted = [...data.snapshots].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          const latest = sorted[0]
          if (!latest) return null

          const outbound = [...latest.flights]
            .filter(f => f.route === 'TRN→CTA')
            .sort((a, b) => a.price - b.price)
          const ret = [...latest.flights]
            .filter(f => f.route === 'CTA→TRN')
            .sort((a, b) => a.price - b.price)

          function FlightTable({ title, flights, color }: { title: string; flights: Flight[]; color: string }) {
            return (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color }}>{title}</h3>
                {flights.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Nessun volo disponibile</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'inherit' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <Th>Compagnia</Th>
                          <Th>Data</Th>
                          <Th>Partenza</Th>
                          <Th>Arrivo</Th>
                          <Th style={{ textAlign: 'right' }}>Prezzo</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {flights.map((f, i) => (
                          <tr key={i}
                            onClick={() => window.open(f.url, '_blank', 'noopener')}
                            style={{ cursor: 'pointer', borderBottom: '1px solid #e2e8f0', transition: 'background 0.1s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <Td>{f.airline}</Td>
                            <Td>{f.date || '—'}</Td>
                            <Td>{f.departureTime || '—'}</Td>
                            <Td>{f.arrivalTime || '—'}</Td>
                            <Td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>€{f.price}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          }

          return (
            <>
              <FlightTable title="✈️ Andata — Torino → Catania" flights={outbound} color="#2563eb" />
              <FlightTable title="🔄 Ritorno — Catania → Torino" flights={ret} color="#7c3aed" />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0, marginBottom: 0 }}>
                Clicca su una riga per aprire la ricerca su Google Flights
              </p>
            </>
          )
        })()}
      </section>

      <footer style={{ marginTop: 48, padding: '16px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Flight Alert — Prezzi aggiornati 3 volte al giorno (6:00, 15:00, 21:00)
      </footer>
    </div>
  )
}
