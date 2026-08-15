'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSync(type: string) {
    setSyncing(true)
    setMessage('')
    try {
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraperType: type }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`Sincronización "${type}" iniciada. Los datos se actualizarán en unos minutos.`)
      } else {
        setMessage('Error: ' + (data.error || 'No se pudo iniciar'))
      }
    } catch {
      setMessage('Error de conexión')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: '16px 20px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--graphite)', marginBottom: 12, textTransform: 'uppercase' }}>
        Sincronización manual
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { type: 'bomberos', label: 'Padrón' },
          { type: 'estado-cia', label: 'Estado' },
          { type: 'asistencia-mensual', label: 'Asistencia' },
          { type: 'partes-cia', label: 'Emergencias' },
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleSync(type)}
            disabled={syncing}
            style={{
              height: 30,
              padding: '0 12px',
              background: syncing ? 'var(--ink-surface)' : 'var(--ink-surface)',
              color: 'var(--steel)',
              border: '1px solid var(--ink-line)',
              fontSize: 11,
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: syncing ? 0.5 : 1,
            }}
          >
            <RefreshCw className="w-3 h-3" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)', marginTop: 10 }}>
          {message}
        </p>
      )}
    </div>
  )
}
