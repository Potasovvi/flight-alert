import { getCheapestPerRoute, getPriceChange } from '../utils/priceTrend.js'
import type { Flight } from '../types.js'

interface PriceHeroProps {
  flights: Flight[]
  previousFlights: Flight[]
}

function HeroCard({ flight, previousFlights }: { flight: Flight; previousFlights: Flight[] }) {
  const { diff, previousPrice } = getPriceChange(flight, previousFlights)

  const isDrop = previousPrice !== null && diff < 0
  const isRise = previousPrice !== null && diff > 0

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 20,
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 220,
      cursor: 'pointer'
    }}
      onClick={() => window.open(flight.url, '_blank', 'noopener')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 16 }}>{flight.airline}</strong>
        <span style={{
          background: '#f0fdf4',
          color: '#166534',
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          💰 Miglior prezzo
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#64748b' }}>
        {flight.departureTime} → {flight.arrivalTime}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
          €{flight.price}
        </span>
        {isDrop && (
          <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
            ↓ -€{Math.abs(diff)}
          </span>
        )}
        {isRise && (
          <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            ↑ +€{diff}
          </span>
        )}
        {previousPrice === null && (
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
            —
          </span>
        )}
      </div>
      {previousPrice !== null && (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Era €{previousPrice} allo scan precedente
        </div>
      )}
    </div>
  )
}

export function PriceHero({ flights, previousFlights }: PriceHeroProps) {
  const outbound = getCheapestPerRoute(flights, 'TRN→CTA')
  const ret = getCheapestPerRoute(flights, 'CTA→TRN')

  if (!outbound && !ret) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {outbound && (
          <div style={{ flex: '1 1 280px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 0', color: '#2563eb' }}>
              ✈️ Andata — Torino → Catania
            </h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px' }}>
              Il volo più economico oggi
            </p>
            <HeroCard flight={outbound} previousFlights={previousFlights} />
          </div>
        )}
        {ret && (
          <div style={{ flex: '1 1 280px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 0', color: '#7c3aed' }}>
              🔄 Ritorno — Catania → Torino
            </h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px' }}>
              Il volo più economico oggi
            </p>
            <HeroCard flight={ret} previousFlights={previousFlights} />
          </div>
        )}
      </div>
    </section>
  )
}
