import { useState } from 'react'

export function DateSearchForm() {
  const [departure, setDeparture] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!departure) return
    setLoading(true)
    setMsg(null)

    const params = new URLSearchParams({ departure_date: departure })
    if (returnDate) params.set('return_date', returnDate)

    try {
      const res = await fetch(`/api/trigger-scrape?${params}`)
      const data = await res.json()
      if (data.success) {
        setMsg({ type: 'success', text: data.message })
      } else {
        setMsg({ type: 'error', text: data.error || 'Errore sconosciuto' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Errore di connessione' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <details style={{ marginTop: 48 }}>
      <summary style={{ fontSize: 14, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
        🔍 Cerca voli per altre date
      </summary>
      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
          Vuoi cercare i prezzi della tratta TO→CT per date personalizzate?
          Inserisci qui e ricevi il messaggio su Telegram!
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Andata *</label>
            <input type="date" value={departure} onChange={e => setDeparture(e.target.value)} required
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Ritorno</label>
            <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '8px 20px', background: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Avvio...' : 'Cerca voli'}
          </button>
        </form>
        {msg && (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: msg.type === 'success' ? '#16a34a' : '#dc2626' }}>
            {msg.text}
          </p>
        )}
      </div>
    </details>
  )
}
