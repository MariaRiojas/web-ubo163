"use client"

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AreaBaseRequerimientoInbox } from '@/lib/areas/get-area-base-data'
import { updateRequerimientoStatus } from '@/lib/areas/actions'
import type { InternalRequestStatus } from '@/lib/db/schema/internal-requests'

// ─── Bandeja de Requerimientos standalone ─────────────────────────────
//
// Requerimientos = TABLE.internalRequests (peticiones formales de
// compra/servicio entre secciones). No confundir con "Solicitudes"
// (TABLE.requests), que son las solicitudes informales creadas desde Faena.

export function BandejaRequerimientosStandalone({
  requerimientos,
  canManage,
}: {
  requerimientos: AreaBaseRequerimientoInbox[]
  canManage: boolean
}) {
  if (requerimientos.length === 0) {
    return (
      <div className="guardia-empty">No hay requerimientos dirigidos al área.</div>
    )
  }
  return (
    <div className="incident-list">
      {requerimientos.map((r) => (
        <RequerimientoRow key={r.id} requerimiento={r} canManage={canManage} />
      ))}
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  requerimiento: 'REQUERIMIENTO',
  solicitud_retiro: 'RETIRO',
  reporte_averia: 'AVERÍA / REPARACIÓN',
  solicitud_reporte: 'REPORTE',
  solicitud_compra: 'COMPRA',
  otro: 'OTRO',
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'PENDIENTE',
  aprobada: 'APROBADO',
  en_proceso: 'EN PROCESO',
  completada: 'COMPLETADO',
  rechazada: 'RECHAZADO',
}

function RequerimientoRow({
  requerimiento,
  canManage,
}: {
  requerimiento: AreaBaseRequerimientoInbox
  canManage: boolean
}) {
  const [status, setStatus] = useState(requerimiento.status as InternalRequestStatus)
  const [busy, setBusy] = useState(false)

  async function act(newStatus: InternalRequestStatus) {
    const prev = status
    setBusy(true)
    setStatus(newStatus)
    const res = await updateRequerimientoStatus(requerimiento.id, newStatus)
    if (!res.ok) {
      setStatus(prev)
      window.alert(res.error)
    }
    setBusy(false)
  }

  const cardClass = cn(
    'incident-card',
    ['completada', 'aprobada'].includes(status) && 'incident-card--resolved',
    status === 'en_proceso' && 'incident-card--in-progress',
    status === 'pendiente' && 'incident-card--pending',
  )
  const pillClass = ['completada', 'aprobada'].includes(status)
    ? 'incident-status-pill incident-status-pill--resolved'
    : status === 'en_proceso'
      ? 'incident-status-pill incident-status-pill--in-progress'
      : status === 'rechazada'
        ? 'incident-status-pill incident-status-pill--rejected'
        : 'incident-status-pill incident-status-pill--pending'
  const pillLabel = STATUS_LABELS[status] ?? status.toUpperCase()
  const typeLabel = TYPE_LABELS[requerimiento.type] ?? requerimiento.type.toUpperCase()
  const isTerminal = ['completada', 'rechazada'].includes(status)

  return (
    <article className={cardClass}>
      <div className="incident-card-left">
        {requerimiento.code && <div className="incident-card-code mono">{requerimiento.code}</div>}
        <div className="incident-card-category incident-card-category--reposicion">{typeLabel}</div>
      </div>
      <div>
        <h4 className="incident-card-title">{requerimiento.title}</h4>
        {requerimiento.description && (
          <p className="incident-card-desc">{requerimiento.description}</p>
        )}
        <div className="incident-card-meta">
          <div className="incident-meta-item">
            <span className="incident-meta-label">SOLICITANTE</span>
            <span>{requerimiento.requestedByName ?? '—'}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">PRIORIDAD</span>
            <span style={{ color: ['alta', 'urgente'].includes(requerimiento.priority) ? 'var(--red-glow)' : 'var(--bone)' }}>
              {capitalize(requerimiento.priority)}
            </span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">RECIBIDO</span>
            <span className="mono">{timeAgo(requerimiento.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="incident-card-status">
        <span className={pillClass}>
          {['completada', 'aprobada'].includes(status) && (
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
          )}
          {pillLabel}
        </span>
        {canManage && !isTerminal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {status === 'pendiente' && (
              <>
                <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => act('aprobada')}>
                  Aprobar
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  disabled={busy}
                  onClick={() => act('rechazada')}
                  style={{ color: 'var(--red-glow)', borderColor: 'var(--red-glow)' }}
                >
                  Rechazar
                </button>
              </>
            )}
            {status === 'aprobada' && (
              <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => act('en_proceso')}>
                Iniciar proceso
              </button>
            )}
            {status === 'en_proceso' && (
              <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => act('completada')}>
                Completar
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Utilities ────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function timeAgo(d: Date | string): string {
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (secs < 60) return 'ahora'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} días`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `hace ${weeks} sem`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months === 1 ? '' : 'es'}`
}
