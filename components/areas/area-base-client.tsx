"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  Users, Package, Inbox, AlertTriangle, FileText, Check,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  AreaBaseData,
  AreaBasePerson,
  AreaBaseInventoryRow,
  AreaBaseIncidentInbox,
  AreaBaseRequestInbox,
} from '@/lib/areas/get-area-base-data'
import { updateIncidentStatus, updateRequestStatus } from '@/lib/areas/actions'
import type { IncidentStatus } from '@/lib/db/schema/incidents'
import type { AreaRequestStatus } from '@/lib/db/schema/requests'

type TabKey = 'personal' | 'inventario' | 'bandeja' | 'custom'

export interface AreaBaseClientProps {
  data: AreaBaseData
  /** Panel extra específico del área. Si se provee, se muestra como primera tab. */
  customPanel?: {
    key: string
    label: string
    icon: React.ReactNode
    count?: number
    node: React.ReactNode
  }
  /** Tab por defecto. Si hay customPanel, default = custom */
  defaultTab?: TabKey
  /** Si true, muestra botones de acción en la bandeja (jefe/adjunto de sección) */
  canManageInbox?: boolean
}

export function AreaBaseClient({
  data, customPanel, defaultTab, canManageInbox = false,
}: AreaBaseClientProps) {
  const initialTab: TabKey = defaultTab ?? (customPanel ? 'custom' : 'personal')
  const [tab, setTab] = useState<TabKey>(initialTab)

  const totalInbox = data.stats.openIncidentsCount + data.stats.openRequestsCount

  return (
    <>
      {/* KPIs */}
      <div className="area-kpi-row">
        <div className="area-kpi">
          <div className="area-kpi-label">PERSONAL</div>
          <div className="area-kpi-value mono">{data.stats.personnelCount}</div>
          <div className="area-kpi-sub">
            {data.jefeArea
              ? `bajo ${data.jefeArea.gradeLabel} ${shortName(data.jefeArea.fullName)}`
              : 'sin responsable asignado'}
          </div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">INVENTARIO</div>
          <div className="area-kpi-value mono">{data.stats.inventoryCount}</div>
          <div className="area-kpi-sub">
            {data.stats.operativesCount} operativos
            {data.stats.damagedCount > 0 && ` · ${data.stats.damagedCount} con novedad`}
          </div>
        </div>
        {(data.stats.expiredCount > 0 || data.stats.expiringSoonCount > 0) && (
          <div
            className={cn(
              'area-kpi',
              data.stats.expiredCount > 0 ? 'area-kpi--alert' : 'area-kpi--warn',
            )}
          >
            <div className="area-kpi-label">VENCIMIENTOS</div>
            <div className="area-kpi-value mono">
              {data.stats.expiredCount + data.stats.expiringSoonCount}
            </div>
            <div className="area-kpi-sub">
              {data.stats.expiredCount > 0 && `${data.stats.expiredCount} vencidos`}
              {data.stats.expiredCount > 0 && data.stats.expiringSoonCount > 0 && ' · '}
              {data.stats.expiringSoonCount > 0 && `${data.stats.expiringSoonCount} en ≤30d`}
            </div>
          </div>
        )}
        <div className={cn('area-kpi', totalInbox > 0 && 'area-kpi--alert')}>
          <div className="area-kpi-label">BANDEJA</div>
          <div className="area-kpi-value mono">{totalInbox}</div>
          <div className="area-kpi-sub">
            {data.stats.openIncidentsCount} incidencia{data.stats.openIncidentsCount === 1 ? '' : 's'}
            {' · '}
            {data.stats.openRequestsCount} solicitud{data.stats.openRequestsCount === 1 ? '' : 'es'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="area-tabs">
        {customPanel && (
          <TabBtn active={tab === 'custom'} onClick={() => setTab('custom')} icon={customPanel.icon}>
            {customPanel.label}
            {customPanel.count != null && customPanel.count > 0 && (
              <span className="area-tab-count mono">{customPanel.count}</span>
            )}
          </TabBtn>
        )}
        <TabBtn active={tab === 'personal'} onClick={() => setTab('personal')} icon={<Users className="w-3.5 h-3.5" strokeWidth={1.8} />}>
          Personal
          <span className="area-tab-count mono">{data.stats.personnelCount}</span>
        </TabBtn>
        <TabBtn active={tab === 'inventario'} onClick={() => setTab('inventario')} icon={<Package className="w-3.5 h-3.5" strokeWidth={1.8} />}>
          Inventario
          <span className="area-tab-count mono">{data.stats.inventoryCount}</span>
        </TabBtn>
        <TabBtn active={tab === 'bandeja'} onClick={() => setTab('bandeja')} icon={<Inbox className="w-3.5 h-3.5" strokeWidth={1.8} />}>
          Bandeja recibida
          {totalInbox > 0 && (
            <span className="area-tab-count area-tab-count--urgent mono">{totalInbox}</span>
          )}
        </TabBtn>
      </nav>

      {tab === 'custom' && customPanel && customPanel.node}
      {tab === 'personal' && <PersonalTab personnel={data.personnel} />}
      {tab === 'inventario' && <InventarioTab inventory={data.inventory} />}
      {tab === 'bandeja' && (
        <BandejaTab incidents={data.incidentsInbox} requests={data.requestsInbox} canManage={canManageInbox} />
      )}
    </>
  )
}

function TabBtn({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('area-tab', active && 'area-tab--active')}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  )
}

