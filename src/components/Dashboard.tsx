import { usePrices } from '../hooks/usePrices.js'

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

function SlimTd({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: '6px 8px',
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

  const scheduledSnapshots = data.snapshots.filter(s => s.source === 'scheduled')
  const manualSnapshots = data.snapshots.filter(s => s.source === 'manual')

  const lastUpdate = getLatestUpdate(scheduledSnapshots)
  const latestScheduled = getLatestSnapshot(scheduledSnapshots, 'scheduled')
  const previousScheduled = getPreviousSnapshot(scheduledSnapshots, 'scheduled')
  const latestManual = getLatestSnapshot(manualSnapshots, 'manual')

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

      {latestScheduled && (
        <PriceHero
          flights={latestScheduled.flights}
          previousFlights={previousScheduled?.flights ?? []}
        />
      )}

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#0f172a' }}>
          📋 Prezzi predefiniti (20/12 → 6/1)
        </h2>
        {(() => {
          if (!latestScheduled) return null

          const outbound = [...latestScheduled.flights]
            .filter(f => f.route === 'TRN→CTA')
            .sort((a, b) => a.price - b.price)
          const ret = [...latestScheduled.flights]
            .filter(f => f.route === 'CTA→TRN')
            .sort((a, b) => a.price - b.price)
          const prev = previousScheduled?.flights ?? []

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
                          <Th style={{ textAlign: 'center' }}>Trend</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {flights.map((f, i) => {
                          const { diff } = getPriceChange(f, prev)
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
              <FlightTable title="✈️ Andata — Torino → Catania" flights={outbound} color="#2563eb" />
              <FlightTable title="🔄 Ritorno — Catania → Torino" flights={ret} color="#7c3aed" />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0, marginBottom: 0 }}>
                Clicca su una riga per aprire la ricerca su Google Flights
              </p>
            </>
          )
        })()}
      </section>

      {latestManual && (() => {
        const manualOutbound = [...latestManual.flights]
          .filter(f => f.route === 'TRN→CTA')
          .sort((a, b) => a.price - b.price)
        const manualRet = [...latestManual.flights]
          .filter(f => f.route === 'CTA→TRN')
          .sort((a, b) => a.price - b.price)
        const manualDate = manualOutbound[0]?.date || ''
        const manualReturnDate = manualRet[0]?.date || ''

        return (
          <section style={{
            marginTop: 40,
            padding: 20,
            border: '1px solid #dbeafe',
            borderRadius: 8,
            background: '#f8faff'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: '#1e40af' }}>
              🔍 La tua ricerca personalizzata
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              {manualDate}{manualReturnDate ? ` → ${manualReturnDate}` : ''} — {latestManual.flights.length} voli trovati
            </p>
            {manualOutbound.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: '#2563eb' }}>
                  ✈️ Andata — Torino → Catania
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <Th style={{ padding: '6px 8px', fontSize: 12 }}>Compagnia</Th>
                      <Th style={{ padding: '6px 8px', fontSize: 12 }}>Partenza</Th>
                      <Th style={{ padding: '6px 8px', fontSize: 12 }}>Arrivo</Th>
                      <Th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 12 }}>Prezzo</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualOutbound.map((f, i) => (
                      <tr key={i}
                        onClick={() => window.open(f.url, '_blank', 'noopener')}
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                        <SlimTd>{f.airline}</SlimTd>
                        <SlimTd>{f.departureTime || '—'}</SlimTd>
                        <SlimTd>{f.arrivalTime || '—'}</SlimTd>
                        <SlimTd style={{ textAlign: 'right', fontWeight: 700 }}>€{f.price}</SlimTd>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {manualRet.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: '#7c3aed' }}>
                  🔄 Ritorno — Catania → Torino
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <Th style={{ padding: '6px 8px', fontSize: 12 }}>Compagnia</Th>
                      <Th style={{ padding: '6px 8px', fontSize: 12 }}>Partenza</Th>
                      <Th style={{ padding: '6px 8px', fontSize: 12 }}>Arrivo</Th>
                      <Th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 12 }}>Prezzo</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualRet.map((f, i) => (
                      <tr key={i}
                        onClick={() => window.open(f.url, '_blank', 'noopener')}
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                        <SlimTd>{f.airline}</SlimTd>
                        <SlimTd>{f.departureTime || '—'}</SlimTd>
                        <SlimTd>{f.arrivalTime || '—'}</SlimTd>
                        <SlimTd style={{ textAlign: 'right', fontWeight: 700 }}>€{f.price}</SlimTd>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={async () => {
              const params = new URLSearchParams({ departure_date: manualDate })
              if (manualReturnDate) params.set('return_date', manualReturnDate)
              params.set('send_telegram', 'true')
              await fetch(`/api/trigger-scrape?${params}`)
            }}
              style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>
              Invia su Telegram 📨
            </button>
          </section>
        )
      })()}

      <DateSearchForm />

      <footer style={{ marginTop: 48, padding: '16px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Flight Alert — Prezzi aggiornati 3 volte al giorno (6:00, 15:00, 21:00)
        {' · '}
        <a href="/api/csv" target="_blank" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Scarica CSV</a>
      </footer>
    </div>
  )
}
