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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null)
  const [saving, setSaving] = useState(false)

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
          onSuccess={() => { setShowImport(false); window.location.href = window.location.pathname + '?t=' + Date.now(); }}
        />
      )}

      {/* Add item form */}
      {showForm && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const res = await fetch('/api/inventory/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                areaKey: areaSlug,
                name: fd.get('name'),
                category: fd.get('category'),
                quantity: parseInt(fd.get('quantity') as string) || 1,
                unitMeasure: fd.get('unitMeasure'),
                condition: fd.get('condition'),
                brand: fd.get('brand'),
                model: fd.get('model'),
                ubicacionInterna: fd.get('ubicacionInterna'),
              }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
              alert('Error: ' + (data.error || 'No se pudo guardar'))
            } else {
              setShowForm(false)
              window.location.href = window.location.pathname + '?t=' + Date.now()
            }
          }}
          style={{
            background: 'var(--ink-deep)',
            border: '1px solid var(--ink-line)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          <input type="hidden" name="areaKey" value={areaSlug} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nombre *</label>
            <input name="name" required placeholder="Ej: Manguera de 2.5 pulgadas" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Categoría *</label>
            <select name="category" required style={inputStyle}>
              <option value="">Seleccionar</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cantidad *</label>
            <input name="quantity" type="number" min="0" required defaultValue="1" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unidad</label>
            <select name="unitMeasure" style={inputStyle}>
              {UNIT_MEASURES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Condición</label>
            <select name="condition" style={inputStyle}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Marca</label>
            <input name="brand" placeholder="Opcional" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Modelo</label>
            <input name="model" placeholder="Opcional" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ubicación</label>
            <input name="ubicacionInterna" placeholder="Ej: Rack A-3" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ height: 32, padding: '0 16px', background: 'var(--ink-surface)', color: 'var(--steel)', border: '1px solid var(--ink-line)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ height: 32, padding: '0 16px', background: 'var(--red-163)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Guardar ítem
            </button>
          </div>
        </form>
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
          {selected.size > 0 && (
            <button
              onClick={async () => {
                if (!confirm(`¿Eliminar ${selected.size} ítem(s) seleccionados?`)) return
                const res = await fetch('/api/inventory/items', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ itemIds: [...selected] }),
                })
                const data = await res.json()
                if (data.success) window.location.href = window.location.pathname + '?t=' + Date.now()
                else alert('Error: ' + data.error)
              }}
              style={{ marginLeft: 'auto', height: 26, padding: '0 12px', background: 'var(--red-163, #dc2626)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Eliminar ({selected.size})
            </button>
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
                {['', '#', 'NOMBRE', 'CATEGORÍA', 'MARCA / MODELO', 'CANTIDAD', 'CONDICIÓN', 'UBICACIÓN', ''].map((h, hi) => (
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
                  <td style={{ padding: '4px 8px', width: 30 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        e.target.checked ? next.add(item.id) : next.delete(item.id)
                        setSelected(next)
                      }}
                      style={{ accentColor: 'var(--red-163, #dc2626)' }}
                    />
                  </td>
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
                  <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setEditingItem(item)}
                        title="Editar"
                        style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', cursor: 'pointer', color: 'var(--steel)', fontSize: 11 }}
                      >
                        &#9998;
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${item.name}"?`)) {
                            fetch('/api/inventory/items', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ itemId: item.id }),
                            }).then(r => r.json()).then(d => { if (d.success) window.location.href = window.location.pathname + '?t=' + Date.now() })
                          }
                        }}
                        title="Eliminar"
                        style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', cursor: 'pointer', color: 'var(--red-glow, #ef4444)', fontSize: 11 }}
                      >
                        &#10005;
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingItem(null) }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setSaving(true)
              const fd = new FormData(e.currentTarget)
              const payload: Record<string, any> = { itemId: editingItem.id }
              ;['name','category','brand','model','quantity','unitMeasure','condition','ubicacionInterna'].forEach(k => {
                const v = fd.get(k) as string
                if (k === 'quantity') payload[k] = parseInt(v) || 1
                else payload[k] = v
              })
              const res = await fetch('/api/inventory/items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
              const data = await res.json()
              setSaving(false)
              if (data.success) { setEditingItem(null); window.location.href = window.location.pathname + '?t=' + Date.now() }
              else alert('Error: ' + data.error)
            }}
            style={{ background: 'var(--ink-deep, #0a0a0a)', border: '1px solid var(--ink-line, #333)', padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--bone, #fff)' }}>Editar ítem</h3>
              <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', color: 'var(--graphite, #666)', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Nombre</label>
                <input name="name" defaultValue={editingItem.name} required style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Categoría</label>
                <select name="category" defaultValue={editingItem.category} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Condición</label>
                <select name="condition" defaultValue={editingItem.condition} style={inputStyle}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Cantidad</label>
                <input name="quantity" type="number" min="0" defaultValue={editingItem.quantity} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Unidad</label>
                <select name="unitMeasure" defaultValue={editingItem.unitMeasure} style={inputStyle}>
                  {UNIT_MEASURES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Marca</label>
                <input name="brand" defaultValue={editingItem.brand ?? ''} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Modelo</label>
                <input name="model" defaultValue={editingItem.model ?? ''} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={modalLabelStyle}>Ubicación</label>
                <input name="ubicacionInterna" defaultValue={editingItem.ubicacionInterna ?? ''} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" onClick={() => setEditingItem(null)} style={{ height: 34, padding: '0 16px', background: 'var(--ink-surface, #1a1a1a)', color: 'var(--steel, #999)', border: '1px solid var(--ink-line, #333)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ height: 34, padding: '0 20px', background: 'var(--red-163, #dc2626)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
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

const modalLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--graphite, #666)',
  fontFamily: 'var(--font-mono, monospace)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}
