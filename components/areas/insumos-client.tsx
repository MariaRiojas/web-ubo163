"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { InventoryRow } from '@/lib/areas/get-area-inventory'

interface InsumoStats {
  total: number
  operativo: number
  baja: number
  pendiente: number
}

interface InsumosByCategory {
  category: string
  label: string
  items: InventoryRow[]
}

const CONDITION_LABELS: Record<string, string> = {
  operativo: 'Operativo',
  mantenimiento: 'Mantenimiento',
  baja: 'Baja',
  pendiente_revision: 'Por revisar',
}
const CONDITION_COLORS: Record<string, string> = {
  operativo: 'var(--emerald-glow)',
  mantenimiento: 'var(--flame)',
  baja: 'var(--red-glow)',
  pendiente_revision: 'var(--brass)',
}

export function InsumosClient({
  items,
  title,
  categoryGroups,
  areaSlug,
}: {
  items: InventoryRow[]
  title: string
  categoryGroups: { value: string; label: string }[]
  areaSlug: string
}) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.category !== filter) return false
    if (search) return i.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const stats: InsumoStats = {
    total: items.length,
    operativo: items.filter(i => i.condition === 'operativo').length,
    baja: items.filter(i => i.condition === 'baja').length,
    pendiente: items.filter(i => i.condition === 'pendiente_revision').length,
  }

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringSoon = items.filter(i => {
    if (!i.expirationDate) return false
    const exp = new Date(i.expirationDate)
    return exp >= now && exp <= thirtyDays
  }).length
  const expired = items.filter(i => {
    if (!i.expirationDate) return false
    return new Date(i.expirationDate) < now
  }).length

  return (
    <>
      {/* KPIs */}
      <div className="area-kpi-row" style={{ marginBottom: 20 }}>
        <div className="area-kpi">
          <div className="area-kpi-label">TOTAL ÍTEMS</div>
          <div className="area-kpi-value mono">{stats.total}</div>
          <div className="area-kpi-sub">en stock</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">OPERATIVOS</div>
          <div className="area-kpi-value mono">{stats.operativo}</div>
          <div className="area-kpi-sub">en condición ok</div>
        </div>
        {(expired > 0 || expiringSoon > 0) && (
          <div className={cn('area-kpi', expired > 0 ? 'area-kpi--alert' : 'area-kpi--warn')}>
            <div className="area-kpi-label">VENCIMIENTOS</div>
            <div className="area-kpi-value mono">{expired + expiringSoon}</div>
            <div className="area-kpi-sub">
              {expired > 0 && `${expired} vencido${expired > 1 ? 's' : ''}`}
              {expired > 0 && expiringSoon > 0 && ' · '}
              {expiringSoon > 0 && `${expiringSoon} ≤30d`}
            </div>
          </div>
        )}
        {(stats.baja > 0 || stats.pendiente > 0) && (
          <div className="area-kpi area-kpi--warn">
            <div className="area-kpi-label">CON NOVEDAD</div>
            <div className="area-kpi-value mono">{stats.baja + stats.pendiente}</div>
            <div className="area-kpi-sub">
              {stats.baja > 0 && `${stats.baja} baja`}
              {stats.baja > 0 && stats.pendiente > 0 && ' · '}
              {stats.pendiente > 0 && `${stats.pendiente} por revisar`}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <nav className="area-inbox-tabs" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className={cn('area-inbox-tab', filter === 'all' && 'area-inbox-tab--active')}
            onClick={() => setFilter('all')}
          >
            Todos <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 10 }}>({items.length})</span>
          </button>
          {categoryGroups.map(cg => {
            const count = items.filter(i => i.category === cg.value).length
            if (count === 0) return null
            return (
              <button
                key={cg.value}
                type="button"
                className={cn('area-inbox-tab', filter === cg.value && 'area-inbox-tab--active')}
                onClick={() => setFilter(cg.value)}
              >
                {cg.label} <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 10 }}>({count})</span>
              </button>
            )
          })}
        </nav>
        <input
          type="search"
          placeholder="Buscar ítem…"
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
            minWidth: 200,
          }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="guardia-empty">No hay ítems que coincidan.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="area-inventory-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>CATEGORÍA</th>
                <th>CÓDIGO</th>
                <th>UBICACIÓN</th>
                <th>CANT.</th>
                <th>VENCIMIENTO</th>
                <th>CONDICIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const expDate = item.expirationDate ? new Date(item.expirationDate) : null
                const isExpired = expDate ? expDate < now : false
                const isSoon = expDate ? (expDate >= now && expDate <= thirtyDays) : false
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--bone)' }}>
                      {item.name}
                      {item.brand && (
                        <div style={{ fontSize: 10, color: 'var(--graphite)', marginTop: 2 }}>
                          {[item.brand, item.model].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.subcategory ?? item.category}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>
                      {item.codigoCbp ?? '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--steel)' }}>
                      {item.almacenReferencia ?? item.ubicacionInterna ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>
                      {item.quantity}
                      {item.unitMeasure && item.unitMeasure !== 'unidad' && (
                        <span style={{ fontSize: 10, color: 'var(--graphite)', marginLeft: 4 }}>
                          {item.unitMeasure}
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {expDate ? (
                        <span style={{
                          color: isExpired ? 'var(--red-glow)' : isSoon ? 'var(--flame)' : 'var(--steel)',
                          fontWeight: isExpired || isSoon ? 600 : 400,
                        }}>
                          {formatDate(expDate)}
                          {isExpired && ' · VENCIDO'}
                          {isSoon && ' · PRÓX.'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: CONDITION_COLORS[item.condition] ?? 'var(--steel)',
                        fontWeight: 600,
                      }}>
                        {CONDITION_LABELS[item.condition] ?? item.condition}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function formatDate(d: Date): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate().toString().padStart(2, '0')}·${meses[d.getMonth()]}·${d.getFullYear()}`
}
