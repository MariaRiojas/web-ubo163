import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Moon, AlertTriangle, Inbox, GraduationCap, Flame,
  Megaphone, ChevronRight, ClipboardCheck, Radio, Award, Building2,
} from "lucide-react"
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data"
import { getGreeting, GRADE_LABELS, formatShortName } from "@/components/intranet/_shared"
import type { Permission } from "@/lib/auth/permissions"

export const dynamic = 'force-dynamic'

const ESTADO_COLOR: Record<string, { color: string; label: string }> = {
  operativo:   { color: 'var(--emerald-glow)', label: 'OPERATIVA' },
  parcial:     { color: 'var(--flame)',        label: 'PARCIAL' },
  inoperativo: { color: 'var(--red-glow)',     label: 'NO OPERATIVA' },
}

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'var(--red-glow)',
  importante: 'var(--flame)',
  normal: 'var(--steel)',
}

function fmtDate(iso: string | null, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { profileId, name, grade, status } = session.user
  const permissions = (session.user.permissions ?? []) as Permission[]
  const has = (p: Permission) => permissions.includes(p)

  const data = await getDashboardData({ profileId, grade, status })

  const gradeLabel = GRADE_LABELS[grade] ?? grade
  const shortName = formatShortName(name ?? '')
  const greeting = getGreeting()
  const todayLong = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const isFormacion =
    status === 'postulante' || status === 'aspirante_en_curso' ||
    grade === 'aspirante' || grade === 'postulante'

  const cs = data.companyStatus
  const estado = ESTADO_COLOR[cs?.estado ?? ''] ?? ESTADO_COLOR.operativo

  // ─── Accesos rápidos contextuales ───
  const quickLinks: { href: string; label: string; icon: typeof Moon }[] = []
  if (has('faena.create_checklist')) quickLinks.push({ href: '/faena', label: 'Faena de Servicio', icon: ClipboardCheck })
  if (has('guard.reserve_bed') || has('guards.reserve')) quickLinks.push({ href: '/guardia-nocturna', label: 'Mi Guardia', icon: Moon })
  if (has('training.access_esbas') || has('training.access_escuela_tecnica')) quickLinks.push({ href: '/capacitacion', label: 'Capacitación', icon: GraduationCap })
  quickLinks.push({ href: '/mi-compania', label: 'Mi Compañía', icon: Building2 })
  if (has('reports.view_all')) {
    quickLinks.push({ href: '/operatividad', label: 'Operatividad', icon: Radio })
    quickLinks.push({ href: '/bomberos', label: 'Bomberos', icon: Award })
  }

  const trainingPct = data.training.featured?.percent ?? data.training.percent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ─── HERO / CABECERA DE COMANDO ─── */}
      <header className="area-hero area-hero--asesoramiento" style={{ marginBottom: 0 }}>
        <div className="area-hero-seal">
          <Flame className="w-8 h-8" strokeWidth={1.4} />
        </div>
        <div className="area-hero-body">
          <div className="area-hero-ref">{greeting} · {todayLong}</div>
          <h1 className="area-hero-title">
            {gradeLabel} {shortName.split(',')[0]?.trim() || name}
          </h1>
          <p className="area-hero-desc">
            Puesto de comando · Compañía de Bomberos Voluntarios Ancón N.° 163
          </p>
        </div>
        {cs && (
          <div className="area-hero-jefe">
            <span className="area-hero-jefe-label">Estado de Compañía</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: estado.color, boxShadow: `0 0 8px ${estado.color}`,
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: estado.color, letterSpacing: '0.06em',
              }}>
                {estado.label}
              </span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
              {cs.timestamp ? fmtDate(cs.timestamp, true) : 'sin sincronizar'}
            </span>
          </div>
        )}
      </header>

      {/* ─── FILA DE KPIs ─── */}
      <div className="area-kpi-row" style={{ marginBottom: 0 }}>
        {/* Guardia de esta noche */}
        <Link href="/guardia-nocturna" className="area-kpi" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Moon className="w-3 h-3" strokeWidth={1.8} />
            GUARDIA DE ESTA NOCHE
          </div>
          <div className="area-kpi-value mono">
            {data.guard ? data.guard.reserved : '—'}
            {data.guard && (
              <span style={{ fontSize: 15, color: 'var(--steel)', fontWeight: 400 }}>
                {' '}/ {data.guard.available}
              </span>
            )}
          </div>
          <div className="area-kpi-sub">
            {data.guard
              ? `camas reservadas · ${data.guard.total} en dotación`
              : 'sin datos de dormitorios'}
          </div>
        </Link>

        {/* Incidencias abiertas */}
        <div className={`area-kpi ${data.openIncidents > 0 ? 'area-kpi--alert' : 'area-kpi--ok'}`}>
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle className="w-3 h-3" strokeWidth={1.8} />
            INCIDENCIAS ABIERTAS
          </div>
          <div className="area-kpi-value mono">{data.openIncidents}</div>
          <div className="area-kpi-sub">pendientes / en proceso</div>
        </div>

        {/* Requerimientos pendientes */}
        <div className={`area-kpi ${data.pendingRequests > 0 ? 'area-kpi--warn' : ''}`}>
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Inbox className="w-3 h-3" strokeWidth={1.8} />
            REQUERIMIENTOS
          </div>
          <div className="area-kpi-value mono">{data.pendingRequests}</div>
          <div className="area-kpi-sub">pendientes de atención</div>
        </div>

        {/* Mi capacitación */}
        <Link href="/capacitacion" className="area-kpi" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GraduationCap className="w-3 h-3" strokeWidth={1.8} />
            MI CAPACITACIÓN
          </div>
          <div className="area-kpi-value mono">
            {trainingPct}<span style={{ fontSize: 15, color: 'var(--steel)' }}>%</span>
          </div>
          <div style={{ height: 3, background: 'var(--ink-line)', borderRadius: 2, margin: '8px 0 6px' }}>
            <div style={{ height: '100%', width: `${trainingPct}%`, background: 'var(--brass)', borderRadius: 2 }} />
          </div>
          <div className="area-kpi-sub">
            {data.training.activeCount > 0
              ? `${data.training.activeCount} en curso · ${data.training.completedCount} completados`
              : `${data.training.completedCount} cursos completados`}
          </div>
        </Link>
      </div>

      {/* Aviso destacado para postulantes/aspirantes */}
      {isFormacion && data.training.featured && (
        <Link
          href="/capacitacion"
          style={{
            display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none',
            padding: '16px 20px', borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(196,160,98,0.08), transparent 60%), var(--ink-deep)',
            border: '1px solid var(--brass-deep)',
          }}
        >
          <GraduationCap className="w-6 h-6" strokeWidth={1.5} style={{ color: 'var(--brass)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 2 }}>
              Continúa tu formación: {data.training.featured.title}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)', letterSpacing: '0.04em' }}>
              {data.training.featured.percent}% completado
            </div>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--graphite)', flexShrink: 0 }} />
        </Link>
      )}

      {/* ─── DOS COLUMNAS: Emergencia + Anuncios ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

        {/* Última emergencia CGBVP */}
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <Flame className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--red-glow)' }} />
            Última emergencia CGBVP
          </h3>
          {data.lastEmergency ? (
            <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderLeft: '3px solid var(--red-163)', borderRadius: 2, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--bone)' }}>
                  {data.lastEmergency.tipo ?? 'Emergencia'}
                </span>
                {data.lastEmergency.numeroParte && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {data.lastEmergency.numeroParte}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <MetaItem label="Fecha" value={fmtDate(data.lastEmergency.fecha, true)} />
                {data.lastEmergency.estado && <MetaItem label="Estado" value={data.lastEmergency.estado} />}
                {(data.lastEmergency.direccion || data.lastEmergency.distrito) && (
                  <MetaItem
                    label="Dirección"
                    value={[data.lastEmergency.direccion, data.lastEmergency.distrito].filter(Boolean).join(' · ')}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="guardia-empty">Sin partes de emergencia registrados.</div>
          )}
        </section>

        {/* Últimos anuncios */}
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <Megaphone className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
            Últimos anuncios
          </h3>
          {data.announcements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.announcements.map(a => (
                <Link
                  key={a.id}
                  href="/comunicados"
                  style={{
                    display: 'grid', gridTemplateColumns: '4px 1fr auto', gap: 12, alignItems: 'center',
                    textDecoration: 'none', padding: '12px 16px', borderRadius: 2,
                    background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                  }}
                >
                  <span style={{ width: 4, height: '100%', minHeight: 24, background: PRIORITY_COLOR[a.priority] ?? 'var(--steel)', borderRadius: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--bone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', marginTop: 2 }}>
                      {fmtDate(a.date)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--graphite)' }} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="guardia-empty">No hay anuncios publicados.</div>
          )}
        </section>
      </div>

      {/* ─── ACCESOS RÁPIDOS ─── */}
      {quickLinks.length > 0 && (
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <ChevronRight className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--steel)' }} />
            Accesos rápidos
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                  padding: '14px 16px', borderRadius: 2,
                  background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                  color: 'var(--bone)',
                }}
              >
                <Icon className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--graphite)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--bone)' }}>{value}</span>
    </div>
  )
}
