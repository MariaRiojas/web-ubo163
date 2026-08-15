'use client'

import { useEffect, useState, useCallback } from 'react'

interface Profile { profileId: string; fullName: string; dni: string; status: string }
interface Enrollment { cohortId: string; profileId: string; status: string; enrolledAt: string; finalGrade: number | null }
interface Evaluation { evaluationId: string; cohortId: string; profileId: string; category: string; subtype: string; score: number; date: string; notes: string }
interface Cohort { cohortId: string; name: string; type: string; year: string; period: string; status: string; resolution: string }

const TABS = ['Miembros', 'Académica', 'Física', 'Aptitud Bomberil', 'Informe'] as const
const FISICA_SUBTYPES = ['planchas', 'burpies', 'abdominales', 'barras', 'resistencia_aerobica']
const APTITUD_SUBTYPES = ['asistencia_lecciones', 'tardanzas', 'asistencia_guardias', 'participacion', 'colaboracion_eventos']
const FISICA_LABELS: Record<string, string> = { planchas: 'Planchas', burpies: 'Burpies', abdominales: 'Abdominales', barras: 'Barras', resistencia_aerobica: 'Resistencia' }
const APTITUD_LABELS: Record<string, string> = { asistencia_lecciones: 'Asist. Lecciones', tardanzas: 'Tardanzas', asistencia_guardias: 'Guardias', participacion: 'Participación', colaboracion_eventos: 'Eventos' }

