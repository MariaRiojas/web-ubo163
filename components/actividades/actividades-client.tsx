'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Users,
  Building2, Cake, Flag, Loader2, X, Pencil, Trash2, AlertCircle,
} from 'lucide-react'
import type { ActividadesMes } from '@/lib/actividades/get-actividades-data'
import type { ActivityView, ActivityType, ActivityStatus } from '@/lib/db/schema/activities'
import { ACTIVITY_TYPE_LABEL } from '@/lib/db/schema/activities'
import { guardarActividad, eliminarActividad, cambiarEstadoActividad } from '@/lib/actividades/actions'
import { ActividadForm } from './actividad-form'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** Color por tipo: la grilla se lee de un vistazo. */
const TIPO_COLOR: Record<ActivityType, string> = {
  visita: 'var(--brass)',
  capacitacion_externa: 'var(--emerald-glow)',
  ceremonia: 'var(--red-163)',
  reunion: 'var(--steel)',
  simulacro: 'var(--flame)',
  instruccion: 'var(--steel)',
  curso: 'var(--emerald-glow)',
  cumpleanos: 'var(--graphite)',
  guardia: 'var(--steel)',
  otro: 'var(--graphite)',
}

const ESTADO_LABEL: Record<ActivityStatus, string> = {
  programada: 'PROGRAMADA',
  confirmada: 'CONFIRMADA',
  realizada: 'REALIZADA',
  cancelada: 'CANCELADA',
  reprogramada: 'REPROGRAMADA',
}

