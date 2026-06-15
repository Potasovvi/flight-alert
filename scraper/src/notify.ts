import { Flight } from './scraper.js'
import { Deal } from './compare.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID
const DRY_RUN = process.env.DRY_RUN === 'true'

function formatDate(): string {
  return new Date().toLocaleDateString('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatTime(): string {
  return new Date().toLocaleTimeString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function bestByAirline(flights: Flight[]): Flight[] {
  const map = new Map<string, Flight>()
  for (const f of flights) {
    const existing = map.get(f.airline)
    if (!existing || f.price < existing.price) {
      map.set(f.airline, f)
    }
  }
  return [...map.values()].sort((a, b) => a.price - b.price)
}

function routeTable(flights: Flight[], label: string, emoji: string): string[] {
  const best = bestByAirline(flights)
  if (best.length === 0) return [`${emoji} ${label}: nessun volo`]
  const lines: string[] = []
  for (const f of best) {
    const dep = f.departureTime ? ` (${f.departureTime})` : ''
    lines.push(`  • ${f.airline}: €${f.price}${dep}`)
  }
  return [`${emoji} *${label}*`, ...lines]
}

export async function sendTelegramNotification(
  flights: Flight[],
  deals: Deal[]
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification')
    return
  }

  const outbound = flights.filter(f => f.route === 'TRN→CTA')
  const ret = flights.filter(f => f.route === 'CTA→TRN')

  const lines: string[] = [
    `✈️ *Report voli Torino↔Catania*`,
    `📅 ${formatDate()} — ${formatTime()}`,
    ''
  ]

  lines.push(...routeTable(outbound, 'Andata (TRN→CTA)', '🚀'))
  lines.push('')
  lines.push(...routeTable(ret, 'Ritorno (CTA→TRN)', '🔄'))

  if (deals.length > 0) {
    lines.push('', `💰 *Offerte del giorno:*`)
    for (const d of deals) {
      const dropEmoji = d.percentageDrop >= 20 ? '🔥' : d.percentageDrop >= 10 ? '💥' : '↓'
      lines.push(
        `  ${d.flight.route === 'CTA→TRN' ? '(R) ' : ''}${d.flight.airline} ${d.flight.departureTime}→${d.flight.arrivalTime}`,
        `   €${d.flight.price}  ${dropEmoji} -${d.percentageDrop}% (era €${d.previousPrice})`
      )
    }
  } else {
    lines.push('', '📊 Prezzi invariati rispetto al giorno precedente')
  }

  lines.push('', '[🔗 Apri la web app](https://flight-alert-omega.vercel.app/)', '—', 'flight-alert')

  const message = lines.join('\n')

  if (DRY_RUN) {
    console.log('--- DRY RUN — Notification would be sent ---')
    console.log(message)
    return
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API error:', response.status, errorText)
    } else {
      console.log('Telegram notification sent successfully')
    }
  } catch (e) {
    console.error('Failed to send Telegram notification:', e)
  }
}
