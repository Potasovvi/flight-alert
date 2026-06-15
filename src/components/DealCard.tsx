import type { Flight } from '../types.js'

interface DealCardProps {
  flight: Flight
  previousPrice: number
  priceDrop: number
  percentageDrop: number
}

export function DealCard({ flight, previousPrice, priceDrop, percentageDrop }: DealCardProps) {
  const badge = percentageDrop >= 20 ? '🔥 Offerta' : percentageDrop >= 10 ? '💥 Buon prezzo' : '↓ In calo'

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
      minWidth: 220
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 16 }}>{flight.airline}</strong>
        <span style={{
          background: percentageDrop >= 20 ? '#fef3c7' : '#f0fdf4',
          color: percentageDrop >= 20 ? '#92400e' : '#166534',
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600
        }}>
          {badge}
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#64748b' }}>
        {flight.departureTime} → {flight.arrivalTime}
      </div>

      {flight.duration && (
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Durata: {flight.duration}
          {flight.stops > 0 ? ` · ${flight.stops} scalo${flight.stops > 1 ? 'i' : ''}` : ' · Diretto'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
          €{flight.price}
        </span>
        <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
          -€{priceDrop} (-{percentageDrop}%)
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#94a3b8' }}>
        Era €{previousPrice} ieri
      </div>
    </div>
  )
}
