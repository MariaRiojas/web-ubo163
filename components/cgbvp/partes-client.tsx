'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, MapPin, Clock, ExternalLink } from 'lucide-react'

interface Emergency {
  emergencyId: string
  parteNumero: string
  fecha: string
  horaDespacho: string
  horaPartida: string
  horaLlegada: string
  horaRegreso: string
  tipo: string
  descripcion: string
  distrito: string
  direccion: string
  vehiculo: string
  vehiculoCodigo: string
  alMando: string
  tripulacion: string[]
  estado: string
  createdAt: string
}

const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  incendio: { bg: 'rgba(220,38,38,0.12)', color: '#f87171' },
  emergencia_medica: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  rescate: { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
  materiales_peligrosos: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  servicios_especiales: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
}

const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  emergencia: { bg: 'rgba(220,38,38,0.12)', color: '#f87171' },
  cerrado: { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
  cancelada: { bg: 'rgba(107,114,128,0.12)', color: '#8a8a8a' },
}

function timeDiffMin(from: string, to: string): number | null {
  if (!from || !to) return null
  const [h1, m1] = from.split(':').map(Number)
  const [h2, m2] = to.split(':').map(Number)
  if (isNaN(h1) || isNaN(h2)) return null
  return (h2 * 60 + m2) - (h1 * 60 + m1)
}

function fmtMin(min: number | null): string {
  if (min === null) return '—'
  if (min < 0) return '—'
  return `${min} min`
}

