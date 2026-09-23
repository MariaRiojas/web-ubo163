'use client'

import { useState } from 'react'
import { X, Loader2, Save, AlertCircle } from 'lucide-react'
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABEL, ACTIVITY_STATUSES } from '@/lib/db/schema/activities'
import type { ActivityView, ActivityType, ActivityStatus } from '@/lib/db/schema/activities'
import { guardarActividad } from '@/lib/actividades/actions'

const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
  color: 'var(--bone)', borderRadius: 2, outline: 'none',
}
const label: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9.5,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--steel)', marginBottom: 5,
}

const ESTADO_LABEL: Record<ActivityStatus, string> = {
  programada: 'Programada', confirmada: 'Confirmada', realizada: 'Realizada',
  cancelada: 'Cancelada', reprogramada: 'Reprogramada',
}

export function ActividadForm({
  actividad, personal, secciones, onClose, onGuardado,
}: {
  actividad?: ActivityView
  personal: { id: string; fullName: string; grade: string }[]
  secciones: { id: string; key: string; name: string }[]
  onClose: () => void
  onGuardado: () => void
}) {
  const edicion = !!actividad
  const [title, setTitle] = useState(actividad?.title ?? '')
  const [type, setType] = useState<ActivityType>(actividad?.type ?? 'visita')
  const [date, setDate] = useState(actividad?.date ?? new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(actividad?.endDate ?? '')
  const [startTime, setStartTime] = useState(actividad?.startTime ?? '')
  const [endTime, setEndTime] = useState(actividad?.endTime ?? '')
  const [entidad, setEntidad] = useState(actividad?.entidad ?? '')
  const [location, setLocation] = useState(actividad?.location ?? '')
  const [description, setDescription] = useState(actividad?.description ?? '')
  const [reqRep, setReqRep] = useState(actividad?.requiereRepresentante ?? false)
  const [reqEsc, setReqEsc] = useState(actividad?.requiereEscolta ?? false)
  const [escoltaCantidad, setEscoltaCantidad] = useState(String(actividad?.escoltaCantidad ?? ''))
  const [representanteProfileId, setRepresentante] = useState('')
  const [sectionId, setSectionId] = useState(actividad?.sectionId ?? '')
  const [status, setStatus] = useState<ActivityStatus>(actividad?.status ?? 'programada')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setGuardando(true)
    const res = await guardarActividad({
      activityId: actividad?.id,
      title, type, date,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      entidad: entidad || undefined,
      location: location || undefined,
      description: description || undefined,
      requiereRepresentante: reqRep,
      requiereEscolta: reqEsc,
      escoltaCantidad: escoltaCantidad ? Number(escoltaCantidad) : undefined,
      representanteProfileId: representanteProfileId || undefined,
      sectionId: sectionId || undefined,
      status,
    })
    if (!res.ok) { setError(res.error); setGuardando(false); return }
    onGuardado()
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="intranet-theme"
        style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--ink-line)', position: 'sticky', top: 0, background: 'var(--ink-elevated)' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--bone)' }}>
            {edicion ? 'Editar actividad' : 'Nueva actividad'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--steel)' }}>
            <X className="w-4 h-4" strokeWidth={1.9} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '9px 11px', borderRadius: 2, fontSize: 12.5,
              background: 'color-mix(in srgb, var(--red-163) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--red-163) 40%, transparent)', color: 'var(--red-glow, #F87171)' }}>
              <AlertCircle className="w-4 h-4" strokeWidth={1.8} style={{ flexShrink: 0 }} />{error}
            </div>
          )}

          <div>
            <label style={label} htmlFor="t">Título</label>
            <input id="t" style={input} value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Ej.: Visita del colegio San Pedro" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 11 }}>
            <div>
              <label style={label} htmlFor="ty">Tipo</label>
              <select id="ty" style={input} value={type} onChange={e => setType(e.target.value as ActivityType)}>
                {ACTIVITY_TYPES.filter(t => t !== 'cumpleanos').map(t => (
                  <option key={t} value={t}>{ACTIVITY_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="st">Estado</label>
              <select id="st" style={input} value={status} onChange={e => setStatus(e.target.value as ActivityStatus)}>
                {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11 }}>
            <div>
              <label style={label} htmlFor="d">Fecha</label>
              <input id="d" type="date" style={input} value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label style={label} htmlFor="d2">Fecha fin (opcional)</label>
              <input id="d2" type="date" style={input} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label style={label} htmlFor="h1">Hora inicio</label>
              <input id="h1" type="time" style={input} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label style={label} htmlFor="h2">Hora fin</label>
              <input id="h2" type="time" style={input} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 11 }}>
            <div>
              <label style={label} htmlFor="en">Institución o empresa</label>
              <input id="en" style={input} value={entidad} onChange={e => setEntidad(e.target.value)}
                placeholder="Ej.: I.E. San Pedro / Minera X" />
            </div>
            <div>
              <label style={label} htmlFor="lu">Lugar</label>
              <input id="lu" style={input} value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Ej.: Compañía / Planta del cliente" />
            </div>
          </div>

          <div>
            <label style={label} htmlFor="se">Área organizadora (opcional)</label>
            <select id="se" style={input} value={sectionId} onChange={e => setSectionId(e.target.value)}>
              <option value="">— Sin asignar —</option>
              {secciones.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Participación institucional */}
          <div style={{ border: '1px solid var(--ink-line)', borderRadius: 3, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brass)' }}>
              Participación institucional
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--steel)', cursor: 'pointer' }}>
              <input type="checkbox" checked={reqRep} onChange={e => setReqRep(e.target.checked)} />
              Requiere un representante de la compañía
            </label>
            {reqRep && (
              <select style={input} value={representanteProfileId} onChange={e => setRepresentante(e.target.value)}>
                <option value="">— Por designar —</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--steel)', cursor: 'pointer' }}>
              <input type="checkbox" checked={reqEsc} onChange={e => setReqEsc(e.target.checked)} />
              Requiere escolta
            </label>
            {reqEsc && (
              <input type="number" min={1} max={30} style={{ ...input, maxWidth: 200 }}
                value={escoltaCantidad} onChange={e => setEscoltaCantidad(e.target.value)}
                placeholder="Cantidad de efectivos" />
            )}
          </div>

          <div>
            <label style={label} htmlFor="de">Detalle (opcional)</label>
            <textarea id="de" rows={3} style={{ ...input, resize: 'vertical' }}
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Contacto, cantidad de asistentes, materiales necesarios…" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={guardando}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" strokeWidth={1.9} />}
              {edicion ? 'Guardar cambios' : 'Crear actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
