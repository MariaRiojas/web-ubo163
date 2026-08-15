'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  Search, SlidersHorizontal, MessageCircle, Lock, FileText, ExternalLink,
  X, ChevronDown, ChevronRight, CalendarClock, UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getCertijovenUrl,
  marcarWhatsappEnviado, registrarEntrevista, registrarPsicologica,
  registrarFisica, aprobarPostulante, descartarPostulante, cerrarConvocatoria,
  crearConvocatoria, getConvocatoriaRoster,
} from '@/lib/admission/actions'
import {
  ADMISSION_ETAPAS, ADMISSION_ETAPA_LABELS,
  type AdmissionApplication, type AdmissionEtapa,
} from '@/lib/db/schema/admission'
import { edadDe } from '@/lib/utils/edad'

type RosterRow = { applicationId: string; fullName: string; dni: string; etapa: AdmissionEtapa; ordenLlegada?: number }

type CohortLite = { cohortId: string; name: string; endDate: string | null }
type ClosedCohort = { cohortId: string; name: string; status: string; endDate: string | null }

const ETAPA_COLOR: Record<AdmissionEtapa, string> = {
  inscrito:    'var(--steel)',
  contactado:  'var(--brass)',
  entrevista:  'var(--brass)',
  psicologica: 'var(--brass)',
  fisica:      'var(--flame)',
  aprobado:    'var(--emerald-glow)',
  descartado:  'var(--red-glow)',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function waLink(celular: string): string {
  const digits = (celular || '').replace(/\D/g, '')
  return `https://wa.me/51${digits}`
}

function EtapaBadge({ etapa }: { etapa?: AdmissionEtapa }) {
  const e = etapa ?? 'inscrito'
  const color = ETAPA_COLOR[e]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.05em',
      textTransform: 'uppercase', color,
      border: `1px solid ${color}`, borderRadius: 2, padding: '2px 7px',
      background: 'color-mix(in srgb, ' + color + ' 12%, transparent)',
    }}>
      {ADMISSION_ETAPA_LABELS[e]}
    </span>
  )
}

