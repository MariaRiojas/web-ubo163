"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { LegajosData, LegajoEntry } from '@/lib/areas/get-legajos-data'

const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo',
  reserva: 'Reserva',
  licencia: 'Licencia',
  aspirante_en_curso: 'Aspirante',
  postulante: 'Postulante',
  retirado: 'Retirado',
}

const GRADE_LABELS: Record<string, string> = {
  postulante: 'Postulante',
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brig. Mayor',
  brigadier_general: 'Brig. General',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'aspirante_en_curso', label: 'Aspirantes' },
  { value: 'postulante', label: 'Postulantes' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'retirado', label: 'Retirados' },
]

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellido = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellido}`
}

function getInitials(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length >= 2) {
    const ap = parts[0].trim().split(/\s+/)[0]?.[0] ?? ''
    const nm = parts[1].trim().split(/\s+/)[0]?.[0] ?? ''
    return `${nm}${ap}`.toUpperCase()
  }
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatJoinDate(d: string | null): string {
  if (!d) return '—'
  const [year, month] = d.split('-')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const m = parseInt(month, 10) - 1
  return `${meses[m] ?? '?'} ${year}`
}

export function LegajosClient({ data }: { data: LegajosData }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = data.entries.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return e.fullName.toLowerCase().includes(q)
        || (e.codigoCgbvp ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const activeCount = data.stats.byStatus['activo'] ?? 0
  const reservaCount = data.stats.byStatus['reserva'] ?? 0
  const aspiranteCount = (data.stats.byStatus['aspirante_en_curso'] ?? 0)
    + (data.stats.byStatus['postulante'] ?? 0)

  return (
    <>
      {/* KPIs */}
      <div className="area-kpi-row" style={{ marginBottom: 20 }}>
        <div className="area-kpi">
          <div className="area-kpi-label">TOTAL EFECTIVOS</div>
          <div className="area-kpi-value mono">{data.stats.total}</div>
          <div className="area-kpi-sub">en nómina</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">ACTIVOS</div>
          <div className="area-kpi-value mono">{activeCount}</div>
          <div className="area-kpi-sub">en actividad</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">RESERVA</div>
          <div className="area-kpi-value mono">{reservaCount}</div>
          <div className="area-kpi-sub">en reserva</div>
        </div>
        {aspiranteCount > 0 && (
          <div className="area-kpi">
            <div className="area-kpi-label">EN FORMACIÓN</div>
            <div className="area-kpi-value mono">{aspiranteCount}</div>
            <div className="area-kpi-sub">aspirantes y postulantes</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <nav className="area-inbox-tabs" style={{ flexWrap: 'wrap' }}>
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={cn('area-inbox-tab', statusFilter === opt.value && 'area-inbox-tab--active')}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                ({opt.value === 'all'
                  ? data.entries.length
                  : (data.stats.byStatus[opt.value] ?? 0)})
              </span>
            </button>
          ))}
        </nav>

        <input
          type="search"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '6px 12px',
            background: 'var(--ink-elevated)',
            border: '1px solid var(--ink-line)',
            color: 'var(--bone)',
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            borderRadius: 4,
            marginLeft: 'auto',
            minWidth: 220,
          }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="guardia-empty">No hay efectivos que coincidan con el filtro.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="area-inventory-table">
            <thead>
              <tr>
                <th>EFECTIVO</th>
                <th>GRADO</th>
                <th>SITUACIÓN</th>
                <th>CÓDIGO</th>
                <th>INGRESO</th>
                <th>CONTACTO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <LegajoRow key={entry.profileId} entry={entry} />
              ))}
            </tbody>
          </table>
          {filtered.length < data.entries.length && (
            <div style={{
              padding: 12, textAlign: 'center',
              fontSize: 11, color: 'var(--graphite)',
              fontFamily: 'var(--font-mono)',
            }}>
              Mostrando {filtered.length} de {data.entries.length} efectivos
            </div>
          )}
        </div>
      )}
    </>
  )
}

function LegajoRow({ entry }: { entry: LegajoEntry }) {
  const initials = getInitials(entry.fullName)
  const statusColor: Record<string, string> = {
    activo: 'var(--emerald-glow)',
    reserva: 'var(--brass)',
    licencia: 'var(--flame)',
    aspirante_en_curso: 'var(--steel)',
    postulante: 'var(--graphite)',
    retirado: 'var(--graphite)',
  }

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 2,
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid var(--red-deep)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--red-glow)', flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--bone)', fontSize: 13 }}>
              {shortName(entry.fullName)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--graphite)', marginTop: 1 }}>
              {entry.fullName}
            </div>
          </div>
        </div>
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>
        {GRADE_LABELS[entry.grade] ?? entry.grade}
      </td>
      <td>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: statusColor[entry.status] ?? 'var(--steel)',
            fontWeight: 600,
          }}
        >
          {STATUS_LABELS[entry.status] ?? entry.status}
        </span>
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass)', fontSize: 12 }}>
        {entry.codigoCgbvp ?? '—'}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>
        {formatJoinDate(entry.joinDate)}
      </td>
      <td style={{ fontSize: 11, color: 'var(--steel)' }}>
        {entry.phone && (
          <div>{entry.phone}</div>
        )}
        {entry.email && (
          <div style={{ fontSize: 10, color: 'var(--graphite)' }}>{entry.email}</div>
        )}
        {!entry.phone && !entry.email && '—'}
      </td>
    </tr>
  )
}
