'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, X, Package, Download, FileSpreadsheet } from 'lucide-react'
import type { InventoryRow } from '@/lib/areas/get-area-inventory'
import { InventarioImportClient } from './inventario-import-client'

const CATEGORIES = [
  'herramienta', 'equipo', 'accesorio', 'epp', 'vehiculo', 'comunicacion',
  'medico', 'medicamento', 'insumo_medico', 'rescate', 'hazmat', 'insumo', 'mobiliario',
]
const CONDITIONS = ['operativo', 'mantenimiento', 'pendiente_revision', 'baja']
const UNIT_MEASURES = [
  'unidad', 'par', 'kit', 'metro', 'litro', 'kilo',
  'caja', 'ampolla', 'frasco', 'tableta', 'galon', 'balon',
]

const CATEGORY_LABELS: Record<string, string> = {
  herramienta: 'Herramienta', equipo: 'Equipo', accesorio: 'Accesorio',
  epp: 'EPP', vehiculo: 'Vehículo', comunicacion: 'Comunicación',
  medico: 'Médico', medicamento: 'Medicamento', insumo_medico: 'Insumo médico',
  rescate: 'Rescate', hazmat: 'HAZMAT', insumo: 'Insumo', mobiliario: 'Mobiliario',
}
const CONDITION_LABELS: Record<string, string> = {
  operativo: 'Operativo', mantenimiento: 'Mantenimiento',
  pendiente_revision: 'Pend. revisión', baja: 'De baja',
}
const CONDITION_COLORS: Record<string, string> = {
  operativo: 'var(--emerald-glow)',
  mantenimiento: 'var(--flame)',
  pendiente_revision: '#60a5fa',
  baja: 'var(--red-glow)',
}
const CONDITION_BG: Record<string, string> = {
  operativo: 'rgba(16,185,129,0.10)',
  mantenimiento: 'rgba(245,158,11,0.10)',
  pendiente_revision: 'rgba(96,165,250,0.10)',
  baja: 'rgba(220,38,38,0.10)',
}

const inputStyle: React.CSSProperties = {
  height: 32,
  border: '1px solid var(--ink-line)',
  background: 'var(--ink-surface)',
  color: 'var(--bone)',
  padding: '0 10px',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
}

interface Props {
  items: InventoryRow[]
  areaSlug: string
  createAction: (formData: FormData) => Promise<void>
}

export function InventarioClient({ items, areaSlug, createAction }: Props) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const filtered = useMemo(() => {
    let list = items
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.model?.toLowerCase().includes(q) ||
        i.codigoCbp?.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) list = list.filter((i) => i.category === categoryFilter)
    if (conditionFilter) list = list.filter((i) => i.condition === conditionFilter)
    return list
  }, [items, search, categoryFilter, conditionFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Action bar */}
      <div
        style={{
          background: 'var(--ink-deep)',
          border: '1px solid var(--ink-line)',
          padding: '10px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3"
            style={{ color: 'var(--graphite)' }}
          />
          <input
            placeholder="Buscar nombre, marca, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: 28 }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
          ))}
        </select>
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todas las condiciones</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>
          ))}
        </select>
        
        <div style={{ display: 'flex', gap: 6 }}>
          <a
            href={`/api/inventory/template?area=${areaSlug}`}
            download
            style={{
              height: 32,
              padding: '0 12px',
              background: 'var(--ink-surface)',
              color: 'var(--steel)',
              border: '1px solid var(--ink-line)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Plantilla
          </a>
          <button
            onClick={() => { setShowImport(!showImport); setShowForm(false); }}
            style={{
              height: 32,
              padding: '0 12px',
              background: showImport ? 'var(--ink-surface)' : 'var(--ink-deep)',
              color: showImport ? 'var(--bone)' : 'var(--steel)',
              border: '1px solid var(--ink-line)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Carga Masiva
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowImport(false); }}
            style={{
              height: 32,
              padding: '0 14px',
              background: showForm ? 'var(--ink-surface)' : 'var(--red-163)',
              color: showForm ? 'var(--steel)' : '#fff',
              border: showForm ? '1px solid var(--ink-line)' : 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showForm ? 'Cancelar' : 'Agregar ítem'}
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <InventarioImportClient
          areaKey={areaSlug}
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); window.location.reload(); }}
        />
      )}

      {/* Table */}
      <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', overflowX: 'auto' }}>
        {/* Stats bar */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--ink-line)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--graphite)' }}>
            INVENTARIO
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)', fontWeight: 700 }}>
            {filtered.length}
          </span>
          {filtered.length !== items.length && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
              de {items.length} ítems
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Package className="w-10 h-10" style={{ color: 'var(--graphite)', opacity: 0.4 }} strokeWidth={1.2} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--graphite)' }}>
              {items.length === 0
                ? 'Sin ítems en el inventario. Usa "Agregar ítem" para comenzar.'
                : 'No hay resultados con los filtros aplicados.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-line)' }}>
                {['#', 'NOMBRE', 'CATEGORÍA', 'MARCA / MODELO', 'CANTIDAD', 'CONDICIÓN', 'UBICACIÓN'].map((h, hi) => (
                  <th
                    key={hi}
                    style={{
                      padding: '8px 12px',
                      textAlign: hi >= 4 ? 'center' : 'left',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      color: 'var(--graphite)',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--ink-line-soft)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 260 }}>
                    <div style={{ fontWeight: 600, color: 'var(--bone)', fontSize: 12, lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    {item.subcategory && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', marginTop: 2 }}>
                        {item.subcategory}
                      </div>
                    )}
                    {item.codigoCbp && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
                        {item.codigoCbp}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                        padding: '2px 7px',
                        background: 'var(--ink-surface)',
                        border: '1px solid var(--ink-line)',
                        color: 'var(--steel)',
                      }}
                    >
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--steel)', fontSize: 12 }}>
                    {[item.brand, item.model].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)' }}>
                    {item.quantity} <span style={{ color: 'var(--graphite)', fontSize: 9 }}>{item.unitMeasure}</span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                        fontWeight: 700,
                        padding: '2px 7px',
                        background: CONDITION_BG[item.condition] ?? 'var(--ink-surface)',
                        color: CONDITION_COLORS[item.condition] ?? 'var(--steel)',
                        border: `1px solid ${CONDITION_COLORS[item.condition] ?? 'var(--ink-line)'}44`,
                      }}
                    >
                      {CONDITION_LABELS[item.condition] ?? item.condition}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--steel)', fontSize: 11, maxWidth: 160 }}>
                    {item.ubicacionInterna || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '0.1em',
  color: 'var(--graphite)',
  textTransform: 'uppercase',
  marginBottom: 4,
}
