"use client"

import { Flame, Clock, Users, Shield, AlertTriangle, BarChart2, Truck } from 'lucide-react'
import type { JefaturaExtraData, RecentEmergency } from '@/lib/areas/get-jefatura-data'

const ESTADO_COLORS: Record<string, string> = {
  CONTROLADA: 'var(--emerald-glow)',
  RETORNO: 'var(--emerald-glow)',
  DESPACHADA: 'var(--flame)',
  'EN CAMINO': 'var(--flame)',
  'EN ESCENA': 'var(--red-glow)',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'var(--red-glow)',
  alta: 'var(--flame)',
  media: 'var(--steel)',
  baja: 'var(--graphite)',
}

export function JefaturaPanel({ extra }: { extra: JefaturaExtraData }) {
  const { recentEmergencies, monthStats, emergencyCountByType } = extra
  const monthName = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPIs institucionales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Kpi icon={Users} label="PERSONAL ACTIVO" value={monthStats.totalPersonnel} sub="activos + reserva" />
        <Kpi icon={Clock} label={`HORAS · ${monthName.split(' ')[0]?.toUpperCase()}`} value={monthStats.totalHoursThisMonth} sub="horas registradas" />
        <Kpi icon={Flame} label="EMERGENCIAS" value={monthStats.emergenciesThisMonth} sub={`este mes`} variant={monthStats.emergenciesThisMonth > 0 ? 'warn' : undefined} />
        <Kpi icon={Shield} label="GUARDIAS" value={monthStats.guardiaThisMonth} sub="noches aceptadas" />
        <Kpi icon={AlertTriangle} label="INCIDENCIAS" value={monthStats.openIncidents} sub="abiertas" variant={monthStats.openIncidents > 0 ? 'alert' : undefined} />
        <Kpi icon={AlertTriangle} label="SOLICITUDES" value={monthStats.openRequests} sub="en trámite" variant={monthStats.openRequests > 0 ? 'warn' : undefined} />
      </div>

      {/* Distribución de emergencias por tipo */}
      {emergencyCountByType.length > 0 && (
        <section>
          <SectionTitle icon={<BarChart2 className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />} title={`Emergencias por tipo — ${monthName}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {emergencyCountByType.map((t) => {
              const max = emergencyCountByType[0]?.count ?? 1
              const pct = Math.round((t.count / max) * 100)
              return (
                <div key={t.tipo} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--bone)' }}>{t.tipo}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>{t.count}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--ink-line)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red-163)', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Partes recientes */}
      <section>
        <SectionTitle
          icon={<Flame className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--red-glow)' }} />}
          title={`Últimos ${recentEmergencies.length} partes de emergencia`}
        />
        {recentEmergencies.length === 0 ? (
          <div className="guardia-empty">Sin partes de emergencia registrados.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentEmergencies.map((em) => (
              <EmergencyCard key={em.id} emergency={em} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

function Kpi({
  icon: Icon, label, value, sub, variant,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: number
  sub: string
  variant?: 'warn' | 'alert'
}) {
  const cls = variant === 'alert' && value > 0
    ? 'area-kpi area-kpi--alert'
    : variant === 'warn' && value > 0
      ? 'area-kpi area-kpi--warn'
      : 'area-kpi'
  return (
    <div className={cls}>
      <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon className="w-3 h-3" strokeWidth={1.8} />
        {label}
      </div>
      <div className="area-kpi-value mono">{value}</div>
      <div className="area-kpi-sub">{sub}</div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="faena-section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon}
      {title}
    </h3>
  )
}

function EmergencyCard({ emergency }: { emergency: RecentEmergency }) {
  const estado = emergency.estado?.toUpperCase() ?? ''
  const estadoColor = ESTADO_COLORS[estado] ?? 'var(--steel)'
  const isActive = ['DESPACHADA', 'EN CAMINO', 'EN ESCENA'].includes(estado)

  return (
    <div
      style={{
        background: isActive ? 'rgba(220, 38, 38, 0.05)' : 'var(--ink-deep)',
        border: `1px solid ${isActive ? 'var(--red-163)' : 'var(--ink-line)'}`,
        borderRadius: 2,
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 16,
        alignItems: 'start',
      }}
    >
      {/* Número de parte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', minWidth: 64 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--brass)',
            letterSpacing: '0.06em',
          }}
        >
          {emergency.numeroParte}
        </div>
        {emergency.duracionMin != null && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--graphite)',
              textAlign: 'center',
            }}
          >
            {emergency.duracionMin} min
          </div>
        )}
      </div>

      {/* Detalle */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 4 }}>
          {emergency.tipoDescripcion ?? emergency.tipo ?? 'Sin clasificar'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--steel)', marginBottom: 6 }}>
          {[emergency.direccion, emergency.distrito].filter(Boolean).join(' · ')}
        </div>
        {/* Vehículos */}
        {emergency.vehiculos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {emergency.vehiculos.map((v) => (
              <span
                key={v}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  background: 'var(--ink-black)',
                  border: '1px solid var(--ink-line)',
                  borderRadius: 2,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--graphite)',
                  letterSpacing: '0.04em',
                }}
              >
                <Truck className="w-2.5 h-2.5" strokeWidth={1.8} />
                {v}
              </span>
            ))}
          </div>
        )}
        {emergency.alMandoTexto && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
            Al mando: {emergency.alMandoTexto}
          </div>
        )}
      </div>

      {/* Estado + fecha */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span
          style={{
            padding: '3px 8px',
            border: `1px solid ${estadoColor}`,
            background: `${estadoColor}18`,
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: estadoColor,
            fontWeight: 700,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {estado || '—'}
        </span>
        {emergency.fechaDespacho && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
            {formatDateTime(emergency.fechaDespacho)}
          </span>
        )}
      </div>
    </div>
  )
}

function formatDateTime(d: Date): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const date = new Date(d)
  return `${date.getDate().toString().padStart(2, '0')} ${meses[date.getMonth()]} · ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
