'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Emergency {
  emergencyId: string
  parteNumero: string
  fecha: string
  tipo: string
  distrito: string
  vehiculo: string
  alMando: string
  kmRecorridos: number
  createdAt: string
}

const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  incendio: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
  emergencia_medica: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  rescate: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  materiales_peligrosos: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  servicios_especiales: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
}

const TIPO_LABELS: Record<string, string> = {
  incendio: 'Incendio',
  emergencia_medica: 'Emergencia Médica',
  rescate: 'Rescate',
  materiales_peligrosos: 'Mat. Peligrosos',
  servicios_especiales: 'Serv. Especiales',
}

export function EmergenciasClient({ emergencies }: { emergencies: Emergency[] }) {
  const [filterTipo, setFilterTipo] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  // Get unique months from data
  const months = useMemo(() => {
    const set = new Set<string>()
    for (const e of emergencies) {
      if (e.fecha) {
        const parts = e.fecha.split(/[-/]/)
        if (parts.length >= 2) set.add(`${parts[0]}-${parts[1]}`)
      } else if (e.createdAt) {
        set.add(e.createdAt.slice(0, 7))
      }
    }
    return [...set].sort().reverse()
  }, [emergencies])

  const filtered = useMemo(() => {
    return emergencies.filter(e => {
      if (filterTipo && e.tipo !== filterTipo) return false
      if (filterMonth) {
        const eMonth = e.fecha?.slice(0, 7) || e.createdAt?.slice(0, 7) || ''
        if (eMonth !== filterMonth) return false
      }
      return true
    })
  }, [emergencies, filterTipo, filterMonth])

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--ink-line)', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle className="h-6 w-6" style={{ color: 'var(--red-163)' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--bone)' }}>
            Partes de Emergencia
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--ink-deep)', color: 'var(--bone)', border: '1px solid var(--ink-line)', padding: '6px 10px' }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--ink-deep)', color: 'var(--bone)', border: '1px solid var(--ink-line)', padding: '6px 10px' }}
          >
            <option value="">Todos los meses</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div style={{ padding: '40px 24px', background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--graphite)' }}>
            Sin partes de emergencia registrados
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-line)' }}>
                {['#', 'Fecha', 'Tipo', 'Distrito', 'Vehículo', 'Al Mando', 'Km'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, letterSpacing: '0.1em', color: 'var(--graphite)', textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const tc = TIPO_COLORS[e.tipo] ?? { bg: 'rgba(107,114,128,0.12)', color: 'var(--graphite)' }
                return (
                  <tr key={e.emergencyId} style={{ borderBottom: '1px solid var(--ink-line)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--steel)' }}>{e.parteNumero}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--bone)' }}>{e.fecha}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', fontWeight: 700, padding: '2px 8px', background: tc.bg, color: tc.color }}>
                        {TIPO_LABELS[e.tipo] ?? e.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--bone)' }}>{e.distrito}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--steel)' }}>{e.vehiculo}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--bone)' }}>{e.alMando}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--bone)' }}>{e.kmRecorridos}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textAlign: 'right' }}>
        {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
