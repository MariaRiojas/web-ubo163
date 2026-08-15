'use client'

import { useState, useTransition } from 'react'
import {
  ShieldCheck, Package, FileText, Gift, Users, GraduationCap,
  Settings, ChevronDown, ChevronUp, Lock, Filter,
} from 'lucide-react'
import { loadAuditPage } from './actions'
import {
  AUDIT_ENTITY_LABELS, AUDIT_ACTION_LABELS,
  type AuditLog, type AuditEntityType,
} from '@/lib/db/schema/audit'

const ENTITY_ICON: Record<AuditEntityType, typeof Package> = {
  inventory: Package,
  document: FileText,
  donation: Gift,
  personnel: Users,
  admission: GraduationCap,
  training: GraduationCap,
  system: Settings,
}

const FILTERS: { key: AuditEntityType | 'all'; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'document', label: 'Documentos' },
  { key: 'donation', label: 'Donaciones' },
  { key: 'personnel', label: 'Personal' },
  { key: 'admission', label: 'Admisión' },
  { key: 'training', label: 'Capacitación' },
]

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export function AuditoriaClient({
  initialItems,
  initialCursor,
}: {
  initialItems: AuditLog[]
  initialCursor: string | null
}) {
  const [items, setItems] = useState<AuditLog[]>(initialItems)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [filter, setFilter] = useState<AuditEntityType | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const applyFilter = (key: AuditEntityType | 'all') => {
    setFilter(key)
    startTransition(async () => {
      const res = await loadAuditPage({ entityType: key === 'all' ? undefined : key })
      if (res.ok) { setItems(res.items); setCursor(res.nextCursor) }
    })
  }

  const loadMore = () => {
    startTransition(async () => {
      const res = await loadAuditPage({
        entityType: filter === 'all' ? undefined : filter,
        cursor,
      })
      if (res.ok) { setItems(prev => [...prev, ...res.items]); setCursor(res.nextCursor) }
    })
  }

  return (
    <div>
      {/* ── Cabecera ── */}
      <header className="area-hero" style={{ marginBottom: 20 }}>
        <div className="area-hero-seal"><ShieldCheck className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">REGISTRO INMUTABLE · SOLO PRIMER JEFE</div>
          <h1 className="area-hero-title">Bitácora de Auditoría</h1>
          <p className="area-hero-desc">
            Traza append-only de operaciones sensibles sobre la base de datos.
            Cada registro es permanente: no puede editarse ni eliminarse.
          </p>
        </div>
        <div className="area-hero-jefe">
          <span className="area-hero-jefe-label">
            <Lock className="w-3 h-3 inline mr-1" strokeWidth={1.8} />INMUTABLE
          </span>
        </div>
      </header>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <Filter className="w-3.5 h-3.5" strokeWidth={1.8} style={{ color: 'var(--graphite)' }} />
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => applyFilter(f.key)}
            disabled={pending}
            style={{
              padding: '5px 12px', fontSize: 12, borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
              background: filter === f.key ? 'var(--brass)' : 'var(--ink-deep)',
              color: filter === f.key ? 'var(--ink-black)' : 'var(--steel)',
              border: `1px solid ${filter === f.key ? 'var(--brass)' : 'var(--ink-line)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      {items.length === 0 ? (
        <div className="guardia-empty">
          No hay registros de auditoría todavía. Aparecerán aquí conforme se realicen
          operaciones sobre inventario, documentos, donaciones y personal.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(entry => {
            const Icon = ENTITY_ICON[entry.entityType] ?? Settings
            const isOpen = expanded === entry.logId
            const hasDetail = entry.before !== undefined || entry.after !== undefined || entry.metadata
            return (
              <div
                key={entry.logId}
                style={{
                  background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                  borderRadius: 2, padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 2, flexShrink: 0,
                    background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--brass)',
                  }}>
                    <Icon className="w-4 h-4" strokeWidth={1.7} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--bone)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--brass)' }}>{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</strong>
                      {' — '}{entry.summary}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--graphite)',
                      marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap',
                    }}>
                      <span>{AUDIT_ENTITY_LABELS[entry.entityType]}</span>
                      <span>·</span>
                      <span>{entry.actorName}{entry.actorRole ? ` (${entry.actorRole})` : ''}</span>
                      <span>·</span>
                      <span>{fmtDate(entry.createdAt)}</span>
                      {entry.entityLabel && (<><span>·</span><span>{entry.entityLabel}</span></>)}
                    </div>
                  </div>

                  {hasDetail && (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : entry.logId)}
                      className="btn btn--ghost btn--sm"
                      style={{ flexShrink: 0 }}
                    >
                      {isOpen
                        ? <ChevronUp className="w-3 h-3" strokeWidth={1.8} />
                        : <ChevronDown className="w-3 h-3" strokeWidth={1.8} />}
                    </button>
                  )}
                </div>

                {isOpen && hasDetail && (
                  <div style={{
                    marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ink-line)',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                  }}>
                    {entry.before !== undefined && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 4 }}>Antes</div>
                        <pre style={{ fontSize: 11, color: 'var(--steel)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                          {JSON.stringify(entry.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.after !== undefined && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 4 }}>Después</div>
                        <pre style={{ fontSize: 11, color: 'var(--steel)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                          {JSON.stringify(entry.after, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.metadata && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 4 }}>Detalle</div>
                        <pre style={{ fontSize: 11, color: 'var(--steel)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {cursor && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button type="button" className="btn btn--ghost" onClick={loadMore} disabled={pending}>
            {pending ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}
