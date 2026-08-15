'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle, CalendarClock, Lock, FileText, ExternalLink, UserCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { TRAMITE_LABELS, type TramiteTipo } from '@/lib/db/schema/aspirante-tramites'
import type { EvalCategoria, Modulo, AspiranteEvaluacion } from '@/lib/db/schema/aspirante-evaluaciones'
import { deleteEvaluacion } from '@/lib/registro/actions'
import { EvalModal } from '@/components/registro/registro-client'
import {
  getResolucionUploadUrl, registrarPase, registrarPaseBulk,
  otorgarLicencia, resolverLicencia, editarDatos, getDocumentoUrl, altaManual,
} from '@/lib/instruccion/actions'
import {
  marcarWhatsappEnviado, registrarEntrevista, registrarPsicologica,
  registrarFisica, aprobarPostulante, descartarPostulante,
  cerrarConvocatoria, crearConvocatoria, getCertijovenUrl,
} from '@/lib/admission/actions'
import type { WorkspaceData, WorkspacePerson, WorkspaceSituacion } from '@/lib/instruccion/get-workspace-data'
import { edadDe } from '@/lib/utils/edad'

// ── paleta / etiquetas de situación ─────────────────────────────────────────
const SIT_COLOR: Record<WorkspaceSituacion, string> = {
  admision: '#4f8fd0', formacion: 'var(--emerald-glow)', escuela: '#57b4bf',
  licencia: 'var(--flame)', baja: 'var(--red-163)', graduado: 'var(--brass)',
}
const SIT_LABEL: Record<WorkspaceSituacion, string> = {
  admision: 'Admisión', formacion: 'Compañía', escuela: 'ESBAS',
  licencia: 'Licencia', baja: 'Baja', graduado: 'Graduado',
}
const SEGMENTS: { key: WorkspaceSituacion; label: string; sub: string }[] = [
  { key: 'admision', label: 'En admisión', sub: 'en pipeline de selección' },
  { key: 'formacion', label: 'Formación en compañía', sub: 'instrucción interna · post. y asp.' },
  { key: 'escuela', label: 'En ESBAS', sub: 'en la escuela de bomberos' },
  { key: 'licencia', label: 'En licencia', sub: 'con permiso vigente' },
  { key: 'baja', label: 'Dados de baja', sub: 'con resolución · no re-postulan' },
]
const PIPELINE = [
  { key: 'inscrito', label: 'Inscrito' }, { key: 'contactado', label: 'WhatsApp' },
  { key: 'entrevista', label: 'Entrevista' }, { key: 'psicologica', label: 'Psicológica' },
  { key: 'fisica', label: 'Prueba física' },
]
// Pases disponibles por situación (para ficha y barra masiva)
const PASES_POR_SIT: Partial<Record<WorkspaceSituacion, { tipo: TramiteTipo; label: string; danger?: boolean }[]>> = {
  formacion: [
    { tipo: 'ascenso_aspirante', label: 'Pase a aspirante' },
    { tipo: 'pase_esbas', label: 'Pase a ESBAS' },
    { tipo: 'baja', label: 'Dar de baja', danger: true },
  ],
  escuela: [
    { tipo: 'graduacion', label: 'Graduar' },
    { tipo: 'baja', label: 'Dar de baja', danger: true },
  ],
  licencia: [
    { tipo: 'reincorporacion', label: 'Reincorporar' },
    { tipo: 'baja', label: 'Dar de baja', danger: true },
  ],
}

