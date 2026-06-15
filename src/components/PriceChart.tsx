import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { PriceHistory } from '../types.js'

interface ChartDataPoint {
  date: string
  [airline: string]: string | number
}

function getMinPricePerDay(history: PriceHistory): ChartDataPoint[] {
  const byDay = new Map<string, Map<string, number>>()

  for (const snap of history.snapshots) {
    const day = snap.timestamp.split('T')[0]
    if (!byDay.has(day)) byDay.set(day, new Map())

    const dayMap = byDay.get(day)!
    for (const flight of snap.flights) {
      const existing = dayMap.get(flight.airline)
      if (existing === undefined || flight.price < existing) {
        dayMap.set(flight.airline, flight.price)
      }
    }
  }

  const sortedDays = [...byDay.keys()].sort()
  const airlines = new Set<string>()
  for (const day of sortedDays) {
    for (const airline of byDay.get(day)!.keys()) {
      airlines.add(airline)
    }
  }

  return sortedDays.map(day => {
    const point: ChartDataPoint = { date: day.slice(5) }
    const dayMap = byDay.get(day)!
    for (const airline of airlines) {
      point[airline] = dayMap.get(airline) ?? null as unknown as number
    }
    return point
  })
}

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#8b5cf6']

interface PriceChartProps {
  history: PriceHistory
}

export function PriceChart({ history }: PriceChartProps) {
  const data = getMinPricePerDay(history)

  if (data.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
        Non ci sono abbastanza dati per mostrare il grafico
      </div>
    )
  }

  const airlines = new Set<string>()
  for (const snap of history.snapshots) {
    for (const f of snap.flights) airlines.add(f.airline)
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#94a3b8"
            tickFormatter={(v: number) => `€${v}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`€${value}`, name]}
            labelFormatter={(label: string) => `Data: ${label}`}
          />
          <Legend />
          {[...airlines].map((airline, i) => (
            <Line
              key={airline}
              type="monotone"
              dataKey={airline}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              name={airline}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
