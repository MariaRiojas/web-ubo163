"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createCalendarEvent, updateCalendarEventStatus, deleteCalendarEvent } from '@/lib/areas/imagen-actions'
import type { ContentCalendarItem, ContentType, ContentCategory, ContentStatus } from '@/lib/db/schema/content-calendar'

const STATUS_COLORS: Record<string, string> = {
  planificado: 'var(--steel)',
  en_proceso: 'var(--brass)',
  publicado: 'var(--emerald-glow)',
  cancelado: 'var(--graphite)',
}
const STATUS_LABELS: Record<string, string> = {
  planificado: 'Planificado',
  en_proceso: 'En proceso',
  publicado: 'Publicado',
  cancelado: 'Cancelado',
}
const TYPE_LABELS: Record<string, string> = {
  post: 'Post', reel: 'Reel', video: 'Video', story: 'Story', carousel: 'Carrusel',
}
const CATEGORY_LABELS: Record<string, string> = {
  aniversario: 'Aniversario',
  cumpleanos: 'Cumpleaños',
  fecha_especial: 'Fecha especial',
  prevencion: 'Prevención',
  emergencias: 'Emergencias',
  reclutamiento: 'Reclutamiento',
  reconocimiento: 'Reconocimiento',
  comunidad: 'Comunidad',
  institucional: 'Institucional',
}
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter']

interface Props {
  initialItems: ContentCalendarItem[]
  canManage: boolean
}

export function CalendarioClient({ initialItems, canManage }: Props) {
  const [items, setItems] = useState(initialItems)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const filtered = items.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    const d = new Date(i.date)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })

  const upcoming = items.filter(i => {
    const d = new Date(i.date)
    return d >= now && i.status !== 'cancelado'
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  async function handleStatusChange(eventId: string, status: ContentStatus) {
    setBusy(eventId)
    const res = await updateCalendarEventStatus(eventId, status)
    if (res.ok) {
      setItems(prev => prev.map(i => i.eventId === eventId ? { ...i, status } : i))
    } else {
      window.alert(res.error)
    }
    setBusy(null)
  }

  async function handleDelete(eventId: string) {
    if (!window.confirm('¿Eliminar este evento?')) return
    setBusy(eventId)
    const res = await deleteCalendarEvent(eventId)
    if (res.ok) {
      setItems(prev => prev.filter(i => i.eventId !== eventId))
    } else {
      window.alert(res.error)
    }
    setBusy(null)
  }

  return (
    <>
      {/* Próximos eventos */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 4 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 10 }}>
            Próximos eventos
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {upcoming.map(item => (
              <div key={item.eventId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)',
                  background: 'rgba(205, 167, 80, 0.1)', borderRadius: 2, padding: '2px 6px',
                }}>
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </div>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{item.title}</span>
                {item.type && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>{TYPE_LABELS[item.type]}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={prevMonth} className="btn btn--ghost btn--sm">‹</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--bone)', minWidth: 140, textAlign: 'center' }}>
            {MONTHS_ES[viewMonth]} {viewYear}
          </span>
          <button type="button" onClick={nextMonth} className="btn btn--ghost btn--sm">›</button>
        </div>

        <nav className="area-inbox-tabs">
          {['all', 'planificado', 'en_proceso', 'publicado', 'cancelado'].map(s => (
            <button
              key={s}
              type="button"
              className={cn('area-inbox-tab', filterStatus === s && 'area-inbox-tab--active')}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
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
            + Nuevo evento
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="guardia-empty">
          No hay eventos en {MONTHS_ES[viewMonth]} {viewYear}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.sort((a, b) => a.date.localeCompare(b.date)).map(item => (
            <CalendarItemRow
              key={item.eventId}
              item={item}
              canManage={canManage}
              busy={busy === item.eventId}
              onStatusChange={status => handleStatusChange(item.eventId, status)}
              onDelete={() => handleDelete(item.eventId)}
            />
          ))}
        </div>
      )}

      {showForm && canManage && (
        <CreateEventModal
          onClose={() => setShowForm(false)}
          onCreated={item => { setItems(prev => [item, ...prev]); setShowForm(false) }}
        />
      )}
    </>
  )
}

function CalendarItemRow({ item, canManage, busy, onStatusChange, onDelete }: {
  item: ContentCalendarItem
  canManage: boolean
  busy: boolean
  onStatusChange: (s: ContentStatus) => void
  onDelete: () => void
}) {
  const d = new Date(item.date + 'T00:00:00')
  const isPast = d < new Date()

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px',
      background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 4,
      opacity: item.status === 'cancelado' ? 0.5 : 1,
    }}>
      <div style={{
        width: 44, textAlign: 'center', flexShrink: 0,
        fontFamily: 'var(--font-mono)', borderRight: '1px solid var(--ink-line)', paddingRight: 12,
      }}>
        <div style={{ fontSize: 18, color: 'var(--bone)', fontWeight: 600 }}>{d.getDate()}</div>
        <div style={{ fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {d.toLocaleDateString('es-PE', { month: 'short' })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--bone)', fontSize: 13, marginBottom: 4 }}>{item.title}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {item.type && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {TYPE_LABELS[item.type]}
            </span>
          )}
          {item.category && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
          )}
          {item.platform?.map(p => (
            <span key={p} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p}</span>
          ))}
        </div>
        {item.caption && (
          <div style={{ fontSize: 11, color: 'var(--graphite)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 500 }}>
            {item.caption}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: STATUS_COLORS[item.status ?? 'planificado'],
          fontWeight: 600,
        }}>
          {STATUS_LABELS[item.status ?? 'planificado']}
        </span>

        {canManage && !busy && item.status !== 'cancelado' && (
          <>
            {item.status === 'planificado' && (
              <button type="button" onClick={() => onStatusChange('en_proceso')} className="btn btn--ghost btn--xs">
                Iniciar
              </button>
            )}
            {item.status === 'en_proceso' && (
              <button type="button" onClick={() => onStatusChange('publicado')} className="btn btn--ghost btn--xs" style={{ color: 'var(--emerald-glow)' }}>
                Publicar
              </button>
            )}
            <button type="button" onClick={() => onStatusChange('cancelado')} className="btn btn--ghost btn--xs" style={{ color: 'var(--graphite)' }}>
              ✕
            </button>
          </>
        )}
        {canManage && !busy && item.status === 'cancelado' && (
          <button type="button" onClick={onDelete} className="btn btn--ghost btn--xs" style={{ color: 'var(--red-glow)' }}>
            Eliminar
          </button>
        )}
        {busy && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>…</span>}
      </div>
    </div>
  )
}

function CreateEventModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (item: ContentCalendarItem) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    setError('')
    const res = await createCalendarEvent({
      title: title.trim(),
      date,
      type: type as ContentType || undefined,
      category: category as ContentCategory || undefined,
      platform: platforms.length > 0 ? platforms : undefined,
      caption: caption.trim() || undefined,
    })
    setSaving(false)
    if (res.ok && res.data) {
      onCreated({
        eventId: res.data.eventId,
        title: title.trim(),
        date,
        type: type as ContentType || undefined,
        category: category as ContentCategory || undefined,
        platform: platforms.length > 0 ? platforms : undefined,
        caption: caption.trim() || undefined,
        status: 'planificado',
        createdAt: new Date().toISOString(),
      })
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
          padding: 24, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--bone)', margin: 0 }}>
          Nuevo evento de calendario
        </h3>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>TÍTULO *</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Ej. Publicación por Día del Bombero" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>FECHA *</span>
          <input required type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>TIPO DE CONTENIDO</span>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              <option value="">— Seleccionar —</option>
              {(['post', 'reel', 'video', 'story', 'carousel'] as const).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>CATEGORÍA</span>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="">— Seleccionar —</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span style={labelStyle}>PLATAFORMAS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {PLATFORMS.map(p => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={platforms.includes(p)}
                  onChange={e => setPlatforms(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))}
                />
                <span style={{ fontSize: 12, color: 'var(--steel)', textTransform: 'capitalize' }}>{p}</span>
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>CAPTION / DESCRIPCIÓN</span>
          <textarea
            value={caption} onChange={e => setCaption(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Texto o ideas para el post…"
          />
        </label>

        {error && <div style={{ color: 'var(--red-glow)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving || !title.trim() || !date}>
            {saving ? 'Guardando…' : 'Crear evento'}
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
