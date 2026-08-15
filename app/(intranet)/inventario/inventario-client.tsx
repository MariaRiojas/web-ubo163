"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import type { InventoryItem, InventoryCondition } from "./page"
import { ImportToolbar } from "@/components/inventario/import-toolbar"
import { AttachmentsModal } from "@/components/inventario/attachments-modal"

// ── Warehouses (almacenes por sección) ────────────────────────────
const WAREHOUSE_DEFS = [
  { seal: 'MQ', label: 'Sala de Máquinas',      sectionKey: 'maquinas' },
  { seal: 'SN', label: 'Almacén de Sanidad',     sectionKey: 'prehospitalaria' },
  { seal: 'SG', label: 'Servicios Generales',    sectionKey: 'servicios_generales' },
  { seal: 'IN', label: 'Instrucción',             sectionKey: 'instruccion' },
  { seal: 'IM', label: 'Imagen Institucional',   sectionKey: 'imagen' },
  { seal: 'AD', label: 'Administración',          sectionKey: 'administracion' },
]

const CONDITION_LABEL: Record<InventoryCondition, string> = {
  operativo:          'OPERATIVO',
  mantenimiento:      'REVISIÓN',
  baja:               'CRÍTICO',
  pendiente_revision: 'PENDIENTE',
}

const CONDITION_DOT: Record<InventoryCondition, string> = {
  operativo:          'bg-emerald-400 shadow-[0_0_6px_#34d399]',
  mantenimiento:      'bg-amber-400 shadow-[0_0_6px_#fbbf24]',
  baja:               'bg-red-500 shadow-[0_0_6px_#ef4444]',
  pendiente_revision: 'bg-amber-400 shadow-[0_0_6px_#fbbf24]',
}

const CONDITION_BADGE: Record<InventoryCondition, string> = {
  operativo:          'text-emerald-400 border-emerald-400/40',
  mantenimiento:      'text-amber-400 border-amber-400/40',
  baja:               'text-red-400 border-red-400/40',
  pendiente_revision: 'text-amber-400 border-amber-400/40',
}

const PAGE_SIZE = 25

function fmtDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return `${dt.getFullYear()}·${String(dt.getMonth() + 1).padStart(2, '0')}·${String(dt.getDate()).padStart(2, '0')}`
}

