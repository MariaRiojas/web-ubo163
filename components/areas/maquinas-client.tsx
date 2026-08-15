"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  Users, Truck, Package, Inbox, ClipboardCheck,
  AlertTriangle, FileText, Check, Clock, QrCode,
  HeartPulse, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MaquinasAreaData, AreaPerson, AreaMachineData, AreaInventoryRow,
  AreaIncidentInbox, AreaRequestInbox, AreaChecklistLog,
} from '@/lib/areas/get-maquinas-data'
import type { ComponentType, SVGProps } from 'react'

type TabKey = 'personal' | 'maquinas' | 'inventario' | 'bandeja' | 'checklists'

export function MaquinasClient({ data }: { data: MaquinasAreaData }) {
  const [tab, setTab] = useState<TabKey>('maquinas')

  const openIncidents = data.incidentsInbox.filter(
    (i) => i.status === 'pendiente' || i.status === 'en_proceso',
  ).length
  const openRequests = data.requestsInbox.filter(
    (r) => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status),
  ).length
  const totalInbox = openIncidents + openRequests

  return (
    <>
      {/* KPIs */}
      <div className="area-kpi-row">
        <div className="area-kpi">
          <div className="area-kpi-label">PERSONAL</div>
          <div className="area-kpi-value mono">{data.stats.personnelCount}</div>
          <div className="area-kpi-sub">
            {data.jefeArea ? `bajo ${data.jefeArea.gradeLabel} ${shortName(data.jefeArea.fullName)}` : 'sin responsable asignado'}
          </div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">MÁQUINAS</div>
          <div className="area-kpi-value mono">{data.stats.machineCount}</div>
          <div className="area-kpi-sub">
            {data.stats.compartmentCount} compartimiento{data.stats.compartmentCount === 1 ? '' : 's'}
          </div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">ÍTEMS</div>
          <div className="area-kpi-value mono">{data.stats.inventoryCount}</div>
          <div className="area-kpi-sub">
            {data.stats.operativesCount} operativos · {data.stats.damagedCount} con novedad
          </div>
        </div>
        <div
          className={cn(
            'area-kpi',
            totalInbox > 0 && 'area-kpi--alert',
          )}
        >
          <div className="area-kpi-label">BANDEJA</div>
          <div className="area-kpi-value mono">{totalInbox}</div>
          <div className="area-kpi-sub">
            {openIncidents} incidencia{openIncidents === 1 ? '' : 's'} · {openRequests} solicitud{openRequests === 1 ? '' : 'es'}
          </div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">CHECKLISTS HOY</div>
          <div className="area-kpi-value mono">{data.stats.checklistsTodayCount}</div>
          <div className="area-kpi-sub">ejecuciones del turno</div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="area-tabs">
        <TabBtn active={tab === 'maquinas'} onClick={() => setTab('maquinas')} icon={Truck}>
          Máquinas
          <span className="area-tab-count mono">{data.stats.machineCount}</span>
        </TabBtn>
        <TabBtn active={tab === 'personal'} onClick={() => setTab('personal')} icon={Users}>
          Personal
          <span className="area-tab-count mono">{data.stats.personnelCount}</span>
        </TabBtn>
        <TabBtn active={tab === 'inventario'} onClick={() => setTab('inventario')} icon={Package}>
          Inventario
          <span className="area-tab-count mono">{data.stats.inventoryCount}</span>
        </TabBtn>
        <TabBtn active={tab === 'bandeja'} onClick={() => setTab('bandeja')} icon={Inbox}>
          Bandeja recibida
          {totalInbox > 0 && (
            <span className="area-tab-count area-tab-count--urgent mono">{totalInbox}</span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'checklists'} onClick={() => setTab('checklists')} icon={ClipboardCheck}>
          Checklists
        </TabBtn>
      </nav>

      {tab === 'maquinas' && <MaquinasTab data={data} />}
      {tab === 'personal' && <PersonalTab personnel={data.personnel} />}
      {tab === 'inventario' && <InventarioTab inventory={data.inventory} />}
      {tab === 'bandeja' && <BandejaTab incidents={data.incidentsInbox} requests={data.requestsInbox} />}
      {tab === 'checklists' && <ChecklistsTab log={data.recentChecklists} />}
    </>
  )
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: ComponentType<SVGProps<SVGSVGElement>>
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('area-tab', active && 'area-tab--active')}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Máquinas
// ═══════════════════════════════════════════════════════════════════