// ── estilos ──────────────────────────────────────────────────────────────────
const s = {
  seg: (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', background: active ? 'var(--ink-surface)' : 'transparent', border: 'none', borderLeft: active ? '2px solid var(--red-163)' : '2px solid transparent', cursor: 'pointer', color: active ? 'var(--bone)' : 'var(--steel)', padding: '10px 11px', fontFamily: 'var(--font-mono)', fontSize: 12 }),
  cnt: (active: boolean): React.CSSProperties => ({ fontFamily: 'var(--font-mono)', fontSize: 11, color: active ? 'var(--brass)' : 'var(--graphite)', background: 'var(--ink-black)', border: `1px solid ${active ? 'var(--brass)' : 'var(--ink-line)'}`, padding: '1px 7px', borderRadius: 2, minWidth: 26, textAlign: 'center' }),
  th: { textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' } as React.CSSProperties,
  td: { padding: '9px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)', fontSize: 13, verticalAlign: 'middle' } as React.CSSProperties,
  input: { width: '100%', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 13, borderRadius: 2 } as React.CSSProperties,
  label: { display: 'block', color: 'var(--steel)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } as React.CSSProperties,
  cardhead: { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brass)', margin: '0 0 8px' } as React.CSSProperties,
  mini: { fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 9px', borderRadius: 2, border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', color: 'var(--steel)', cursor: 'pointer' } as React.CSSProperties,
}
const fmt = (n: number | null | undefined) => typeof n === 'number' ? n.toFixed(2) : '—'
const notaColor = (n: number | null | undefined) => typeof n !== 'number' ? 'var(--graphite)' : n < 11 ? 'var(--red-163)' : n < 14 ? 'var(--brass)' : 'var(--emerald-glow)'
function fecha(iso?: string | null) { if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? String(iso).split('T')[0] : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) }
const waLink = (cel?: string) => `https://wa.me/51${(cel || '').replace(/\D/g, '')}`

async function uploadPdf(file: File, profileId: string): Promise<string> {
  const res = await getResolucionUploadUrl({ profileId, contentType: 'application/pdf', sizeBytes: file.size })
  if (!res.ok) throw new Error(res.error)
  const put = await fetch(res.url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file })
  if (!put.ok) throw new Error('No se pudo subir el PDF')
  return res.key
}

function Badge({ sit }: { sit: WorkspaceSituacion }) {
  const c = SIT_COLOR[sit]
  return <span style={{ display: 'inline-flex', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: c, border: `1px solid ${c}`, borderRadius: 2, padding: '2px 6px', background: `color-mix(in srgb, ${c} 12%, transparent)` }}>{SIT_LABEL[sit]}</span>
}

// discriminated modal state
type Modal =
  | { kind: 'pase'; tipo: TramiteTipo; person: WorkspacePerson }
  | { kind: 'bulk'; tipo: TramiteTipo; ids: string[]; label: string }
  | { kind: 'licencia'; person: WorkspacePerson }
  | { kind: 'editar'; person: WorkspacePerson }
  | { kind: 'nota'; person: WorkspacePerson; categoria: EvalCategoria; existing?: AspiranteEvaluacion; modulo?: Modulo }
  | { kind: 'alta' }
  | { kind: 'nuevaConv' }
  | null

export function AspirantesWorkspace({ data, canManage }: { data: WorkspaceData; canManage: boolean }) {
  const router = useRouter()
  const first = SEGMENTS.find(seg => data.counts[seg.key] > 0)?.key ?? 'admision'
  const [seg, setSeg] = useState<WorkspaceSituacion>(first)
  const [histLabel, setHistLabel] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandMod, setExpandMod] = useState<string | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<Modal>(null)

  const histMode = histLabel !== null
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = histMode
      ? data.people.filter(p => p.convocatoriaLabel === histLabel)
      : data.people.filter(p => p.situacion === seg)
    return base.filter(p => !q || p.fullName.toLowerCase().includes(q) || (p.dni || '').includes(q))
  }, [data.people, seg, search, histMode, histLabel])
  const selected = selectedId ? data.people.find(p => p.id === selectedId) ?? null : null
  const bulkPases = histMode ? [] : (PASES_POR_SIT[seg]?.filter(p => p.tipo !== 'reincorporacion') ?? [])

  const changeSeg = (k: WorkspaceSituacion) => { setSeg(k); setHistLabel(null); setSelectedId(null); setSel(new Set()) }
  const changeHist = (label: string) => { setHistLabel(label); setSelectedId(null); setSel(new Set()) }
  const toggleSel = (id: string) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const done = () => { setModal(null); setSel(new Set()); router.refresh() }

  const cerrarConv = () => {
    const c = data.convocatoriaActiva
    if (!c) return
    if (!window.confirm(`¿Cerrar la convocatoria «${c.name}»? El formulario público dejará de recibir postulaciones.`)) return
    cerrarConvocatoria({ cohortId: c.cohortId }).then(res => {
      if (!res.ok) { toast.error(res.error); return }
      toast.success('Convocatoria cerrada'); router.refresh()
    })
  }

  return (
    <>
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal">163</div>
        <div className="area-hero-body">
          <div className="area-hero-ref">ÁREA DE INSTRUCCIÓN</div>
          <h1 className="area-hero-title">Aspirantes y Postulantes</h1>
          <p className="area-hero-desc">Vista unificada por situación. La convocatoria de ingreso es el ancla histórica; cada quien avanza a su propio ritmo.</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            <button className="btn btn--sm" style={{ borderColor: 'var(--brass)', color: 'var(--brass)' }} onClick={() => setModal({ kind: 'alta' })}>+ Agregar manualmente</button>
            {!data.convocatoriaActiva && <button className="btn btn--primary btn--sm" onClick={() => setModal({ kind: 'nuevaConv' })}>Abrir convocatoria</button>}
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 220px) 1fr', gap: 18, alignItems: 'start' }}>
        <aside style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--ink-line)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)' }}>Situación</div>
          {SEGMENTS.map(item => {
            const active = !histMode && seg === item.key
            return (
              <button key={item.key} onClick={() => changeSeg(item.key)} style={{ ...s.seg(active), borderBottom: '1px solid var(--ink-line)' }}>
                <span>{item.label}<span style={{ display: 'block', color: 'var(--graphite)', fontSize: 10 }}>{item.sub}</span></span>
                <span style={s.cnt(active)}>{data.counts[item.key]}</span>
              </button>
            )
          })}
          {data.convocatoriasIngreso.length > 0 && (
            <>
              <div style={{ padding: '12px 12px 8px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--steel)', borderTop: '1px solid var(--ink-line)' }}>Histórico · convocatorias de ingreso</div>
              {data.convocatoriasIngreso.map(c => {
                const active = histLabel === c.label
                return (
                  <button key={c.label} onClick={() => changeHist(c.label)} style={{ ...s.seg(active), borderBottom: '1px solid var(--ink-line)' }}>
                    <span>Conv. {c.label}<span style={{ display: 'block', color: 'var(--graphite)', fontSize: 10 }}>consultar traza</span></span>
                    <span style={s.cnt(active)}>{c.count}</span>
                  </button>
                )
              })}
            </>
          )}
          {data.convocatoriaActiva && (
            <div style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)' }}>Convocatoria abierta:<br /><b style={{ color: 'var(--bone)' }}>{data.convocatoriaActiva.name}</b></div>
          )}
        </aside>

        <section>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {histMode && (
              <button className="btn btn--ghost btn--sm" onClick={() => changeSeg(seg)} style={{ whiteSpace: 'nowrap' }}>← Volver a situación</button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o DNI…" style={{ ...s.input, flex: 1, minWidth: 200 }} />
          </div>

          {/* Cabecera de histórico */}
          {histMode && (
            <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 3, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--bone)', fontWeight: 700 }}>Histórico · Convocatoria {histLabel}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Consulta de solo lectura · {rows.length} ingresaron por esta convocatoria · su estado actual</div>
            </div>
          )}

          {/* Control de convocatoria — solo en el segmento de admisión */}
          {!histMode && seg === 'admision' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 3, padding: '10px 14px', marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>
                <CalendarClock className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
                {data.convocatoriaActiva
                  ? <>Convocatoria abierta: <b style={{ color: 'var(--bone)' }}>{data.convocatoriaActiva.name}</b>{data.convocatoriaActiva.endDate ? ` · cierra ${fecha(data.convocatoriaActiva.endDate)}` : ''}</>
                  : <>Sin convocatoria activa · el formulario público está cerrado</>}
              </span>
              {canManage && data.convocatoriaActiva && (
                <button className="btn btn--sm" onClick={cerrarConv} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', color: 'var(--red-163)', border: '1px solid var(--red-163)' }}><Lock className="w-3 h-3" strokeWidth={2} /> Cerrar convocatoria</button>
              )}
            </div>
          )}

          {/* Aviso de duplicados: postulaciones que corresponden a gente ya en formación */}
          {!histMode && seg === 'admision' && data.duplicatesSuppressed > 0 && (
            <div style={{ border: '1px solid color-mix(in srgb, var(--flame) 45%, var(--ink-line))', background: 'color-mix(in srgb, var(--flame) 8%, transparent)', borderRadius: 3, padding: '9px 12px', marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--flame)' }}>⚠ {data.duplicatesSuppressed} postulación{data.duplicatesSuppressed === 1 ? '' : 'es'} oculta{data.duplicatesSuppressed === 1 ? '' : 's'}</b> — corresponden a personas que <b style={{ color: 'var(--bone)' }}>ya están en formación</b> (mismo DNI) y llenaron el formulario público por error. No se muestran aquí para evitar registros duplicados.
            </div>
          )}

          {/* Barra de selección múltiple */}
          {canManage && sel.size > 0 && bulkPases.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', border: '1px solid var(--brass)', background: 'color-mix(in srgb, var(--brass) 9%, transparent)', borderRadius: 3, padding: '9px 11px', marginBottom: 11, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>
              <span style={{ background: 'var(--brass)', color: 'var(--ink-black)', borderRadius: 2, padding: '1px 7px', fontWeight: 700 }}>{sel.size}</span> seleccionados
              {bulkPases.map(b => (
                <button key={b.tipo} style={{ ...s.mini, ...(b.danger ? { color: 'var(--red-163)', borderColor: 'color-mix(in srgb, var(--red-163) 40%, var(--ink-line))' } : {}) }}
                  onClick={() => setModal({ kind: 'bulk', tipo: b.tipo, ids: [...sel], label: b.label })}>{b.label}</button>
              ))}
              <span style={{ color: 'var(--graphite)' }}>· una sola resolución para todos</span>
              <button style={s.mini} onClick={() => setSel(new Set())}>limpiar</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr minmax(320px, 380px)' : '1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', overflowX: 'auto' }}>
              <RosterTable seg={seg} histMode={histMode} rows={rows} selectedId={selectedId} sel={sel} canManage={canManage}
                onSelect={id => setSelectedId(cur => cur === id ? null : id)} onToggleSel={toggleSel} />
            </div>
            {selected && (
              <Ficha person={selected} canManage={canManage} expandMod={expandMod}
                onToggleMod={m => setExpandMod(c => c === m ? null : m)} onClose={() => setSelectedId(null)} onAction={setModal} onRefresh={() => router.refresh()} />
            )}
          </div>
        </section>
      </div>

      {modal?.kind === 'pase' && <PaseModal tipo={modal.tipo} persons={[modal.person]} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'bulk' && <PaseModal tipo={modal.tipo} bulkIds={modal.ids} bulkLabel={modal.label} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'licencia' && <LicenciaModal person={modal.person} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'editar' && <EditarModal person={modal.person} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'nota' && (
        <EvalModal aspiranteId={modal.person.id} fullName={modal.person.fullName} categoria={modal.categoria}
          existing={modal.existing} defaultModulo={modal.modulo ?? 'I'}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh() }} />
      )}
      {modal?.kind === 'alta' && <AltaManualModal defaultConvocatoria={data.convocatoriaActiva?.name} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'nuevaConv' && <NuevaConvocatoriaModal onClose={() => setModal(null)} onDone={done} />}
    </>
  )
}