// Icono genérico de caja para items
function ItemIcon({ condition }: { condition: InventoryCondition }) {
  const cls =
    condition === 'baja' ? 'text-red-400 border-red-400/50 bg-red-400/10' :
    condition !== 'operativo' ? 'text-amber-400 border-amber-400/40 bg-amber-400/5' :
    'text-[#8B96A5] border-[#232B3B] bg-[#212838]'
  return (
    <div className={`w-7 h-7 flex items-center justify-center border rounded-[2px] shrink-0 ${cls}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <path d="m7.5 4.27 9 5.15M3.3 7 12 12l8.7-5M12 22V12"/>
      </svg>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────
interface InventarioClientProps {
  items: InventoryItem[]
  canManage: boolean
}

export function InventarioClient({ items, canManage }: InventarioClientProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAttachments, setShowAttachments] = useState(false)

  // Sub-locations for expanded section
  const subLocations = useMemo(() => {
    if (!expandedSection) return []
    return [...new Set(
      items
        .filter(i => i.sectionKey === expandedSection)
        .map(i => i.location)
        .filter(Boolean) as string[]
    )].sort()
  }, [items, expandedSection])

  // Filtered items
  const filtered = useMemo(() => {
    let base = selectedSection ? items.filter(i => i.sectionKey === selectedSection) : items
    if (selectedLocation) base = base.filter(i => i.location === selectedLocation)
    if (search) {
      const q = search.toLowerCase()
      const qNoHyphen = q.replace(/-/g, '')
      base = base.filter(item => {
        const shortId = item.id.replace(/-/g, '').slice(0, 12).toLowerCase()
        return item.name.toLowerCase().includes(q) ||
          (item.serialNumber?.toLowerCase().includes(q) ?? false) ||
          (item.inbpCode?.toLowerCase().includes(q) ?? false) ||
          (item.brand?.toLowerCase().includes(q) ?? false) ||
          item.section.toLowerCase().includes(q) ||
          shortId.includes(qNoHyphen)
      })
    }
    return base
  }, [items, selectedSection, selectedLocation, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Stats (always from all items)
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0)
  const operativeCount = items.filter(i => i.condition === 'operativo').length
  const attentionCount = items.filter(i => i.condition === 'mantenimiento' || i.condition === 'pendiente_revision').length
  const criticalCount = items.filter(i => i.condition === 'baja').length
  const operativePct = items.length > 0 ? Math.round(operativeCount / items.length * 100) : 0
  const attentionPct = items.length > 0 ? Math.round(attentionCount / items.length * 100) : 0
  const criticalPct = items.length > 0 ? Math.round(criticalCount / items.length * 100) : 0

  function handleSectionClick(key: string) {
    if (expandedSection === key) {
      // colapsar
      setExpandedSection(null)
      setSelectedSection(null)
      setSelectedLocation(null)
    } else {
      setExpandedSection(key)
      setSelectedSection(key)
      setSelectedLocation(null)
    }
    setPage(1)
  }

  function handleLocationClick(loc: string) {
    setSelectedLocation(prev => prev === loc ? null : loc)
    setPage(1)
  }

  // Crumb text
  const activeDef = WAREHOUSE_DEFS.find(w => w.sectionKey === selectedSection)

  const rowVariant = (item: InventoryItem) => {
    if (item.condition === 'baja') return 'shadow-[inset_3px_0_0_#DC2626] bg-red-500/[0.03]'
    if (item.condition !== 'operativo') return 'shadow-[inset_3px_0_0_#F59E0B]'
    return ''
  }

  return (
    <div style={{ fontFamily: 'var(--font-ui-loaded, "Inter Tight", system-ui, sans-serif)' }}>

      {/* ── Doc meta ── */}
      <div className="flex items-center gap-5 mb-6 pb-4 border-b border-[#232B3B]">
        {[
          { label: 'REGISTRO', value: 'RIF-XVI-163' },
          { label: 'MÓDULO',   value: 'INVENTARIO' },
          { label: 'VIGENCIA', value: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-5">
            {i > 0 && <div className="w-px h-6 bg-[#232B3B]" />}
            <div className="flex flex-col gap-0.5">
              <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.1em', color: '#5C6575', textTransform: 'uppercase' }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 12, color: '#C4A062', letterSpacing: '0.02em' }}>{m.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Page title + actions ── */}
      <div className="flex items-end justify-between gap-6 mb-10">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display-loaded, serif)', fontSize: 42, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em', color: '#E8EBF0' }}>
            Inventario General
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B96A5' }}>Compañía de Bomberos Voluntarios N.° 163 — Ancón</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/inventario/diccionario"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider border rounded-[2px] transition-colors"
            style={{ color: '#E8EBF0', borderColor: '#232B3B', background: 'transparent', letterSpacing: '0.04em' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#8B96A5')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#232B3B')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Diccionario de datos
          </Link>
          <Link
            href="/registro/etiquetas"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider border rounded-[2px] transition-colors"
            style={{ color: '#E8EBF0', borderColor: '#232B3B', background: 'transparent', letterSpacing: '0.04em' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#8B96A5')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#232B3B')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7M14 17h7M14 20h7"/></svg>
            Etiquetas QR
          </Link>
          {canManage && (
            <ImportToolbar
              canManage={canManage}
              onImported={(n) => toast.success(`Se importaron ${n} ítems. Recarga la página para ver los cambios.`)}
            />
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr' }}>
        {/* Featured */}
        <div className="relative p-5 border" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, transparent 50%), #131821', borderColor: '#232B3B' }}>
          {[['tl','top-0 left-0 border-r-0 border-b-0'],['tr','top-0 right-0 border-l-0 border-b-0'],['bl','bottom-0 left-0 border-r-0 border-t-0'],['br','bottom-0 right-0 border-l-0 border-t-0']].map(([k, cls]) => (
            <div key={k} className={`absolute w-3 h-3 border border-red-600 pointer-events-none ${cls}`} style={{ borderWidth: '1.5px' }} />
          ))}
          <div style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.12em', color: '#8B96A5', textTransform: 'uppercase', marginBottom: 12 }}>INVENTARIO TOTAL</div>
          <div className="flex items-baseline gap-2 mb-2">
            <span style={{ fontFamily: 'var(--font-display-loaded, serif)', fontSize: 48, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.03em', color: '#E8EBF0' }}>{items.length.toLocaleString()}</span>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8B96A5' }}>ítems</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#8B96A5' }}>
            <span style={{ color: '#34D399', fontFamily: 'var(--font-mono-loaded, monospace)', fontWeight: 600 }}>{totalUnits.toLocaleString()}</span>
            <span>unidades en total</span>
          </div>
        </div>

        {[
          { label: 'OPERATIVOS',           value: operativeCount, pct: operativePct,  bar: '#10B981', txt: '#34D399', sub: `${operativePct}% del total` },
          { label: 'REQUIEREN ATENCIÓN',   value: attentionCount, pct: attentionPct,  bar: '#F59E0B', txt: '#F59E0B', sub: 'Mantenimiento / revisión' },
          { label: 'CRÍTICOS',             value: criticalCount,  pct: criticalPct,   bar: '#DC2626', txt: '#EF4444', sub: 'Baja / vencidos' },
        ].map(s => (
          <div key={s.label} className="p-5 border" style={{ background: '#131821', borderColor: '#232B3B' }}>
            <div style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.12em', color: s.txt, textTransform: 'uppercase', marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display-loaded, serif)', fontSize: 48, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.03em', color: s.txt, marginBottom: 12 }}>{s.value}</div>
            <div className="h-[3px] overflow-hidden mb-2" style={{ background: '#232B3B' }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: s.bar, transition: 'width 600ms' }} />
            </div>
            <div className="text-xs" style={{ color: '#8B96A5' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main 3-col grid ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '260px 1fr 300px', alignItems: 'start' }}>

        {/* ── Warehouses ── */}
        <aside className="border sticky top-5" style={{ background: '#131821', borderColor: '#232B3B' }}>
          <div className="grid gap-3 items-center px-5 py-4 mb-1" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, #232B3B, transparent)' }} />
            <h2 className="whitespace-nowrap text-center" style={{ fontFamily: 'var(--font-display-loaded, serif)', fontWeight: 500, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B96A5' }}>Almacenes</h2>
            <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, #232B3B, transparent)' }} />
          </div>

          {/* All button */}
          <button
            onClick={() => { setSelectedSection(null); setExpandedSection(null); setSelectedLocation(null); setPage(1) }}
            className="flex items-center gap-3 px-5 py-3.5 w-full text-left border-t transition-colors"
            style={{
              borderColor: '#1D2432',
              background: !selectedSection ? 'linear-gradient(90deg, rgba(220,38,38,0.08), transparent)' : 'transparent',
              boxShadow: !selectedSection ? 'inset 2px 0 0 #DC2626' : 'none',
            }}
          >
            <div className="w-[34px] h-[34px] flex items-center justify-center border shrink-0" style={{ fontSize: 10, fontFamily: 'var(--font-display-loaded, serif)', fontWeight: 600, letterSpacing: '0.08em', borderColor: !selectedSection ? '#DC2626' : '#8F7340', color: !selectedSection ? '#EF4444' : '#C4A062', background: !selectedSection ? 'radial-gradient(circle at 30% 30%, rgba(220,38,38,0.2), transparent), #212838' : 'radial-gradient(circle at 30% 30%, rgba(196,160,98,0.15), transparent), #212838' }}>
              ALL
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: '#E8EBF0' }}>Todos los almacenes</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11, color: '#8B96A5' }}>{items.length}</span>
              </div>
            </div>
          </button>

          {WAREHOUSE_DEFS.map(w => {
            const wItems = items.filter(i => i.sectionKey === w.sectionKey)
            if (wItems.length === 0) return null
            const isExpanded = expandedSection === w.sectionKey
            const isActive = selectedSection === w.sectionKey
            const attCount = wItems.filter(i => i.condition !== 'operativo').length

            return (
              <div key={w.sectionKey}>
                <button
                  onClick={() => handleSectionClick(w.sectionKey)}
                  className="flex items-center gap-3 px-5 py-3.5 w-full text-left border-t transition-colors"
                  style={{
                    borderColor: '#1D2432',
                    background: isActive && !selectedLocation ? 'linear-gradient(90deg, rgba(220,38,38,0.08), transparent)' : 'transparent',
                    boxShadow: isActive && !selectedLocation ? 'inset 2px 0 0 #DC2626' : 'none',
                  }}
                >
                  <div className="w-[34px] h-[34px] flex items-center justify-center border shrink-0" style={{ fontSize: 11, fontFamily: 'var(--font-display-loaded, serif)', fontWeight: 600, letterSpacing: '0.08em', borderColor: isActive ? '#DC2626' : '#8F7340', color: isActive ? '#EF4444' : '#C4A062', background: isActive ? 'radial-gradient(circle at 30% 30%, rgba(220,38,38,0.2), transparent), #212838' : 'radial-gradient(circle at 30% 30%, rgba(196,160,98,0.15), transparent), #212838' }}>
                    {w.seal}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: '#E8EBF0' }}>{w.label}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11, color: '#8B96A5' }}>{wItems.length}</span>
                      {attCount > 0 && (
                        <>
                          <span style={{ color: '#3B4454' }}>·</span>
                          <span className="text-xs" style={{ color: '#F59E0B' }}>{attCount} por revisar</span>
                        </>
                      )}
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0 transition-transform" style={{ color: '#5C6575', transform: isExpanded ? 'rotate(90deg)' : 'none' }}><path d="M9 18l6-6-6-6"/></svg>
                </button>

                {isExpanded && subLocations.length > 0 && (
                  <div style={{ background: '#0A0E14', borderTop: '1px solid #1D2432', paddingBlock: 8 }}>
                    {subLocations.map(loc => (
                      <button
                        key={loc}
                        onClick={() => handleLocationClick(loc)}
                        className="flex items-center gap-3 w-full text-left transition-colors"
                        style={{
                          padding: '8px 20px 8px 32px',
                          color: selectedLocation === loc ? '#E8EBF0' : '#8B96A5',
                          background: selectedLocation === loc ? 'rgba(220,38,38,0.06)' : 'transparent',
                        }}
                      >
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ background: selectedLocation === loc ? '#DC2626' : '#3B4454', boxShadow: selectedLocation === loc ? '0 0 6px #EF4444' : 'none' }} />
                        <span className="flex-1 text-xs" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{loc}</span>
                        <span className="text-xs" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', color: selectedLocation === loc ? '#C4A062' : '#3B4454' }}>
                          {items.filter(i => i.sectionKey === w.sectionKey && i.location === loc).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </aside>

        {/* ── Table ── */}
        <div className="border flex flex-col overflow-hidden" style={{ background: '#131821', borderColor: '#232B3B' }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 border-b" style={{ borderColor: '#232B3B', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-mono-loaded, monospace)' }}>
              <span className="uppercase tracking-widest" style={{ fontSize: 10, color: '#5C6575' }}>CONSULTANDO</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ color: '#3B4454' }}><path d="M9 18l6-6-6-6"/></svg>
              {activeDef ? (
                <>
                  <span style={{ color: '#8B96A5', letterSpacing: '0.02em' }}>{activeDef.label}</span>
                  {selectedLocation && (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ color: '#3B4454' }}><path d="M9 18l6-6-6-6"/></svg>
                      <span className="font-medium" style={{ color: '#C4A062' }}>{selectedLocation.toUpperCase()}</span>
                    </>
                  )}
                </>
              ) : (
                <span style={{ color: '#C4A062' }}>TODOS LOS ALMACENES</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-[2px] transition-colors" style={{ background: '#0A0E14', borderColor: '#232B3B', width: 220 }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#DC2626')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = '#232B3B')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ color: '#5C6575', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="search"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Buscar por nombre, ID, serie..."
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: '#E8EBF0', fontFamily: 'var(--font-ui-loaded, sans-serif)' }}
                />
              </div>
            </div>
          </div>

          {/* Tabla (header + filas) en un solo contenedor con scroll horizontal:
              con minWidth las columnas nunca se aplastan/superponen cuando el panel es angosto */}
          <div className="flex-1 overflow-x-auto" style={{ minHeight: 0 }}>
           <div style={{ minWidth: 920, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Table head */}
            <div className="grid" style={{ gridTemplateColumns: '130px 1fr 130px 140px 50px 110px 90px', gap: 16, padding: '10px 20px', background: '#1A202D', borderBottom: '1px solid #232B3B', flexShrink: 0 }}>
              {['CÓD. INBP','DESIGNACIÓN','MARCA / MODELO','UBICACIÓN','CANT.','CONDICIÓN','VENCE'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.1em', color: '#5C6575', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="overflow-y-auto flex-1" style={{ minHeight: 0 }}>
            {pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: '#5C6575' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" className="mb-3 opacity-30"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <p className="text-sm">No se encontraron ítems</p>
              </div>
            ) : pageItems.map(item => {
              const isSelected = selectedItem?.id === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(prev => prev?.id === item.id ? null : item)}
                  className="grid w-full text-left border-b transition-colors"
                  style={{
                    gridTemplateColumns: '130px 1fr 130px 140px 50px 110px 90px',
                    gap: 16,
                    padding: '14px 20px',
                    borderColor: '#1D2432',
                    background: isSelected ? 'linear-gradient(90deg, rgba(220,38,38,0.08), rgba(220,38,38,0.02))' : 'transparent',
                    boxShadow: isSelected ? 'inset 3px 0 0 #DC2626' : item.condition === 'baja' ? 'inset 3px 0 0 #DC2626' : item.condition !== 'operativo' ? 'inset 3px 0 0 #F59E0B' : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="self-center" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11, color: '#C4A062' }}>
                    {item.inbpCode ?? '—'}
                  </div>

                  <div className="self-center flex items-center gap-3 min-w-0">
                    <ItemIcon condition={item.condition} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" style={{ fontSize: 13, color: '#E8EBF0', letterSpacing: '-0.005em' }}>{item.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#8B96A5' }}>
                        {item.category}
                        {item.serialNumber && ` · ${item.serialNumber}`}
                      </div>
                    </div>
                  </div>

                  <div className="self-center min-w-0">
                    {item.brand ? (
                      <>
                        <div className="font-medium" style={{ fontSize: 12, color: '#E8EBF0' }}>{item.brand}</div>
                        {item.model && <div style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, color: '#8B96A5', marginTop: 2, letterSpacing: '0.02em' }}>{item.model}</div>}
                      </>
                    ) : <span style={{ color: '#3B4454' }}>—</span>}
                  </div>

                  <div className="self-center min-w-0">
                    <div style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11, color: '#C4A062', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(item.location ?? item.section).toUpperCase()}
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: '#8B96A5' }}>{item.section}</div>
                  </div>

                  <div className="self-center text-right font-medium" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 14, color: '#E8EBF0' }}>{item.quantity}</div>

                  <div className="self-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 border rounded-[2px]" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.08em' } as React.CSSProperties}
                      data-cond={item.condition}
                    >
                      <style>{`
                        [data-cond="operativo"] { color: #34D399; border-color: rgba(52,211,153,0.4); }
                        [data-cond="mantenimiento"] { color: #F59E0B; border-color: rgba(245,158,11,0.4); }
                        [data-cond="baja"] { color: #EF4444; border-color: rgba(239,68,68,0.4); }
                        [data-cond="pendiente_revision"] { color: #F59E0B; border-color: rgba(245,158,11,0.4); }
                      `}</style>
                      <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_DOT[item.condition]}`} />
                      {CONDITION_LABEL[item.condition]}
                    </div>
                  </div>

                  <div className="self-center" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11, color: item.nextMaintenance ? (new Date(item.nextMaintenance) < new Date() ? '#EF4444' : '#F59E0B') : '#5C6575' }}>
                    {fmtDate(item.nextMaintenance)}
                  </div>
                </button>
              )
            })}
            </div>
           </div>
          </div>

          {/* Footer / pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ background: '#0A0E14', borderColor: '#232B3B' }}>
            <div className="text-xs" style={{ color: '#8B96A5' }}>
              Mostrando{' '}
              <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', color: '#E8EBF0' }}>{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}</span>
              {' '}de{' '}
              <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', color: '#E8EBF0' }}>{filtered.length}</span> ítems
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {[
                  { label: '←', action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                  ...Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let p = i + 1
                    if (totalPages > 5) {
                      if (page <= 3) p = i + 1
                      else if (page >= totalPages - 2) p = totalPages - 4 + i
                      else p = page - 2 + i
                    }
                    return { label: String(p), action: () => setPage(p), disabled: false, active: p === page }
                  }),
                  { label: '→', action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
                ].map((b, i) => (
                  <button key={i} onClick={b.action} disabled={b.disabled}
                    className="min-w-[28px] h-7 px-2 rounded-[2px] border transition-colors"
                    style={{
                      fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11,
                      color: (b as {active?: boolean}).active ? '#E8EBF0' : b.disabled ? '#3B4454' : '#8B96A5',
                      background: (b as {active?: boolean}).active ? '#DC2626' : '#131821',
                      borderColor: (b as {active?: boolean}).active ? '#DC2626' : '#232B3B',
                      cursor: b.disabled ? 'not-allowed' : 'pointer',
                      opacity: b.disabled ? 0.4 : 1,
                    }}
                  >{b.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <aside className="border relative overflow-hidden" style={{ background: '#131821', borderColor: '#232B3B', padding: 24 }}>
          {/* Corner brackets */}
          {[['top-0 left-0','border-r-0 border-b-0'],['top-0 right-0','border-l-0 border-b-0'],['bottom-0 left-0','border-r-0 border-t-0'],['bottom-0 right-0','border-l-0 border-t-0']].map(([pos, brdr], i) => (
            <div key={i} className={`absolute w-3.5 h-3.5 border pointer-events-none ${pos} ${brdr}`} style={{ borderColor: '#C4A062', borderWidth: '1.5px', opacity: 0.8 }} />
          ))}

          {selectedItem ? (
            <>
              <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#232B3B' }}>
                <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.14em', color: '#C4A062', textTransform: 'uppercase' }}>FICHA TÉCNICA</span>
                <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 11, color: '#8B96A5' }}>
                  {selectedItem.id.replace(/-/g, '').slice(0, 12).toUpperCase()}
                </span>
              </div>

              <div style={{ fontFamily: 'var(--font-display-loaded, serif)', fontSize: 20, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#E8EBF0', marginBottom: 4 }}>
                {selectedItem.name}
              </div>
              {(selectedItem.brand || selectedItem.model) && (
                <div className="text-xs mb-5" style={{ color: '#8B96A5' }}>
                  {[selectedItem.brand, selectedItem.model].filter(Boolean).join(' · ')}
                </div>
              )}

              <div className="h-px my-4" style={{ background: 'linear-gradient(to right, transparent, #232B3B, transparent)' }} />

              <div className="flex flex-col gap-2">
                {[
                  { label: 'ID ETIQUETA',   value: selectedItem.id.replace(/-/g,'').slice(0,12).toUpperCase(), mono: true },
                  { label: 'CATEGORÍA',     value: selectedItem.category },
                  { label: 'SERIE',         value: selectedItem.serialNumber, mono: true },
                  { label: 'CÓD. INBP',    value: selectedItem.inbpCode, mono: true },
                  { label: 'UBICACIÓN',     value: selectedItem.location?.toUpperCase() ?? selectedItem.section.toUpperCase() },
                  { label: 'SECCIÓN',       value: selectedItem.section },
                  { label: 'CANTIDAD',      value: `${selectedItem.quantity} ${selectedItem.quantity === 1 ? 'unidad' : 'unidades'}`, mono: true },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="grid items-baseline gap-3" style={{ gridTemplateColumns: '80px 1fr' }}>
                    <span style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 9, letterSpacing: '0.1em', color: '#5C6575', textTransform: 'uppercase' }}>{r.label}</span>
                    <span className="text-right text-xs" style={{ fontFamily: r.mono ? 'var(--font-mono-loaded, monospace)' : 'inherit', color: '#E8EBF0' }}>{r.value}</span>
                  </div>
                ))}
              </div>

              <div className="h-px my-4" style={{ background: 'linear-gradient(to right, transparent, #232B3B, transparent)' }} />

              <div className="flex flex-col gap-2 mb-4">
                <div style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.12em', color: '#5C6575', textTransform: 'uppercase', marginBottom: 4 }}>Condición</div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 border rounded-[2px] self-start" style={{
                  fontFamily: 'var(--font-mono-loaded, monospace)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                } as React.CSSProperties}
                  data-cond2={selectedItem.condition}
                >
                  <style>{`
                    [data-cond2="operativo"] { color: #34D399; border-color: rgba(52,211,153,0.4); }
                    [data-cond2="mantenimiento"] { color: #F59E0B; border-color: rgba(245,158,11,0.4); }
                    [data-cond2="baja"] { color: #EF4444; border-color: rgba(239,68,68,0.4); }
                    [data-cond2="pendiente_revision"] { color: #F59E0B; border-color: rgba(245,158,11,0.4); }
                  `}</style>
                  <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_DOT[selectedItem.condition]}`} />
                  {CONDITION_LABEL[selectedItem.condition]}
                </div>
                {selectedItem.notes && (
                  <p className="text-xs mt-2 p-3 rounded-[2px] border" style={{ color: '#F59E0B', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
                    {selectedItem.notes}
                  </p>
                )}
              </div>

              <Link
                href={`/registro/movimiento/${selectedItem.id}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2.5 border rounded-[2px] transition-colors mt-2"
                style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C4A062', borderColor: '#8F7340', borderStyle: 'dashed', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.borderStyle = 'solid' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#C4A062'; e.currentTarget.style.borderColor = '#8F7340'; e.currentTarget.style.borderStyle = 'dashed' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 3h-3a2 2 0 0 1-2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                Registrar movimiento →
              </Link>

              {/* Actas de asignación y adjuntos (acta firmada PDF/foto) */}
              <button
                type="button"
                onClick={() => setShowAttachments(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 border rounded-[2px] transition-colors mt-2"
                style={{ fontFamily: 'var(--font-mono-loaded, monospace)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C4A062', borderColor: '#8F7340', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,160,98,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                Actas y adjuntos
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#5C6575' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="40" height="40" className="mb-3 opacity-20">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <p className="text-xs" style={{ fontFamily: 'var(--font-mono-loaded, monospace)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selecciona un ítem</p>
              <p className="text-xs mt-1">para ver la ficha técnica</p>
            </div>
          )}

          {/* Watermark */}
          <div className="absolute pointer-events-none" style={{ bottom: -40, right: -40, width: 160, height: 160, opacity: 0.04 }}>
            <svg viewBox="0 0 100 100" fill="currentColor" width="100%" height="100%"><circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="3" fill="none"/><text x="50" y="56" textAnchor="middle" style={{ fontFamily: 'serif', fontSize: 24 }}>163</text></svg>
          </div>
        </aside>
      </div>

      {/* Modal de actas y adjuntos del ítem seleccionado */}
      {selectedItem && (
        <AttachmentsModal
          inventoryId={selectedItem.id}
          itemName={selectedItem.name}
          canManage={canManage}
          open={showAttachments}
          onOpenChange={setShowAttachments}
        />
      )}
    </div>
  )
}
