import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getCourseDetail } from '@/lib/capacitacion/get-capacitacion-data'
import { getCourseModules } from '@/lib/db/schema/training'
import { LessonPlayer, type PlayerQuizQuestion } from '@/components/capacitacion/lesson-player'

export const dynamic = 'force-dynamic'

/** Fisher-Yates — orden rotativo de preguntas por carga de página */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { slug, lessonId } = await params
  const detail = await getCourseDetail(slug, session.user.profileId)
  if (!detail) notFound()

  const lessonMeta = detail.lessons.find(l => l.lessonId === lessonId)
  if (!lessonMeta) notFound()

  // Sin inscripción o lección bloqueada por secuencialidad → volver al curso
  if (!detail.enrollment || lessonMeta.isLocked) {
    redirect(`/capacitacion/${slug}`)
  }

  // Lección cruda (con quiz) + contexto de módulo
  const modules = getCourseModules(detail.course)
  const moduleOfLesson = modules.find(m => m.lessons.some(l => l.lessonId === lessonId))
  const rawLesson = moduleOfLesson?.lessons.find(l => l.lessonId === lessonId)
  if (!rawLesson) notFound()

  // Quiz saneado: NUNCA enviar correctAnswer al cliente (se califica en servidor)
  const quiz: PlayerQuizQuestion[] = shuffle(rawLesson.quiz ?? []).map(q => ({
    questionId: q.questionId,
    type: q.type,
    prompt: q.prompt,
    options: q.type === 'multiple_choice' ? shuffle(q.options ?? []) : undefined,
    points: q.points > 0 ? q.points : 1,
  }))

  // Navegación prev/siguiente sobre el orden plano
  const flatIds = detail.lessons.map(l => l.lessonId)
  const idx = flatIds.indexOf(lessonId)
  const prevLesson = idx > 0 ? detail.lessons[idx - 1] : null
  const nextLesson = idx < detail.lessons.length - 1 ? detail.lessons[idx + 1] : null

  return (
    <LessonPlayer
      courseId={detail.course.courseId}
      courseSlug={slug}
      courseTitle={detail.course.title}
      moduleTitle={moduleOfLesson?.title ?? 'Contenido del curso'}
      lesson={{
        lessonId: rawLesson.lessonId,
        title: rawLesson.title,
        description: rawLesson.description ?? null,
        contentType: rawLesson.contentType,
        content: rawLesson.content ?? null,
        videoUrl: rawLesson.videoUrl ?? null,
        materialKey: rawLesson.materialKey ?? null,
        durationMinutes: rawLesson.durationMinutes ?? null,
        status: lessonMeta.status,
        score: lessonMeta.score,
      }}
      quiz={quiz}
      position={{ current: idx + 1, total: detail.lessons.length }}
      prevLesson={prevLesson ? { lessonId: prevLesson.lessonId, title: prevLesson.title } : null}
      nextLesson={nextLesson ? { lessonId: nextLesson.lessonId, title: nextLesson.title, isLocked: nextLesson.isLocked } : null}
    />
  )
}