// ── tabla ────────────────────────────────────────────────────────────────────
function RosterTable({ seg, histMode, rows, selectedId, sel, canManage, onSelect, onToggleSel }: {
  seg: WorkspaceSituacion; histMode: boolean; rows: WorkspacePerson[]; selectedId: string | null; sel: Set<string>; canManage: boolean
  onSelect: (id: string) => void; onToggleSel: (id: string) => void
}) {
  if (rows.length === 0) return <p style={{ color: 'var(--graphite)', padding: 16, fontSize: 13, fontFamily: 'var(--font-mono)' }}>Sin personas en este grupo.</p>
  const showEstado = histMode
  const showEtapa = !histMode && seg === 'admision'
  const showNota = histMode || seg !== 'admision'
  const showCheck = !histMode && canManage && (seg === 'formacion' || seg === 'escuela')
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
      <thead>
        <tr>
          {showCheck && <th style={{ ...s.th, width: 26 }}></th>}
          <th style={s.th}>N°</th><th style={s.th}>Nombre</th><th style={s.th}>Grado</th>
          {showEstado && <th style={s.th}>Estado</th>}
          {showEtapa && <th style={s.th}>Etapa</th>}
          {showNota && <th style={s.th}>General</th>}
          <th style={s.th}>Conv. ingreso</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p, i) => (
          <tr key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: 'pointer', background: selectedId === p.id ? 'var(--ink-surface)' : 'transparent' }}>
            {showCheck && <td style={s.td} onClick={e => { e.stopPropagation(); onToggleSel(p.id) }}><input type="checkbox" checked={sel.has(p.id)} readOnly style={{ accentColor: 'var(--brass)', cursor: 'pointer' }} /></td>}
            <td style={{ ...s.td, fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>{p.ordenAntiguedad ?? p.ordenLlegada ?? i + 1}</td>
            <td style={s.td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ fontWeight: 600 }}>{p.fullName}</span>{p.celular && <a href={waLink(p.celular)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={`WhatsApp ${p.celular}`} style={{ display: 'inline-flex', color: 'var(--emerald-glow)' }}><MessageCircle className="w-4 h-4" strokeWidth={1.8} /></a>}</span></td>
            <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>{p.gradeLabel}</td>
            {showEstado && <td style={s.td}><Badge sit={p.situacion} /></td>}
            {showEtapa && <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>{etapaLabel(p.etapa)}</td>}
            {showNota && <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(p.notas?.general) }}>{fmt(p.notas?.general)}</td>}
            <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>{p.convocatoriaLabel || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
const etapaLabel = (e?: string) => ({ inscrito: 'Inscrito', contactado: 'WhatsApp enviado', entrevista: 'Entrevista', psicologica: 'Ev. psicológica', fisica: 'Prueba física' } as Record<string, string>)[e || 'inscrito'] || '—'

// ── ficha ────────────────────────────────────────────────────────────────────
function Ficha({ person, canManage, expandMod, onToggleMod, onClose, onAction, onRefresh }: {
  person: WorkspacePerson; canManage: boolean; expandMod: string | null
  onToggleMod: (m: string) => void; onClose: () => void; onAction: (m: Modal) => void; onRefresh: () => void
}) {
  const edadTxt = person.birthDate ? `Nac. ${fecha(person.birthDate)} · ${person.edad ?? '—'} años` : (person.edad != null ? `${person.edad} años` : 'Edad —')
  const verDoc = async (key: string) => { const r = await getDocumentoUrl(key); if (r.ok) window.open(r.url, '_blank'); else toast.error(r.error) }
  return (
    <aside style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', padding: 16, position: 'sticky', top: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', fontSize: '1.05rem', lineHeight: 1.2 }}>{person.fullName}</h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>{person.gradeLabel}</span>
            {person.convocatoriaLabel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>· Conv. {person.convocatoriaLabel}</span>}
            <Badge sit={person.situacion} />
          </div>
        </div>
        <button onClick={onClose} className="btn btn--ghost btn--sm" aria-label="Cerrar">✕</button>
      </div>

      {/* Datos */}
      <div style={{ border: '1px solid var(--ink-line)', borderRadius: 3, padding: '10px 12px', marginBottom: 14, background: 'var(--ink-black)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brass)' }}>Datos personales</span>
          {canManage && person.kind === 'profile' && <button style={{ ...s.mini, padding: '2px 8px' }} onClick={() => onAction({ kind: 'editar', person })}>✎ Editar</button>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>
          <span style={{ color: 'var(--bone)' }}>{edadTxt}</span>
          {person.profession && <span>{person.profession}</span>}
          {person.distrito && <span>Distrito {person.distrito}</span>}
          {person.dni && <span>DNI {person.dni}</span>}
          {person.celular && <span>Cel. {person.celular}</span>}
          {person.correo && <span>{person.correo}</span>}
          {person.certijovenKey && <button style={{ ...s.mini, padding: '1px 6px', color: '#4f8fd0' }} onClick={() => verDoc(person.certijovenKey!)}>📎 CERTIJOVEN</button>}
        </div>
      </div>

      {person.kind === 'application'
        ? (canManage ? <AdmisionPipeline person={person} onRefresh={onRefresh} /> : <PipelineView person={person} />)
        : <NotasView person={person} canManage={canManage} expandMod={expandMod} onToggleMod={onToggleMod} onAction={onAction} onRefresh={onRefresh} />}
      {person.kind === 'profile' && <Trayectoria person={person} onVerDoc={verDoc} />}
      {person.kind === 'profile' && <SituacionTramites person={person} canManage={canManage} onAction={onAction} onVerDoc={verDoc} onRefresh={onRefresh} />}

      {person.kind === 'profile' && (
        <Link href={`/areas/instruccion/registro/${person.id}`} className="btn btn--primary btn--sm" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 10 }}>Generar informe</Link>
      )}
      {person.kind === 'application' && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', marginTop: 10, lineHeight: 1.5 }}>Al aprobar la postulación, la persona pasa automáticamente a «Formación en compañía».</p>
      )}
    </aside>
  )
}

