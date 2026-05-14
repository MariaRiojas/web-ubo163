'use client'

import { useState, useMemo } from 'react'
import { Users, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Bombero = {
  id: string
  fullName: string
  grade: string
  gradeLabel: string
  codigoCgbvp: string | null
  dni: string | null
  status: string
  avatarUrl: string | null
  enTurno: boolean
  horas: number
  diasAsistidos: number
  guardias: number
  emergencias: number
  alMando: number
}

interface Props {
  bomberos: Bombero[]
  mes: number
  anio: number
  totalActivos: number
  totalEnTurno: number
  totalHoras: number
  totalEmergencias: number
  gradesOptions: string[]
  gradeLabels: Record<string, string>
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function BomberosClient({
  bomberos, mes, anio, totalActivos, totalEnTurno, totalHoras, totalEmergencias,
  gradesOptions, gradeLabels,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mesFilter, setMesFilter] = useState(`${anio}-${String(mes).padStart(2, '0')}`)
  const [gradeFilter, setGradeFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [sortCol, setSortCol] = useState<'horas' | 'emergencias' | 'alMando'>('horas')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const monthLabel = MESES[mes - 1]

  const maxHoras = useMemo(() => Math.max(...bomberos.map(b => b.horas), 1), [bomberos])

  const filtered = useMemo(() => {
    let list = bomberos
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.fullName.toLowerCase().includes(q) ||
        b.codigoCgbvp?.toLowerCase().includes(q) ||
        b.dni?.includes(q)
      )
    }
    if (gradeFilter) list = list.filter(b => b.grade === gradeFilter)
    if (estadoFilter === 'en_turno') list = list.filter(b => b.enTurno)
    if (estadoFilter === 'no_turno') list = list.filter(b => !b.enTurno)

    list = [...list].sort((a, b) => {
      const diff = (a[sortCol] ?? 0) - (b[sortCol] ?? 0)
      return sortDir === 'desc' ? -diff : diff
    })
    return list
  }, [bomberos, search, gradeFilter, estadoFilter, sortCol, sortDir])

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const handleMonthChange = (val: string) => {
    setMesFilter(val)
    router.push(`/bomberos?mes=${val}`)
  }

  const inputStyle: React.CSSProperties = {
    height: 34,
    border: "1px solid var(--ink-line)",
    background: "var(--ink-surface)",
    color: "var(--bone)",
    padding: "0 12px",
    fontSize: 12,
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Users className="h-6 w-6" style={{ color: "var(--red-163)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--bone)", letterSpacing: "-0.015em" }}>Bomberos</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--steel)", marginLeft: 36 }}>Actividad y asistencia — {monthLabel} {anio}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: 'BOMBEROS ACTIVOS', value: totalActivos, sub: 'en la compañía' },
          { label: 'EN TURNO AHORA', value: totalEnTurno, sub: 'estado actual' },
          { label: 'HORAS ACUMULADAS', value: totalHoras, sub: `${monthLabel} ${anio}` },
          { label: 'EMERGENCIAS ATENDIDAS', value: totalEmergencias, sub: 'participaciones totales' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "16px 16px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: "var(--bone)", marginBottom: 4 }}>{kpi.value.toLocaleString()}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "12px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <input type="month" value={mesFilter} onChange={e => handleMonthChange(e.target.value)} style={inputStyle} />
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--graphite)" }} />
          <input
            placeholder="Apellidos, nombres, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: 32 }}
          />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={inputStyle}>
          <option value="">Todos los grados</option>
          {gradesOptions.map(g => <option key={g} value={g}>{gradeLabels[g] ?? g}</option>)}
        </select>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} style={inputStyle}>
          <option value="">Todos</option>
          <option value="en_turno">En turno</option>
          <option value="no_turno">Fuera de turno</option>
        </select>
        <button
          onClick={() => { setSearch(''); setGradeFilter(''); setEstadoFilter('') }}
          style={{ height: 34, padding: "0 14px", background: "var(--red-163)", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
        >
          Limpiar
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--ink-line)" }}>
              {['#', 'Efectivo', 'Estado', `Horas ${sortCol === 'horas' ? (sortDir === 'desc' ? '↓' : '↑') : ''}`, 'Días asist.', 'Guardias', `Emergencias ${sortCol === 'emergencias' ? (sortDir === 'desc' ? '↓' : '↑') : ''}`, `Al mando ${sortCol === 'alMando' ? (sortDir === 'desc' ? '↓' : '↑') : ''}`, ''].map((h, hi) => (
                <th
                  key={hi}
                  onClick={() => hi === 3 ? handleSort('horas') : hi === 6 ? handleSort('emergencias') : hi === 7 ? handleSort('alMando') : undefined}
                  style={{ padding: "10px 14px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)", textTransform: "uppercase", cursor: [3, 6, 7].includes(hi) ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--ink-line-soft)" }}>
                <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--graphite)" }}>{i + 1}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(220,38,38,0.12)", border: "1px solid var(--red-163)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--red-glow)" }}>{initials(b.fullName)}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", lineHeight: 1.3 }}>{b.fullName}</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>{b.gradeLabel} · {b.codigoCgbvp ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {b.enTurno ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", fontWeight: 700, padding: "2px 8px", background: "rgba(16,185,129,0.10)", color: "var(--emerald-glow)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--emerald-glow)" }} /> EN TURNO
                    </span>
                  ) : (
                    <span style={{ color: "var(--graphite)", fontSize: 13 }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                    <div style={{ flex: 1, height: 3, background: "var(--ink-line)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min((b.horas / maxHoras) * 100, 100)}%`, height: "100%", background: "var(--red-163)", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--bone)", minWidth: 32, textAlign: "right" }}>{b.horas}h</span>
                  </div>
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone)" }}>{b.diasAsistidos}</td>
                <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone)" }}>{b.guardias}</td>
                <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone)" }}>{b.emergencias}</td>
                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                  {b.alMando > 0 ? (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--red-glow)" }}>{b.alMando}</span>
                  ) : (
                    <span style={{ color: "var(--graphite)" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <Link href={`/bomberos/${b.id}`} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--brass)", textDecoration: "none", whiteSpace: "nowrap" }}>
                    VER →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "40px 14px", textAlign: "center", color: "var(--graphite)", fontSize: 13 }}>
                  No se encontraron bomberos con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