const MACHINE_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  autobomba: Truck,
  ambulancia: HeartPulse,
  rescate: Wrench,
  auxiliar: Truck,
  cisterna: Truck,
  otra: Package,
}

const MACHINE_KIND_LABEL: Record<string, string> = {
  autobomba: 'Autobomba',
  ambulancia: 'Atención prehospitalaria',
  rescate: 'Unidad de rescate técnico',
  auxiliar: 'Unidad auxiliar',
  cisterna: 'Cisterna',
  otra: 'Otra',
}

function MaquinasTab({ data }: { data: MaquinasAreaData }) {
  if (data.machines.length === 0) {
    return (
      <div className="guardia-empty">
        Aún no hay máquinas registradas en la compañía.
      </div>
    )
  }

  return (
    <div className="area-machine-list">
      {data.machines.map((m) => (
        <MachineCardUI key={m.machine.machineId} data={m} />
      ))}
    </div>
  )
}

function MachineCardUI({ data }: { data: AreaMachineData }) {
  const Icon = MACHINE_ICON[data.machine.kind] ?? Package
  const kindLabel = MACHINE_KIND_LABEL[data.machine.kind] ?? data.machine.kind

  const statusClass = `area-machine-status area-machine-status--${data.machine.status}`
  const statusLabel = {
    operativa: 'Operativa',
    mantenimiento: 'En mantenimiento',
    fuera_servicio: 'Fuera de servicio',
    baja: 'Dada de baja',
  }[data.machine.status] ?? data.machine.status

  return (
    <article className="area-machine-card">
      <div className="area-machine-header">
        <div className="area-machine-icon">
          <Icon className="w-6 h-6" strokeWidth={1.4} />
        </div>
        <div>
          <div className="area-machine-label">{data.machine.label}</div>
          <div className="area-machine-kind">{kindLabel}</div>
          <div className="area-machine-meta">
            {data.machine.codigoCgbvp && <span>CGBVP {data.machine.codigoCgbvp}</span>}
            {data.machine.plate && (
              <>
                <span>·</span>
                <span>Placa {data.machine.plate}</span>
              </>
            )}
            <span>·</span>
            <span>
              {data.totalCompartments} compartimiento{data.totalCompartments === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>
              {data.totalInventoryItems} ítem{data.totalInventoryItems === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className={statusClass}>{statusLabel}</div>
      </div>

      {data.compartments.length > 0 && (
        <div className="area-compartments">
          {data.compartments.map((c) => (
            <div key={c.id} className="area-compartment">
              <div>
                <div className="area-compartment-name">{c.name}</div>
                <div className="area-compartment-meta">
                  {c.type} · {c.itemCount} ítem{c.itemCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="area-compartment-qr" title="Código QR físico">
                {c.qrCode}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Personal
// ═══════════════════════════════════════════════════════════════════

function PersonalTab({ personnel }: { personnel: AreaPerson[] }) {
  if (personnel.length === 0) {
    return (
      <div className="guardia-empty">
        Esta área aún no tiene personal asignado.
      </div>
    )
  }

  return (
    <div className="area-personal">
      {personnel.map((p) => (
        <PersonRow key={p.profileId} person={p} />
      ))}
    </div>
  )
}

function PersonRow({ person }: { person: AreaPerson }) {
  const initials = getInitials(person.fullName)
  const rowClass = `area-person-row area-person-row--${person.role}`
  const roleClass = `area-person-role area-person-role--${person.role}`

  return (
    <div className={rowClass}>
      <div className="area-person-initials">{initials}</div>
      <div>
        <div className="area-person-name">{person.fullName}</div>
        <div className="area-person-grade">{person.gradeLabel}</div>
      </div>
      <div className={roleClass}>{person.roleLabel}</div>
      <div className="area-person-code">{person.codigoCgbvp ?? '—'}</div>
    </div>
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

// ═══════════════════════════════════════════════════════════════════
// Tab: Inventario
// ═══════════════════════════════════════════════════════════════════

function InventarioTab({ inventory }: { inventory: AreaInventoryRow[] }) {
  if (inventory.length === 0) {
    return (
      <div className="guardia-empty">
        Aún no se ha registrado inventario para esta área.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="area-inventory-table">
        <thead>
          <tr>
            <th>NOMBRE</th>
            <th>CATEGORÍA</th>
            <th>CÓDIGO CBP</th>
            <th>UBICACIÓN</th>
            <th>MARCA</th>
            <th>CONDICIÓN</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((i) => {
            const ubicacion =
              i.compartmentName && i.machineLabel
                ? `${i.machineLabel} → ${i.compartmentName}`
                : i.almacenReferencia ?? '—'
            const condClass = `area-inventory-condicion area-inventory-condicion--${i.condition}`
            return (
              <tr key={i.id}>
                <td style={{ fontWeight: 600, color: 'var(--bone)' }}>{i.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {i.subcategory ?? i.category}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>
                  {i.codigoCbp ?? '—'}
                </td>
                <td style={{ fontSize: 11, color: 'var(--steel)' }}>{ubicacion}</td>
                <td style={{ color: 'var(--steel)' }}>{i.brand ?? '—'}</td>
                <td>
                  <span className={condClass}>{formatCondition(i.condition)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {inventory.length >= 100 && (
        <div style={{
          padding: 12,
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--graphite)',
          fontFamily: 'var(--font-mono)',
        }}>
          Mostrando primeros 100. <Link href="/inventario" style={{ color: 'var(--brass)' }}>Ver inventario completo →</Link>
        </div>
      )}
    </div>
  )
}

function formatCondition(c: string): string {
  const map: Record<string, string> = {
    operativo: 'Operativo',
    dañado: 'Dañado',
    danado: 'Dañado',
    fuera_servicio: 'Fuera de servicio',
    en_mantenimiento: 'Mantenimiento',
  }
  return map[c] ?? c
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Bandeja recibida
// ═══════════════════════════════════════════════════════════════════

function BandejaTab({
  incidents, requests,
}: {
  incidents: AreaIncidentInbox[]
  requests: AreaRequestInbox[]
}) {
  const [view, setView] = useState<'incidencias' | 'solicitudes'>('incidencias')

  return (
    <>
      <nav className="area-inbox-tabs">
        <button
          type="button"
          className={cn('area-inbox-tab', view === 'incidencias' && 'area-inbox-tab--active')}
          onClick={() => setView('incidencias')}
        >
          <AlertTriangle className="w-3 h-3" strokeWidth={1.8} />
          Incidencias
          <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
            ({incidents.length})
          </span>
        </button>
        <button
          type="button"
          className={cn('area-inbox-tab', view === 'solicitudes' && 'area-inbox-tab--active')}
          onClick={() => setView('solicitudes')}
        >
          <FileText className="w-3 h-3" strokeWidth={1.8} />
          Solicitudes
          <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
            ({requests.length})
          </span>
        </button>
      </nav>

      {view === 'incidencias' ? (
        incidents.length === 0 ? (
          <div className="guardia-empty">No hay incidencias dirigidas al área.</div>
        ) : (
          <div className="incident-list">
            {incidents.map((i) => <IncidentInboxRow key={i.id} incident={i} />)}
          </div>
        )
      ) : (
        requests.length === 0 ? (
          <div className="guardia-empty">No hay solicitudes dirigidas al área.</div>
        ) : (
          <div className="incident-list">
            {requests.map((r) => <RequestInboxRow key={r.id} request={r} />)}
          </div>
        )
      )}
    </>
  )
}

function IncidentInboxRow({ incident }: { incident: AreaIncidentInbox }) {
  const cardClass = cn(
    'incident-card',
    incident.status === 'resuelta' && 'incident-card--resolved',
    incident.status === 'en_proceso' && 'incident-card--in-progress',
    incident.status === 'pendiente' && 'incident-card--pending',
  )

  const pillClass = {
    resuelta: 'incident-status-pill incident-status-pill--resolved',
    en_proceso: 'incident-status-pill incident-status-pill--in-progress',
    pendiente: 'incident-status-pill incident-status-pill--pending',
    rechazada: 'incident-status-pill incident-status-pill--rejected',
  }[incident.status] ?? 'incident-status-pill incident-status-pill--pending'

  const pillLabel = {
    resuelta: 'RESUELTA',
    en_proceso: 'EN PROCESO',
    pendiente: 'PENDIENTE',
    rechazada: 'RECHAZADA',
  }[incident.status] ?? incident.status.toUpperCase()

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
        <div className="incident-card-meta">
          <div className="incident-meta-item">
            <span className="incident-meta-label">REPORTADA POR</span>
            <span>{incident.reportedByName ?? '—'}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">PRIORIDAD</span>
            <span style={{ color: incident.priority === 'alta' || incident.priority === 'urgente' ? 'var(--red-glow)' : 'var(--bone)' }}>
              {capitalize(incident.priority)}
            </span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">RECIBIDA</span>
            <span className="mono">{timeAgo(new Date(incident.createdAt))}</span>
          </div>
        </div>
      </div>
      <div className="incident-card-status">
        <span className={pillClass}>
          {incident.status === 'resuelta' && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
          {pillLabel}
        </span>
      </div>
    </article>
  )
}

function RequestInboxRow({ request }: { request: AreaRequestInbox }) {
  const cardClass = cn(
    'incident-card',
    ['completada', 'aprobada'].includes(request.status) && 'incident-card--resolved',
    request.status === 'en_proceso' && 'incident-card--in-progress',
    request.status === 'pendiente' && 'incident-card--pending',
  )

  const pillClass =
    ['completada', 'aprobada'].includes(request.status)
      ? 'incident-status-pill incident-status-pill--resolved'
      : request.status === 'en_proceso'
        ? 'incident-status-pill incident-status-pill--in-progress'
        : 'incident-status-pill incident-status-pill--pending'

  const pillLabel = {
    pendiente: 'PENDIENTE',
    aprobada: 'APROBADA',
    rechazada: 'RECHAZADA',
    en_proceso: 'EN PROCESO',
    completada: 'COMPLETADA',
    cancelada: 'CANCELADA',
  }[request.status] ?? request.status.toUpperCase()

  const categoryLabel = {
    repuesto: 'REPUESTO',
    reparacion: 'REPARACIÓN',
    reposicion_insumo: 'REPOSICIÓN',
    mantenimiento: 'MANTENIMIENTO',
    capacitacion: 'CAPACITACIÓN',
    permiso: 'PERMISO',
    otro: 'OTRO',
  }[request.category] ?? request.category.toUpperCase()

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
            <span className="mono">{timeAgo(new Date(request.createdAt))}</span>
          </div>
        </div>
      </div>
      <div className="incident-card-status">
        <span className={pillClass}>
          {['completada', 'aprobada'].includes(request.status) && (
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
          )}
          {pillLabel}
        </span>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Checklists
// ═══════════════════════════════════════════════════════════════════

function ChecklistsTab({ log }: { log: AreaChecklistLog[] }) {
  if (log.length === 0) {
    return (
      <div className="guardia-empty">
        Aún no se ha ejecutado ningún checklist en esta área.
      </div>
    )
  }

  return (
    <div className="area-checklist-history">
      {log.map((entry) => <ChecklistRow key={entry.id} entry={entry} />)}
    </div>
  )
}

function ChecklistRow({ entry }: { entry: AreaChecklistLog }) {
  const rowClass = `area-checklist-row area-checklist-row--${entry.status}`
  const statusClass = `area-checklist-status area-checklist-status--${entry.status}`

  const statusLabel = {
    completado: 'COMPLETADO',
    en_curso: 'EN CURSO',
    diferido: 'DIFERIDO',
    vencido: 'VENCIDO',
  }[entry.status] ?? entry.status.toUpperCase()

  const freqLabel = {
    turno_manana: 'Turno mañana',
    turno_tarde: 'Turno tarde',
    turno_noche: 'Turno noche',
    post_emergencia: 'Post-emergencia',
    manual: 'Manual',
  }[entry.frequency] ?? entry.frequency

  return (
    <div className={rowClass}>
      <div className="area-checklist-time mono">{formatDateTime(new Date(entry.startedAt))}</div>
      <div>
        <div className="area-checklist-title">
          {entry.machineLabel} → {entry.compartmentName}
        </div>
        <div className="area-checklist-sub">{freqLabel}</div>
      </div>
      <div className="area-checklist-performer">
        {entry.performerName ? shortName(entry.performerName) : '—'}
      </div>
      <div className={statusClass}>
        {entry.status === 'completado' && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
        {entry.status === 'en_curso' && <Clock className="w-2.5 h-2.5" strokeWidth={2} />}
        {statusLabel}
      </div>
    </div>
  )
}

function formatDateTime(d: Date): string {
  const dd = new Date(d)
  const iso = dd.toISOString().slice(5, 10).replace('-', '/')
  const h = dd.getHours().toString().padStart(2, '0')
  const m = dd.getMinutes().toString().padStart(2, '0')
  return `${iso} ${h}:${m}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return 'hace unos segundos'
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