function PipelineView({ person }: { person: WorkspacePerson }) {
  const app = person.application
  const done = (k: string) => {
    if (!app) return false
    if (k === 'inscrito') return true
    if (k === 'contactado') return !!app.contactadoWhatsappAt || reached(app.etapa, 'contactado')
    if (k === 'entrevista') return !!app.entrevista?.resultado
    if (k === 'psicologica') return !!app.psicologica?.resultado
    if (k === 'fisica') return !!app.fisica?.resultado
    return false
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.cardhead}>Pipeline de admisión</div>
      {PIPELINE.map(step => (
        <div key={step.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ink-line)', padding: '7px 0', fontSize: 12 }}>
          <span style={{ color: 'var(--steel)' }}>{step.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: done(step.key) ? 'var(--emerald-glow)' : 'var(--graphite)' }}>{done(step.key) ? '✓ hecho' : 'pendiente'}</span>
        </div>
      ))}
    </div>
  )
}
const ORDER = ['inscrito', 'contactado', 'entrevista', 'psicologica', 'fisica', 'aprobado']
const reached = (cur: string | undefined, target: string) => ORDER.indexOf(cur || 'inscrito') >= ORDER.indexOf(target)

// ── pipeline de admisión accionable (gestión) ────────────────────────────────
function AdmisionPipeline({ person, onRefresh }: { person: WorkspacePerson; onRefresh: () => void }) {
  const app = person.application
  const [pending, startTransition] = useTransition()
  if (!app) return null
  const id = app.applicationId

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) { toast.error(res.error ?? 'No se pudo completar la acción'); return }
      toast.success(okMsg); onRefresh()
    })
  }
  const askObs = (msg: string) => window.prompt(msg) ?? undefined
  const verCert = (key: string) => { getCertijovenUrl(key).then(r => r.ok ? window.open(r.url, '_blank') : toast.error(r.error)) }

  const Step = ({ title, done, children }: { title: string; done: boolean; children: React.ReactNode }) => (
    <div style={{ border: '1px solid var(--ink-line)', borderRadius: 3, padding: '8px 10px', background: 'var(--ink-black)', marginBottom: 6 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: done ? 'var(--emerald-glow)' : 'var(--graphite)', marginBottom: 6 }}>{done ? '✓ ' : ''}{title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
  const btn = (label: string, color: string, onClick: () => void) => (
    <button disabled={pending} style={{ ...s.mini, color }} onClick={onClick}>{label}</button>
  )

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.cardhead}>Pipeline de admisión</div>
      <Step title="1 · WhatsApp" done={!!app.contactadoWhatsappAt || app.etapa === 'contactado'}>
        {btn('Marcar enviado', 'var(--emerald-glow)', () => run(() => marcarWhatsappEnviado({ applicationId: id }), 'WhatsApp marcado'))}
      </Step>
      <Step title="2 · Entrevista" done={!!app.entrevista?.resultado}>
        {btn('Apto', 'var(--emerald-glow)', () => run(() => registrarEntrevista({ applicationId: id, resultado: 'apto' }), 'Entrevista registrada'))}
        {btn('Observado', 'var(--flame)', () => run(() => registrarEntrevista({ applicationId: id, resultado: 'observado', observacion: askObs('Observación de la entrevista:') }), 'Entrevista registrada'))}
      </Step>
      <Step title="3 · Psicológica" done={!!app.psicologica?.resultado}>
        {btn('Apto', 'var(--emerald-glow)', () => run(() => registrarPsicologica({ applicationId: id, resultado: 'apto' }), 'Ev. psicológica registrada'))}
        {btn('Observado', 'var(--flame)', () => run(() => registrarPsicologica({ applicationId: id, resultado: 'observado', observacion: askObs('Observación psicológica:') }), 'Ev. psicológica registrada'))}
      </Step>
      <Step title="4 · Prueba física" done={!!app.fisica?.resultado}>
        {btn('Programar', 'var(--steel)', () => { const f = window.prompt('Fecha de la prueba física (ej. 2026-09-15):'); if (f) run(() => registrarFisica({ applicationId: id, fechaProgramada: f }), 'Prueba física programada') })}
        {btn('Apto', 'var(--emerald-glow)', () => run(() => registrarFisica({ applicationId: id, resultado: 'apto' }), 'Prueba física registrada'))}
        {btn('No apto', 'var(--red-163)', () => run(() => registrarFisica({ applicationId: id, resultado: 'no_apto' }), 'Prueba física registrada'))}
      </Step>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        <button disabled={pending} className="btn btn--primary btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => run(() => aprobarPostulante({ applicationId: id }), 'Postulante aprobado')}>
          <UserCheck className="w-3.5 h-3.5" strokeWidth={2} /> Aprobar
        </button>
        <button disabled={pending} className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--red-163)' }}
          onClick={() => { if (window.confirm(`¿Descartar la postulación de ${app.fullName}?`)) run(() => descartarPostulante({ applicationId: id, observacion: askObs('Motivo (opcional):') }), 'Postulante descartado') }}>
          <X className="w-3.5 h-3.5" strokeWidth={2} /> Descartar
        </button>
        {app.certijovenKey && (
          <button disabled={pending} className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }} onClick={() => verCert(app.certijovenKey!)}>
            <FileText className="w-3 h-3" strokeWidth={1.8} /> CERTIJOVEN <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── modal: nueva convocatoria ────────────────────────────────────────────────
function NuevaConvocatoriaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', type: 'esbas', year: String(new Date().getFullYear()), period: '', resolution: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!f.name.trim() || !f.year || !f.period) { setErr('Completa nombre, año y periodo.'); return }
    setSaving(true)
    const res = await crearConvocatoria(f)
    if (!res.ok) { setErr(res.error); setSaving(false); return }
    toast.success('Convocatoria abierta'); onDone()
  }
  return (
    <Overlay title="Nueva convocatoria" subtitle="Activa el formulario público de admisión">
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Nombre *</label><input value={f.name} onChange={set('name')} style={s.input} placeholder="Ej. Convocatoria 2026-I" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Tipo</label><select value={f.type} onChange={set('type')} style={s.input as React.CSSProperties}><option value="esbas">ESBAS / Compañía</option><option value="tecnica">Escuela Técnica</option></select></div>
          <div><label style={s.label}>Resolución</label><input value={f.resolution} onChange={set('resolution')} style={s.input} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Año *</label><input value={f.year} onChange={set('year')} inputMode="numeric" style={s.input} /></div>
          <div><label style={s.label}>Periodo *</label><input value={f.period} onChange={set('period')} style={s.input} placeholder="I, II, III" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div><label style={s.label}>Fecha inicio</label><input type="date" value={f.startDate} onChange={set('startDate')} style={s.input} /></div>
          <div><label style={s.label}>Fecha cierre</label><input type="date" value={f.endDate} onChange={set('endDate')} style={s.input} /></div>
        </div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Abriendo…' : 'Abrir convocatoria'}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Overlay>
  )
}

/** nota más reciente de una categoría (opcionalmente por módulo). */
function latestEval(evals: AspiranteEvaluacion[], cat: EvalCategoria, modulo?: Modulo): AspiranteEvaluacion | undefined {
  const f = evals.filter(e => e.categoria === cat && (modulo ? e.modulo === modulo : true))
  return f.length ? f[f.length - 1] : undefined
}

