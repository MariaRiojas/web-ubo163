"use client"

import { useState, useTransition } from 'react'
import {
  Check, X, AlertCircle, ChevronDown, ChevronUp, Edit,
  Trash2, Send, Archive, Pin, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AnuncioView } from '@/lib/anuncios/get-anuncios-data'
import {
  markAnnouncementAsRead,
  approveAnnouncement,
  rejectAnnouncement,
  submitForApproval,
  deleteMyDraft,
  archiveMyAnnouncement,
} from '@/lib/anuncios/actions'
import { AnuncioContent, getAnuncioTextLength } from './anuncio-content'

const STATUS_LABELS: Record<string, string> = {
  borrador: 'BORRADOR',
  pendiente_aprobacion: 'PENDIENTE APROBACIÓN',
  aprobado: 'APROBADO',
  rechazado: 'RECHAZADO',
  archivado: 'ARCHIVADO',
}

const PRIORITY_LABEL: Record<string, string> = {
  normal: 'NORMAL',
  importante: 'IMPORTANTE',
  urgente: 'URGENTE',
}

export type AnuncioCardMode = 'buzon' | 'mis' | 'pendiente'

export function AnuncioCard({
  anuncio,
  mode,
  onEdit,
}: {
  anuncio: AnuncioView
  mode: AnuncioCardMode
  onEdit?: (anuncio: AnuncioView) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isLong = getAnuncioTextLength(anuncio.content) > 260
  const isUnread = mode === 'buzon' && !anuncio.isRead

  const cardClass = cn(
    'anuncio-card',
    `anuncio-card--${anuncio.priority}`,
    isUnread && 'anuncio-card--unread',
    anuncio.isPinned && 'anuncio-card--pinned',
  )

  const handleMarkRead = () => {
    if (anuncio.isRead) return
    startTransition(async () => {
      await markAnnouncementAsRead(anuncio.id)
    })
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await submitForApproval(anuncio.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Enviado a aprobación')
    })
  }

  const handleDelete = () => {
    if (!confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      const res = await deleteMyDraft(anuncio.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Borrador eliminado')
    })
  }

  const handleArchive = () => {
    if (!confirm('¿Archivar este anuncio? Dejará de verse en los buzones.')) return
    startTransition(async () => {
      const res = await archiveMyAnnouncement(anuncio.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Anuncio archivado')
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveAnnouncement(anuncio.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Anuncio aprobado y publicado')
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Indique un motivo de rechazo')
      return
    }
    startTransition(async () => {
      const res = await rejectAnnouncement(anuncio.id, rejectReason.trim())
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Anuncio rechazado — el autor podrá editarlo y reenviarlo')
        setRejectMode(false)
        setRejectReason('')
      }
    })
  }

  return (
    <article
      className={cardClass}
      onMouseEnter={handleMarkRead}
    >
      <div className="anuncio-card-header">
        <div className="anuncio-card-meta">
          {anuncio.originSection && (
            <span className="anuncio-card-origin">
              {anuncio.originSection.name.toUpperCase()}
            </span>
          )}
          {anuncio.isPinned && (
            <>
              {anuncio.originSection && <span>·</span>}
              <span className="anuncio-card-pinned-flag">
                <Pin className="w-2.5 h-2.5 inline mr-1" strokeWidth={2} />
                FIJADO
              </span>
            </>
          )}
          <span>·</span>
          <span className={`anuncio-card-priority anuncio-card-priority--${anuncio.priority}`}>
            {PRIORITY_LABEL[anuncio.priority]}
          </span>
          {mode !== 'buzon' && (
            <>
              <span>·</span>
              <span className={`anuncio-status-pill anuncio-status-pill--${anuncio.status}`}>
                {STATUS_LABELS[anuncio.status] ?? anuncio.status.toUpperCase()}
              </span>
            </>
          )}
        </div>
      </div>

      <h3 className="anuncio-card-title">{anuncio.title}</h3>

      <AnuncioContent
        content={anuncio.content}
        className={cn(
          'anuncio-card-content',
          isLong && !expanded && 'anuncio-card-content--collapsed',
        )}
      />

      {isLong && (
        <button
          type="button"
          className="anuncio-card-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" strokeWidth={1.8} />
              Contraer
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" strokeWidth={1.8} />
              Leer más
            </>
          )}
        </button>
      )}

      {/* Info de rechazo si aplica */}
      {anuncio.status === 'rechazado' && anuncio.reviewNotes && (
        <div className="anuncio-review-reject-reason">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--red-glow)', marginBottom: 4 }}>
            MOTIVO DE RECHAZO
          </div>
          {anuncio.reviewNotes}
          {anuncio.reviewer && (
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--graphite)' }}>
              — {anuncio.reviewer.fullName}
            </div>
          )}
        </div>
      )}

      {/* Info de aprobación si aplica (en mis) */}
      {mode === 'mis' && anuncio.status === 'aprobado' && anuncio.reviewer && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--emerald-glow)',
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 2,
            letterSpacing: '0.02em',
          }}
        >
          <Check className="w-3 h-3 inline mr-1" strokeWidth={2.5} />
          Aprobado por {anuncio.reviewer.fullName}
          {anuncio.publishedAt && ` · ${formatDate(anuncio.publishedAt)}`}
        </div>
      )}

      {/* Footer */}
      <div className="anuncio-card-footer">
        <div className="anuncio-card-author">
          <span className="anuncio-card-author-initials">
            {getInitials(anuncio.author.fullName)}
          </span>
          <span>
            {shortName(anuncio.author.fullName)}
            {' · '}
            <span className="anuncio-card-date">
              {mode === 'buzon' && anuncio.publishedAt
                ? timeAgo(anuncio.publishedAt)
                : timeAgo(anuncio.createdAt)}
            </span>
          </span>
        </div>

        <div className="anuncio-card-actions">
          <span className="anuncio-card-audience">
            {anuncio.directRecipient ? (
              <>Directo: {shortName(anuncio.directRecipient.fullName)}</>
            ) : (
              anuncio.audienceSummary.slice(0, 2).join(' · ') +
                (anuncio.audienceSummary.length > 2 ? ` · +${anuncio.audienceSummary.length - 2}` : '')
            )}
          </span>

          {mode === 'mis' && ['borrador', 'rechazado'].includes(anuncio.status) && onEdit && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onEdit(anuncio)}
                disabled={pending}
              >
                <Edit className="w-3 h-3" strokeWidth={1.8} />
                Editar
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleSubmit}
                disabled={pending}
              >
                <Send className="w-3 h-3" strokeWidth={1.8} />
                Enviar
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleDelete}
                disabled={pending}
                title="Eliminar borrador"
              >
                <Trash2 className="w-3 h-3" strokeWidth={1.8} />
              </button>
            </>
          )}

          {mode === 'mis' && anuncio.status === 'aprobado' && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleArchive}
              disabled={pending}
              title="Archivar"
            >
              <Archive className="w-3 h-3" strokeWidth={1.8} />
              Archivar
            </button>
          )}
        </div>
      </div>

      {/* Review panel para Primer Jefe */}
      {mode === 'pendiente' && (
        <div className="anuncio-review">
          <div className="anuncio-review-label">REVISIÓN DEL PRIMER JEFE</div>
          {!rejectMode ? (
            <div className="anuncio-review-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleApprove}
                disabled={pending}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
                {pending ? 'Aprobando…' : 'Aprobar y publicar'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setRejectMode(true)}
                disabled={pending}
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
                Rechazar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                className="anuncio-composer-textarea"
                placeholder="Motivo de rechazo (obligatorio). El autor verá este mensaje."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{ minHeight: 80 }}
              />
              <div className="anuncio-review-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleReject}
                  disabled={pending || !rejectReason.trim()}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                  {pending ? 'Rechazando…' : 'Confirmar rechazo'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setRejectMode(false)
                    setRejectReason('')
                  }}
                  disabled={pending}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function getInitials(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length >= 2) {
    const ap = parts[0].trim().split(/\s+/)[0]?.[0] ?? ''
    const nm = parts[1].trim().split(/\s+/)[0]?.[0] ?? ''
    return `${nm}${ap}`.toUpperCase()
  }
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellidos}`
}

function formatDate(d: Date): string {
  const dd = new Date(d)
  const day = dd.getDate().toString().padStart(2, '0')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${day}·${months[dd.getMonth()]}·${dd.getFullYear()}`
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return 'ahora mismo'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `hace ${weeks} sem`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months === 1 ? '' : 'es'}`
}
