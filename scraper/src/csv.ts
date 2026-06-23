import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { PriceSnapshot } from './scraper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_FILE = path.resolve(__dirname, '../../data/prices.csv')

function escapeCsv(val: string | number): string {
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function bestFlight(flights: PriceSnapshot['flights'], route: string) {
  const filtered = flights.filter(f => f.route === route)
  if (filtered.length === 0) return null
  return filtered.reduce((a, b) => a.price < b.price ? a : b)
}

export async function appendToCsv(snapshot: PriceSnapshot): Promise<void> {
  const outbound = bestFlight(snapshot.flights, 'TRN→CTA')
  const ret = bestFlight(snapshot.flights, 'CTA→TRN')

  if (!outbound && !ret) return

  const header = 'scrape_timestamp,andata_tratta,andata_data,andata_compagnia,andata_orario,andata_prezzo,ritorno_tratta,ritorno_data,ritorno_compagnia,ritorno_orario,ritorno_prezzo\n'

  const ts = snapshot.timestamp
  const andata = outbound
    ? `${escapeCsv('TRN→CTA')},${escapeCsv(outbound.date)},${escapeCsv(outbound.airline)},${escapeCsv(`${outbound.departureTime}→${outbound.arrivalTime}`)},${outbound.price}`
    : ',,,,'
  const ritorno = ret
    ? `${escapeCsv('CTA→TRN')},${escapeCsv(ret.date)},${escapeCsv(ret.airline)},${escapeCsv(`${ret.departureTime}→${ret.arrivalTime}`)},${ret.price}`
    : ',,,,'

  const row = `${ts},${andata},${ritorno}\n`

  let exists = true
  try {
    await fs.access(CSV_FILE)
  } catch {
    exists = false
  }

  if (!exists) {
    await fs.writeFile(CSV_FILE, header + row, 'utf-8')
  } else {
    await fs.appendFile(CSV_FILE, row, 'utf-8')
  }

  console.log(`CSV row appended (outbound: ${outbound?.airline ?? 'none'}, return: ${ret?.airline ?? 'none'})`)
}