function NotasView({ person, canManage, expandMod, onToggleMod, onAction, onRefresh }: {
  person: WorkspacePerson; canManage: boolean; expandMod: string | null; onToggleMod: (m: string) => void
  onAction: (m: Modal) => void; onRefresh: () => void
}) {
  const n = person.notas
  if (!n) return null
  const evals = n.evaluaciones ?? []
  const add = (categoria: EvalCategoria, existing?: AspiranteEvaluacion, modulo?: Modulo) =>
    onAction({ kind: 'nota', person, categoria, existing, modulo: modulo ?? existing?.modulo })
  const del = (evalId: string) => {
    if (!window.confirm('¿Eliminar esta nota?')) return
    deleteEvaluacion(evalId).then(r => { if (!r.ok) toast.error(r.error); else { toast.success('Nota eliminada'); onRefresh() } })
  }
  const Stat = ({ k, v, big }: { k: string; v: number | null; big?: boolean }) => (
    <div style={{ border: '1px solid var(--ink-line)', padding: big ? '8px 10px' : '6px 8px', background: big ? 'var(--ink-surface)' : 'var(--ink-black)', gridColumn: big ? '1 / -1' : undefined }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--steel)' }}>{k}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: big ? 20 : 15, color: notaColor(v) }}>{fmt(v)}</div>
    </div>
  )
  const catHead = (label: string, categoria: EvalCategoria, modulo?: Modulo) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--steel)' }}>{label}</span>
      {canManage && <button style={{ ...s.mini, padding: '2px 8px' }} onClick={() => add(categoria, undefined, modulo)}>+ nota</button>}
    </div>
  )
  const row = (titulo: string, nota: number | null, ev?: AspiranteEvaluacion, extra?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, padding: '4px 0 4px 12px', borderBottom: '1px solid var(--ink-surface)', fontSize: 12 }}>
      <span style={{ color: 'var(--steel)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}{extra && <span style={{ color: 'var(--graphite)', fontSize: 10 }}> · {extra}</span>}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: notaColor(nota) }}>{fmt(nota)}</span>
        {canManage && ev && <><button style={{ ...s.mini, padding: '1px 5px' }} onClick={() => add(ev.categoria, ev)}>✎</button><button style={{ ...s.mini, padding: '1px 5px', color: 'var(--red-163)' }} onClick={() => del(ev.evalId)}>✕</button></>}
      </span>
    </div>
  )
  const fisico = latestEval(evals, 'fisico')
  const actitudes = evals.filter(e => e.categoria === 'actitud')
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={s.cardhead}>Notas · Formación (CFBB)</span>
        {canManage && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>ingreso manual</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 4 }}>
        <Stat k="Académica" v={n.academica} /><Stat k="Físico" v={n.fisico} /><Stat k="Actitud" v={n.actitud} /><Stat k="Asistencia" v={n.asistencia} /><Stat k="General" v={n.general} big />
      </div>

      {/* Académica — módulos → lecciones (editable) */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--steel)', margin: '12px 0 2px' }}>Académica · ESBAS</div>
      {n.academicaModulos.map(mod => {
        const open = expandMod === person.id + mod.modulo
        return (
          <div key={mod.modulo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--ink-surface)' }}>
              <span onClick={() => onToggleMod(person.id + mod.modulo)} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)', cursor: 'pointer' }}>Módulo {mod.modulo} <span style={{ color: 'var(--graphite)' }}>{open ? '▾' : '▸'}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: notaColor(mod.promedio) }}>{fmt(mod.promedio)}</span>
                {canManage && <button style={{ ...s.mini, padding: '1px 6px' }} onClick={() => add('academica', undefined, mod.modulo)}>+ lección</button>}
              </span>
            </div>
            {open && (mod.lecciones.length === 0 ? <p style={{ color: 'var(--graphite)', fontSize: 11, padding: '4px 0 4px 12px' }}>Sin lecciones registradas.</p> : mod.lecciones.map(l => {
              const ev = evals.find(e => e.evalId === l.evalId)
              return <div key={l.evalId}>{row(l.titulo, l.nota, ev)}</div>
            }))}
          </div>
        )
      })}

      {/* Físico */}
      {catHead('Físico · métricas', 'fisico')}
      {fisico
        ? row('Última evaluación', fisico.nota, fisico, fisico.metricas ? Object.entries(fisico.metricas).map(([k, v]) => `${k} ${v}`).join(' · ') : undefined)
        : <p style={{ color: 'var(--graphite)', fontSize: 11, padding: '2px 0 2px 12px' }}>Sin datos.</p>}

      {/* Actitud */}
      {catHead('Actitud bomberil', 'actitud')}
      {actitudes.length === 0
        ? <p style={{ color: 'var(--graphite)', fontSize: 11, padding: '2px 0 2px 12px' }}>Sin comentarios.</p>
        : actitudes.map(ev => row(ev.comentario ? (ev.comentario.length > 42 ? ev.comentario.slice(0, 41) + '…' : ev.comentario) : 'Evaluación', ev.nota, ev, fecha(ev.fecha || ev.createdAt)))}

      {/* Asistencia — automática desde el registro de instrucción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--steel)' }}>Asistencia · instrucción</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>auto</span>
      </div>
      {n.asistenciaAuto
        ? <div style={{ padding: '2px 0 2px 12px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--ink-surface)', padding: '4px 0' }}>
              <span style={{ color: 'var(--steel)' }}>Días asistidos</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>{n.asistenciaAuto.obligatoriosAsistidos} / {n.asistenciaAuto.sesionesRealizadas}{n.asistenciaAuto.pct != null ? `  ·  ${n.asistenciaAuto.pct}%` : ''}</span>
            </div>
            {n.asistenciaAuto.tardanzas > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: 'var(--steel)' }}>Tardanzas</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--flame)' }}>{n.asistenciaAuto.tardanzas}</span></div>}
            {n.asistenciaAuto.apoyos > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: 'var(--steel)' }}>Apoyos</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>{n.asistenciaAuto.apoyos}</span></div>}
          </div>
        : <p style={{ color: 'var(--graphite)', fontSize: 11, padding: '2px 0 2px 12px' }}>Sin registros de asistencia todavía. La nota se calcula sola cuando marque asistencia.</p>}
    </div>
  )
}

function Trayectoria({ person, onVerDoc }: { person: WorkspacePerson; onVerDoc: (k: string) => void }) {
  const hitos = [
    { h: 'Ingreso', d: person.convocatoriaLabel ? `Convocatoria ${person.convocatoriaLabel}` : 'Convocatoria de ingreso', f: person.fechaIngreso || undefined, res: undefined as string | undefined },
    ...person.tramites.filter(t => t.tipo !== 'licencia').map(t => ({ h: TRAMITE_LABELS[t.tipo], d: t.detalle || t.promocion, f: t.fecha, res: t.resolucionKey })),
  ]
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.cardhead}>Trayectoria — traza en la compañía</div>
      <div style={{ borderLeft: '1px solid var(--ink-line)', marginLeft: 6, paddingLeft: 14 }}>
        {hitos.map((x, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 10 }}>
            <span style={{ position: 'absolute', left: -19, top: 2, width: 9, height: 9, borderRadius: '50%', background: i === hitos.length - 1 ? 'var(--emerald-glow)' : 'var(--brass)', border: '2px solid var(--ink-deep)' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)' }}>{x.h}</div>
            {x.d && <div style={{ fontSize: 12, color: 'var(--steel)' }}>{x.d}</div>}
            {x.f && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>{fecha(x.f)}</div>}
            {x.res && <button style={{ ...s.mini, padding: '1px 6px', color: '#4f8fd0', marginTop: 3 }} onClick={() => onVerDoc(x.res!)}>📎 resolución</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

// Pases contextuales por situación (ficha) — devuelve los botones de "Pase de etapa".
function TransicionBtns({ person, onAction, onVerDoc }: { person: WorkspacePerson; onAction: (m: Modal) => void; onVerDoc: (k: string) => void }) {
  const P = (tipo: TramiteTipo, label: string, danger?: boolean, flame?: boolean, apto?: boolean) => (
    <button key={tipo + label} style={{ ...s.mini, ...(danger ? { color: 'var(--red-163)', borderColor: 'color-mix(in srgb, var(--red-163) 40%, var(--ink-line))' } : flame ? { color: 'var(--flame)', borderColor: 'color-mix(in srgb, var(--flame) 40%, var(--ink-line))' } : apto ? { color: 'var(--emerald-glow)', borderColor: 'color-mix(in srgb, var(--emerald-glow) 40%, var(--ink-line))' } : {}) }}
      onClick={() => onAction({ kind: 'pase', tipo, person })}>{label}</button>
  )
  const Lic = () => <button key="lic" style={{ ...s.mini, color: 'var(--flame)', borderColor: 'color-mix(in srgb, var(--flame) 40%, var(--ink-line))' }} onClick={() => onAction({ kind: 'licencia', person })}>Otorgar licencia</button>
  switch (person.situacion) {
    case 'formacion':
      return <>{person.grade === 'postulante' && P('ascenso_aspirante', 'Pase a aspirante')}{P('pase_esbas', 'Pase a ESBAS')}<Lic />{P('baja', 'Dar de baja', true)}</>
    case 'escuela':
      return <>{P('graduacion', 'Graduar (egreso oficial)')}<Lic />{P('baja', 'Dar de baja', true)}</>
    case 'licencia':
      return <>{P('reincorporacion', 'Reincorporar', false, false, true)}{P('baja', 'Dar de baja', true)}</>
    case 'graduado':
      return <span style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Efectivo graduado · trámite cerrado.</span>
    case 'baja': {
      const bajaTr = person.tramites.filter(t => t.tipo === 'baja').slice(-1)[0]
      return <>{bajaTr?.resolucionKey && <button key="verbaja" style={{ ...s.mini, color: '#4f8fd0' }} onClick={() => onVerDoc(bajaTr.resolucionKey!)}>Ver resolución de baja</button>}{P('reincorporacion', 'Revertir baja (con resolución)', false, false, true)}</>
    }
    default:
      return null
  }
}

function SituacionTramites({ person, canManage, onAction, onVerDoc, onRefresh }: {
  person: WorkspacePerson; canManage: boolean; onAction: (m: Modal) => void; onVerDoc: (k: string) => void; onRefresh: () => void
}) {
  const licencias = person.tramites.filter(t => t.tipo === 'licencia')
  const bajaTr = person.tramites.filter(t => t.tipo === 'baja').slice(-1)[0]
  const resolver = (tramiteId: string, aprobar: boolean) => {
    resolverLicencia({ tramiteId, aprobar }).then(r => {
      if (!r.ok) { toast.error(r.error); return }
      toast.success(aprobar ? 'Licencia aprobada' : 'Licencia rechazada'); onRefresh()
    })
  }
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ border: '1px solid var(--ink-line)', borderRadius: 3, padding: 12, background: 'var(--ink-black)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={s.cardhead}>Situación y trámites</span><Badge sit={person.situacion} /></div>

        {person.situacion === 'baja' && bajaTr && (
          <div style={{ borderLeft: '2px solid var(--red-163)', padding: '6px 0 6px 9px', fontSize: 12, color: 'var(--steel)', marginBottom: 8 }}>
            <b style={{ color: 'var(--red-163)' }}>DADO DE BAJA</b> · {fecha(bajaTr.fecha)}<br />{bajaTr.detalle}{bajaTr.normativa ? ` (${bajaTr.normativa})` : ''}<br />
            <span style={{ color: 'var(--graphite)', fontSize: 11 }}>Baja justificada por la normativa vigente. No puede volver a postular.</span>
          </div>
        )}

        {/* Pase de etapa — botones según situación */}
        {canManage && (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--steel)', margin: '4px 0 6px' }}>Pase de etapa</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><TransicionBtns person={person} onAction={onAction} onVerDoc={onVerDoc} /></div>
            {person.situacion !== 'graduado' && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', marginTop: 8, lineHeight: 1.55 }}>📎 Cada pase — <b style={{ color: 'var(--steel)' }}>aspirante · ESBAS · graduación · baja</b> — se registra con su <b style={{ color: 'var(--steel)' }}>resolución en PDF</b> y queda en la trayectoria.</p>
            )}
          </>
        )}

        {/* Licencias */}
        {person.situacion !== 'baja' && person.situacion !== 'graduado' && (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--steel)', margin: '13px 0 6px' }}>Licencias</div>
            {licencias.length === 0 ? <div style={{ color: 'var(--graphite)', fontSize: 12 }}>Sin licencias registradas.</div> : licencias.map(l => {
              const pend = l.licenciaEstado === 'solicitada'
              return (
                <div key={l.tramiteId} style={{ borderLeft: `2px solid ${pend ? 'var(--flame)' : 'var(--flame)'}`, padding: '4px 0 4px 9px', margin: '6px 0', fontSize: 12, color: 'var(--steel)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)' }}>{fecha(l.fecha)}{l.hasta ? ` → ${fecha(l.hasta)}` : ''}</span>
                  {l.licenciaEstado && <span style={{ marginLeft: 6, color: l.licenciaEstado === 'aprobada' ? 'var(--emerald-glow)' : l.licenciaEstado === 'rechazada' ? 'var(--red-163)' : 'var(--flame)' }}>· {l.licenciaEstado}</span>}
                  <br />{l.detalle}{l.resolucionKey && <> · <button style={{ ...s.mini, padding: '1px 6px', color: '#4f8fd0' }} onClick={() => onVerDoc(l.resolucionKey!)}>📎 documento</button></>}
                  {canManage && pend && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button style={{ ...s.mini, color: 'var(--emerald-glow)', borderColor: 'color-mix(in srgb, var(--emerald-glow) 40%, var(--ink-line))' }} onClick={() => resolver(l.tramiteId, true)}>Aprobar</button>
                      <button style={{ ...s.mini, color: 'var(--red-163)', borderColor: 'color-mix(in srgb, var(--red-163) 40%, var(--ink-line))' }} onClick={() => resolver(l.tramiteId, false)}>Rechazar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ── overlay base ─────────────────────────────────────────────────────────────
function Overlay({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 26, width: 460, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: 4, fontSize: '1.15rem' }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--steel)', fontSize: 12, marginBottom: 18, fontFamily: 'var(--font-mono)' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

// ── modal de pase (single o bulk) con resolución ────────────────────────────
function PaseModal({ tipo, persons, bulkIds, bulkLabel, onClose, onDone }: {
  tipo: TramiteTipo; persons?: WorkspacePerson[]; bulkIds?: string[]; bulkLabel?: string; onClose: () => void; onDone: () => void
}) {
  const [fecha, setFecha] = useState('')
  const [promocion, setPromocion] = useState('')
  const [detalle, setDetalle] = useState('')
  const [normativa, setNormativa] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const requiereRes = tipo !== 'reincorporacion'
  const esBaja = tipo === 'baja'
  const label = bulkLabel ?? TRAMITE_LABELS[tipo]
  const count = bulkIds ? bulkIds.length : (persons?.length ?? 0)
  const subtitle = bulkIds ? `${count} efectivos · una sola resolución` : persons?.[0]?.fullName

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (file && file.type !== 'application/pdf') { setErr('La resolución debe ser un PDF.'); return }
    if (requiereRes && !file) { setErr('Adjunta la resolución (PDF).'); return }
    setSaving(true)
    try {
      const anchorId = bulkIds ? bulkIds[0] : persons![0].id
      const key = file ? await uploadPdf(file, anchorId) : undefined
      const common = { tipo, fecha: fecha || undefined, detalle: detalle || undefined, promocion: promocion || undefined, resolucionKey: key, normativa: normativa || undefined }
      const res = bulkIds
        ? await registrarPaseBulk({ profileIds: bulkIds, ...common })
        : await registrarPase({ profileId: persons![0].id, ...common })
      if (!res.ok) { setErr(res.error); setSaving(false); return }
      toast.success(bulkIds ? `${label} aplicado a ${'count' in res ? res.count : count} efectivos` : `${label} registrado`)
      onDone()
    } catch (e: any) { setErr(e?.message ?? 'Error al procesar'); setSaving(false) }
  }

  return (
    <Overlay title={label} subtitle={subtitle}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}><label style={s.label}>Fecha del acto</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={s.input} /></div>
        {(tipo === 'ascenso_aspirante' || tipo === 'pase_esbas' || tipo === 'graduacion') && (
          <div style={{ marginBottom: 12 }}><label style={s.label}>Promoción</label><input value={promocion} onChange={e => setPromocion(e.target.value)} placeholder="Ej. 2025-I" style={s.input} /></div>
        )}
        <div style={{ marginBottom: 12 }}><label style={s.label}>{esBaja ? 'Motivo de la baja' : 'Detalle (opcional)'}</label><textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={2} style={{ ...s.input, resize: 'vertical' }} /></div>
        {esBaja && <div style={{ marginBottom: 12 }}><label style={s.label}>Normativa que la justifica</label><input value={normativa} onChange={e => setNormativa(e.target.value)} placeholder="Ej. RIF art. 48°" style={s.input} /></div>}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Resolución (PDF){requiereRes ? ' *' : ' (opcional)'}</label>
          <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ ...s.input, padding: 6 }} />
        </div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Procesando…' : 'Confirmar'}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Overlay>
  )
}

function LicenciaModal({ person, onClose, onDone }: { person: WorkspacePerson; onClose: () => void; onDone: () => void }) {
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState(''); const [motivo, setMotivo] = useState('')
  const [file, setFile] = useState<File | null>(null); const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!desde) { setErr('Indica la fecha de inicio.'); return }
    if (file && file.type !== 'application/pdf') { setErr('El documento debe ser un PDF.'); return }
    setSaving(true)
    try {
      const key = file ? await uploadPdf(file, person.id) : undefined
      const res = await otorgarLicencia({ profileId: person.id, desde, hasta: hasta || undefined, motivo: motivo || undefined, docKey: key })
      if (!res.ok) { setErr(res.error); setSaving(false); return }
      toast.success('Licencia otorgada'); onDone()
    } catch (e: any) { setErr(e?.message ?? 'Error'); setSaving(false) }
  }
  return (
    <Overlay title="Otorgar licencia" subtitle={person.fullName}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label style={s.label}>Desde *</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={s.input} /></div>
          <div><label style={s.label}>Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={s.input} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={s.label}>Motivo</label><textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} placeholder="Ej. reposo médico" style={{ ...s.input, resize: 'vertical' }} /></div>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Documento (PDF, opcional)</label><input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ ...s.input, padding: 6 }} /></div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}><button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Guardando…' : 'Otorgar'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button></div>
      </form>
    </Overlay>
  )
}

