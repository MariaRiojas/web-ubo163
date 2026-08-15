"use client"

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Award, Download, ClipboardCheck, AlertCircle } from 'lucide-react'
import type { ProgresoData, ProgresoEntry, ProgresoCourseDetail, ProgresoLessonDetail } from '@/lib/areas/get-progreso-data'
import { markPracticeAttendance, issueCertificate } from '@/lib/capacitacion/instructor-actions'

const GRADE_LABELS: Record<string, string> = {
  postulante: 'Postulante',
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brig. Mayor',
  brigadier_general: 'Brig. General',
}

const STATUS_COLORS: Record<string, string> = {
  completada: 'var(--emerald-glow)',
  aprobada: 'var(--emerald-glow)',
  activa: 'var(--brass)',
  en_curso: 'var(--brass)',
  reprobada: 'var(--red-glow)',
  abandonada: 'var(--graphite)',
  no_iniciada: 'var(--graphite)',
}

const STATUS_LABELS: Record<string, string> = {
  completada: 'Completado',
  aprobada: 'Aprobada',
  activa: 'En curso',
  en_curso: 'En curso',
  reprobada: 'Reprobado',
  abandonada: 'Abandonado',
  no_iniciada: 'No iniciada',
}

const TYPE_LABELS: Record<string, string> = {
  texto: 'Texto',
  video: 'Video',
  lectura_archivo: 'Archivo',
  practica: 'Práctica',
  evaluacion: 'Evaluación',
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellido = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellido}`
}

function getInitials(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length >= 2) {
    const ap = parts[0].trim().split(/\s+/)[0]?.[0] ?? ''
    const nm = parts[1].trim().split(/\s+/)[0]?.[0] ?? ''
    return `${nm}${ap}`.toUpperCase()
  }
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ProgresoClient({ data, canManage }: { data: ProgresoData; canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = data.entries.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.fullName.toLowerCase().includes(q) || (e.codigoCgbvp ?? '').toLowerCase().includes(q)
  })

  return (
    <>
      {/* KPIs */}
      <div className="area-kpi-row" style={{ marginBottom: 20 }}>
        <div className="area-kpi">
          <div className="area-kpi-label">INSCRIPCIONES</div>
          <div className="area-kpi-value mono">{data.stats.totalEnrolled}</div>
          <div className="area-kpi-sub">total registradas</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">COMPLETADAS</div>
          <div className="area-kpi-value mono">{data.stats.totalCompleted}</div>
          <div className="area-kpi-sub">cursos terminados</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">EN CURSO</div>
          <div className="area-kpi-value mono">{data.stats.totalInProgress}</div>
          <div className="area-kpi-sub">actualmente activas</div>
        </div>
        <div className="area-kpi">
          <div className="area-kpi-label">EFECTIVOS</div>
          <div className="area-kpi-value mono">{data.entries.length}</div>
          <div className="area-kpi-sub">con historial</div>
        </div>
      </div>

      {data.entries.length === 0 ? (
        <div className="guardia-empty">
          Aún no hay inscripciones registradas en el sistema.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="search"
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'var(--ink-elevated)',
                border: '1px solid var(--ink-line)',
                color: 'var(--bone)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                borderRadius: 4,
                minWidth: 240,
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)', marginLeft: 'auto' }}>
              {filtered.length} efectivo{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.map(entry => (
              <ProgresoRow
                key={entry.profileId}
                entry={entry}
                canManage={canManage}
                expanded={expanded === entry.profileId}
                onToggle={() => setExpanded(prev => prev === entry.profileId ? null : entry.profileId)}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function ProgresoRow({
  entry,
  canManage,
  expanded,
  onToggle,
}: {
  entry: ProgresoEntry
  canManage: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const initials = getInitials(entry.fullName)
  const pct = entry.totalEnrolled > 0 ? Math.round((entry.completedCount / entry.totalEnrolled) * 100) : 0
  const [openCourse, setOpenCourse] = useState<string | null>(null)

  return (
    <div
      style={{
        background: 'var(--ink-elevated)',
        border: '1px solid var(--ink-line)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', background: 'none', border: 'none',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 2, flexShrink: 0,
          background: 'rgba(220, 38, 38, 0.1)', border: '1px solid var(--red-deep)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red-glow)',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--bone)', fontSize: 13 }}>
              {shortName(entry.fullName)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
              {GRADE_LABELS[entry.grade] ?? entry.grade}
            </span>
            {entry.codigoCgbvp && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)' }}>
                {entry.codigoCgbvp}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{
              flex: 1, height: 4, background: 'var(--ink-line)', borderRadius: 2, maxWidth: 200,
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${pct}%`,
                background: pct === 100 ? 'var(--emerald-glow)' : pct > 0 ? 'var(--brass)' : 'transparent',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)' }}>
              {entry.completedCount}/{entry.totalEnrolled} completado{entry.completedCount !== 1 ? 's' : ''}
            </span>
            {entry.inProgressCount > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)' }}>
                · {entry.inProgressCount} en curso
              </span>
            )}
          </div>
        </div>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </button>

      {expanded && entry.courses.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--ink-line)',
          padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {entry.courses.map(c => (
            <CourseDrilldown
              key={c.courseId}
              profileId={entry.profileId}
              course={c}
              canManage={canManage}
              open={openCourse === c.courseId}
              onToggle={() => setOpenCourse(prev => prev === c.courseId ? null : c.courseId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseDrilldown({
  profileId,
  course,
  canManage,
  open,
  onToggle,
}: {
  profileId: string
  course: ProgresoCourseDetail
  canManage: boolean
  open: boolean
  onToggle: () => void
}) {
  const pendingCount = course.lessons.filter(l => l.pendingReview).length

  return (
    <div style={{ border: '1px solid var(--ink-line)', borderRadius: 3, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: 'var(--ink-black)',
          border: 'none', cursor: 'pointer', padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: STATUS_COLORS[course.status] ?? 'var(--steel)',
        }} />
        <span style={{ fontSize: 12, color: 'var(--bone)', flex: 1 }}>{course.title}</span>
        {pendingCount > 0 && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--brass)',
            border: '1px solid var(--brass)', borderRadius: 2, padding: '1px 5px',
          }}>
            {pendingCount} por revisar
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: STATUS_COLORS[course.status] ?? 'var(--steel)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {STATUS_LABELS[course.status] ?? course.status}
        </span>
        {course.finalGrade && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brass)' }}>
            {Number(course.finalGrade).toFixed(2)}/20
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)',
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {course.lessons.map(l => (
            <LessonRow
              key={l.lessonId}
              profileId={profileId}
              courseId={course.courseId}
              lesson={l}
              canManage={canManage}
            />
          ))}

          <CertificateControl profileId={profileId} course={course} canManage={canManage} />
        </div>
      )}
    </div>
  )
}

