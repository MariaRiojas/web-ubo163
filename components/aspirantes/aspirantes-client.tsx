'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Cohort {
  cohortId: string; name: string; type: string; year: string; period: string
  status: string; resolution: string; startDate: string; endDate: string; createdAt: string
}

interface GeneralItem {
  profileId: string; fullName: string; grade: string; status: string
  codigoCgbvp: string; cohortId: string; cohortName: string; enrolledAt: string
}

type TabKey = 'general' | 'convocatorias' | 'historial'

const GRADE_LABEL: Record<string, string> = { postulante: 'Postulante', aspirante: 'Aspirante' }

export function AspirantesClient({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<TabKey>('general')
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [general, setGeneral] = useState<GeneralItem[]>([])
  const [loadingCohorts, setLoadingCohorts] = useState(true)
  const [loadingGeneral, setLoadingGeneral] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { loadCohorts(); loadGeneral() }, [])

  async function loadCohorts() {
    setLoadingCohorts(true)
    const res = await fetch('/api/aspirantes')
    const data = await res.json()
    setCohorts(data.items || [])
    setLoadingCohorts(false)
  }

  async function loadGeneral() {
    setLoadingGeneral(true)
    const res = await fetch('/api/aspirantes?view=general')
    const data = await res.json()
    setGeneral(data.items || [])
    setLoadingGeneral(false)
  }

  async function createCohort(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries())
    await fetch('/api/aspirantes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setShowModal(false)
    loadCohorts()
  }

  async function closeCohort(cohortId: string, name: string) {
    if (!confirm(`¿Cerrar la convocatoria "${name}"? Pasará al Historial. Sus miembros y evaluaciones se conservarán intactos.`)) return
    setClosingId(cohortId)
    await fetch(`/api/aspirantes/${cohortId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'graduada' }),
    })
    setClosingId(null)
    loadCohorts()
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { activa: '#22c55e', cerrada: '#6b7280', graduada: '#d4a017' }
    return { background: colors[s] || '#6b7280', color: '#fff', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const }
  }

  const activeCohorts = cohorts.filter(c => c.status === 'activa')
  const closedCohorts = cohorts.filter(c => c.status === 'cerrada' || c.status === 'graduada')

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--bone)' }}>Postulantes y Aspirantes</h1>
        {canManage && tab === 'convocatorias' && (
          <button onClick={() => setShowModal(true)} style={{ background: 'var(--red-163)', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontSize: '12px', borderRadius: '0' }}>
            + Nueva Convocatoria
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--ink-line)', marginBottom: '24px' }}>
        <TabBtn active={tab === 'general'} onClick={() => setTab('general')} label="General" count={general.length} />
        <TabBtn active={tab === 'convocatorias'} onClick={() => setTab('convocatorias')} label="Convocatorias" count={activeCohorts.length} />
        <TabBtn active={tab === 'historial'} onClick={() => setTab('historial')} label="Historial" count={closedCohorts.length} />
      </div>

      {tab === 'general' && (
        loadingGeneral ? <p style={{ color: 'var(--steel)' }}>Cargando...</p> : <GeneralTable items={general} />
      )}

      {tab === 'convocatorias' && (
        loadingCohorts ? <p style={{ color: 'var(--steel)' }}>Cargando...</p> : (
          <CohortGrid
            cohorts={activeCohorts}
            canManage={canManage}
            statusBadge={statusBadge}
            closingId={closingId}
            onOpen={id => router.push(`/areas/instruccion/aspirantes/${id}`)}
            onClose={closeCohort}
            emptyMessage="No hay convocatorias activas."
          />
        )
      )}

      {tab === 'historial' && (
        loadingCohorts ? <p style={{ color: 'var(--steel)' }}>Cargando...</p> : (
          <CohortGrid
            cohorts={closedCohorts}
            canManage={false}
            statusBadge={statusBadge}
            closingId={null}
            onOpen={id => router.push(`/areas/instruccion/aspirantes/${id}`)}
            onClose={() => {}}
            emptyMessage="No hay convocatorias en el historial."
          />
        )
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={createCohort} style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: '32px', width: '420px', maxWidth: '90vw' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: '20px' }}>Nueva Convocatoria</h2>
            <Field label="Nombre" name="name" required />
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Tipo</label>
              <select name="type" required style={inputStyle}>
                <option value="postulante">Postulante</option>
                <option value="aspirante">Aspirante</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Año" name="year" required defaultValue={new Date().getFullYear().toString()} />
              <Field label="Periodo" name="period" required placeholder="I, II, III" />
            </div>
            <Field label="Resolución" name="resolution" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Fecha inicio" name="startDate" type="date" />
              <Field label="Fecha fin" name="endDate" type="date" />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" style={{ background: 'var(--red-163)', color: '#fff', border: 'none', padding: '8px 20px', cursor: 'pointer', fontFamily: 'var(--font-mono)', borderRadius: '0' }}>Crear</button>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--steel)', border: '1px solid var(--ink-line)', padding: '8px 20px', cursor: 'pointer', borderRadius: '0' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--red-163)' : '2px solid transparent',
        color: active ? 'var(--bone)' : 'var(--steel)',
        padding: '10px 16px',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {label}
      <span style={{ background: 'var(--ink-surface)', color: 'var(--steel)', padding: '1px 6px', fontSize: '11px', borderRadius: '0' }}>{count}</span>
    </button>
  )
}

function GeneralTable({ items }: { items: GeneralItem[] }) {
  if (items.length === 0) {
    return <p style={{ color: 'var(--steel)' }}>No hay postulantes ni aspirantes en formación.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={thStyle}>Nombre completo</th>
            <th style={thStyle}>Grado</th>
            <th style={thStyle}>Código CGBVP</th>
            <th style={thStyle}>Convocatoria</th>
            <th style={thStyle}>Fecha inscripción</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.profileId}>
              <td style={tdStyle}>{item.fullName}</td>
              <td style={tdStyle}>
                <span style={{ background: item.grade === 'postulante' ? '#3b82f6' : '#f97316', color: '#fff', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                  {GRADE_LABEL[item.grade] || item.grade}
                </span>
              </td>
              <td style={tdStyle}>{item.codigoCgbvp || '—'}</td>
              <td style={tdStyle}>{item.cohortName || <span style={{ color: 'var(--steel)' }}>Sin convocatoria</span>}</td>
              <td style={tdStyle}>{item.enrolledAt ? item.enrolledAt.split('T')[0] : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CohortGrid({
  cohorts, canManage, statusBadge, closingId, onOpen, onClose, emptyMessage,
}: {
  cohorts: Cohort[]
  canManage: boolean
  statusBadge: (s: string) => React.CSSProperties
  closingId: string | null
  onOpen: (cohortId: string) => void
  onClose: (cohortId: string, name: string) => void
  emptyMessage: string
}) {
  if (cohorts.length === 0) {
    return <p style={{ color: 'var(--steel)' }}>{emptyMessage}</p>
  }

  return (
    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
      {cohorts.map(c => (
        <div key={c.cohortId} onClick={() => onOpen(c.cohortId)} style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: '20px', cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--ink-surface)', padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--steel)' }}>
            {c.type === 'postulante' ? 'POST' : 'ASP'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: '8px' }}>{c.name}</h3>
          <p style={{ color: 'var(--steel)', fontSize: '13px', margin: '4px 0' }}>{c.year}-{c.period}</p>
          {c.resolution && <p style={{ color: 'var(--steel)', fontSize: '12px', margin: '4px 0' }}>Res. {c.resolution}</p>}
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={statusBadge(c.status)}>{c.status}</span>
            {canManage && c.status === 'activa' && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(c.cohortId, c.name) }}
                disabled={closingId === c.cohortId}
                style={{ background: 'transparent', color: 'var(--steel)', border: '1px solid var(--ink-line)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', borderRadius: '0' }}
              >
                {closingId === c.cohortId ? 'Cerrando...' : 'Cerrar cohorte'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--steel)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '13px', borderRadius: '0' }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase' }
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)' }

function Field({ label, name, type = 'text', required, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} style={inputStyle} />
    </div>
  )
}
