"use client"

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import type { EvaluacionesData, EvalQueueItem } from '@/lib/areas/get-evaluaciones-data'
import { gradeEvalResponse } from '@/lib/capacitacion/instructor-actions'
import { GRADE_LABEL } from '@/lib/cgbvp/grades'

function gradeLabel(g: string): string {
  return (GRADE_LABEL as Record<string, string>)[g] ?? g
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellido = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellido}`
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function InstruccionEvaluacionesClient({
  data,
  canGrade,
}: {
  data: EvaluacionesData
  canGrade: boolean
}) {
  const [tab, setTab] = useState<'pendientes' | 'calificadas'>('pendientes')

  return (
    <>
      <div className="area-kpi-row" style={{ marginBottom: 20 }}>
        <div className="area-kpi">
          <div className="area-kpi-label">PENDIENTES</div>
          <div className="area-kpi-value mono">{data.pending.length}</div>
          <div className="area-kpi-sub">redacciones por calificar</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">CALIFICADAS</div>
          <div className="area-kpi-value mono">{data.graded.length}</div>
          <div className="area-kpi-sub">respuestas revisadas</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--ink-line)' }}>
        {([
          ['pendientes', `Pendientes (${data.pending.length})`],
          ['calificadas', `Calificadas (${data.graded.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: '8px 16px', fontSize: 13, cursor: 'pointer',
              background: 'none', border: 'none',
              color: tab === key ? 'var(--bone)' : 'var(--graphite)',
              borderBottom: tab === key ? '2px solid var(--brass)' : '2px solid transparent',
              fontWeight: tab === key ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pendientes' ? (
        data.pending.length === 0 ? (
          <div className="guardia-empty">No hay redacciones pendientes de calificación.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.pending.map(item => (
              <PendingCard key={item.evalId} item={item} canGrade={canGrade} />
            ))}
          </div>
        )
      ) : (
        data.graded.length === 0 ? (
          <div className="guardia-empty">Aún no hay respuestas calificadas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.graded.map(item => (
              <GradedCard key={item.evalId} item={item} />
            ))}
          </div>
        )
      )}
    </>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--ink-elevated)',
  border: '1px solid var(--ink-line)',
  borderRadius: 4,
  padding: '14px 16px',
}

function MetaHeader({ item }: { item: EvalQueueItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 600, color: 'var(--bone)', fontSize: 13 }}>{shortName(item.studentName)}</span>
      {item.grade && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
          {gradeLabel(item.grade)}
        </span>
      )}
      <span style={{ fontSize: 11, color: 'var(--steel)' }}>· {item.courseTitle}</span>
      <span style={{ fontSize: 11, color: 'var(--graphite)' }}>› {item.lessonTitle}</span>
    </div>
  )
}

function PromptAnswer({ item }: { item: EvalQueueItem }) {
  return (
    <>
      <div style={{
        marginTop: 10, fontSize: 12, color: 'var(--brass)', fontWeight: 600,
      }}>
        {item.prompt}
      </div>
      <div style={{
        marginTop: 6, padding: '10px 12px', fontSize: 13, color: 'var(--bone)',
        background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 3,
        whiteSpace: 'pre-wrap', lineHeight: 1.5,
      }}>
        {item.answer || <span style={{ color: 'var(--graphite)' }}>(respuesta en blanco)</span>}
      </div>
    </>
  )
}

function PendingCard({ item, canGrade }: { item: EvalQueueItem; canGrade: boolean }) {
  const router = useRouter()
  const [score, setScore] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    const val = Number(score)
    if (score.trim() === '' || !Number.isFinite(val)) {
      setError('Ingrese una nota')
      return
    }
    if (val < 0 || val > item.maxScore) {
      setError(`La nota debe estar entre 0 y ${item.maxScore}`)
      return
    }
    startTransition(async () => {
      const res = await gradeEvalResponse(item.evalId, val)
      if (!res.ok) { setError(res.error ?? 'Error al calificar'); return }
      router.refresh()
    })
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Clock className="w-3 h-3" strokeWidth={1.8} style={{ color: 'var(--brass)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}><MetaHeader item={item} /></div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
          {fmtDate(item.createdAt)}
        </span>
      </div>

      <PromptAnswer item={item} />

      {canGrade ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--steel)' }}>
            Nota (0–{item.maxScore})
          </label>
          <input
            type="number"
            min={0}
            max={item.maxScore}
            step="0.5"
            value={score}
            onChange={e => setScore(e.target.value)}
            disabled={pending}
            style={{
              width: 90, padding: '6px 10px', fontSize: 13,
              background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
              color: 'var(--bone)', borderRadius: 3,
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
            / {item.maxScore} pts
          </span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={save}
            disabled={pending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {pending && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.8} />}
            Guardar nota
          </button>
          {error && <span style={{ fontSize: 12, color: 'var(--red-glow)' }}>{error}</span>}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--graphite)' }}>
          Solo el instructor con permiso de gestión puede calificar.
        </div>
      )}
    </div>
  )
}

function GradedCard({ item }: { item: EvalQueueItem }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <CheckCircle2 className="w-3 h-3" strokeWidth={1.8} style={{ color: 'var(--emerald-glow)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}><MetaHeader item={item} /></div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--brass)', fontWeight: 600 }}>
          {item.score ?? '—'} / {item.maxScore}
        </span>
      </div>

      <PromptAnswer item={item} />

      <div style={{ marginTop: 10, display: 'flex', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
        {item.gradedByName && <span>Calificó: {shortName(item.gradedByName)}</span>}
        {item.gradedAt && <span>· {fmtDate(item.gradedAt)}</span>}
      </div>
    </div>
  )
}
