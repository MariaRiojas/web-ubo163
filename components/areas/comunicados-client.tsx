"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createComunicado, submitComunicadoForApproval } from '@/lib/areas/imagen-actions'
import type { Announcement, AnnouncementStatus, AnnouncementPriority } from '@/lib/db/schema/announcements'
import { AnuncioContent } from '@/components/anuncios/anuncio-content'

const STATUS_COLORS: Record<string, string> = {
  borrador: 'var(--steel)',
  pendiente_aprobacion: 'var(--brass)',
  aprobado: 'var(--emerald-glow)',
  rechazado: 'var(--red-glow)',
  archivado: 'var(--graphite)',
}
const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
}
const PRIORITY_LABELS: Record<string, string> = {
  normal: 'Normal',
  importante: 'Importante',
  urgente: 'Urgente',
}
const PRIORITY_COLORS: Record<string, string> = {
  normal: 'var(--steel)',
  importante: 'var(--brass)',
  urgente: 'var(--red-glow)',
}

interface Props {
  initialItems: Announcement[]
  canManage: boolean
  sectionId: string
  profileId: string
}

export function ComunicadosClient({ initialItems, canManage, sectionId, profileId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const filtered = items.filter(i => filterStatus === 'all' || i.status === filterStatus)

  const stats = {
    borrador: items.filter(i => i.status === 'borrador').length,
    pendiente: items.filter(i => i.status === 'pendiente_aprobacion').length,
    aprobado: items.filter(i => i.status === 'aprobado').length,
  }

  async function handleSubmitForApproval(announcementId: string) {
    if (!window.confirm('¿Enviar este comunicado para aprobación del Primer Jefe?')) return
    setBusy(announcementId)
    const res = await submitComunicadoForApproval(announcementId)
    if (res.ok) {
      setItems(prev => prev.map(i => i.announcementId === announcementId ? { ...i, status: 'pendiente_aprobacion' as AnnouncementStatus, updatedAt: new Date().toISOString() } : i))
    } else {
      window.alert(res.error)
    }
    setBusy(null)
  }

  return (
    <>
      {/* KPIs */}
      <div className="area-kpi-row" style={{ marginBottom: 20 }}>
        <div className="area-kpi">
          <div className="area-kpi-label">BORRADORES</div>
          <div className="area-kpi-value mono">{stats.borrador}</div>
          <div className="area-kpi-sub">sin enviar</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">PENDIENTES</div>
          <div className="area-kpi-value mono">{stats.pendiente}</div>
          <div className="area-kpi-sub">en revisión</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">APROBADOS</div>
          <div className="area-kpi-value mono">{stats.aprobado}</div>
          <div className="area-kpi-sub">publicados</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <nav className="area-inbox-tabs">
          {(['all', 'borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado'] as const).map(s => (
            <button
              key={s}
              type="button"
              className={cn('area-inbox-tab', filterStatus === s && 'area-inbox-tab--active')}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? `Todos (${items.length})` : STATUS_LABELS[s]}
              {s !== 'all' && (
                <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  ({items.filter(i => i.status === s).length})
                </span>
              )}
            </button>
          ))}
        </nav>

        {canManage && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowForm(true)}
          >
            + Nuevo comunicado
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="guardia-empty">
          {items.length === 0
            ? 'No hay comunicados del área de Imagen aún.'
            : 'No hay comunicados con el filtro seleccionado.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => (
            <ComunicadoRow
              key={item.announcementId}
              item={item}
              canManage={canManage}
              currentProfileId={profileId}
              busy={busy === item.announcementId}
              onSubmitForApproval={() => handleSubmitForApproval(item.announcementId)}
            />
          ))}
        </div>
      )}

      {showForm && canManage && (
        <CreateComunicadoModal
          sectionId={sectionId}
          onClose={() => setShowForm(false)}
          onCreated={item => { setItems(prev => [item, ...prev]); setShowForm(false) }}
        />
      )}
    </>
  )
}

function ComunicadoRow({ item, canManage, currentProfileId, busy, onSubmitForApproval }: {
  item: Announcement
  canManage: boolean
  currentProfileId: string
  busy: boolean
  onSubmitForApproval: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isAuthor = item.authorId === currentProfileId
  const canSend = canManage && isAuthor && item.status === 'borrador'

  return (
    <div style={{
      background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 4, overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') setExpanded(ex => !ex) }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--bone)', fontSize: 13 }}>{item.title}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: PRIORITY_COLORS[item.priority], fontWeight: 600,
            }}>
              {PRIORITY_LABELS[item.priority]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: STATUS_COLORS[item.status], fontWeight: 600,
            }}>
              {STATUS_LABELS[item.status]}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
              {new Date(item.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {item.audienceAllBomberos && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--steel)' }}>Todos los efectivos</span>
            )}
          </div>
        </div>

        {canSend && !busy && (
          <button
            type="button"
            className="btn btn--primary btn--xs"
            onClick={e => { e.stopPropagation(); onSubmitForApproval() }}
          >
            Enviar para aprobación
          </button>
        )}
        {busy && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>…</span>}

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', flexShrink: 0 }}>
          {expanded ? '▴' : '▾'}
        </span>
      </div>

      {expanded && (
        <div style={{
          borderTop: '1px solid var(--ink-line)', padding: '12px 14px',
          fontSize: 13, color: 'var(--steel)', lineHeight: 1.6,
        }}>
          <AnuncioContent content={item.content} />
          {item.reviewNotes && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.05)', border: '1px solid var(--red-deep)', borderRadius: 4 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Nota de revisión
              </div>
              <div style={{ fontSize: 12, color: 'var(--steel)' }}>{item.reviewNotes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CreateComunicadoModal({ sectionId, onClose, onCreated }: {
  sectionId: string
  onClose: () => void
  onCreated: (item: Announcement) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'normal' | 'importante' | 'urgente'>('normal')
  const [allBomberos, setAllBomberos] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    setError('')
    const res = await createComunicado({
      title: title.trim(),
      content: content.trim(),
      priority,
      audienceAllBomberos: allBomberos,
      sectionId,
    })
    setSaving(false)
    if (res.ok && res.data) {
      onCreated({
        announcementId: res.data.announcementId,
        title: title.trim(),
        content: content.trim(),
        priority,
        status: 'borrador',
        authorId: '',
        originSectionId: sectionId,
        audienceAllBomberos: allBomberos,
        audienceAspirantes: false,
        audiencePostulantes: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Announcement)
    } else if (!res.ok) {
      setError(res.error)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--ink-base)', border: '1px solid var(--ink-line)', borderRadius: 6,
          padding: 24, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--bone)', margin: 0 }}>
          Nuevo comunicado
        </h3>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>TÍTULO *</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Asunto del comunicado" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>CONTENIDO *</span>
          <textarea
            required value={content} onChange={e => setContent(e.target.value)}
            rows={6} style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Cuerpo del comunicado…"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>PRIORIDAD</span>
          <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} style={inputStyle}>
            <option value="normal">Normal</option>
            <option value="importante">Importante</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={allBomberos} onChange={e => setAllBomberos(e.target.checked)} />
          <span style={{ fontSize: 13, color: 'var(--bone)' }}>Visible para todos los efectivos</span>
        </label>

        {error && <div style={{ color: 'var(--red-glow)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving || !title.trim() || !content.trim()}>
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
  color: 'var(--graphite)', textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
  padding: '6px 10px', background: 'var(--ink-elevated)',
  border: '1px solid var(--ink-line)', color: 'var(--bone)',
  fontFamily: 'var(--font-ui)', fontSize: 13, borderRadius: 4,
}