function EditarModal({ person, onClose, onDone }: { person: WorkspacePerson; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    fullName: person.fullName ?? '', dni: person.dni ?? '', birthDate: person.birthDate ?? '',
    phone: person.celular ?? '', email: person.correo ?? '', profession: person.profession ?? '',
    distrito: person.distrito ?? '', residencia: person.residencia ?? '',
  })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(p => ({ ...p, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true)
    const res = await editarDatos({ profileId: person.id, patch: f })
    if (!res.ok) { setErr(res.error); setSaving(false); return }
    toast.success('Datos actualizados'); onDone()
  }
  return (
    <Overlay title="Editar datos" subtitle={person.fullName}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Nombres y apellidos</label><input value={f.fullName} onChange={set('fullName')} style={s.input} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>DNI</label><input value={f.dni} onChange={set('dni')} style={s.input} /></div>
          <div><label style={s.label}>Fecha de nacimiento</label><input type="date" value={f.birthDate ? f.birthDate.split('T')[0] : ''} onChange={set('birthDate')} style={s.input} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Celular</label><input value={f.phone} onChange={set('phone')} style={s.input} /></div>
          <div><label style={s.label}>Correo</label><input value={f.email} onChange={set('email')} style={s.input} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Profesión / ocupación</label><input value={f.profession} onChange={set('profession')} style={s.input} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div><label style={s.label}>Distrito</label><input value={f.distrito} onChange={set('distrito')} style={s.input} /></div>
          <div><label style={s.label}>Residencia</label><input value={f.residencia} onChange={set('residencia')} style={s.input} /></div>
        </div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}><button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button></div>
      </form>
    </Overlay>
  )
}

