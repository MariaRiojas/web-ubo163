"use client"

import { useState, useTransition } from 'react'
import { Check, X, Send, RotateCcw, Hourglass } from 'lucide-react'
import { toast } from 'sonner'
import { submitLessonQuiz } from '@/lib/capacitacion/actions'
import type { PlayerQuizQuestion } from './lesson-player'

type QuizResult = {
  passed: boolean
  wrongIds: string[]
  pendingReview: boolean
  score20?: number
  autoScore20?: number
  courseCompleted?: boolean
}

export function MiniQuiz({
  courseId,
  lessonId,
  quiz,
  isEvaluacion,
  onPassed,
}: {
  courseId: string
  lessonId: string
  quiz: PlayerQuizQuestion[]
  isEvaluacion: boolean
  onPassed: (courseCompleted: boolean) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [pending, startTransition] = useTransition()

  const setAnswer = (questionId: string, value: string) =>
    setAnswers(prev => ({ ...prev, [questionId]: value }))

  const allAnswered = quiz.every(q => (answers[q.questionId] ?? '').trim().length > 0)

  const handleSubmit = () => {
    if (!allAnswered) { toast.error('Responda todas las preguntas'); return }
    startTransition(async () => {
      try {
        const res = await submitLessonQuiz({ courseId, lessonId, answers })
        if (!res.ok) { toast.error(res.error); return }
        const r: QuizResult = {
          passed: 'passed' in res ? res.passed : false,
          wrongIds: 'wrongIds' in res ? res.wrongIds : [],
          pendingReview: 'pendingReview' in res ? res.pendingReview : false,
          score20: 'score20' in res ? res.score20 : undefined,
          autoScore20: 'autoScore20' in res ? res.autoScore20 : undefined,
          courseCompleted: 'courseCompleted' in res ? res.courseCompleted : false,
        }
        setResult(r)
        if (r.passed) {
          toast.success(r.courseCompleted ? '¡Curso completado!' : isEvaluacion ? 'Evaluación aprobada' : 'Lección completada')
          onPassed(!!r.courseCompleted)
        } else if (r.pendingReview) {
          toast.info('Sus respuestas de redacción fueron enviadas al instructor')
        }
      } catch (err) {
        console.error('[MiniQuiz submit]', err)
        toast.error('No se pudo enviar. Inténtelo de nuevo.')
      }
    })
  }

  const handleRetry = () => {
    setResult(null)
    setAnswers({})
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
        color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 6,
      }}>
        {isEvaluacion ? 'Evaluación · Nota mínima 14/20' : 'Comprobación de lectura'}
      </div>
      <p style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 20 }}>
        {isEvaluacion
          ? `${quiz.length} pregunta${quiz.length === 1 ? '' : 's'}. Responda con calma — la nota se calcula sobre 20.`
          : 'Responda correctamente para completar la lección. Puede reintentar las veces que necesite.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {quiz.map((q, i) => {
          const wrong = result != null && !result.passed && result.wrongIds.includes(q.questionId)
          const rightAfterSubmit = result != null && !result.wrongIds.includes(q.questionId) && q.type !== 'open_text'
          return (
            <div
              key={q.questionId}
              style={{
                padding: '16px 18px',
                background: 'var(--ink-deep)',
                border: `1px solid ${wrong ? 'var(--red-glow)' : rightAfterSubmit ? 'var(--emerald-glow)' : 'var(--ink-line)'}`,
                borderRadius: 3,
              }}
            >
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'baseline' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)', flexShrink: 0,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ fontSize: 14, color: 'var(--bone)', lineHeight: 1.55, flex: 1 }}>
                  {q.prompt}
                </div>
                {isEvaluacion && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', flexShrink: 0 }}>
                    {q.points} pt{q.points === 1 ? '' : 's'}
                  </span>
                )}
                {wrong && <X className="w-4 h-4" strokeWidth={2.2} style={{ color: 'var(--red-glow)', flexShrink: 0 }} />}
                {rightAfterSubmit && <Check className="w-4 h-4" strokeWidth={2.2} style={{ color: 'var(--emerald-glow)', flexShrink: 0 }} />}
              </div>

              {q.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(q.options ?? []).map(opt => {
                    const selected = answers[q.questionId] === opt
                    return (
                      <label
                        key={opt}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, cursor: result ? 'default' : 'pointer',
                          padding: '9px 12px', borderRadius: 2, fontSize: 13,
                          background: selected ? 'var(--ink-black)' : 'transparent',
                          border: `1px solid ${selected ? 'var(--brass-deep)' : 'var(--ink-line)'}`,
                          color: selected ? 'var(--bone)' : 'var(--steel)',
                        }}
                      >
                        <input
                          type="radio"
                          name={q.questionId}
                          value={opt}
                          checked={selected}
                          disabled={!!result && (result.passed || result.pendingReview)}
                          onChange={() => setAnswer(q.questionId, opt)}
                          style={{ accentColor: 'var(--brass)' }}
                        />
                        {opt}
                      </label>
                    )
                  })}
                </div>
              )}

              {q.type === 'fill_blank' && (
                <input
                  type="text"
                  placeholder="Complete la frase…"
                  value={answers[q.questionId] ?? ''}
                  disabled={!!result && (result.passed || result.pendingReview)}
                  onChange={e => setAnswer(q.questionId, e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: 13,
                    background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
                    color: 'var(--bone)', borderRadius: 2,
                  }}
                />
              )}

              {q.type === 'open_text' && (
                <textarea
                  rows={5}
                  placeholder="Desarrolle su respuesta… (la calificará el instructor)"
                  value={answers[q.questionId] ?? ''}
                  disabled={!!result && (result.passed || result.pendingReview)}
                  onChange={e => setAnswer(q.questionId, e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: 13, lineHeight: 1.6,
                    background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
                    color: 'var(--bone)', borderRadius: 2, resize: 'vertical',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Resultado / acciones ── */}
      <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {!result && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={pending || !allAnswered}
            onClick={handleSubmit}
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
            {pending ? 'Enviando…' : isEvaluacion ? 'Enviar evaluación' : 'Comprobar respuestas'}
          </button>
        )}

        {result && result.pendingReview && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            background: 'var(--ink-deep)', border: '1px solid var(--brass-deep)', borderRadius: 3,
            fontSize: 13, color: 'var(--bone)',
          }}>
            <Hourglass className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
            <div>
              Redacciones enviadas al instructor para su calificación.
              {result.autoScore20 != null && (
                <span style={{ color: 'var(--steel)' }}> Avance automático: {result.autoScore20}/20.</span>
              )}
            </div>
          </div>
        )}

        {result && !result.passed && !result.pendingReview && (
          <>
            <div style={{ fontSize: 13, color: 'var(--red-glow)' }}>
              {isEvaluacion && result.score20 != null
                ? `Nota: ${result.score20}/20 — no alcanzó el mínimo de 14`
                : `${result.wrongIds.length} respuesta${result.wrongIds.length === 1 ? '' : 's'} incorrecta${result.wrongIds.length === 1 ? '' : 's'}`}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleRetry}>
              <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
              Reintentar
            </button>
          </>
        )}

        {result && result.passed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            color: 'var(--emerald-glow)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
          }}>
            <Check className="w-4 h-4" strokeWidth={2.2} />
            {isEvaluacion && result.score20 != null ? `APROBADA · ${result.score20}/20` : 'LECCIÓN COMPLETADA'}
          </div>
        )}
      </div>
    </div>
  )
}
