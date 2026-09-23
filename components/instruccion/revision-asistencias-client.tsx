'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck, MapPin, Clock, ImageOff, ShieldCheck, ShieldAlert,
  Loader2, X, Camera, AlertTriangle,
} from 'lucide-react'
import type { RevisionAsistenciaData, RevisionRegistro, RevisionSesion } from '@/lib/instruccion/get-asistencia-data'
import { getAsistenciaSelfieUrl, revisarAsistencia } from '@/lib/instruccion/asistencia-actions'

type Filtro = 'todos' | 'pendiente' | 'observada' | 'alerta'

function fmtFecha(d: string): string {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  return `${parts[1].trim()} ${parts[0].trim()}`
}

/** ¿Este registro merece una mirada extra del instructor? */
function tieneAlerta(r: RevisionRegistro, radioM: number): boolean {
  if (!r.selfieKey) return true
  if (typeof r.distanceM === 'number' && r.distanceM > radioM) return true
  if (typeof r.accuracyM === 'number' && r.accuracyM > 100) return true
  if (r.status === 'tardanza' && !r.comentario) return true
  return false
}

const REVIEW_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'POR REVISAR', color: 'var(--brass)', bg: 'color-mix(in srgb, var(--brass) 16%, transparent)' },
  validada: { label: 'VALIDADA', color: 'var(--emerald-glow)', bg: 'color-mix(in srgb, var(--emerald-glow) 14%, transparent)' },
  observada: { label: 'OBSERVADA', color: 'var(--red-163)', bg: 'color-mix(in srgb, var(--red-163) 18%, transparent)' },
}

