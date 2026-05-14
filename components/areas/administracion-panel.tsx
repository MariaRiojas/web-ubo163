"use client"

import { Users, Clock, FileText, BarChart2 } from 'lucide-react'
import type {
  AdministracionExtraData,
  ServiceHoursContributor,
  PendingInternalRequest,
} from '@/lib/areas/get-administracion-data'

const GRADE_LABELS: Record<string, string> = {
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brig. Mayor',
  brigadier_general: 'Brig. General',
}

const STATUS_LABELS: Record<string, string> = {
  postulante: 'Postulante',
  aspirante_en_curso: 'Aspirante en curso',
  activo: 'Activo',
  reserva: 'Reserva',
  licencia: 'Licencia',
  retirado: 'Retirado',
}

const HOUR_TYPE_LABELS: Record<string, string> = {
  guardia_nocturna: 'Guardia',
  emergencia: 'Emergencia',
  instruccion: 'Instrucción',
  administrativo: 'Admin.',
  mantenimiento: 'Mant.',
  evento_institucional: 'Evento',
  comision: 'Comisión',
}

export function AdministracionPanel({ extra }: { extra: AdministracionExtraData }) {
  const { topContributors, personnelDistribution, pendingInternalRequests, stats } = extra

  const monthName = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPIs del mes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="area-kpi">
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users className="w-3 h-3" strokeWidth={1.8} />
            PERSONAL ACTIVO
          </div>
          <div className="area-kpi-value mono">{stats.activePersonnelCount}</div>
          <div className="area-kpi-sub">efectivos + reserva</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock className="w-3 h-3" strokeWidth={1.8} />
            HORAS · {monthName.toUpperCase()}
          </div>
          <div className="area-kpi-value mono">{stats.totalHoursThisMonth}</div>
          <div className="area-kpi-sub">promedio {stats.avgHoursPerPerson} h/persona</div>
        </div>
        <div className={`area-kpi ${stats.pendingRequestsCount > 0 ? 'area-kpi--warn' : ''}`}>
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText className="w-3 h-3" strokeWidth={1.8} />
            SOLICITUDES INTERNAS
          </div>
          <div className="area-kpi-value mono">{stats.pendingRequestsCount}</div>
          <div className="area-kpi-sub">pendientes / en proceso</div>
        </div>
      </div>

      {/* Top contribuidores de horas */}
      {topContributors.length > 0 && (
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <Clock className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
            Horas de servicio — {monthName}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topContributors.map((c, idx) => (
              <ContributorRow key={c.profileId} contributor={c} rank={idx + 1} />
            ))}
          </div>
          {topContributors.length === 0 && (
            <div className="guardia-empty">
              Sin horas registradas este mes.
            </div>
          )}
        </section>
      )}

      {/* Solicitudes internas pendientes */}
      {pendingInternalRequests.length > 0 && (
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <FileText className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--red-glow)' }} />
            Solicitudes internas pendientes ({pendingInternalRequests.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingInternalRequests.map((r) => (
              <InternalRequestRow key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}

      {/* Distribución de personal */}
      <section>
        <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
          <BarChart2 className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--steel)' }} />
          Distribución del personal
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <DistributionTable
            title="Por estado"
            data={personnelDistribution.byStatus}
            labelMap={STATUS_LABELS}
          />
          <DistributionTable
            title="Por grado"
            data={personnelDistribution.byGrade}
            labelMap={GRADE_LABELS}
          />
        </div>
      </section>

    </div>
  )
}

function ContributorRow({ contributor, rank }: { contributor: ServiceHoursContributor; rank: number }) {
  const name = shortName(contributor.fullName)
  const totalNonEmpty = Object.entries(contributor.breakdown)
    .filter(([, v]) => v > 0)

  const maxHours = contributor.totalHours
  const barWidth = Math.min(100, (contributor.totalHours / Math.max(maxHours, 1)) * 100)

  return (
    <div
      style={{
        background: 'var(--ink-deep)',
        border: '1px solid var(--ink-line)',
        borderRadius: 2,
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: rank <= 3 ? 'var(--brass)' : 'var(--graphite)',
            border: `1px solid ${rank <= 3 ? 'var(--brass-deep)' : 'var(--ink-line)'}`,
            background: rank <= 3 ? 'rgba(196, 160, 98, 0.08)' : 'transparent',
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          #{rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)' }}>{name}</div>
          <div style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            {GRADE_LABELS[contributor.grade] ?? contributor.grade}
            {contributor.codigoCgbvp && ` · ${contributor.codigoCgbvp}`}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--bone)',
            letterSpacing: '-0.02em',
          }}
        >
          {contributor.totalHours}
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--graphite)', marginLeft: 4 }}>h</span>
        </div>
      </div>

      {/* Mini barra de progreso */}
      <div style={{ height: 2, background: 'var(--ink-line)', borderRadius: 1, marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${barWidth}%`, background: 'var(--brass)', borderRadius: 1 }} />
      </div>

      {/* Desglose por tipo */}
      {totalNonEmpty.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {totalNonEmpty.map(([type, hours]) => (
            <span
              key={type}
              style={{
                padding: '2px 8px',
                background: 'var(--ink-black)',
                border: '1px solid var(--ink-line)',
                borderRadius: 2,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--steel)',
                letterSpacing: '0.04em',
              }}
            >
              {HOUR_TYPE_LABELS[type] ?? type}: {hours}h
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function InternalRequestRow({ request }: { request: PendingInternalRequest }) {
  const priorityColor = request.priority === 'urgente' || request.priority === 'alta'
    ? 'var(--red-glow)'
    : 'var(--steel)'
  const statusLabel = {
    pendiente: 'PENDIENTE',
    aprobada: 'APROBADA',
    en_proceso: 'EN PROCESO',
  }[request.status] ?? request.status.toUpperCase()

  const typeLabel = {
    requerimiento: 'REQUERIMIENTO',
    solicitud_retiro: 'RETIRO',
    reporte_averia: 'AVERÍA',
    solicitud_reporte: 'REPORTE',
    solicitud_compra: 'COMPRA',
    otro: 'OTRO',
  }[request.type] ?? request.type.toUpperCase()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--ink-deep)',
        border: '1px solid var(--ink-line)',
        borderRadius: 2,
      }}
    >
      <div
        style={{
          padding: '3px 8px',
          background: 'var(--ink-black)',
          border: '1px solid var(--ink-line)',
          borderRadius: 2,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--brass)',
          letterSpacing: '0.1em',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {typeLabel}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 2 }}>
          {request.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
          {request.code} · {request.requesterName ?? '—'} · {timeAgo(request.createdAt)}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: priorityColor, fontWeight: 600, textTransform: 'uppercase' }}>
        {request.priority}
      </div>
      <div
        style={{
          padding: '3px 8px',
          background: 'var(--ink-black)',
          border: '1px solid var(--ink-line)',
          borderRadius: 2,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--steel)',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}
      >
        {statusLabel}
      </div>
    </div>
  )
}

function DistributionTable({
  title, data, labelMap,
}: {
  title: string
  data: Record<string, number>
  labelMap: Record<string, string>
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--graphite)',
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '1px solid var(--ink-line-soft)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(([key, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{labelMap[key] ?? key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>
                  {count} <span style={{ color: 'var(--graphite)', fontWeight: 400 }}>({pct}%)</span>
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--ink-line)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brass)', borderRadius: 2 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Utilidades ───

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellidos}`
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (secs < 60) return 'ahora'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} días`
}
