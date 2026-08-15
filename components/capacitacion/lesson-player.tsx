"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Check, Clock, Download, ClipboardCheck,
  BookOpen, Video, Award, FileText, Eye, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { markLessonComplete } from '@/lib/capacitacion/actions'
import { MiniQuiz } from './mini-quiz'
import { SafeHtml, LESSON_SANITIZE_CONFIG } from '@/components/ui/safe-html'

export interface PlayerQuizQuestion {
  questionId: string
  type: 'multiple_choice' | 'fill_blank' | 'open_text'
  prompt: string
  options?: string[]
  points: number
}

interface PlayerLesson {
  lessonId: string
  title: string
  description: string | null
  contentType: string
  content: string | null
  videoUrl: string | null
  materialKey: string | null
  durationMinutes: number | null
  status: 'no_iniciada' | 'en_curso' | 'completada' | 'aprobada' | 'reprobada'
  score: string | null
}

const TYPE_META: Record<string, { label: string; Icon: typeof BookOpen }> = {
  texto:           { label: 'Lectura interactiva', Icon: BookOpen },
  video:           { label: 'Video',               Icon: Video },
  practica:        { label: 'Práctica presencial', Icon: ClipboardCheck },
  evaluacion:      { label: 'Evaluación',          Icon: Award },
  lectura_archivo: { label: 'Material de estudio', Icon: FileText },
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (u.hostname === 'youtu.be') {
      const v = u.pathname.slice(1)
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const v = u.pathname.split('/').filter(Boolean)[0]
      return v ? `https://player.vimeo.com/video/${v}` : null
    }
  } catch {}
  return null
}

/**
 * Divide el contenido de la lección en bloques narrativos.
 * Separadores: `<hr>` (Tiptap/HTML) o una línea `---` (texto plano).
 */
function splitIntoBlocks(content: string): string[] {
  return content
    .split(/<hr\s*\/?\s*>|\r?\n-{3,}\r?\n/i)
    .map(b => b.trim())
    .filter(Boolean)
}

/** Texto plano → párrafos HTML sencillos; si ya trae etiquetas se respeta. */
function toHtml(block: string): string {
  if (/<[a-z][\s\S]*>/i.test(block)) return block
  return block
    .split(/\r?\n\r?\n/)
    .map(p => `<p>${p.replace(/\r?\n/g, '<br/>')}</p>`)
    .join('')
}

/** Bloque que se revela al entrar al viewport (scrollytelling). */
function ScrollBlock({
  html,
  index,
  onReveal,
  instantReveal,
}: {
  html: string
  index: number
  onReveal: (index: number) => void
  instantReveal: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(instantReveal)

  useEffect(() => {
    if (instantReveal) { onReveal(index); return }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true)
            onReveal(index)
            io.disconnect()
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instantReveal])

  return (
    <div
      ref={ref}
      className="lesson-scroll-block"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        fontSize: 15,
        lineHeight: 1.75,
        color: 'var(--steel)',
        maxWidth: 720,
        margin: '0 auto',
        padding: '28px 0',
        borderBottom: '1px solid var(--ink-line)',
      }}
    >
      <SafeHtml html={html} config={LESSON_SANITIZE_CONFIG} />
    </div>
  )
}