export function RevisionAsistenciasClient({
  data,
  canManage,
}: {
  data: RevisionAsistenciaData
  canManage: boolean
}) {
  const [sel, setSel] = useState<string | null>(data.sesiones[0]?.date ?? null)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [lightbox, setLightbox] = useState<{ url: string; reg: RevisionRegistro } | null>(null)

  const sesion: RevisionSesion | undefined = useMemo(
    () => data.sesiones.find(s => s.date === sel),
    [data.sesiones, sel],
  )

  const registros = useMemo(() => {
    if (!sesion) return []
    if (filtro === 'todos') return sesion.registros
    if (filtro === 'alerta') return sesion.registros.filter(r => tieneAlerta(r, data.radioM))
    return sesion.registros.filter(r => r.review === filtro)
  }, [sesion, filtro, data.radioM])

  if (data.sesiones.length === 0) {
    return (
      <div className="guardia-empty">
        Todavía no hay asistencias registradas. Cuando los postulantes y aspirantes marquen su
        asistencia, cada sesión aparecerá aquí con su evidencia fotográfica.
      </div>
    )
  }

  return (
    <>
      <div className="area-kpi-row" style={{ marginBottom: 18 }}>
        <div className="area-kpi">
          <div className="area-kpi-label">SESIONES</div>
          <div className="area-kpi-value mono">{data.sesiones.length}</div>
          <div className="area-kpi-sub">días con registro</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">POR REVISAR</div>
          <div className="area-kpi-value mono" style={{ color: data.totalPendientes > 0 ? 'var(--brass)' : undefined }}>
            {data.totalPendientes}
          </div>
          <div className="area-kpi-sub">evidencias sin validar</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">OBSERVADAS</div>
          <div className="area-kpi-value mono" style={{ color: data.totalObservadas > 0 ? 'var(--red-163)' : undefined }}>
            {data.totalObservadas}
          </div>
          <div className="area-kpi-sub">no cuentan para la nota</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">GEOCERCO</div>
          <div className="area-kpi-value mono">{data.radioM} m</div>
          <div className="area-kpi-sub">radio válido desde la compañía</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: 18, alignItems: 'start' }}>
        {/* Rail de sesiones */}
        <aside style={{ border: '1px solid var(--ink-line)', borderRadius: 4, background: 'var(--ink-elevated)', overflow: 'hidden' }}>
          <div style={{
            padding: '9px 12px', borderBottom: '1px solid var(--ink-line)',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
            color: 'var(--graphite)', textTransform: 'uppercase',
          }}>Sesiones</div>
          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {data.sesiones.map(s => {
              const active = s.date === sel
              return (
                <button key={s.date} type="button" onClick={() => setSel(s.date)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '10px 12px', border: 'none',
                    borderLeft: active ? '2px solid var(--red-163)' : '2px solid transparent',
                    borderBottom: '1px solid var(--ink-line)',
                    background: active ? 'var(--ink-surface)' : 'transparent',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: active ? 'var(--bone)' : 'var(--steel)' }}>
                      {s.date}
                    </span>
                    {s.dayType === 'apoyo' && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>APOYO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--graphite)', marginTop: 2 }}>
                    {s.sessionLabel} · {s.registros.length} registro{s.registros.length === 1 ? '' : 's'}
                  </div>
                  {(s.pendientes > 0 || s.observadas > 0) && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                      {s.pendientes > 0 && <Pill color="var(--brass)">{s.pendientes} por revisar</Pill>}
                      {s.observadas > 0 && <Pill color="var(--red-163)">{s.observadas} obs.</Pill>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Detalle de la sesión */}
        <section>
          {sesion && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--bone)', margin: 0, textTransform: 'capitalize' }}>
                  {fmtFecha(sesion.date)}
                </h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {sesion.dayType === 'obligatorio' ? 'Instrucción obligatoria' : 'Día de apoyo'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--ink-line)', flexWrap: 'wrap' }}>
                {([
                  ['todos', 'Todos (' + sesion.registros.length + ')'],
                  ['pendiente', 'Por revisar (' + sesion.pendientes + ')'],
                  ['observada', 'Observadas (' + sesion.observadas + ')'],
                  ['alerta', 'Con alerta (' + sesion.registros.filter(r => tieneAlerta(r, data.radioM)).length + ')'],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setFiltro(key as Filtro)}
                    style={{
                      padding: '7px 13px', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none',
                      color: filtro === key ? 'var(--bone)' : 'var(--graphite)',
                      borderBottom: filtro === key ? '2px solid var(--brass)' : '2px solid transparent',
                      marginBottom: -1, fontFamily: 'var(--font-mono)',
                    }}>{label}</button>
                ))}
              </div>

              {registros.length === 0 ? (
                <div className="guardia-empty">No hay registros con este filtro.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 8 }}>
                  {registros.map(r => (
                    <RegistroCard key={r.profileId + '-' + r.date} reg={r} radioM={data.radioM}
                      canManage={canManage} onZoom={(url) => setLightbox({ url, reg: r })} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {lightbox && <Lightbox url={lightbox.url} reg={lightbox.reg} radioM={data.radioM} onClose={() => setLightbox(null)} />}
    </>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 6px', borderRadius: 8,
      background: 'color-mix(in srgb, ' + color + ' 16%, transparent)', color,
    }}>{children}</span>
  )
}

const THUMB = 78

/** Miniatura cuadrada de la evidencia: pide la URL prefirmada al montar. */
function Evidencia({ selfieKey, onZoom }: { selfieKey?: string; onZoom: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!selfieKey) return
    let vivo = true
    getAsistenciaSelfieUrl(selfieKey)
      .then(res => { if (vivo) { if (res.ok) setUrl(res.url); else setError(true) } })
      .catch(() => { if (vivo) setError(true) })
    return () => { vivo = false }
  }, [selfieKey])

  const box: React.CSSProperties = {
    width: THUMB, height: THUMB, flexShrink: 0, borderRadius: 3,
    background: 'var(--ink-surface)', border: '1px solid var(--ink-line)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--graphite)', overflow: 'hidden',
  }

  if (!selfieKey) return (
    <div style={box} title="Sin evidencia fotográfica">
      <ImageOff className="w-4 h-4" strokeWidth={1.6} />
    </div>
  )
  if (error) return (
    <div style={box} title="No se pudo cargar la evidencia">
      <AlertTriangle className="w-4 h-4" strokeWidth={1.6} />
    </div>
  )
  if (!url) return <div style={box}><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} /></div>

  return (
    <button type="button" onClick={() => onZoom(url)} title="Ampliar evidencia"
      style={{ ...box, padding: 0, cursor: 'zoom-in' }}>
      <img src={url} alt="Evidencia de asistencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </button>
  )
}