export function PartesClient({ emergencies }: { emergencies: Emergency[] }) {
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterDistrito, setFilterDistrito] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const tipos = useMemo(() => [...new Set(emergencies.map(e => e.tipo).filter(Boolean))], [emergencies])
  const distritos = useMemo(() => [...new Set(emergencies.map(e => e.distrito).filter(Boolean))].sort(), [emergencies])

  const filtered = useMemo(() => {
    return emergencies.filter(e => {
      if (filterTipo && e.tipo !== filterTipo) return false
      if (filterEstado && e.estado !== filterEstado) return false
      if (filterDistrito && e.distrito !== filterDistrito) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(e.parteNumero?.toLowerCase().includes(q) || e.descripcion?.toLowerCase().includes(q) || e.direccion?.toLowerCase().includes(q) || e.alMando?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [emergencies, search, filterTipo, filterEstado, filterDistrito])

  const toggle = (id: string) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--bone)' }}>
          Partes de Emergencia
        </h1>
        <span style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>{filtered.length} registros</span>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <input
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--ink-deep)', color: 'var(--bone)', border: '1px solid var(--ink-line)', padding: '6px 12px', flex: '1 1 180px', minWidth: 140 }}
        />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={selectStyle}>
          <option value="">Tipo</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={selectStyle}>
          <option value="">Estado</option>
          <option value="emergencia">Emergencia</option>
          <option value="cerrado">Cerrado</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={filterDistrito} onChange={e => setFilterDistrito(e.target.value)} style={selectStyle}>
          <option value="">Distrito</option>
          {distritos.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setFilterTipo(''); setFilterEstado(''); setFilterDistrito('') }} style={{ fontSize: 10, padding: '6px 12px', background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', color: 'var(--steel)', cursor: 'pointer' }}>Limpiar</button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--graphite)' }}>Sin partes de emergencia</p>
        </div>
      ) : (
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-line)' }}>
                <th style={thStyle}></th>
                <th style={thStyle}>N.° Parte</th>
                <th style={thStyle}>Tipo / Estado</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>T. Resp.</th>
                <th style={thStyle}>Duración</th>
                <th style={thStyle}>Al Mando</th>
                <th style={thStyle}>Unidades</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const isExpanded = expanded.has(e.emergencyId)
                const tResp = timeDiffMin(e.horaDespacho, e.horaLlegada)
                const duracion = timeDiffMin(e.horaPartida, e.horaRegreso)
                const tc = TIPO_COLORS[e.tipo] ?? { bg: 'rgba(107,114,128,0.12)', color: '#8a8a8a' }
                const ec = ESTADO_COLORS[e.estado] ?? { bg: 'rgba(107,114,128,0.12)', color: '#8a8a8a' }
                return (
                  <Fragment key={e.emergencyId}>
                    <tr onClick={() => toggle(e.emergencyId)} style={{ borderBottom: '1px solid var(--ink-line)', cursor: 'pointer' }}>
                      <td style={{ ...tdStyle, width: 28 }}>{isExpanded ? <ChevronDown className="h-3 w-3" style={{ color: 'var(--steel)' }} /> : <ChevronRight className="h-3 w-3" style={{ color: 'var(--steel)' }} />}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--bone)' }}>{e.parteNumero}</td>
                      <td style={tdStyle}>
                        <span style={{ ...badgeStyle, background: tc.bg, color: tc.color }}>{e.tipo}</span>
                        <span style={{ ...badgeStyle, background: ec.bg, color: ec.color, marginLeft: 4 }}>{e.estado}</span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--bone)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.descripcion || e.direccion || '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--steel)', whiteSpace: 'nowrap' }}>{e.fecha}</td>
                      <td style={{ ...tdStyle, color: tResp !== null && tResp <= 5 ? '#10b981' : 'var(--bone)' }}>{fmtMin(tResp)}</td>
                      <td style={{ ...tdStyle, color: 'var(--bone)' }}>{fmtMin(duracion)}</td>
                      <td style={{ ...tdStyle, color: 'var(--bone)' }}>{e.alMando || '—'}</td>
                      <td style={tdStyle}>
                        {e.vehiculoCodigo && <span style={{ ...badgeStyle, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>{e.vehiculoCodigo}</span>}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#0a0a0a' }}>
                        <td colSpan={9} style={{ padding: '12px 20px' }}>
                          <ExpandedRow e={e} tResp={tResp} duracion={duracion} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ExpandedRow({ e, tResp, duracion }: { e: Emergency; tResp: number | null; duracion: number | null }) {
  const steps = [
    { label: 'Despacho', time: e.horaDespacho, color: '#f59e0b' },
    { label: 'Salida', time: e.horaPartida, color: '#3b82f6' },
    { label: 'Llegada', time: e.horaLlegada, color: '#10b981' },
    { label: 'Retorno', time: e.horaRegreso, color: '#8b5cf6' },
  ]

  const mapsUrl = e.direccion ? `https://www.google.com/maps/search/${encodeURIComponent(e.direccion + ' ' + (e.distrito || ''))}` : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Timeline */}
      <div>
        <p style={{ fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Timeline</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.time ? s.color : '#333', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--bone)', width: 60 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: s.time ? 'var(--bone)' : 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{s.time || '—'}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
          <div><span style={{ fontSize: 9, color: 'var(--graphite)' }}>T. RESPUESTA</span><p style={{ fontSize: 13, fontWeight: 700, color: 'var(--bone)' }}>{fmtMin(tResp)}</p></div>
          <div><span style={{ fontSize: 9, color: 'var(--graphite)' }}>DURACIÓN</span><p style={{ fontSize: 13, fontWeight: 700, color: 'var(--bone)' }}>{fmtMin(duracion)}</p></div>
        </div>
      </div>
      {/* Location & units */}
      <div>
        <p style={{ fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Ubicación y Unidades</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
          <MapPin className="h-3 w-3" style={{ color: 'var(--steel)', marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 11, color: 'var(--bone)' }}>{e.direccion || '—'}</p>
            <p style={{ fontSize: 10, color: 'var(--steel)' }}>{e.distrito}</p>
          </div>
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener" style={{ fontSize: 10, color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginBottom: 10 }}>
            <ExternalLink className="h-3 w-3" /> Google Maps
          </a>
        )}
        {e.vehiculoCodigo && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--graphite)' }}>UNIDADES</span>
            <p style={{ fontSize: 12, color: 'var(--bone)', marginTop: 2 }}>{e.vehiculoCodigo}</p>
          </div>
        )}
        {e.tripulacion?.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--graphite)' }}>TRIPULACIÓN</span>
            <p style={{ fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{e.tripulacion.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { Fragment } from 'react'

const selectStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--ink-deep)', color: 'var(--bone)', border: '1px solid var(--ink-line)', padding: '6px 10px' }
const thStyle: React.CSSProperties = { padding: '10px 8px', textAlign: 'left', fontSize: 9, letterSpacing: '0.08em', color: 'var(--graphite)', textTransform: 'uppercase', fontWeight: 600 }
const tdStyle: React.CSSProperties = { padding: '8px', color: 'var(--bone)' }
const badgeStyle: React.CSSProperties = { fontSize: 9, padding: '2px 6px', fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }
