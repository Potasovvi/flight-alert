import { Deal } from './compare.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID
const DRY_RUN = process.env.DRY_RUN === 'true'

export async function sendTelegramNotification(deals: Deal[]): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification')
    return
  }

  const top3 = deals.slice(0, 3)
  const dateStr = new Date().toLocaleDateString('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const lines = [
    `✈️ *Voli TORINO → CATANIA — ${dateStr}*`,
    '',
    '💰 *Offerte del giorno:*'
  ]

  for (const d of top3) {
    const dropEmoji = d.percentageDrop >= 20 ? '🔥' : d.percentageDrop >= 10 ? '💥' : '↓'
    lines.push(
      `${d.flight.airline} ${d.flight.departureTime}→${d.flight.arrivalTime}`,
      `   €${d.flight.price}  ${dropEmoji} -${d.percentageDrop}% (era €${d.previousPrice})`
    )
  }

  const totalDeals = deals.length
  if (totalDeals > 3) {
    lines.push('', `+${totalDeals - 3} altre tratte in calo`)
  }

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
