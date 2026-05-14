"use client"

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Check, Play, FileText, Video, ClipboardCheck, BookOpen, Lock,
  ArrowLeft, Clock, GraduationCap, Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { CourseDetailData } from '@/lib/capacitacion/get-capacitacion-data'
import {
  enrollInCourse, unenrollFromCourse, markLessonComplete, unmarkLesson,
} from '@/lib/capacitacion/actions'

const CONTENT_TYPE_LABELS: Record<string, string> = {
  texto: 'Lectura',
  video: 'Video',
  practica: 'Práctica',
  evaluacion: 'Evaluación',
  lectura_archivo: 'Material',
}

const CONTENT_TYPE_ICONS = {
  texto: BookOpen,
  video: Video,
  practica: ClipboardCheck,
  evaluacion: Award,
  lectura_archivo: FileText,
} as const

export function CourseDetail({ detail }: { detail: CourseDetailData }) {
  const [pending, startTransition] = useTransition()

  const handleEnroll = () => {
    startTransition(async () => {
      const res = await enrollInCourse(detail.course.id)
      if (!res.ok) toast.error(res.error)
      else toast.success(res.reused ? 'Inscripción reactivada' : 'Inscripción confirmada')
    })
  }

  const handleUnenroll = () => {
    if (!confirm('¿Abandonar el curso? Su progreso actual se mantendrá.')) return
    startTransition(async () => {
      const res = await unenrollFromCourse(detail.course.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Abandonó el curso')
    })
  }

  return (
    <div className="course-detail">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/capacitacion"
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver a Capacitación
        </Link>
      </div>

      <header className="course-detail-header">
        <div className="course-detail-header-category">
          {detail.course.category === 'esbas' ? 'CURSO ESBAS · FUNDACIONAL' :
           detail.course.category === 'escuela_tecnica' ? 'ESCUELA TÉCNICA' :
           detail.course.category.toUpperCase()}
        </div>
        <h1 className="course-detail-header-title">{detail.course.title}</h1>
        {detail.course.subtitle && (
          <p className="course-detail-header-subtitle">{detail.course.subtitle}</p>
        )}
        {detail.course.description && (
          <p className="course-detail-header-desc">{detail.course.description}</p>
        )}

        <div className="course-detail-meta">
          {detail.course.durationHours && (
            <div className="course-detail-meta-item">
              <span className="course-detail-meta-label">DURACIÓN</span>
              <span className="course-detail-meta-value">{detail.course.durationHours} h</span>
            </div>
          )}
          <div className="course-detail-meta-item">
            <span className="course-detail-meta-label">LECCIONES</span>
            <span className="course-detail-meta-value">{detail.meta.totalLessons}</span>
          </div>
          {detail.course.minGrade && (
            <div className="course-detail-meta-item">
              <span className="course-detail-meta-label">GRADO MÍNIMO</span>
              <span className="course-detail-meta-value">{detail.course.minGrade}</span>
            </div>
          )}
          {detail.enrollment && (
            <>
              <div className="course-detail-meta-item">
                <span className="course-detail-meta-label">ESTADO</span>
                <span
                  className="course-detail-meta-value"
                  style={{
                    color: detail.enrollment.status === 'completada'
                      ? 'var(--emerald-glow)'
                      : 'var(--brass)',
                  }}
                >
                  {detail.enrollment.status === 'completada' ? 'Completado' :
                   detail.enrollment.status === 'activa' ? 'En curso' :
                   detail.enrollment.status}
                </span>
              </div>
              <div className="course-detail-meta-item">
                <span className="course-detail-meta-label">PROGRESO</span>
                <span className="course-detail-meta-value mono">
                  {detail.meta.completedLessons} / {detail.meta.totalLessons} · {detail.meta.percent}%
                </span>
              </div>
              {detail.enrollment.finalGrade && (
                <div className="course-detail-meta-item">
                  <span className="course-detail-meta-label">NOTA FINAL</span>
                  <span className="course-detail-meta-value" style={{ color: 'var(--brass)' }}>
                    {Number(detail.enrollment.finalGrade).toFixed(1)} / 20
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* CTA principal */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {!detail.enrollment && detail.meta.canEnroll && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleEnroll}
            disabled={pending}
          >
            <GraduationCap className="w-4 h-4" strokeWidth={1.8} />
            {pending ? 'Inscribiendo…' : 'Inscribirme al curso'}
          </button>
        )}
        {!detail.enrollment && !detail.meta.canEnroll && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--ink-deep)',
              border: '1px dashed var(--ink-line)',
              borderRadius: 2,
              color: 'var(--steel)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Lock className="w-4 h-4" strokeWidth={1.8} />
            {detail.meta.canEnrollReason ?? 'Curso no disponible para su figura'}
          </div>
        )}
        {detail.enrollment && detail.enrollment.status === 'activa' && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleUnenroll}
            disabled={pending}
          >
            Abandonar curso
          </button>
        )}
      </div>

      {/* Lista de lecciones */}
      {detail.lessons.length === 0 ? (
        <div className="guardia-empty">
          Este curso aún no tiene lecciones cargadas.
        </div>
      ) : (
        <>
          <h2 className="faena-section-title">Contenido del curso</h2>
          <div className="lesson-list">
            {detail.lessons.map((l) => (
              <LessonRow
                key={l.id}
                lesson={l}
                isEnrolled={!!detail.enrollment}
                canEdit={detail.enrollment?.status === 'activa'}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LessonRow({
  lesson,
  isEnrolled,
  canEdit,
}: {
  lesson: CourseDetailData['lessons'][number]
  isEnrolled: boolean
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [showScoreInput, setShowScoreInput] = useState(false)
  const [scoreValue, setScoreValue] = useState('')

  const Icon = CONTENT_TYPE_ICONS[lesson.contentType as keyof typeof CONTENT_TYPE_ICONS] ?? BookOpen
  const typeLabel = CONTENT_TYPE_LABELS[lesson.contentType] ?? lesson.contentType

  const isCompleted = ['completada', 'aprobada'].includes(lesson.status)
  const isReprobada = lesson.status === 'reprobada'

  const rowClass = cn(
    'lesson-item',
    isCompleted && 'lesson-item--completed',
    lesson.isCurrent && !isCompleted && 'lesson-item--current',
  )

  const handleMark = (score?: number) => {
    startTransition(async () => {
      const res = await markLessonComplete({
        lessonId: lesson.id,
        score,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (res.courseCompleted) {
        toast.success('¡Curso completado! 🎓')
      } else {
        toast.success(res.status === 'aprobada' ? 'Lección aprobada' : 'Lección marcada')
      }
      setShowScoreInput(false)
      setScoreValue('')
    })
  }

  const handleUnmark = () => {
    if (!confirm('¿Desmarcar esta lección?')) return
    startTransition(async () => {
      const res = await unmarkLesson(lesson.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Lección desmarcada')
    })
  }

  return (
    <div className={rowClass}>
      <div className="lesson-item-number">
        {isCompleted ? (
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        ) : (
          lesson.displayOrder + 1
        )}
      </div>
      <div>
        <div className="lesson-item-title">{lesson.title}</div>
        <div className="lesson-item-meta">
          <span className="lesson-item-type">
            <Icon className="w-3 h-3 inline mr-1" strokeWidth={1.8} />
            {typeLabel}
          </span>
          {lesson.durationMinutes && (
            <>
              <span>·</span>
              <span>
                <Clock className="w-3 h-3 inline mr-1" strokeWidth={1.8} />
                {lesson.durationMinutes} min
              </span>
            </>
          )}
          {!lesson.required && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--graphite)' }}>opcional</span>
            </>
          )}
          {lesson.score && (
            <>
              <span>·</span>
              <span style={{ color: isReprobada ? 'var(--red-glow)' : 'var(--emerald-glow)' }}>
                {Number(lesson.score).toFixed(1)} / 20
              </span>
            </>
          )}
        </div>
      </div>

      <div className="lesson-item-action">
        {lesson.isLocked && (
          <span style={{ color: 'var(--graphite)', fontSize: 11 }}>
            <Lock className="w-3 h-3 inline mr-1" strokeWidth={1.8} />
            Inscríbase para desbloquear
          </span>
        )}
        {!lesson.isLocked && isEnrolled && !isCompleted && canEdit && (
          <>
            {showScoreInput ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  placeholder="0-20"
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                  style={{
                    width: 60,
                    padding: '6px 8px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--ink-black)',
                    border: '1px solid var(--ink-line)',
                    color: 'var(--bone)',
                    borderRadius: 2,
                  }}
                />
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    const n = Number(scoreValue)
                    if (isNaN(n) || n < 0 || n > 20) {
                      toast.error('Puntaje entre 0 y 20')
                      return
                    }
                    handleMark(n)
                  }}
                  disabled={pending}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setShowScoreInput(false)
                    setScoreValue('')
                  }}
                  disabled={pending}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  if (lesson.contentType === 'evaluacion') {
                    setShowScoreInput(true)
                  } else {
                    handleMark()
                  }
                }}
                disabled={pending}
              >
                <Play className="w-3 h-3" strokeWidth={1.8} />
                {lesson.isCurrent ? 'Continuar' : 'Marcar completa'}
              </button>
            )}
          </>
        )}
        {!lesson.isLocked && isEnrolled && isCompleted && canEdit && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleUnmark}
            disabled={pending}
            title="Desmarcar"
          >
            Desmarcar
          </button>
        )}
        {!lesson.isLocked && isEnrolled && isCompleted && !canEdit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--emerald-glow)',
              letterSpacing: '0.08em',
            }}
          >
            <Check className="w-3 h-3 inline mr-1" strokeWidth={2.5} />
            COMPLETADA
          </span>
        )}
      </div>
    </div>
  )
}
