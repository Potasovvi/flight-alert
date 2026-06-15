export interface Flight {
  airline: string
  departureTime: string
  arrivalTime: string
  duration: string
  stops: number
  price: number
  currency: string
  date: string
}

export interface PriceSnapshot {
  timestamp: string
  flights: Flight[]
}

export interface PriceHistory {
  snapshots: PriceSnapshot[]
}
