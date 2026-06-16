import { Flight } from './scraper.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID
const DRY_RUN = process.env.DRY_RUN === 'true'

function formatDateRange(dep: string, ret: string): string {
  const fmt = (d: string) => new Date(d + 'T00:00:00')
    .toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(dep)} → ${fmt(ret)}`
}

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

function topN(flights: Flight[], n: number): Flight[] {
  return [...flights].sort((a, b) => a.price - b.price).slice(0, n)
}

export async function sendDailySummary(flights: Flight[], departureDate?: string, returnDate?: string, isCustom: boolean = false): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification')
    return
  }

  const outbound = flights.filter(f => f.route === 'TRN→CTA')
  const ret = flights.filter(f => f.route === 'CTA→TRN')

  const title = isCustom ? '✈️ *Ricerca personalizzata — TRN↔CTA*' : '✈️ *Riepilogo giornaliero — TRN↔CTA*'
  const dateRange = departureDate && returnDate ? formatDateRange(departureDate, returnDate) : ''

  const lines: string[] = [
    title,
    `📅 ${formatDate()} — ${formatTime()}`,
    ...(dateRange ? [`📆 ${dateRange}`] : []),
    ''
  ]

  const topOutbound = topN(outbound, 3)
  lines.push(`🚀 *Top 3 Andata (TRN→CTA)*`)
  if (topOutbound.length === 0) {
    lines.push('  Nessun volo trovato')
  } else {
    for (let i = 0; i < topOutbound.length; i++) {
      const f = topOutbound[i]
      const dep = f.departureTime ? ` (${f.departureTime})` : ''
      lines.push(`  ${i + 1}. ${f.airline}: €${f.price}${dep}`)
    }
  }

  lines.push('')

  const topReturn = topN(ret, 3)
  lines.push(`🔄 *Top 3 Ritorno (CTA→TRN)*`)
  if (topReturn.length === 0) {
    lines.push('  Nessun volo trovato')
  } else {
    for (let i = 0; i < topReturn.length; i++) {
      const f = topReturn[i]
      const dep = f.departureTime ? ` (${f.departureTime})` : ''
      lines.push(`  ${i + 1}. ${f.airline}: €${f.price}${dep}`)
    }
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
      console.log('Daily summary sent successfully')
    }
  } catch (e) {
    console.error('Failed to send daily summary:', e)
  }
}