function RegistroCard({
  reg, radioM, canManage, onZoom,
}: {
  reg: RevisionRegistro
  radioM: number
  canManage: boolean
  onZoom: (url: string) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState(reg.reviewNote ?? '')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const rs = REVIEW_STYLE[reg.review]
  const lejos = typeof reg.distanceM === 'number' && reg.distanceM > radioM
  const alerta = tieneAlerta(reg, radioM)

  function decidir(decision: 'validada' | 'observada' | 'pendiente') {
    setError(null)
    start(async () => {
      const res = await revisarAsistencia({
        profileId: reg.profileId, date: reg.date, decision,
        ...(decision === 'observada' ? { nota: motivo } : {}),
      })
      if (!res.ok) { setError(res.error); return }
      setPidiendoMotivo(false)
      router.refresh()
    })
  }

  return (
    <article style={{
      background: 'var(--ink-elevated)', borderRadius: 4,
      border: '1px solid ' + (alerta ? 'color-mix(in srgb, var(--red-163) 45%, var(--ink-line))' : 'var(--ink-line)'),
      padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <Evidencia selfieKey={reg.selfieKey} onZoom={onZoom} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--bone)', fontSize: 13, fontWeight: 600, lineHeight: 1.25 }}>
              {shortName(reg.fullName)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--graphite)' }}>
              {reg.gradeLabel}
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.05em',
            padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
            background: rs.bg, color: rs.color,
          }}>{rs.label}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: reg.status === 'tardanza' ? 'var(--flame)' : 'var(--steel)' }}>
            <Clock className="w-3 h-3" strokeWidth={1.8} />
            {reg.horaRegistro}
            {reg.status === 'tardanza' && ' · +' + (reg.lateMinutes ?? 0) + '′'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: lejos ? 'var(--red-163)' : 'var(--steel)' }}>
            <MapPin className="w-3 h-3" strokeWidth={1.8} />
            {typeof reg.distanceM === 'number' ? reg.distanceM + ' m' : 'sin GPS'}
            {typeof reg.accuracyM === 'number' && ' (±' + reg.accuracyM + ')'}
          </span>
          {typeof reg.lat === 'number' && typeof reg.lng === 'number' && (
            <a href={'https://www.google.com/maps?q=' + reg.lat + ',' + reg.lng} target="_blank" rel="noreferrer"
              style={{ color: 'var(--brass)', textDecoration: 'none' }}>ver mapa ↗</a>
          )}
        </div>

        {reg.comentario && (
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--steel)', lineHeight: 1.4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>MOTIVO · </span>
            {reg.comentario}
          </p>
        )}

        {reg.review === 'observada' && reg.reviewNote && (
          <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--red-163)', lineHeight: 1.4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}>OBSERVACIÓN · </span>
            {reg.reviewNote}
          </p>
        )}

        {reg.reviewedByName && reg.review !== 'pendiente' && (
          <div style={{ marginTop: 5, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--graphite)' }}>
            Revisó {reg.reviewedByName}
            {reg.reviewedAt && ' · ' + new Date(reg.reviewedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
          </div>
        )}

        {canManage && (
          <>
            {pidiendoMotivo && (
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
                placeholder="Motivo de la observación (ej.: la foto no corresponde a la estación)"
                style={{
                  width: '100%', marginTop: 7, padding: '6px 8px', fontSize: 11.5, resize: 'vertical',
                  background: 'var(--ink-surface)', border: '1px solid var(--ink-line)',
                  borderRadius: 3, color: 'var(--bone)',
                }} />
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              {reg.review !== 'validada' && (
                <button type="button" className="btn btn--sm" disabled={pending}
                  onClick={() => decidir('validada')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" strokeWidth={1.9} />}
                  Validar
                </button>
              )}
              {reg.review !== 'observada' ? (
                <button type="button" className="btn btn--ghost btn--sm" disabled={pending}
                  onClick={() => (pidiendoMotivo ? decidir('observada') : setPidiendoMotivo(true))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--red-163)' }}>
                  <ShieldAlert className="w-3 h-3" strokeWidth={1.9} />
                  {pidiendoMotivo ? 'Confirmar observación' : 'Observar'}
                </button>
              ) : (
                <button type="button" className="btn btn--ghost btn--sm" disabled={pending}
                  onClick={() => decidir('pendiente')}>Reabrir</button>
              )}
            </div>
            {error && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--red-163)' }}>{error}</div>}
          </>
        )}
      </div>
    </article>
  )
}

function Lightbox({ url, reg, radioM, onClose }: { url: string; reg: RevisionRegistro; radioM: number; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const lejos = typeof reg.distanceM === 'number' && reg.distanceM > radioM

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{ maxWidth: 720, width: '100%', background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--ink-line)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Camera className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
            <span style={{ color: 'var(--bone)', fontSize: 13, fontWeight: 600 }}>{shortName(reg.fullName)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--graphite)' }}>
              {reg.date} · {reg.horaRegistro}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--steel)' }}>
            <X className="w-4 h-4" strokeWidth={1.9} />
          </button>
        </div>
        <img src={url} alt="Evidencia de asistencia" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', background: '#000' }} />
        <div style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: lejos ? 'var(--red-163)' : 'var(--steel)' }}>
          <CalendarCheck className="w-3 h-3" strokeWidth={1.8} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {reg.sessionLabel} · {typeof reg.distanceM === 'number' ? reg.distanceM + ' m de la compañía' : 'sin GPS'}
          {lejos && ' · FUERA DEL RADIO (' + radioM + ' m)'}
        </div>
      </div>
    </div>
  )
}