export function LessonPlayer({
  courseId,
  courseSlug,
  courseTitle,
  moduleTitle,
  lesson,
  quiz,
  position,
  prevLesson,
  nextLesson,
}: {
  courseId: string
  courseSlug: string
  courseTitle: string
  moduleTitle: string
  lesson: PlayerLesson
  quiz: PlayerQuizQuestion[]
  position: { current: number; total: number }
  prevLesson: { lessonId: string; title: string } | null
  nextLesson: { lessonId: string; title: string; isLocked: boolean } | null
}) {
  const router = useRouter()
  const alreadyDone = ['completada', 'aprobada'].includes(lesson.status)
  const [completed, setCompleted] = useState(alreadyDone)

  const isPractica = lesson.contentType === 'practica'
  const isEvaluacion = lesson.contentType === 'evaluacion'
  const isVideo = lesson.contentType === 'video'
  const isLectura = lesson.contentType === 'lectura_archivo'

  const blocks = useMemo(
    () => (lesson.content && !isEvaluacion ? splitIntoBlocks(lesson.content).map(toHtml) : []),
    [lesson.content, isEvaluacion],
  )

  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set())
  const [videoWatched, setVideoWatched] = useState(alreadyDone)
  const [readConfirmed, setReadConfirmed] = useState(alreadyDone)

  const revealedCount = revealedSet.size
  const allBlocksSeen = blocks.length === 0 || revealedCount >= blocks.length
  const embedUrl = lesson.videoUrl ? getEmbedUrl(lesson.videoUrl) : null

  // Requisitos previos al quiz según tipo de lección
  const quizUnlocked =
    completed ||
    (allBlocksSeen &&
      (!isVideo || videoWatched) &&
      (!isLectura || readConfirmed))

  const { label: typeLabel, Icon: TypeIcon } = TYPE_META[lesson.contentType] ?? TYPE_META.texto
  const scrollPercent = blocks.length > 0 ? Math.round((revealedCount / blocks.length) * 100) : 100

  const [pendingMark, startMark] = useTransition()

  const handlePassed = () => {
    setCompleted(true)
    router.refresh()
  }

  const handleMarkComplete = () => {
    startMark(async () => {
      try {
        const res = await markLessonComplete({ courseId, lessonId: lesson.lessonId })
        if (!res.ok) { toast.error(res.error); return }
        toast.success(res.courseCompleted ? '¡Curso completado!' : 'Lección completada')
        handlePassed()
      } catch (err) {
        console.error('[LessonPlayer markComplete]', err)
        toast.error('No se pudo registrar el progreso. Inténtelo de nuevo.')
      }
    })
  }

  return (
    <div className="max-w-[1400px]">
      {/* ── Migas + progreso ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--ink-black)', borderBottom: '1px solid var(--ink-line)',
        margin: '0 0 24px', padding: '12px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href={`/capacitacion/${courseSlug}`}
            className="btn btn--ghost btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            {courseTitle}
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {moduleTitle}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>
            LECCIÓN {position.current} / {position.total}
          </span>
        </div>
        {/* Barra de progreso de lectura */}
        {blocks.length > 0 && !isPractica && (
          <div style={{ height: 2, background: 'var(--ink-line)', marginTop: 10, borderRadius: 1 }}>
            <div style={{
              height: '100%', borderRadius: 1,
              width: `${completed ? 100 : scrollPercent}%`,
              background: completed ? 'var(--emerald-glow)' : 'var(--brass)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}
      </div>

      {/* ── Cabecera de la lección ── */}
      <header style={{ maxWidth: 720, margin: '0 auto 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
          color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 10,
        }}>
          <TypeIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
          {typeLabel}
          {lesson.durationMinutes && (
            <span style={{ color: 'var(--graphite)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              · <Clock className="w-3 h-3" strokeWidth={1.8} /> {lesson.durationMinutes} min
            </span>
          )}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.2,
          color: 'var(--bone)', marginBottom: 10,
        }}>
          {lesson.title}
        </h1>
        {lesson.description && (
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--steel)', marginBottom: 6 }}>
            {lesson.description}
          </p>
        )}
        {completed && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
            color: 'var(--emerald-glow)',
          }}>
            <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
            {lesson.score ? `COMPLETADA · ${Number(lesson.score).toFixed(1)}/20` : 'COMPLETADA'}
          </div>
        )}
      </header>

      {/* ── Práctica presencial: sin scrollytelling ── */}
      {isPractica ? (
        <div style={{ maxWidth: 720, margin: '32px auto' }}>
          {lesson.content && (
            <SafeHtml
              html={toHtml(lesson.content)}
              config={LESSON_SANITIZE_CONFIG}
              style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--steel)', marginBottom: 24 }}
            />
          )}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px',
            background: 'var(--ink-deep)', border: '1px dashed var(--brass-deep)', borderRadius: 3,
          }}>
            <ClipboardCheck className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--steel)' }}>
              <strong style={{ color: 'var(--bone)' }}>Actividad presencial.</strong>{' '}
              {completed
                ? 'El instructor validó su asistencia a esta práctica.'
                : 'Su asistencia será registrada por el instructor una vez realizada la actividad. Esta lección no puede marcarse desde la plataforma.'}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Video ── */}
          {isVideo && lesson.videoUrl && (
            <div style={{ maxWidth: 720, margin: '24px auto' }}>
              {embedUrl ? (
                <div style={{ borderRadius: 3, overflow: 'hidden', aspectRatio: '16/9', background: '#000', border: '1px solid var(--ink-line)' }}>
                  <iframe
                    src={embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              ) : (
                <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                  Ver video externo
                </a>
              )}
              {!completed && (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
                  fontSize: 13, color: videoWatched ? 'var(--emerald-glow)' : 'var(--steel)', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={videoWatched}
                    onChange={e => setVideoWatched(e.target.checked)}
                    style={{ accentColor: 'var(--brass)' }}
                  />
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                  Confirmo que vi el video completo
                </label>
              )}
            </div>
          )}

          {/* ── Material descargable ── */}
          {isLectura && lesson.materialKey && (
            <div style={{ maxWidth: 720, margin: '24px auto' }}>
              <a
                href={`/api/library/${lesson.materialKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                <Download className="w-4 h-4" strokeWidth={1.8} />
                Descargar material de estudio
              </a>
              {!completed && (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
                  fontSize: 13, color: readConfirmed ? 'var(--emerald-glow)' : 'var(--steel)', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={readConfirmed}
                    onChange={e => setReadConfirmed(e.target.checked)}
                    style={{ accentColor: 'var(--brass)' }}
                  />
                  <BookOpen className="w-4 h-4" strokeWidth={1.8} />
                  Confirmo que leí el documento completo
                </label>
              )}
            </div>
          )}

          {/* ── Bloques scrollytelling ── */}
          {blocks.length > 0 && (
            <div style={{ margin: '8px 0 0' }}>
              {blocks.map((html, i) => (
                <ScrollBlock
                  key={i}
                  html={html}
                  index={i}
                  instantReveal={completed || i === 0}
                  onReveal={idx => setRevealedSet(prev => {
                    if (prev.has(idx)) return prev
                    const next = new Set(prev)
                    next.add(idx)
                    return next
                  })}
                />
              ))}
            </div>
          )}

          {/* ── Instrucciones de evaluación ── */}
          {isEvaluacion && lesson.content && (
            <SafeHtml
              html={toHtml(lesson.content)}
              config={LESSON_SANITIZE_CONFIG}
              style={{
                maxWidth: 720, margin: '24px auto', padding: '14px 18px',
                background: 'var(--ink-deep)', borderLeft: '2px solid var(--brass-deep)',
                fontSize: 13, lineHeight: 1.65, color: 'var(--steel)',
              }}
            />
          )}

          {/* ── Quiz ── */}
          {quiz.length > 0 && !completed && (
            <div style={{
              maxWidth: 720, margin: '36px auto 0', paddingTop: 32,
              opacity: quizUnlocked ? 1 : 0.35,
              transition: 'opacity 0.6s ease',
              pointerEvents: quizUnlocked ? 'auto' : 'none',
            }}>
              {!quizUnlocked && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)',
                  letterSpacing: '0.08em',
                }}>
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {isVideo && !videoWatched ? 'CONFIRME EL VIDEO PARA DESBLOQUEAR EL CUESTIONARIO'
                    : isLectura && !readConfirmed ? 'CONFIRME LA LECTURA PARA DESBLOQUEAR EL CUESTIONARIO'
                    : 'CONTINÚE LEYENDO PARA DESBLOQUEAR EL CUESTIONARIO'}
                </div>
              )}
              <MiniQuiz
                courseId={courseId}
                lessonId={lesson.lessonId}
                quiz={quiz}
                isEvaluacion={isEvaluacion}
                onPassed={handlePassed}
              />
            </div>
          )}

          {/* ── Sin quiz: marcar como completada directamente ── */}
          {quiz.length === 0 && !completed && (
            <div style={{
              maxWidth: 720, margin: '36px auto 0',
              opacity: quizUnlocked ? 1 : 0.35,
              transition: 'opacity 0.6s ease',
              pointerEvents: quizUnlocked ? 'auto' : 'none',
            }}>
              <button
                type="button"
                className="btn btn--primary"
                disabled={pendingMark}
                onClick={handleMarkComplete}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
                {pendingMark ? 'Guardando…' : 'Marcar lección como completada'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Navegación inferior ── */}
      <div style={{
        maxWidth: 720, margin: '48px auto 24px', paddingTop: 20,
        borderTop: '1px solid var(--ink-line)',
        display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        {prevLesson ? (
          <Link
            href={`/capacitacion/${courseSlug}/leccion/${prevLesson.lessonId}`}
            className="btn btn--ghost btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            {prevLesson.title}
          </Link>
        ) : <span />}
        {nextLesson && (completed || !nextLesson.isLocked) ? (
          <Link
            href={`/capacitacion/${courseSlug}/leccion/${nextLesson.lessonId}`}
            className="btn btn--primary btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            {nextLesson.title}
            <ArrowRight className="w-3 h-3" strokeWidth={1.8} />
          </Link>
        ) : nextLesson ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-mono)',
          }}>
            <Lock className="w-3 h-3" strokeWidth={1.8} />
            {nextLesson.title}
          </span>
        ) : completed ? (
          <Link
            href={`/capacitacion/${courseSlug}`}
            className="btn btn--primary btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            Finalizar curso
            <ArrowRight className="w-3 h-3" strokeWidth={1.8} />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
