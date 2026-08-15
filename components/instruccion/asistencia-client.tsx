'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, Clock, AlertTriangle, CheckCircle2, HandHeart, MapPin, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { registrarMiAsistencia, getAsistenciaSelfieUploadUrl } from '@/lib/instruccion/asistencia-actions'
import { distanceToCompany, GEOFENCE_RADIUS_M } from '@/lib/instruccion/geo'
import { companyConfig } from '@/company.config'
import type { MiAsistenciaData } from '@/lib/instruccion/get-asistencia-data'

const DIA_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fechaLarga(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return `${DIA_LARGO[d.getUTCDay()]} ${d.getUTCDate()} de ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getUTCMonth()]}. ${d.getUTCFullYear()}`
}
function horaDe(iso?: string) { return iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : '' }

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

interface Geo { lat: number; lng: number; accuracy: number; distance: number; within: boolean }

export function AsistenciaInstruccionClient({ data, nombre }: { data: MiAsistenciaData; nombre: string }) {
  const router = useRouter()
  const { today, yaRegistroHoy, registroHoy, records, resumen } = data
  const [comentario, setComentario] = useState('')
  const [forceComment, setForceComment] = useState(false)
  const [pending, startTransition] = useTransition()

  // Captura anti-fraude
  const [geo, setGeo] = useState<Geo | null>(null)
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'ok' | 'error'>('idle')
  const [geoErr, setGeoErr] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const requiereComentario = (today.hasScheduledSession && today.isLate) || forceComment

  useEffect(() => {
    if (!yaRegistroHoy) obtenerUbicacion()
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function obtenerUbicacion() {
    if (!('geolocation' in navigator)) { setGeoState('error'); setGeoErr('Tu dispositivo no permite geolocalización.'); return }
    setGeoState('locating'); setGeoErr(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords
        const distance = distanceToCompany(latitude, longitude)
        setGeo({ lat: latitude, lng: longitude, accuracy, distance, within: distance <= GEOFENCE_RADIUS_M })
        setGeoState('ok')
      },
      () => { setGeoState('error'); setGeoErr('No pudimos obtener tu ubicación. Activa el GPS y permite el acceso a la ubicación.') },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Debe ser una foto'); return }
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhoto(f); setPhotoUrl(URL.createObjectURL(f))
  }

  const puedeRegistrar = geo?.within && !!photo && (!requiereComentario || comentario.trim().length > 0)

  const registrar = () => {
    if (!geo) { toast.error('Falta tu ubicación'); return }
    if (!geo.within) { toast.error(`Estás a ${geo.distance} m de la compañía`); return }
    if (!photo) { toast.error('Toma la foto de evidencia'); return }
    if (requiereComentario && !comentario.trim()) { toast.error('Indica el motivo de la tardanza'); return }

    startTransition(async () => {
      // 1) subir evidencia
      const contentType = photo.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const up = await getAsistenciaSelfieUploadUrl({ contentType, sizeBytes: photo.size })
      if (!up.ok) { toast.error(up.error); return }
      const put = await fetch(up.url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: photo })
      if (!put.ok) { toast.error('No se pudo subir la foto'); return }

      // 2) registrar
      const res = await registrarMiAsistencia({
        comentario: comentario.trim() || undefined,
        lat: geo.lat, lng: geo.lng, accuracyM: geo.accuracy, selfieKey: up.key,
      })
      if (!res.ok) {
        if (/tardanza/i.test(res.error)) setForceComment(true)
        toast.error(res.error); return
      }
      toast.success(res.status === 'tardanza' ? 'Asistencia registrada (con tardanza)' : '¡Asistencia registrada!')
      router.refresh()
    })
  }

  return (
    <>
      <header style={{ marginBottom: 18 }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '0.14em', color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 4 }}>ÁREA DE INSTRUCCIÓN · FORMACIÓN</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--bone)', lineHeight: 1.1 }}>Mi Asistencia</h1>
        <p style={{ color: 'var(--steel)', fontSize: 13, marginTop: 4 }}>Hola, {nombre.split(' ')[0]}. Marca tu asistencia estando en la compañía.</p>
      </header>

      {/* ── Tarjeta principal de HOY ── */}
      <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 4, padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <CalendarCheck className="w-5 h-5" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--bone)' }}>{fechaLarga(today.dateStr)}</span>
          {today.dayType === 'obligatorio'
            ? <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brass)', border: '1px solid var(--brass)', borderRadius: 2, padding: '2px 7px' }}>Día obligatorio · {today.sessionLabel}</span>
            : <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--steel)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '2px 7px' }}>Día de apoyo</span>}
        </div>
        {today.hasScheduledSession && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...mono, fontSize: 12, color: 'var(--steel)', marginBottom: 14 }}>
            <Clock className="w-3.5 h-3.5" strokeWidth={1.8} /> Horario: {today.scheduledLabel}
          </div>
        )}
        {!today.hasScheduledSession && (
          <p style={{ ...mono, fontSize: 12, color: 'var(--graphite)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <HandHeart className="w-3.5 h-3.5" strokeWidth={1.8} /> Hoy no hay instrucción programada. Si viniste a apoyar, igual puedes registrarte.
          </p>
        )}

        {yaRegistroHoy && registroHoy ? (
          <div style={{ border: `1px solid ${registroHoy.status === 'tardanza' ? 'var(--flame)' : 'var(--emerald-glow)'}`, background: `color-mix(in srgb, ${registroHoy.status === 'tardanza' ? 'var(--flame)' : 'var(--emerald-glow)'} 10%, transparent)`, borderRadius: 3, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: registroHoy.status === 'tardanza' ? 'var(--flame)' : 'var(--emerald-glow)', fontWeight: 700, fontSize: 15 }}>
              <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
              {registroHoy.status === 'tardanza' ? 'Registrado con tardanza' : 'Asistencia registrada'}
            </div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--steel)', marginTop: 6 }}>
              Marcaste a las <b style={{ color: 'var(--bone)' }}>{horaDe(registroHoy.registeredAt)}</b>
              {registroHoy.status === 'tardanza' && registroHoy.lateMinutes ? ` · ${registroHoy.lateMinutes} min después del inicio` : ''}
              {typeof registroHoy.distanceM === 'number' ? ` · a ${registroHoy.distanceM} m de la estación` : ''}
            </div>
            {registroHoy.comentario && <div style={{ ...mono, fontSize: 12, color: 'var(--graphite)', marginTop: 4 }}>“{registroHoy.comentario}”</div>}
          </div>
        ) : (
          <div>
            {/* Paso 1 · Ubicación */}
            <StepBox
              icon={<MapPin className="w-4 h-4" strokeWidth={1.9} />}
              title="1 · Tu ubicación"
              done={!!geo?.within}
              danger={geoState === 'error' || (!!geo && !geo.within)}
            >
              {geoState === 'locating' && <span style={{ ...mono, fontSize: 12, color: 'var(--steel)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Obteniendo ubicación…</span>}
              {geoState === 'error' && <div style={{ ...mono, fontSize: 12, color: 'var(--flame)' }}>{geoErr} <button onClick={obtenerUbicacion} style={linkBtn}>reintentar</button></div>}
              {geo && geo.within && <span style={{ ...mono, fontSize: 12, color: 'var(--emerald-glow)' }}>Estás en la compañía ✓ (a {geo.distance} m)</span>}
              {geo && !geo.within && <div style={{ ...mono, fontSize: 12, color: 'var(--flame)' }}>Estás a {geo.distance} m de la compañía — debes acercarte (máx. {GEOFENCE_RADIUS_M} m). <button onClick={obtenerUbicacion} style={linkBtn}>reintentar</button></div>}
            </StepBox>

            {/* Paso 2 · Evidencia */}
            <StepBox icon={<Camera className="w-4 h-4" strokeWidth={1.9} />} title="2 · Foto de evidencia" done={!!photo}>
              <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={onPickPhoto} style={{ display: 'none' }} />
              {!photo
                ? <button onClick={() => fileRef.current?.click()} className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Camera className="w-3.5 h-3.5" strokeWidth={1.8} /> Tomar foto</button>
                : <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl!} alt="evidencia" style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 3, border: '1px solid var(--ink-line)' }} />
                    <span style={{ ...mono, fontSize: 12, color: 'var(--emerald-glow)' }}>Foto lista ✓</span>
                    <button onClick={() => fileRef.current?.click()} style={linkBtn}>cambiar</button>
                  </div>}
            </StepBox>

            {/* Tardanza */}
            {requiereComentario && (
              <div style={{ border: '1px solid var(--flame)', background: 'color-mix(in srgb, var(--flame) 8%, transparent)', borderRadius: 3, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--flame)', ...mono, fontSize: 12, marginBottom: 8 }}>
                  <AlertTriangle className="w-4 h-4" strokeWidth={2} /> Llegaste después del inicio — indica el motivo de la tardanza
                </div>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={2} placeholder="Ej. trabajo, tráfico, permiso del instructor…"
                  style={{ width: '100%', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '9px 11px', ...mono, fontSize: 13, borderRadius: 2, resize: 'vertical' }} />
              </div>
            )}

            <button onClick={registrar} disabled={pending || !puedeRegistrar}
              style={{ width: '100%', padding: '18px', border: 'none', borderRadius: 3, cursor: pending || !puedeRegistrar ? 'not-allowed' : 'pointer',
                background: !puedeRegistrar ? 'var(--ink-surface)' : today.isLate ? 'var(--flame)' : 'var(--emerald-glow)',
                color: !puedeRegistrar ? 'var(--graphite)' : 'var(--ink-black)',
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '0.01em', opacity: pending ? 0.7 : 1, transition: 'background .2s' }}>
              {pending ? 'Registrando…' : today.isLate ? 'Registrar mi tardanza' : 'Registrar mi asistencia'}
            </button>
            {!puedeRegistrar && !pending && (
              <p style={{ ...mono, fontSize: 11, color: 'var(--graphite)', marginTop: 8, textAlign: 'center' }}>
                {!geo?.within ? 'Debes estar en la compañía' : !photo ? 'Falta la foto de evidencia' : 'Completa el motivo de la tardanza'}
              </p>
            )}
            {!requiereComentario && (
              <button onClick={() => setForceComment(true)} style={{ background: 'transparent', border: 'none', color: 'var(--steel)', ...mono, fontSize: 11, cursor: 'pointer', marginTop: 8, display: 'block', marginLeft: 'auto' }}>
                + agregar comentario
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Resumen ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        <Stat label="Asistencias obligatorias" value={resumen.obligatorios} color="var(--emerald-glow)" />
        <Stat label="Tardanzas" value={resumen.tardanzas} color="var(--flame)" />
        <Stat label="Apoyos" value={resumen.apoyos} color="var(--brass)" />
      </div>

      {/* ── Historial ── */}
      <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 4 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ink-line)', ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)' }}>Mi historial</div>
        {records.length === 0
          ? <p style={{ padding: 16, color: 'var(--graphite)', fontSize: 13, ...mono }}>Aún no has registrado ninguna asistencia.</p>
          : records.map(r => (
            <div key={r.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--ink-line)' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: 'var(--bone)', fontSize: 13 }}>{fechaLarga(r.date)}</span>
                <span style={{ ...mono, fontSize: 11, color: 'var(--graphite)', marginLeft: 8 }}>{r.dayType === 'apoyo' ? 'Apoyo' : r.sessionLabel}</span>
                {r.comentario && <div style={{ ...mono, fontSize: 11, color: 'var(--graphite)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{r.comentario}”</div>}
              </div>
              <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0, color: r.status === 'tardanza' ? 'var(--flame)' : 'var(--emerald-glow)', border: `1px solid ${r.status === 'tardanza' ? 'var(--flame)' : 'var(--emerald-glow)'}`, borderRadius: 2, padding: '2px 7px' }}>
                {r.status === 'tardanza' ? `Tardanza${r.lateMinutes ? ` +${r.lateMinutes}m` : ''}` : 'Presente'}
              </span>
            </div>
          ))}
      </div>

      <p style={{ ...mono, fontSize: 10, color: 'var(--graphite)', marginTop: 12, textAlign: 'center' }}>
        Tu ubicación y una foto se guardan como evidencia. Compañía: {companyConfig.location.address}.
      </p>
    </>
  )
}

const linkBtn: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: 4 }

function StepBox({ icon, title, done, danger, children }: { icon: React.ReactNode; title: string; done?: boolean; danger?: boolean; children: React.ReactNode }) {
  const color = danger ? 'var(--flame)' : done ? 'var(--emerald-glow)' : 'var(--graphite)'
  return (
    <div style={{ border: `1px solid ${danger ? 'color-mix(in srgb, var(--flame) 45%, var(--ink-line))' : 'var(--ink-line)'}`, background: 'var(--ink-black)', borderRadius: 3, padding: '10px 12px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color, ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {done ? <CheckCircle2 className="w-4 h-4" strokeWidth={2} /> : icon} {title}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 3, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, color }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--steel)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