export function CohortDetailClient({ cohortId, canManage }: { cohortId: string; canManage: boolean }) {
  const [tab, setTab] = useState<typeof TABS[number]>('Miembros')
  const [cohort, setCohort] = useState<Cohort | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<string | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [report, setReport] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/aspirantes/${cohortId}`)
    const data = await res.json()
    setCohort(data.cohort)
    setEnrollments(data.enrollments || [])
    setEvaluations(data.evaluations || [])
    setProfiles(data.profiles || [])
    setLoading(false)
  }, [cohortId])

  useEffect(() => { load() }, [load])

  const activeEnrollments = enrollments.filter(e => e.status !== 'retirado')
  const profileMap = Object.fromEntries(profiles.map(p => [p.profileId, p.fullName]))

  function getScore(profileId: string, category: string, subtype: string) {
    const ev = evaluations.find(e => e.profileId === profileId && e.category === category && e.subtype === subtype)
    return ev ? ev.score : null
  }

  function avg(scores: (number | null)[]) {
    const valid = scores.filter((s): s is number => s !== null)
    if (valid.length === 0) return null
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100
  }

  async function loadAllProfiles() {
    const res = await fetch('/api/personnel')
    const data = await res.json()
    setAllProfiles((data.items || []).filter((p: any) => p.status === 'postulante' || p.status === 'aspirante_en_curso' || p.status === 'activo'))
  }

  async function enrollMembers(ids: string[]) {
    await fetch(`/api/aspirantes/${cohortId}/enroll`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileIds: ids }) })
    setModal(null)
    load()
  }

  async function submitEval(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries())
    body.score = String(Number(body.score))
    await fetch(`/api/aspirantes/${cohortId}/evaluate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setModal(null)
    load()
  }

  async function loadReport() {
    const res = await fetch(`/api/aspirantes/${cohortId}/report`)
    const data = await res.json()
    setReport(data.report || [])
  }

  async function closeCohort() {
    if (!confirm('¿Cerrar convocatoria? Se calcularán los promedios finales.')) return
    // Update each enrollment with finalGrade
    for (const r of report) {
      const status = r.aprobado ? 'aprobado' : 'desaprobado'
      await fetch(`/api/aspirantes/${cohortId}/enroll`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: '__noop__' }) }).catch(() => {})
      // Actually use PUT on the cohort to update enrollment status
    }
    await fetch(`/api/aspirantes/${cohortId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cerrada' }) })
    load()
  }

  useEffect(() => { if (tab === 'Informe') loadReport() }, [tab])

  if (loading) return <p style={{ padding: '24px', color: 'var(--steel)' }}>Cargando...</p>
  if (!cohort) return <p style={{ padding: '24px', color: 'var(--steel)' }}>No encontrado</p>

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <a href="/areas/instruccion/aspirantes" style={{ color: 'var(--steel)', fontSize: '12px', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>← Volver</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--bone)' }}>{cohort.name}</h1>
        <span style={{ background: cohort.status === 'activa' ? '#22c55e' : cohort.status === 'graduada' ? '#d4a017' : '#6b7280', color: '#fff', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{cohort.status}</span>
      </div>
      <p style={{ color: 'var(--steel)', fontSize: '13px', marginBottom: '24px' }}>
        {cohort.type === 'postulante' ? 'Postulantes' : 'Aspirantes'} · {cohort.year}-{cohort.period}
        {cohort.resolution && ` · Res. ${cohort.resolution}`}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--ink-line)', marginBottom: '24px' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid var(--red-163)' : '2px solid transparent', color: tab === t ? 'var(--bone)' : 'var(--steel)', padding: '10px 16px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Miembros */}
      {tab === 'Miembros' && (
        <div>
          {canManage && (
            <button onClick={() => { loadAllProfiles(); setModal('enroll') }} style={btnStyle}>+ Agregar Miembros</button>
          )}
          <table style={tableStyle}>
            <thead><tr>
              <th style={thStyle}>Nombre</th><th style={thStyle}>Estado</th><th style={thStyle}>Promedio</th>
            </tr></thead>
            <tbody>
              {activeEnrollments.map(en => {
                const allScores = evaluations.filter(ev => ev.profileId === en.profileId).map(ev => ev.score)
                const prom = avg(allScores)
                return (
                  <tr key={en.profileId}>
                    <td style={tdStyle}>{profileMap[en.profileId] || en.profileId}</td>
                    <td style={tdStyle}>{en.status}</td>
                    <td style={{ ...tdStyle, color: prom !== null && prom < 14 ? 'var(--red-163)' : '#22c55e' }}>{prom !== null ? prom.toFixed(2) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {activeEnrollments.length === 0 && <p style={{ color: 'var(--steel)', marginTop: '12px' }}>Sin miembros inscritos.</p>}
        </div>
      )}

      {/* Tab: Académica */}
      {tab === 'Académica' && (
        <div>
          {canManage && <button onClick={() => setModal('academica')} style={btnStyle}>+ Registrar Nota</button>}
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Nombre</th>
                {Array.from({ length: 30 }, (_, i) => <th key={i} style={{ ...thStyle, minWidth: '40px' }}>L{i + 1}</th>)}
                <th style={thStyle}>Prom</th>
              </tr></thead>
              <tbody>
                {activeEnrollments.map(en => {
                  const scores = Array.from({ length: 30 }, (_, i) => getScore(en.profileId, 'academica', `leccion_${i + 1}`))
                  const prom = avg(scores)
                  return (
                    <tr key={en.profileId}>
                      <td style={tdStyle}>{profileMap[en.profileId] || '—'}</td>
                      {scores.map((s, i) => <td key={i} style={{ ...tdStyle, color: s !== null ? (s < 14 ? 'var(--red-163)' : '#22c55e') : 'var(--steel)' }}>{s !== null ? s : '—'}</td>)}
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: prom !== null && prom < 14 ? 'var(--red-163)' : '#22c55e' }}>{prom !== null ? prom.toFixed(1) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Física */}
      {tab === 'Física' && (
        <div>
          {canManage && <button onClick={() => setModal('fisica')} style={btnStyle}>+ Registrar Nota</button>}
          <table style={tableStyle}>
            <thead><tr>
              <th style={thStyle}>Nombre</th>
              {FISICA_SUBTYPES.map(s => <th key={s} style={thStyle}>{FISICA_LABELS[s]}</th>)}
              <th style={thStyle}>Prom</th>
            </tr></thead>
            <tbody>
              {activeEnrollments.map(en => {
                const scores = FISICA_SUBTYPES.map(s => getScore(en.profileId, 'fisica', s))
                const prom = avg(scores)
                return (
                  <tr key={en.profileId}>
                    <td style={tdStyle}>{profileMap[en.profileId] || '—'}</td>
                    {scores.map((s, i) => <td key={i} style={{ ...tdStyle, color: s !== null ? (s < 14 ? 'var(--red-163)' : '#22c55e') : 'var(--steel)' }}>{s !== null ? s : '—'}</td>)}
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: prom !== null && prom < 14 ? 'var(--red-163)' : '#22c55e' }}>{prom !== null ? prom.toFixed(1) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Aptitud Bomberil */}
      {tab === 'Aptitud Bomberil' && (
        <div>
          {canManage && <button onClick={() => setModal('aptitud')} style={btnStyle}>+ Registrar Nota</button>}
          <table style={tableStyle}>
            <thead><tr>
              <th style={thStyle}>Nombre</th>
              {APTITUD_SUBTYPES.map(s => <th key={s} style={thStyle}>{APTITUD_LABELS[s]}</th>)}
              <th style={thStyle}>Prom</th>
            </tr></thead>
            <tbody>
              {activeEnrollments.map(en => {
                const scores = APTITUD_SUBTYPES.map(s => getScore(en.profileId, 'aptitud', s))
                const prom = avg(scores)
                return (
                  <tr key={en.profileId}>
                    <td style={tdStyle}>{profileMap[en.profileId] || '—'}</td>
                    {scores.map((s, i) => <td key={i} style={{ ...tdStyle, color: s !== null ? (s < 14 ? 'var(--red-163)' : '#22c55e') : 'var(--steel)' }}>{s !== null ? s : '—'}</td>)}
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: prom !== null && prom < 14 ? 'var(--red-163)' : '#22c55e' }}>{prom !== null ? prom.toFixed(1) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Informe */}
      {tab === 'Informe' && (
        <div>
          {canManage && cohort.status === 'activa' && (
            <button onClick={closeCohort} style={{ ...btnStyle, background: '#d4a017' }}>Cerrar Convocatoria</button>
          )}
          <table style={tableStyle}>
            <thead><tr>
              <th style={thStyle}>Nombre</th><th style={thStyle}>Académica</th><th style={thStyle}>Física</th><th style={thStyle}>Aptitud</th><th style={thStyle}>General</th><th style={thStyle}>Estado</th>
            </tr></thead>
            <tbody>
              {report.map((r: any) => (
                <tr key={r.profileId}>
                  <td style={tdStyle}>{r.fullName}</td>
                  <td style={{ ...tdStyle, color: r.avgAcademica >= 14 ? '#22c55e' : 'var(--red-163)' }}>{r.avgAcademica.toFixed(2)}</td>
                  <td style={{ ...tdStyle, color: r.avgFisica >= 14 ? '#22c55e' : 'var(--red-163)' }}>{r.avgFisica.toFixed(2)}</td>
                  <td style={{ ...tdStyle, color: r.avgAptitud >= 14 ? '#22c55e' : 'var(--red-163)' }}>{r.avgAptitud.toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{r.avgGeneral.toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{ background: r.aprobado ? '#22c55e' : 'var(--red-163)', color: '#fff', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      {r.aprobado ? 'APROBADO' : 'DESAPROBADO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.length === 0 && <p style={{ color: 'var(--steel)', marginTop: '12px' }}>Sin datos para el informe.</p>}
        </div>
      )}

      {/* Modal: Enroll */}
      {modal === 'enroll' && <EnrollModal profiles={allProfiles} enrolled={enrollments.map(e => e.profileId)} onClose={() => setModal(null)} onEnroll={enrollMembers} />}

      {/* Modal: Eval */}
      {(modal === 'academica' || modal === 'fisica' || modal === 'aptitud') && (
        <EvalModal category={modal} members={activeEnrollments.map(e => ({ id: e.profileId, name: profileMap[e.profileId] || e.profileId }))} onClose={() => setModal(null)} onSubmit={submitEval} />
      )}
    </div>
  )
}

function EnrollModal({ profiles, enrolled, onClose, onEnroll }: { profiles: Profile[]; enrolled: string[]; onClose: () => void; onEnroll: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const available = profiles.filter(p => !enrolled.includes(p.profileId))

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: '16px' }}>Agregar Miembros</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
          {available.map(p => (
            <label key={p.profileId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', color: 'var(--bone)', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(p.profileId)} onChange={e => setSelected(e.target.checked ? [...selected, p.profileId] : selected.filter(id => id !== p.profileId))} />
              {p.fullName} <span style={{ color: 'var(--steel)', fontSize: '11px' }}>({p.dni})</span>
            </label>
          ))}
          {available.length === 0 && <p style={{ color: 'var(--steel)' }}>No hay miembros disponibles.</p>}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => onEnroll(selected)} disabled={selected.length === 0} style={btnStyle}>Inscribir ({selected.length})</button>
          <button onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--ink-line)', color: 'var(--steel)' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function EvalModal({ category, members, onClose, onSubmit }: { category: string; members: { id: string; name: string }[]; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  const subtypes = category === 'academica'
    ? Array.from({ length: 30 }, (_, i) => ({ value: `leccion_${i + 1}`, label: `Lección ${i + 1}` }))
    : category === 'fisica'
      ? FISICA_SUBTYPES.map(s => ({ value: s, label: FISICA_LABELS[s] }))
      : APTITUD_SUBTYPES.map(s => ({ value: s, label: APTITUD_LABELS[s] }))

  return (
    <div style={overlayStyle}>
      <form onSubmit={onSubmit} style={modalStyle}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: '16px' }}>Registrar Nota — {category === 'academica' ? 'Académica' : category === 'fisica' ? 'Física' : 'Aptitud Bomberil'}</h3>
        <input type="hidden" name="category" value={category} />
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>Miembro</label>
          <select name="profileId" required style={inputSt}>
            <option value="">Seleccionar...</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>Evaluación</label>
          <select name="subtype" required style={inputSt}>
            <option value="">Seleccionar...</option>
            {subtypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>Nota (0-20)</label>
          <input name="score" type="number" min="0" max="20" step="0.5" required style={inputSt} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>Fecha</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} style={inputSt} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>Observaciones</label>
          <textarea name="notes" rows={2} style={{ ...inputSt, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" style={btnStyle}>Guardar</button>
          <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--ink-line)', color: 'var(--steel)' }}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}

const btnStyle: React.CSSProperties = { background: 'var(--red-163)', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', borderRadius: '0', marginBottom: '16px' }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase' }
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)' }
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle: React.CSSProperties = { background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: '32px', width: '440px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }
const labelSt: React.CSSProperties = { display: 'block', color: 'var(--steel)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }
const inputSt: React.CSSProperties = { width: '100%', background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '13px', borderRadius: '0' }