function LessonRow({
  profileId,
  courseId,
  lesson,
  canManage,
}: {
  profileId: string
  courseId: string
  lesson: ProgresoLessonDetail
  canManage: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isCompleted = ['completada', 'aprobada'].includes(lesson.status)
  const canMarkPractice = canManage && lesson.contentType === 'practica' && !isCompleted

  function mark() {
    setError(null)
    startTransition(async () => {
      const res = await markPracticeAttendance({ profileId, courseId, lessonId: lesson.lessonId })
      if (!res.ok) { setError(res.error ?? 'Error al registrar'); return }
      router.refresh()
    })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
      flexWrap: 'wrap',
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: STATUS_COLORS[lesson.status] ?? 'var(--steel)',
      }} />
      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', minWidth: 70 }}>
        {lesson.moduleTitle.length > 14 ? lesson.moduleTitle.slice(0, 13) + '…' : lesson.moduleTitle}
      </span>
      <span style={{ fontSize: 12, color: 'var(--bone)', flex: 1, minWidth: 120 }}>
        {lesson.lessonTitle}
        {!lesson.required && (
          <span style={{ fontSize: 9, color: 'var(--graphite)', marginLeft: 6 }}>(opcional)</span>
        )}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--steel)' }}>
        {TYPE_LABELS[lesson.contentType] ?? lesson.contentType}
      </span>
      {lesson.pendingReview && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--brass)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <AlertCircle className="w-2.5 h-2.5" strokeWidth={2} /> por revisar
        </span>
      )}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: STATUS_COLORS[lesson.status] ?? 'var(--steel)',
        textTransform: 'uppercase', minWidth: 74, textAlign: 'right',
      }}>
        {STATUS_LABELS[lesson.status] ?? lesson.status}
      </span>
      {lesson.score != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--brass)' }}>
          {Number(lesson.score).toFixed(2)}
        </span>
      )}
      {canMarkPractice && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={mark}
          disabled={pending}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}
        >
          {pending
            ? <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={1.8} />
            : <ClipboardCheck className="w-2.5 h-2.5" strokeWidth={1.8} />}
          Marcar práctica asistida
        </button>
      )}
      {error && <span style={{ fontSize: 10, color: 'var(--red-glow)', width: '100%' }}>{error}</span>}
    </div>
  )
}

function CertificateControl({
  profileId,
  course,
  canManage,
}: {
  profileId: string
  course: ProgresoCourseDetail
  canManage: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setError(null)
    setDownloading(true)
    try {
      const res = await fetch(`/api/training/certificate/${profileId}/${course.courseId}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'No se pudo obtener el certificado'); return }
      window.open(json.url, '_blank')
    } catch {
      setError('No se pudo descargar el certificado')
    } finally {
      setDownloading(false)
    }
  }

  function issue() {
    setError(null)
    startTransition(async () => {
      const res = await issueCertificate({ profileId, courseId: course.courseId })
      if (!res.ok) { setError(res.error ?? 'Error al emitir'); return }
      router.refresh()
    })
  }

  const disabledReason =
    course.status !== 'completada'
      ? 'El curso aún no está completado'
      : course.finalGrade == null || Number(course.finalGrade) < 14
        ? `Nota final ${course.finalGrade ? Number(course.finalGrade).toFixed(2) : 'N/D'}/20 — se requiere ≥ 14`
        : null

  const hasCert = !!course.certificateKey

  return (
    <div style={{
      marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ink-line)',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      {hasCert && (
        <button
          type="button"
          className="btn btn--sm"
          onClick={download}
          disabled={downloading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {downloading
            ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.8} />
            : <Download className="w-3 h-3" strokeWidth={1.8} />}
          Descargar certificado
        </button>
      )}

      {canManage && (
        disabledReason && !hasCert ? (
          <span style={{ fontSize: 11, color: 'var(--graphite)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Award className="w-3 h-3" strokeWidth={1.8} />
            {disabledReason}
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--sm"
            onClick={issue}
            disabled={pending || !!disabledReason}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {pending
              ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.8} />
              : <Award className="w-3 h-3" strokeWidth={1.8} />}
            {hasCert ? 'Reemitir certificado' : 'Emitir certificado'}
          </button>
        )
      )}

      {course.completedAt && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', marginLeft: 'auto' }}>
          Completado {fmtDate(course.completedAt)}
        </span>
      )}
      {error && <span style={{ fontSize: 11, color: 'var(--red-glow)', width: '100%' }}>{error}</span>}
    </div>
  )
}
