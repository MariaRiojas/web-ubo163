import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Truck, Flame, Moon, Radio, CheckCircle2, Wrench, AlertCircle, Clock } from 'lucide-react'
import { getOperatividadData } from '@/lib/reportes/get-operatividad-data'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function OperatividadPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('reports.view_all') && !perms.includes('company.view_all')) {
    redirect('/dashboard')
  }

  const { snapshot, guardia, emergencias, inventario } = await getOperatividadData()

  const estado = snapshot?.estado ?? 'desconocido'
  const bannerText = estado === 'operativo' ? 'EN SERVICIO'
    : estado === 'parcial' ? 'PARCIALMENTE OPERATIVO'
    : estado === 'desconocido' ? 'ESTADO SIN SINCRONIZAR' : 'INOPERATIVO'
  const bannerColor = estado === 'operativo' ? 'var(--emerald-glow)'
    : estado === 'parcial' ? 'var(--flame)'
    : estado === 'desconocido' ? 'var(--graphite)' : 'var(--red-glow)'

  const syncFecha = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null
  const syncStale = snapshot?.syncedAt ? (Date.now() - new Date(snapshot.syncedAt).getTime()) > 3 * 24 * 3600 * 1000 : true

  return (
    <div className="max-w-[1400px]">
      {/* Hero + estado */}
      <header className="area-hero" style={{ marginBottom: 16 }}>
        <div className="area-hero-seal"><Radio className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">COMANDO · ESTADO OPERATIVO</div>
          <h1 className="area-hero-title">Operatividad</h1>
          <p className="area-hero-desc">Estado actual de la Compañía: guardia, flota y actividad de emergencias.</p>
        </div>
        <div className="area-hero-jefe">
          <span className="area-hero-jefe-label">ESTADO</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: bannerColor, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: bannerColor }} />
            {bannerText}
          </span>
        </div>
      </header>

      {/* Aviso de sincronización */}
      {syncStale && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 16, background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderLeft: '3px solid var(--flame)', borderRadius: 2, fontSize: 12, color: 'var(--steel)' }}>
          <AlertCircle className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--flame)', flexShrink: 0 }} />
          <span>
            El estado en vivo (personal en turno) requiere sincronización desde una máquina del cuartel.
            {syncFecha ? ` Última: ${syncFecha}.` : ' Aún sin sincronizar.'} La guardia y las emergencias mostradas sí están al día.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi icon={<Moon className="w-5 h-5" strokeWidth={1.7} />} label="Guardia esta noche" value={`${guardia.ocupadas}/${guardia.total}`} sub="camas reservadas" accent={guardia.ocupadas > 0} />
        <Kpi icon={<Truck className="w-5 h-5" strokeWidth={1.7} />} label="Flota operativa" value={snapshot ? `${snapshot.vehiculosOperativos}/${snapshot.vehiculosTotal}` : '—'} sub="unidades" />
        <Kpi icon={<Flame className="w-5 h-5" strokeWidth={1.7} />} label="Emergencias este mes" value={emergencias.esteMes} sub="partes de la Compañía" />
        <Kpi icon={<Users className="w-5 h-5" strokeWidth={1.7} />} label="Personal en turno" value={snapshot?.personalEnTurno ?? '—'} sub={snapshot?.personalEnTurno ? 'efectivos' : 'requiere sync'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
        {/* Flota */}
        <Panel title="Flota" icon={<Truck className="w-4 h-4" strokeWidth={1.7} />} sub={snapshot ? `${snapshot.vehiculos.length} unidades` : ''}>
          {!snapshot || snapshot.vehiculos.length === 0 ? (
            <Empty>Sin flota registrada. Cárgala en el área de Máquinas o sincroniza el estado desde el cuartel.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {snapshot.vehiculos.map((v, i) => {
                const op = v.estado === 'operativo'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ink-line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {op ? <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--emerald-glow)' }} /> : <Wrench className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--red-glow)' }} />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)' }}>{v.codigo}</div>
                        <div style={{ fontSize: 11, color: 'var(--steel)' }}>{v.tipo}{v.motivo ? ` — ${v.motivo}` : ''}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: op ? 'var(--emerald-glow)' : 'var(--red-glow)' }}>
                      {op ? 'OPERATIVA' : 'FALLA'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {snapshot && (
            <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 11, color: 'var(--graphite)' }}>
              {snapshot.primerJefe && <span>1er Jefe: <span style={{ color: 'var(--steel)' }}>{snapshot.primerJefe}</span></span>}
              {snapshot.segundoJefe && <span>2do Jefe: <span style={{ color: 'var(--steel)' }}>{snapshot.segundoJefe}</span></span>}
            </div>
          )}
        </Panel>

        {/* Emergencias recientes */}
        <Panel title="Emergencias recientes" icon={<Flame className="w-4 h-4" strokeWidth={1.7} />} sub="partes de la Compañía">
          {emergencias.recientes.length === 0 ? (
            <Empty>Sin emergencias registradas recientemente.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emergencias.recientes.map(e => (
                <div key={e.numeroParte} style={{ borderLeft: '2px solid var(--brass-deep)', paddingLeft: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)' }}>{e.fecha}</span>
                    <span style={{ fontSize: 12, color: 'var(--bone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.tipo}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--steel)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.direccion}{e.distrito !== '—' ? ` · ${e.distrito}` : ''}
                  </div>
                </div>
              ))}
              <Link href="/emergencias" className="btn btn--ghost btn--sm" style={{ marginTop: 6, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <Clock className="w-3 h-3" strokeWidth={1.8} /> Ver análisis completo de emergencias
              </Link>
            </div>
          )}
        </Panel>
      </div>

      {/* Operatividad del inventario por área */}
      <div style={{ marginTop: 12 }}>
        <Panel title="Operatividad del inventario por área" icon={<Truck className="w-4 h-4" strokeWidth={1.7} />} sub="equipos operativos vs total">
          {inventario.length === 0 ? (
            <Empty>Sin inventario registrado.</Empty>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {inventario.map(a => {
                const color = a.porcentaje >= 90 ? 'var(--emerald-glow)' : a.porcentaje >= 70 ? 'var(--brass)' : 'var(--flame)'
                return (
                  <div key={a.area} style={{ background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--bone)', fontWeight: 600 }}>{a.area}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color }}>{a.porcentaje}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--ink-deep)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${a.porcentaje}%`, background: color, borderRadius: 2 }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', display: 'flex', gap: 10 }}>
                      <span>{a.operativos}/{a.total} operativos</span>
                      {a.atencion > 0 && <span style={{ color: 'var(--flame)' }}>{a.atencion} en atención</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number | string; sub: string; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderLeft: `3px solid ${accent ? 'var(--brass)' : 'var(--ink-line)'}`, borderRadius: 3, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--graphite)' }}>{label}</span>
        <span style={{ color: 'var(--brass)' }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, color: 'var(--bone)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 6 }}>{sub}</div>
    </div>
  )
}

function Panel({ title, icon, sub, children }: { title: string; icon: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--brass)' }}>{icon}</span>
        <h2 style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 600 }}>{title}</h2>
        {sub && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>{sub}</span>}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: 'var(--graphite)', padding: '8px 0' }}>{children}</p>
}