function fmtDiaLargo(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export function ActividadesClient({
  data,
  canManage,
  personal,
  secciones,
}: {
  data: ActividadesMes
  canManage: boolean
  personal: { id: string; fullName: string; grade: string }[]
  secciones: { id: string; key: string; name: string }[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<{ abierto: boolean; actividad?: ActivityView }>({ abierto: false })
  const [detalle, setDetalle] = useState<ActivityView | null>(null)
  const [verCumples, setVerCumples] = useState(true)

  const { anio, mes, hoy } = data

  const visibles = useMemo(
    () => data.actividades.filter(a => verCumples || a.type !== 'cumpleanos'),
    [data.actividades, verCumples],
  )

  const porDia = useMemo(() => {
    const m: Record<string, ActivityView[]> = {}
    for (const a of visibles) (m[a.date] ??= []).push(a)
    return m
  }, [visibles])

  // Celdas de la grilla: relleno inicial + días del mes
  const celdas = useMemo(() => {
    const primero = new Date(Date.UTC(anio, mes - 1, 1))
    const offset = primero.getUTCDay()
    const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
    const out: (string | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= total; d++) {
      out.push(`${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return out
  }, [anio, mes])

  function irA(delta: number) {
    const d = new Date(Date.UTC(anio, mes - 1 + delta, 1))
    router.push(`/actividades?anio=${d.getUTCFullYear()}&mes=${d.getUTCMonth() + 1}`)
  }

  const conParticipacion = data.proximas.filter(a => a.requiereEscolta || a.requiereRepresentante)

  return (
    <>
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><CalendarDays className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">COMPAÑÍA 163 · CALENDARIO</div>
          <h1 className="area-hero-title">Actividades</h1>
          <p className="area-hero-desc">
            Visitas, capacitaciones a empresas, ceremonias y todo evento que requiera
            representante o escolta. Los cumpleaños y la instrucción semanal se muestran solos.
          </p>
        </div>
        {canManage && (
          <button type="button" className="btn btn--primary btn--sm"
            onClick={() => setForm({ abierto: true })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Nueva actividad
          </button>
        )}
      </header>

      {conParticipacion.length > 0 && (
        <div style={{
          marginBottom: 18, padding: '12px 14px', borderRadius: 4,
          background: 'color-mix(in srgb, var(--brass) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--brass) 35%, transparent)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--brass)', marginBottom: 8 }}>
            REQUIEREN PARTICIPACIÓN INSTITUCIONAL
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {conParticipacion.map(a => (
              <button key={a.id} type="button" onClick={() => setDetalle(a)}
                style={{
                  background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 3,
                  padding: '6px 10px', cursor: 'pointer', textAlign: 'left', color: 'var(--bone)', fontSize: 12.5,
                }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)' }}>{a.date.slice(8)}/{a.date.slice(5, 7)}</span>
                {' · '}{a.title}
                {a.requiereEscolta && <Flag className="w-3 h-3" strokeWidth={1.9} style={{ display: 'inline', marginLeft: 6, verticalAlign: -1, color: 'var(--red-163)' }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 18, alignItems: 'start' }}>
        {/* ─── Grilla del mes ─── */}
        <section style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => irA(-1)} aria-label="Mes anterior">
                <ChevronLeft className="w-4 h-4" strokeWidth={1.9} />
              </button>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--bone)', margin: 0, minWidth: 180, textAlign: 'center' }}>
                {MESES[mes - 1]} {anio}
              </h2>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => irA(1)} aria-label="Mes siguiente">
                <ChevronRight className="w-4 h-4" strokeWidth={1.9} />
              </button>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--steel)', cursor: 'pointer' }}>
              <input type="checkbox" checked={verCumples} onChange={e => setVerCumples(e.target.checked)} />
              <Cake className="w-3.5 h-3.5" strokeWidth={1.8} /> Cumpleaños
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, background: 'var(--ink-line)', border: '1px solid var(--ink-line)', borderRadius: 4, overflow: 'hidden' }}>
            {DIAS.map(d => (
              <div key={d} style={{
                background: 'var(--ink-surface)', padding: '7px 4px', textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                color: 'var(--graphite)', textTransform: 'uppercase',
              }}>{d}</div>
            ))}

            {celdas.map((dia, i) => {
              if (!dia) return <div key={`v${i}`} style={{ background: 'var(--ink-deep)', minHeight: 92 }} />
              const eventos = porDia[dia] ?? []
              const esHoy = dia === hoy
              return (
                <div key={dia} style={{
                  background: esHoy ? 'color-mix(in srgb, var(--red-163) 9%, var(--ink-elevated))' : 'var(--ink-elevated)',
                  minHeight: 92, padding: 5, display: 'flex', flexDirection: 'column', gap: 3,
                  borderTop: esHoy ? '2px solid var(--red-163)' : '2px solid transparent',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: esHoy ? 'var(--bone)' : 'var(--graphite)', fontWeight: esHoy ? 700 : 400,
                  }}>{Number(dia.slice(8))}</div>
                  {eventos.slice(0, 3).map(a => (
                    <button key={a.id} type="button" onClick={() => setDetalle(a)} title={a.title}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                        background: 'transparent', border: 'none', padding: '1px 3px', borderRadius: 2,
                        borderLeft: `2px solid ${TIPO_COLOR[a.type]}`,
                        color: a.status === 'cancelada' ? 'var(--graphite)' : 'var(--steel)',
                        textDecoration: a.status === 'cancelada' ? 'line-through' : 'none',
                        fontSize: 10.5, lineHeight: 1.3, overflow: 'hidden',
                        whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                      {a.startTime ? `${a.startTime} ` : ''}{a.title}
                    </button>
                  ))}
                  {eventos.length > 3 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--graphite)', paddingLeft: 3 }}>
                      +{eventos.length - 3} más
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── Próximas ─── */}
        <aside>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
            color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 10,
          }}>Próximas dos semanas</div>

          {data.proximas.length === 0 ? (
            <div className="guardia-empty" style={{ fontSize: 12.5 }}>
              No hay actividades cargadas para las próximas dos semanas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.proximas.map(a => (
                <button key={a.id} type="button" onClick={() => setDetalle(a)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', background: 'var(--ink-elevated)',
                    border: '1px solid var(--ink-line)', borderLeft: `3px solid ${TIPO_COLOR[a.type]}`,
                    borderRadius: 3, padding: '9px 11px',
                  }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)', marginBottom: 3 }}>
                    {fmtDiaLargo(a.date).toUpperCase()}{a.startTime ? ` · ${a.startTime}` : ''}
                  </div>
                  <div style={{ color: 'var(--bone)', fontSize: 13, lineHeight: 1.3 }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--graphite)' }}>
                    <span>{ACTIVITY_TYPE_LABEL[a.type]}</span>
                    {a.requiereEscolta && <span style={{ color: 'var(--red-163)' }}>ESCOLTA</span>}
                    {a.requiereRepresentante && <span style={{ color: 'var(--brass)' }}>REPRESENTANTE</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {detalle && (
        <DetalleModal
          actividad={detalle}
          canManage={canManage}
          onClose={() => setDetalle(null)}
          onEditar={() => { setForm({ abierto: true, actividad: detalle }); setDetalle(null) }}
        />
      )}

      {form.abierto && (
        <ActividadForm
          actividad={form.actividad}
          personal={personal}
          secciones={secciones}
          onClose={() => setForm({ abierto: false })}
          onGuardado={() => { setForm({ abierto: false }); router.refresh() }}
        />
      )}
    </>
  )
}

function DetalleModal({
  actividad, canManage, onClose, onEditar,
}: {
  actividad: ActivityView
  canManage: boolean
  onClose: () => void
  onEditar: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const a = actividad

  function borrar() {
    setError('')
    start(async () => {
      const res = await eliminarActividad(a.id)
      if (!res.ok) { setError(res.error); return }
      onClose(); router.refresh()
    })
  }

  function marcar(status: ActivityStatus) {
    setError('')
    start(async () => {
      const res = await cambiarEstadoActividad(a.id, status)
      if (!res.ok) { setError(res.error); return }
      onClose(); router.refresh()
    })
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="intranet-theme"
        style={{ width: '100%', maxWidth: 520, background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--ink-line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)', letterSpacing: '0.08em' }}>
              {ACTIVITY_TYPE_LABEL[a.type].toUpperCase()} · {ESTADO_LABEL[a.status]}
            </div>
            <h3 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--bone)' }}>{a.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--steel)' }}>
            <X className="w-4 h-4" strokeWidth={1.9} />
          </button>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: 'var(--steel)' }}>
          <Linea icon={<CalendarDays className="w-3.5 h-3.5" strokeWidth={1.8} />}>
            {fmtDiaLargo(a.date)}{a.endDate && a.endDate !== a.date ? ` — ${fmtDiaLargo(a.endDate)}` : ''}
          </Linea>
          {(a.startTime || a.endTime) && (
            <Linea icon={<Clock className="w-3.5 h-3.5" strokeWidth={1.8} />}>
              {a.startTime}{a.endTime ? ` – ${a.endTime}` : ''}
            </Linea>
          )}
          {a.entidad && <Linea icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.8} />}>{a.entidad}</Linea>}
          {a.location && <Linea icon={<MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />}>{a.location}</Linea>}
          {(a.requiereEscolta || a.requiereRepresentante) && (
            <Linea icon={<Users className="w-3.5 h-3.5" strokeWidth={1.8} />}>
              {a.requiereRepresentante && `Representante${a.representanteNombre ? `: ${a.representanteNombre}` : ' por designar'}`}
              {a.requiereEscolta && a.requiereRepresentante && ' · '}
              {a.requiereEscolta && `Escolta${a.escoltaCantidad ? ` (${a.escoltaCantidad} efectivos)` : ''}`}
            </Linea>
          )}
          {a.description && (
            <p style={{ margin: '4px 0 0', lineHeight: 1.5, color: 'var(--steel)' }}>{a.description}</p>
          )}
          {!a.editable && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', marginTop: 4 }}>
              {a.origen === 'cumpleanos' && 'Derivada de la fecha de nacimiento del perfil'}
              {a.origen === 'instruccion' && 'Derivada del horario de instrucción'}
              {a.origen === 'convocatoria' && 'Derivada de la convocatoria de admisión'}
            </div>
          )}
          {error && <div style={{ color: 'var(--red-163)', fontSize: 12 }}>{error}</div>}
        </div>

        {canManage && a.editable && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--ink-line)' }}>
            <button type="button" className="btn btn--sm" onClick={onEditar} disabled={pending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Pencil className="w-3 h-3" strokeWidth={1.9} /> Editar
            </button>
            {a.status !== 'realizada' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => marcar('realizada')} disabled={pending}>
                Marcar realizada
              </button>
            )}
            {a.status !== 'cancelada' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => marcar('cancelada')} disabled={pending}>
                Cancelar actividad
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={borrar} disabled={pending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--red-163)', marginLeft: 'auto' }}>
              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" strokeWidth={1.9} />} Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Linea({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--graphite)', marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}