function AltaManualModal({ defaultConvocatoria, onClose, onDone }: { defaultConvocatoria?: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    fullName: '', grade: 'postulante' as 'postulante' | 'aspirante', dni: '', birthDate: '',
    phone: '', email: '', profession: '', distrito: '', residencia: '',
    convocatoriaIngresoLabel: defaultConvocatoria ?? '', ordenAntiguedad: '',
  })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }))
  const edad = edadDe(f.birthDate)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (f.fullName.trim().length < 3) { setErr('Ingresa el nombre completo.'); return }
    if (f.dni && !/^\d{8}$/.test(f.dni)) { setErr('El DNI debe tener 8 dígitos.'); return }
    setSaving(true)
    const res = await altaManual({
      fullName: f.fullName, grade: f.grade,
      dni: f.dni || undefined, birthDate: f.birthDate || undefined,
      phone: f.phone || undefined, email: f.email || undefined, profession: f.profession || undefined,
      distrito: f.distrito || undefined, residencia: f.residencia || undefined,
      convocatoriaIngresoLabel: f.convocatoriaIngresoLabel || undefined,
      ordenAntiguedad: f.ordenAntiguedad ? Number(f.ordenAntiguedad) : undefined,
    })
    if (!res.ok) { setErr(res.error); setSaving(false); return }
    toast.success('Efectivo registrado en formación'); onDone()
  }
  return (
    <Overlay title="Alta manual" subtitle="Para quienes ingresaron sin el formulario público">
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Nombres y apellidos *</label><input value={f.fullName} onChange={set('fullName')} style={s.input} placeholder="Ej. Juan Carlos Pérez Rojas" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Grado *</label><select value={f.grade} onChange={set('grade')} style={s.input as React.CSSProperties}><option value="postulante">Postulante</option><option value="aspirante">Aspirante</option></select></div>
          <div><label style={s.label}>DNI</label><input value={f.dni} onChange={set('dni')} inputMode="numeric" maxLength={8} style={s.input} placeholder="8 dígitos" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Fecha de nacimiento {edad !== null && <span style={{ color: 'var(--brass)' }}>· {edad} años</span>}</label><input type="date" max={new Date().toISOString().slice(0, 10)} value={f.birthDate} onChange={set('birthDate')} style={s.input} /></div>
          <div><label style={s.label}>Orden de antigüedad</label><input value={f.ordenAntiguedad} onChange={set('ordenAntiguedad')} inputMode="numeric" style={s.input} placeholder="N.°" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Celular</label><input value={f.phone} onChange={set('phone')} inputMode="numeric" style={s.input} /></div>
          <div><label style={s.label}>Correo</label><input value={f.email} onChange={set('email')} type="email" style={s.input} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Profesión / ocupación</label><input value={f.profession} onChange={set('profession')} style={s.input} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Distrito</label><input value={f.distrito} onChange={set('distrito')} style={s.input} /></div>
          <div><label style={s.label}>Residencia</label><input value={f.residencia} onChange={set('residencia')} style={s.input} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Convocatoria de ingreso</label><input value={f.convocatoriaIngresoLabel} onChange={set('convocatoriaIngresoLabel')} style={s.input} placeholder="Ej. 2025-I" /></div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}><button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Registrando…' : 'Registrar'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button></div>
      </form>
    </Overlay>
  )
}
