import { usePrices } from '../hooks/usePrices.js'

import { PriceChart } from './PriceChart.js'
import { PriceHero } from './PriceHero.js'
import { DateSearchForm } from './DateSearchForm.js'
import { getLatestSnapshot, getPreviousSnapshot, getPriceChange } from '../utils/priceTrend.js'
import type { Flight } from '../types.js'

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

  const lastUpdate = getLatestUpdate(data.snapshots)
  const latestSnapshot = getLatestSnapshot(data.snapshots)
  const previousSnapshot = getPreviousSnapshot(data.snapshots)

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

      {latestSnapshot && (
        <PriceHero
          flights={latestSnapshot.flights}
          previousFlights={previousSnapshot?.flights ?? []}
        />
      )}

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#0f172a' }}>
          📈 Andamento prezzi
        </h2>
        <PriceChart history={data} />
      </section>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#0f172a' }}>
          📋 Ultimo rilevamento: {lastUpdate}
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

          function FlightTable({ title, flights, color, previousFlights }: { title: string; flights: Flight[]; color: string; previousFlights: Flight[] }) {
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
                          <Th style={{ textAlign: 'center' }}>Trend</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {flights.map((f, i) => {
                          const { diff } = getPriceChange(f, previousFlights)
                          return (
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
                              <Td style={{ textAlign: 'center' }}>
                                {diff < 0 ? (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>↓ €{Math.abs(diff)}</span>
                                ) : diff > 0 ? (
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>↑ €{diff}</span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </Td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          }

          return (
            <>
              <FlightTable title="✈️ Andata — Torino → Catania" flights={outbound} color="#2563eb" previousFlights={previousSnapshot?.flights ?? []} />
              <FlightTable title="🔄 Ritorno — Catania → Torino" flights={ret} color="#7c3aed" previousFlights={previousSnapshot?.flights ?? []} />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0, marginBottom: 0 }}>
                Clicca su una riga per aprire la ricerca su Google Flights
              </p>
            </>
          )
        })()}
      </section>

      <DateSearchForm />

      <footer style={{ marginTop: 48, padding: '16px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Flight Alert — Prezzi aggiornati 3 volte al giorno (6:00, 15:00, 21:00)
        {' · '}
        <a href="/api/csv" target="_blank" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Scarica CSV</a>
      </footer>
    </div>
  )
}