// ─── Personal ───
function PersonalTab({ personnel }: { personnel: AreaBasePerson[] }) {
  if (personnel.length === 0) {
    return (
      <div className="guardia-empty">
        Esta área aún no tiene personal asignado.
      </div>
    )
  }
  return (
    <div className="area-personal">
      {personnel.map((p) => {
        const initials = getInitials(p.fullName)
        const rowClass = `area-person-row area-person-row--${p.role}`
        const roleClass = `area-person-role area-person-role--${p.role}`
        return (
          <div key={p.profileId} className={rowClass}>
            <div className="area-person-initials">{initials}</div>
            <div>
              <div className="area-person-name">{p.fullName}</div>
              <div className="area-person-grade">{p.gradeLabel}</div>
            </div>
            <div className={roleClass}>{p.roleLabel}</div>
            <div className="area-person-code">{p.codigoCgbvp ?? '—'}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Inventario ───
function InventarioTab({ inventory }: { inventory: AreaBaseInventoryRow[] }) {
  if (inventory.length === 0) {
    return (
      <div className="guardia-empty">
        Aún no se ha registrado inventario para esta área.
      </div>
    )
  }

  const now = new Date()
  const thirtyDays = new Date()
  thirtyDays.setDate(now.getDate() + 30)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="area-inventory-table">
        <thead>
          <tr>
            <th>NOMBRE</th>
            <th>CATEGORÍA</th>
            <th>CÓDIGO</th>
            <th>ASIGNADO / UBICACIÓN</th>
            <th>CANT.</th>
            <th>VENCIMIENTO</th>
            <th>CONDICIÓN</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((i) => {
            const condClass = `area-inventory-condicion area-inventory-condicion--${i.condition}`
            const expDate = i.expirationDate ? new Date(i.expirationDate) : null
            const expired = expDate ? expDate < now : false
            const expiringSoon = expDate ? (expDate >= now && expDate <= thirtyDays) : false
            return (
              <tr key={i.id}>
                <td style={{ fontWeight: 600, color: 'var(--bone)' }}>
                  {i.name}
                  {i.brand && (
                    <div style={{ fontSize: 10, color: 'var(--graphite)', marginTop: 2 }}>
                      {[i.brand, i.model].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {i.subcategory ?? i.category}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>
                  {i.codigoCbp ?? '—'}
                </td>
                <td style={{ fontSize: 11, color: 'var(--steel)' }}>
                  {i.assignedTo ? shortName(i.assignedTo) : (i.almacenReferencia ?? '—')}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>
                  {i.quantity}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {expDate ? (
                    <span style={{
                      color: expired ? 'var(--red-glow)'
                        : expiringSoon ? 'var(--flame)'
                        : 'var(--steel)',
                      fontWeight: expired || expiringSoon ? 600 : 400,
                    }}>
                      {formatDate(expDate)}
                      {expired && ' · VENCIDO'}
                      {expiringSoon && ' · PRÓXIMO'}
                    </span>
                  ) : '—'}
                </td>
                <td>
                  <span className={condClass}>{formatCondition(i.condition)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {inventory.length >= 150 && (
        <div style={{
          padding: 12, textAlign: 'center',
          fontSize: 11, color: 'var(--graphite)',
          fontFamily: 'var(--font-mono)',
        }}>
          Mostrando primeros 150. <Link href="/inventario" style={{ color: 'var(--brass)' }}>Ver inventario completo →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Bandeja ───
function BandejaTab({
  incidents, requests, canManage,
}: {
  incidents: AreaBaseIncidentInbox[]
  requests: AreaBaseRequestInbox[]
  canManage: boolean
}) {
  const [view, setView] = useState<'incidencias' | 'solicitudes'>('solicitudes')

  return (
    <>
      <nav className="area-inbox-tabs">
        <button
          type="button"
          className={cn('area-inbox-tab', view === 'solicitudes' && 'area-inbox-tab--active')}
          onClick={() => setView('solicitudes')}
        >
          <FileText className="w-3 h-3" strokeWidth={1.8} />
          Solicitudes <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)' }}>({requests.length})</span>
        </button>
        <button
          type="button"
          className={cn('area-inbox-tab', view === 'incidencias' && 'area-inbox-tab--active')}
          onClick={() => setView('incidencias')}
        >
          <AlertTriangle className="w-3 h-3" strokeWidth={1.8} />
          Incidencias <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)' }}>({incidents.length})</span>
        </button>
      </nav>

      {view === 'solicitudes' ? (
        requests.length === 0 ? (
          <div className="guardia-empty">No hay solicitudes dirigidas al área.</div>
        ) : (
          <div className="incident-list">
            {requests.map((r) => <RequestInboxRow key={r.id} request={r} canManage={canManage} />)}
          </div>
        )
      ) : (
        incidents.length === 0 ? (
          <div className="guardia-empty">No hay incidencias dirigidas al área.</div>
        ) : (
          <div className="incident-list">
            {incidents.map((i) => <IncidentInboxRow key={i.id} incident={i} canManage={canManage} />)}
          </div>
        )
      )}
    </>
  )
}

function IncidentInboxRow({ incident, canManage }: { incident: AreaBaseIncidentInbox; canManage: boolean }) {
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
  const pillClass = {
    resuelta: 'incident-status-pill incident-status-pill--resolved',
    en_proceso: 'incident-status-pill incident-status-pill--in-progress',
    pendiente: 'incident-status-pill incident-status-pill--pending',
    rechazada: 'incident-status-pill incident-status-pill--rejected',
  }[status] ?? 'incident-status-pill incident-status-pill--pending'
  const pillLabel = {
    resuelta: 'RESUELTA',
    en_proceso: 'EN PROCESO',
    pendiente: 'PENDIENTE',
    rechazada: 'RECHAZADA',
  }[status] ?? status.toUpperCase()
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
            <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => act('rechazada')}
              style={{ color: 'var(--red-glow)', borderColor: 'var(--red-glow)' }}>
              Rechazar
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function RequestInboxRow({ request, canManage }: { request: AreaBaseRequestInbox; canManage: boolean }) {
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
  const pillClass =
    ['completada', 'aprobada'].includes(status)
      ? 'incident-status-pill incident-status-pill--resolved'
      : status === 'en_proceso'
        ? 'incident-status-pill incident-status-pill--in-progress'
        : 'incident-status-pill incident-status-pill--pending'
  const pillLabel = {
    pendiente: 'PENDIENTE', aprobada: 'APROBADA', rechazada: 'RECHAZADA',
    en_proceso: 'EN PROCESO', completada: 'COMPLETADA', cancelada: 'CANCELADA',
  }[status] ?? status.toUpperCase()
  const categoryLabel = {
    repuesto: 'REPUESTO', reparacion: 'REPARACIÓN', reposicion_insumo: 'REPOSICIÓN',
    mantenimiento: 'MANTENIMIENTO', capacitacion: 'CAPACITACIÓN',
    permiso: 'PERMISO', otro: 'OTRO',
  }[request.category] ?? request.category.toUpperCase()
  const isTerminal = ['completada', 'cancelada', 'rechazada'].includes(status)

  return (
    <article className={cardClass}>
      <div className="incident-card-left">
        {request.code && <div className="incident-card-code mono">{request.code}</div>}
        <div className="incident-card-category incident-card-category--reposicion">
          {categoryLabel}
        </div>
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
              <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => act('rechazada')}
                style={{ color: 'var(--red-glow)', borderColor: 'var(--red-glow)' }}>
                Rechazar
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Utilities ───

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
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate().toString().padStart(2, '0')}·${meses[d.getMonth()]}·${d.getFullYear()}`
}

function formatCondition(c: string): string {
  const map: Record<string, string> = {
    operativo: 'Operativo',
    dañado: 'Dañado', danado: 'Dañado',
    fuera_servicio: 'Fuera de servicio',
    en_mantenimiento: 'Mantenimiento',
  }
  return map[c] ?? c
}

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
