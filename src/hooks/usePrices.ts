import { useState, useEffect } from 'react'
import type { PriceHistory } from '../types.js'

const API_URL = '/api/prices'

export function usePrices() {
  const [data, setData] = useState<PriceHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPrices() {
      try {
        setLoading(true)
        const res = await fetch(API_URL)

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `HTTP ${res.status}`)
        }

        const json: PriceHistory = await res.json()

        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load prices')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPrices()
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
