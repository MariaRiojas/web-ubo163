"use client"

import { useState } from 'react'
import { Check, AlertTriangle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AreaBaseIncidentInbox, AreaBaseRequestInbox } from '@/lib/areas/get-area-base-data'
import { updateIncidentStatus, updateRequestStatus } from '@/lib/areas/actions'
import type { IncidentStatus } from '@/lib/db/schema/incidents'
import type { AreaRequestStatus } from '@/lib/db/schema/requests'

// ─── Bandeja de Incidencias standalone ───────────────────────────────

export function BandejaIncidenciasStandalone({
  incidents,
  canManage,
}: {
  incidents: AreaBaseIncidentInbox[]
  canManage: boolean
}) {
  if (incidents.length === 0) {
    return (
      <div className="guardia-empty">No hay incidencias dirigidas al área.</div>
    )
  }
  return (
    <div className="incident-list">
      {incidents.map((i) => (
        <IncidentRow key={i.id} incident={i} canManage={canManage} />
      ))}
    </div>
  )
}

// ─── Bandeja de Solicitudes standalone ───────────────────────────────

export function BandejaSolicitudesStandalone({
  requests,
  canManage,
}: {
  requests: AreaBaseRequestInbox[]
  canManage: boolean
}) {
  if (requests.length === 0) {
    return (
      <div className="guardia-empty">No hay solicitudes dirigidas al área.</div>
    )
  }
  return (
    <div className="incident-list">
      {requests.map((r) => (
        <RequestRow key={r.id} request={r} canManage={canManage} />
      ))}
    </div>
  )
}

// ─── Rows ─────────────────────────────────────────────────────────────

function IncidentRow({ incident, canManage }: { incident: AreaBaseIncidentInbox; canManage: boolean }) {
  const [status, setStatus] = useState(incident.status)
  const [busy, setBusy] = useState(false)

  async function act(newStatus: IncidentStatus) {
    const prev = status
    setBusy(true)
    setStatus(newStatus)
    const res = await updateIncidentStatus(incident.id, newStatus)
    if (!res.ok) {
      setStatus(prev)
      window.alert(res.error)
    }
    setBusy(false)
  }

  const cardClass = cn(
    'incident-card',
    status === 'resuelta' && 'incident-card--resolved',
    status === 'en_proceso' && 'incident-card--in-progress',
    status === 'pendiente' && 'incident-card--pending',
  )
  const pillClass = ({
    resuelta: 'incident-status-pill incident-status-pill--resolved',
    en_proceso: 'incident-status-pill incident-status-pill--in-progress',
    pendiente: 'incident-status-pill incident-status-pill--pending',
    rechazada: 'incident-status-pill incident-status-pill--rejected',
  } as Record<string, string>)[status] ?? 'incident-status-pill incident-status-pill--pending'
  const pillLabel = ({
    resuelta: 'RESUELTA', en_proceso: 'EN PROCESO',
    pendiente: 'PENDIENTE', rechazada: 'RECHAZADA',
  } as Record<string, string>)[status] ?? status.toUpperCase()
  const isTerminal = status === 'resuelta' || status === 'rechazada'

  return (
    <article className={cardClass}>
      <div className="incident-card-left">
        {incident.code && <div className="incident-card-code mono">{incident.code}</div>}
        {incident.category && (
          <div className="incident-card-category incident-card-category--equipamiento">
            {incident.category.toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <h4 className="incident-card-title">{incident.title}</h4>
        <p className="incident-card-desc">{incident.description}</p>
        <div className="incident-card-meta">
          <div className="incident-meta-item">
            <span className="incident-meta-label">REPORTADA POR</span>
            <span>{incident.reportedByName ?? '—'}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">PRIORIDAD</span>
            <span style={{ color: ['alta', 'urgente'].includes(incident.priority) ? 'var(--red-glow)' : 'var(--bone)' }}>
              {capitalize(incident.priority)}
            </span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">RECIBIDA</span>
            <span className="mono">{timeAgo(incident.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="incident-card-status">
        <span className={pillClass}>
          {status === 'resuelta' && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
          {pillLabel}
        </span>
        {canManage && !isTerminal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {status === 'pendiente' && (
              <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => act('en_proceso')}>
                Tomar
              </button>
            )}
            {status === 'en_proceso' && (
              <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => act('resuelta')}>
                Resolver
              </button>
            )}
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={busy}
              onClick={() => act('rechazada')}
              style={{ color: 'var(--red-glow)', borderColor: 'var(--red-glow)' }}
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function RequestRow({ request, canManage }: { request: AreaBaseRequestInbox; canManage: boolean }) {
  const [status, setStatus] = useState(request.status)
  const [busy, setBusy] = useState(false)

  async function act(newStatus: AreaRequestStatus) {
    const prev = status
    setBusy(true)
    setStatus(newStatus)
    const res = await updateRequestStatus(request.id, newStatus)
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
  const pillClass = (['completada', 'aprobada'].includes(status)
    ? 'incident-status-pill incident-status-pill--resolved'
    : status === 'en_proceso'
      ? 'incident-status-pill incident-status-pill--in-progress'
      : 'incident-status-pill incident-status-pill--pending')
  const pillLabel = ({
    pendiente: 'PENDIENTE', aprobada: 'APROBADA', rechazada: 'RECHAZADA',
    en_proceso: 'EN PROCESO', completada: 'COMPLETADA', cancelada: 'CANCELADA',
  } as Record<string, string>)[status] ?? status.toUpperCase()
  const categoryLabel = ({
    repuesto: 'REPUESTO', reparacion: 'REPARACIÓN', reposicion_insumo: 'REPOSICIÓN',
    mantenimiento: 'MANTENIMIENTO', capacitacion: 'CAPACITACIÓN',
    permiso: 'PERMISO', otro: 'OTRO',
  } as Record<string, string>)[request.category] ?? request.category.toUpperCase()
  const isTerminal = ['completada', 'cancelada', 'rechazada'].includes(status)

  return (
    <article className={cardClass}>
      <div className="incident-card-left">
        {request.code && <div className="incident-card-code mono">{request.code}</div>}
        <div className="incident-card-category incident-card-category--reposicion">{categoryLabel}</div>
      </div>
      <div>
        <h4 className="incident-card-title">{request.title}</h4>
        <p className="incident-card-desc">{request.description}</p>
        <div className="incident-card-meta">
          <div className="incident-meta-item">
            <span className="incident-meta-label">SOLICITANTE</span>
            <span>{request.createdByName ?? '—'}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">PRIORIDAD</span>
            <span>{capitalize(request.priority)}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">RECIBIDA</span>
            <span className="mono">{timeAgo(request.createdAt)}</span>
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
              <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => act('aprobada')}>
                Aprobar
              </button>
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
            {status !== 'rechazada' && (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                disabled={busy}
                onClick={() => act('rechazada')}
                style={{ color: 'var(--red-glow)', borderColor: 'var(--red-glow)' }}
              >
                Rechazar
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