export function AdmisionGestionClient({
  cohort,
  closedCohorts,
  applications,
  canManage,
}: {
  cohort: CohortLite | null
  closedCohorts: ClosedCohort[]
  applications: AdmissionApplication[]
  canManage: boolean
}) {
  const [items, setItems] = useState(applications)
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [etapaFilter, setEtapaFilter] = useState<AdmissionEtapa | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showNuevaConv, setShowNuevaConv] = useState(false)
  const [roster, setRoster] = useState<{ name: string; rows: RosterRow[] } | null>(null)
  const [rosterLoading, setRosterLoading] = useState(false)

  const abrirRoster = (c: ClosedCohort) => {
    setRosterLoading(true)
    setRoster({ name: c.name, rows: [] })
    startTransition(async () => {
      const res = await getConvocatoriaRoster(c.cohortId)
      setRosterLoading(false)
      if (!res.ok) { toast.error(res.error); setRoster(null); return }
      setRoster({ name: c.name, rows: res.roster })
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(a => {
      if (etapaFilter !== 'all' && (a.etapa ?? 'inscrito') !== etapaFilter) return false
      if (!q) return true
      return (a.fullName?.toLowerCase().includes(q) || a.dni?.includes(q))
    })
  }, [items, search, etapaFilter])

  const patchLocal = (applicationId: string, patch: Partial<AdmissionApplication>) =>
    setItems(prev => prev.map(i => i.applicationId === applicationId ? { ...i, ...patch } : i))

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void, okMsg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) { toast.error(res.error ?? 'No se pudo completar la acción'); return }
      onOk()
      toast.success(okMsg)
    })
  }

  const viewCertijoven = (key: string) => {
    startTransition(async () => {
      const res = await getCertijovenUrl(key)
      if (!res.ok) { toast.error(res.error); return }
      window.open(res.url, '_blank')
    })
  }

  const closeConvocatoria = () => {
    if (!cohort) return
    if (!window.confirm(`¿Cerrar la convocatoria «${cohort.name}»? El formulario público dejará de recibir postulaciones.`)) return
    run(
      () => cerrarConvocatoria({ cohortId: cohort.cohortId }),
      () => { window.location.reload() },
      'Convocatoria cerrada',
    )
  }

  return (
    <>
      <header className="area-hero" style={{ marginBottom: 20 }}>
        <div className="area-hero-seal">AD</div>
        <div className="area-hero-body">
          <div className="area-hero-ref">ÁREA DE INSTRUCCIÓN</div>
          <h1 className="area-hero-title">Admisión de Postulantes</h1>
          <p className="area-hero-desc">
            Convocatoria vigente y registro histórico de promociones. Gestiona el proceso de
            selección desde la inscripción hasta la aprobación.
          </p>
        </div>
        {cohort && (
          <div className="area-hero-jefe">
            <span className="area-hero-jefe-label">POSTULANTES</span>
            <span className="area-hero-jefe-name mono" style={{ fontSize: 28 }}>{items.length}</span>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 18, alignItems: 'start' }}>
        {/* ── Columna izquierda: Histórico ── */}
        <aside>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--steel)',
            }}>
              Histórico
            </span>
            {canManage && !cohort && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowNuevaConv(true)}>
                + Nueva convocatoria
              </button>
            )}
          </div>
          {closedCohorts.length === 0 ? (
            <div className="guardia-empty" style={{ fontSize: 12 }}>
              Aún no hay convocatorias cerradas.
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              maxHeight: 620, overflowY: 'auto', paddingRight: 4,
            }}>
              {closedCohorts.map(c => (
                <button key={c.cohortId} type="button" onClick={() => abrirRoster(c)} title="Ver postulantes y su estado final" style={{
                  background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                  borderRadius: 3, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', width: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                      {c.name}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'var(--graphite)',
                      border: '1px solid var(--ink-line)', borderRadius: 2, padding: '2px 6px',
                    }}>
                      <Lock className="w-2.5 h-2.5" strokeWidth={2} />
                      {c.status === 'graduada' ? 'Graduada' : 'Cerrado'}
                    </span>
                  </div>
                  {c.endDate && (
                    <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
                      Cerró el {fmtDate(c.endDate)}
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--brass)' }}>
                    Ver postulantes →
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Columna derecha: Convocatoria abierta ── */}
        <section>
          {!cohort ? (
            <div className="guardia-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span>No hay ninguna convocatoria activa. Abre una nueva convocatoria para activar el formulario público de admisión y empezar a recibir postulaciones.</span>
              {canManage && (
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowNuevaConv(true)}>
                  + Nueva convocatoria
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Título de la convocatoria abierta */}
              <div style={{
                background: 'var(--ink-deep)', border: '1px solid var(--brass)',
                borderRadius: 3, padding: '16px 18px', marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 4,
                }}>
                  Convocatoria abierta
                </div>
                <div style={{ fontSize: 20, color: 'var(--bone)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  Postulantes {cohort.name}
                </div>
              </div>

              {/* Caja de control: cierre + cerrar convocatoria */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                borderRadius: 3, padding: '12px 16px', marginBottom: 12,
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>
                  <CalendarClock className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
                  {cohort.endDate ? <>Cierra el {fmtDate(cohort.endDate)}</> : 'Sin fecha de cierre definida'}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={closeConvocatoria}
                    disabled={pending}
                    className="btn btn--sm"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'transparent', color: 'var(--red-163)',
                      border: '1px solid var(--red-163)',
                    }}
                  >
                    <Lock className="w-3 h-3" strokeWidth={2} /> Cerrar Convocatoria
                  </button>
                )}
              </div>

              {/* Búsqueda + filtro */}
              <div style={{ display: 'flex', gap: 8, marginBottom: showFilter ? 8 : 14, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search className="w-3.5 h-3.5" strokeWidth={1.8} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--graphite)' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o DNI…"
                    style={{
                      width: '100%', padding: '8px 12px 8px 32px', fontSize: 13,
                      background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
                      borderRadius: 2, color: 'var(--bone)', fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilter(v => !v)}
                  className="btn btn--ghost btn--sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: showFilter ? 'var(--brass)' : undefined }}
                >
                  <SlidersHorizontal className="w-3 h-3" strokeWidth={1.8} /> Filtro
                </button>
              </div>

              {showFilter && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {(['all', ...ADMISSION_ETAPAS] as const).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEtapaFilter(key)}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 2, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.03em',
                        background: etapaFilter === key ? 'var(--brass)' : 'var(--ink-deep)',
                        color: etapaFilter === key ? 'var(--ink-black)' : 'var(--steel)',
                        border: `1px solid ${etapaFilter === key ? 'var(--brass)' : 'var(--ink-line)'}`,
                      }}
                    >
                      {key === 'all' ? 'Todas' : ADMISSION_ETAPA_LABELS[key]}
                    </button>
                  ))}
                </div>
              )}

              {/* Tabla de postulantes */}
              {filtered.length === 0 ? (
                <div className="guardia-empty">
                  {items.length === 0 ? 'Aún no hay postulaciones en esta convocatoria.' : 'Ningún postulante coincide con el filtro.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--ink-line)', borderRadius: 3 }}>
                  <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--ink-black)' }}>
                        {['N°', 'Postulante', 'Documento', 'Fecha registro', 'Estado', ...(canManage ? [''] : [])].map((h, idx) => (
                          <th key={idx} style={{
                            textAlign: 'left', padding: '9px 12px',
                            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                            textTransform: 'uppercase', color: 'var(--graphite)',
                            borderBottom: '1px solid var(--ink-line)', whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(app => {
                        const isOpen = expandedId === app.applicationId
                        return (
                          <FragmentRow
                            key={app.applicationId}
                            app={app}
                            isOpen={isOpen}
                            canManage={canManage}
                            pending={pending}
                            onToggle={() => setExpandedId(isOpen ? null : app.applicationId)}
                            onViewCertijoven={viewCertijoven}
                            actions={{
                              whatsapp: () => run(
                                () => marcarWhatsappEnviado({ applicationId: app.applicationId }),
                                () => patchLocal(app.applicationId, { etapa: 'contactado', contactadoWhatsappAt: new Date().toISOString() }),
                                'WhatsApp marcado como enviado',
                              ),
                              entrevista: (resultado, observacion) => run(
                                () => registrarEntrevista({ applicationId: app.applicationId, resultado, observacion }),
                                () => patchLocal(app.applicationId, { etapa: 'entrevista' }),
                                `Entrevista registrada (${resultado})`,
                              ),
                              psicologica: (resultado, observacion) => run(
                                () => registrarPsicologica({ applicationId: app.applicationId, resultado, observacion }),
                                () => patchLocal(app.applicationId, { etapa: 'psicologica' }),
                                `Ev. psicológica registrada (${resultado})`,
                              ),
                              programarFisica: (fechaProgramada) => run(
                                () => registrarFisica({ applicationId: app.applicationId, fechaProgramada }),
                                () => patchLocal(app.applicationId, { etapa: 'fisica' }),
                                'Prueba física programada',
                              ),
                              resultadoFisica: (resultado) => run(
                                () => registrarFisica({ applicationId: app.applicationId, resultado }),
                                () => patchLocal(app.applicationId, { etapa: 'fisica' }),
                                `Prueba física registrada (${resultado})`,
                              ),
                              aprobar: () => run(
                                () => aprobarPostulante({ applicationId: app.applicationId }),
                                () => patchLocal(app.applicationId, { etapa: 'aprobado', status: 'aprobado_siguiente_etapa' }),
                                'Postulante aprobado',
                              ),
                              descartar: (observacion) => run(
                                () => descartarPostulante({ applicationId: app.applicationId, observacion }),
                                () => patchLocal(app.applicationId, { etapa: 'descartado', status: 'descartado', observaciones: observacion }),
                                'Postulante descartado',
                              ),
                            }}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showNuevaConv && <NuevaConvocatoriaModal onClose={() => setShowNuevaConv(false)} />}
      {roster && <RosterModal name={roster.name} rows={roster.rows} loading={rosterLoading} onClose={() => setRoster(null)} />}
    </>
  )
}

// ── Modal: nueva convocatoria ───────────────────────────────────────────────
function NuevaConvocatoriaModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: '', type: 'esbas', year: String(new Date().getFullYear()), period: '', resolution: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!f.name.trim() || !f.year || !f.period) { setErr('Completa nombre, año y periodo.'); return }
    setSaving(true)
    const res = await crearConvocatoria(f)
    if (!res.ok) { setErr(res.error); setSaving(false); return }
    toast.success('Convocatoria abierta'); window.location.reload()
  }
  const inp: React.CSSProperties = { width: '100%', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 13, borderRadius: 2 }
  const lab: React.CSSProperties = { display: 'block', color: 'var(--steel)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }
  return (
    <ModalShell title="Nueva convocatoria" subtitle="Activa el formulario público de admisión" onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}><label style={lab}>Nombre *</label><input value={f.name} onChange={set('name')} style={inp} placeholder="Ej. Convocatoria 2026-I" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={lab}>Tipo</label><select value={f.type} onChange={set('type')} style={inp}><option value="esbas">ESBAS / Compañía</option><option value="tecnica">Escuela Técnica</option></select></div>
          <div><label style={lab}>Resolución</label><input value={f.resolution} onChange={set('resolution')} style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={lab}>Año *</label><input value={f.year} onChange={set('year')} inputMode="numeric" style={inp} /></div>
          <div><label style={lab}>Periodo *</label><input value={f.period} onChange={set('period')} style={inp} placeholder="I, II, III" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div><label style={lab}>Fecha inicio</label><input type="date" value={f.startDate} onChange={set('startDate')} style={inp} /></div>
          <div><label style={lab}>Fecha cierre</label><input type="date" value={f.endDate} onChange={set('endDate')} style={inp} /></div>
        </div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Abriendo…' : 'Abrir convocatoria'}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Modal: roster histórico de una convocatoria (solo lectura) ───────────────
function RosterModal({ name, rows, loading, onClose }: { name: string; rows: RosterRow[]; loading: boolean; onClose: () => void }) {
  return (
    <ModalShell title={name} subtitle="Estado final de cada postulante · solo lectura" onClose={onClose} wide>
      {loading ? (
        <p style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--graphite)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Esta convocatoria no tiene postulaciones registradas.</p>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
          <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ink-black)' }}>
                {['N°', 'Postulante', 'DNI', 'Estado final'].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--graphite)', borderBottom: '1px solid var(--ink-line)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.applicationId}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--ink-line)', fontFamily: 'var(--font-mono)', color: 'var(--brass)' }}>{r.ordenLlegada ?? i + 1}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)' }}>{r.fullName}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--ink-line)', fontFamily: 'var(--font-mono)', color: 'var(--steel)' }}>{r.dni}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--ink-line)' }}><EtapaBadge etapa={r.etapa} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({ title, subtitle, wide, onClose, children }: { title: string; subtitle?: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 24, width: wide ? 620 : 460, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: subtitle ? 4 : 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', fontSize: '1.15rem' }}>{title}</h2>
          <button type="button" onClick={onClose} className="btn btn--ghost btn--sm" aria-label="Cerrar">✕</button>
        </div>
        {subtitle && <p style={{ color: 'var(--steel)', fontSize: 12, marginBottom: 18, fontFamily: 'var(--font-mono)' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

// ── Fila de la tabla + panel expandible de gestión ──────────────────────────

interface RowActions {
  whatsapp: () => void
  entrevista: (resultado: 'apto' | 'observado', observacion?: string) => void
  psicologica: (resultado: 'apto' | 'observado', observacion?: string) => void
  programarFisica: (fechaProgramada: string) => void
  resultadoFisica: (resultado: 'apto' | 'no_apto') => void
  aprobar: () => void
  descartar: (observacion?: string) => void
}

function FragmentRow({
  app, isOpen, canManage, pending, onToggle, onViewCertijoven, actions,
}: {
  app: AdmissionApplication
  isOpen: boolean
  canManage: boolean
  pending: boolean
  onToggle: () => void
  onViewCertijoven: (key: string) => void
  actions: RowActions
}) {
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid var(--ink-line)',
    color: 'var(--bone)', verticalAlign: 'middle',
  }
  return (
    <>
      <tr style={{ background: isOpen ? 'var(--ink-black)' : 'transparent' }}>
        <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--brass)', width: 48 }}>
          {app.ordenLlegada ?? '—'}
        </td>
        <td style={cellStyle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{app.fullName}</span>
            <a
              href={waLink(app.celular)}
              target="_blank"
              rel="noopener noreferrer"
              title={`WhatsApp ${app.celular}`}
              style={{ display: 'inline-flex', color: 'var(--emerald-glow)' }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
            </a>
          </span>
        </td>
        <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--steel)' }}>{app.dni}</td>
        <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--steel)', whiteSpace: 'nowrap' }}>
          {fmtDate(app.createdAt)}
        </td>
        <td style={cellStyle}><EtapaBadge etapa={app.etapa} /></td>
        {canManage && (
          <td style={{ ...cellStyle, width: 40, textAlign: 'right' }}>
            <button
              type="button"
              onClick={onToggle}
              className="btn btn--ghost btn--sm"
              title="Gestionar"
              style={{ padding: '4px 6px' }}
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
            </button>
          </td>
        )}
      </tr>
      {isOpen && canManage && (
        <tr>
          <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--ink-line)' }}>
            <ManagePanel app={app} pending={pending} onViewCertijoven={onViewCertijoven} actions={actions} />
          </td>
        </tr>
      )}
    </>
  )
}

function ManagePanel({
  app, pending, onViewCertijoven, actions,
}: {
  app: AdmissionApplication
  pending: boolean
  onViewCertijoven: (key: string) => void
  actions: RowActions
}) {
  const labelCls: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: 6, display: 'block',
  }
  const step = (title: string, done: boolean, children: React.ReactNode) => (
    <div style={{
      background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: '10px 12px',
      flex: 1, minWidth: 180,
    }}>
      <div style={{ ...labelCls, color: done ? 'var(--emerald-glow)' : 'var(--graphite)' }}>
        {done ? '✓ ' : ''}{title}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )

  const askObs = (msg: string) => window.prompt(msg) ?? undefined

  return (
    <div style={{ background: 'var(--ink-black)', padding: '14px 16px' }}>
      {/* Datos de contacto */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>
        <span>{(edadDe(app.birthDate) ?? app.age) ?? '—'} años{app.birthDate ? ` (${fmtDate(app.birthDate)})` : ''}</span>
        <span>· {app.profession}</span>
        <span>· Distrito {app.distrito}</span>
        {app.residencia && <span>· {app.residencia}</span>}
        {app.correo && <span>· {app.correo}</span>}
        <span>· Cel. {app.celular}</span>
        {app.contactadoWhatsappAt && <span style={{ color: 'var(--emerald-glow)' }}>· WhatsApp {fmtDate(app.contactadoWhatsappAt)}</span>}
      </div>

      {app.observaciones && (
        <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--flame)', borderLeft: '2px solid var(--flame)', paddingLeft: 8 }}>
          {app.observaciones}
        </p>
      )}

      {/* Pipeline */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {step('1 · WhatsApp', !!app.contactadoWhatsappAt || app.etapa === 'contactado', (
          <button type="button" disabled={pending} className="btn btn--ghost btn--sm" onClick={actions.whatsapp}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--emerald-glow)' }}>
            <MessageCircle className="w-3 h-3" strokeWidth={1.8} /> Enviado
          </button>
        ))}

        {step('2 · Entrevista', !!app.entrevista?.resultado, (
          <>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ color: 'var(--emerald-glow)' }}
              onClick={() => actions.entrevista('apto')}>Apto</button>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ color: 'var(--flame)' }}
              onClick={() => actions.entrevista('observado', askObs('Observación de la entrevista:'))}>Observado</button>
          </>
        ))}

        {step('3 · Psicológica', !!app.psicologica?.resultado, (
          <>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ color: 'var(--emerald-glow)' }}
              onClick={() => actions.psicologica('apto')}>Apto</button>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ color: 'var(--flame)' }}
              onClick={() => actions.psicologica('observado', askObs('Observación psicológica:'))}>Observado</button>
          </>
        ))}

        {step('4 · Prueba física', !!app.fisica?.resultado, (
          <>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => { const f = window.prompt('Fecha de la prueba física (ej. 2026-09-15):'); if (f) actions.programarFisica(f) }}>
              <CalendarClock className="w-3 h-3" strokeWidth={1.8} /> Programar
            </button>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ color: 'var(--emerald-glow)' }}
              onClick={() => actions.resultadoFisica('apto')}>Apto</button>
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" style={{ color: 'var(--red-glow)' }}
              onClick={() => actions.resultadoFisica('no_apto')}>No apto</button>
          </>
        ))}
      </div>

      {/* Decisión final + documento */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" disabled={pending} className="btn btn--primary btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={actions.aprobar}>
          <UserCheck className="w-3.5 h-3.5" strokeWidth={2} /> Aprobar
        </button>
        <button type="button" disabled={pending} className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--red-glow)' }}
          onClick={() => { if (window.confirm(`¿Descartar la postulación de ${app.fullName}?`)) actions.descartar(askObs('Motivo (opcional):')) }}>
          <X className="w-3.5 h-3.5" strokeWidth={2} /> Descartar
        </button>

        <span style={{ marginLeft: 'auto' }}>
          {app.certijovenKey ? (
            <button type="button" disabled={pending} className="btn btn--ghost btn--sm" onClick={() => onViewCertijoven(app.certijovenKey!)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileText className="w-3 h-3" strokeWidth={1.8} /> Ver CERTIJOVEN <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
            </button>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>Sin CERTIJOVEN adjunto</span>
          )}
        </span>
      </div>
    </div>
  )
}
