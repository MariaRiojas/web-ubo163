"use server"

import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, ScanCommand, QueryCommand, now } from '@/lib/db/dynamodb'
import type { Course, TrainingProgress, LessonProgressEntry, CourseLesson, EvalResponse } from '@/lib/db/schema/training'
import { getCourseLessons } from '@/lib/db/schema/training'
import type { Profile } from '@/lib/db/schema/profiles'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'
import { GRADE_HIERARCHY, type Grade } from '@/lib/cgbvp/grades'

function gradeMeetsMinimum(userGrade: string | null, minGrade: string | null): boolean {
  if (!minGrade) return true
  const userIdx = GRADE_HIERARCHY.indexOf((userGrade ?? 'aspirante') as Grade)
  const minIdx = GRADE_HIERARCHY.indexOf(minGrade as Grade)
  if (userIdx < 0 || minIdx < 0) return false
  return userIdx >= minIdx
}

// ═══════════════════════════════════════════════════════════════════
// INSCRIBIRSE EN UN CURSO
// ═══════════════════════════════════════════════════════════════════

export async function enrollInCourse(courseId: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  try {
  const permissions = (session.user.permissions as Permission[]) ?? []

  const { Item: courseItem } = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
  }))
  if (!courseItem) return { ok: false as const, error: 'Curso no encontrado' }
  const course = courseItem as Course
  if (!course.active) return { ok: false as const, error: 'Curso inactivo' }

  const canManage = permissions.includes('training.manage')

  if (!canManage) {
    if (course.category === 'esbas' && !permissions.includes('training.access_esbas')) {
      return { ok: false as const, error: 'No tiene acceso al ESBAS' }
    }
    if (course.category === 'escuela_tecnica' && !permissions.includes('training.access_escuela_tecnica')) {
      return { ok: false as const, error: 'La Escuela Técnica está disponible desde Seccionario en actividad' }
    }
  }

  const { Item: profileItem } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId: session.user.profileId },
    ProjectionExpression: 'profileId, grade, #st',
    ExpressionAttributeNames: { '#st': 'status' },
  }))
  if (!profileItem) return { ok: false as const, error: 'Perfil no encontrado' }
  const profile = profileItem as Profile

  if (!canManage) {
    if (course.category === 'esbas') {
      const ok =
        (course.availableForPostulantes && profile.status === 'postulante') ||
        (course.availableForAspirantes && (profile.status === 'aspirante_en_curso' || profile.status === 'activo'))
      if (!ok) return { ok: false as const, error: 'Este curso no está disponible para su figura actual' }
    } else {
      if (!gradeMeetsMinimum(profile.grade, course.minGrade ?? null)) {
        return { ok: false as const, error: `Requiere grado ${course.minGrade} o superior` }
      }
    }
  }

  // Check for existing enrollment (PK=profileId, SK=courseId)
  const { Item: existingItem } = await ddb.send(new GetCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId: session.user.profileId, courseId },
  }))
  const existing = (existingItem ?? null) as TrainingProgress | null

  if (existing) {
    if (existing.status === 'activa' || existing.status === 'completada') {
      return { ok: false as const, error: 'Ya está inscrito en este curso' }
    }
    // Reactivate abandoned/failed enrollment
    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId: session.user.profileId, courseId },
      UpdateExpression: 'SET #st = :a',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':a': 'activa' },
    }))
    revalidatePath('/capacitacion')
    revalidatePath(`/capacitacion/${course.slug}`)
    return { ok: true as const, reused: true as const }
  }

  const ts = now()
  const newProgress: TrainingProgress = {
    profileId: session.user.profileId,
    courseId,
    status: 'activa',
    enrolledAt: ts,
    lessonProgress: {},
  }
  await ddb.send(new PutCommand({ TableName: TABLE.trainingProgress, Item: newProgress }))

  revalidatePath('/capacitacion')
  revalidatePath(`/capacitacion/${course.slug}`)
  return { ok: true as const, reused: false as const }
  } catch (err) {
    console.error('[enrollInCourse]', err)
    return { ok: false as const, error: 'Error al procesar la inscripción. Inténtelo de nuevo.' }
  }
}

// ═══════════════════════════════════════════════════════════════════
// DESINSCRIBIRSE
// ═══════════════════════════════════════════════════════════════════

export async function unenrollFromCourse(courseId: string) {
  try {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId: session.user.profileId, courseId },
  }))
  if (!Item) return { ok: false as const, error: 'No está inscrito' }
  const enrollment = Item as TrainingProgress
  if (enrollment.status === 'completada') {
    return { ok: false as const, error: 'No puede desinscribirse de un curso completado' }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId: session.user.profileId, courseId },
    UpdateExpression: 'SET #st = :s',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'abandonada' },
  }))

  revalidatePath('/capacitacion')
  return { ok: true as const }
  } catch (err) {
    console.error('[unenrollFromCourse]', err)
    return { ok: false as const, error: 'Error al procesar. Inténtelo de nuevo.' }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR LECCIÓN COMPLETA
// Lessons are denormalized in course.lessons[]; progress in trainingProgress.lessonProgress
// ═══════════════════════════════════════════════════════════════════

export async function markLessonComplete(input: {
  courseId: string
  lessonId: string
  score?: number
  notes?: string
}) {
  try {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const [courseResult, enrollmentResult] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId: input.courseId } })),
    ddb.send(new GetCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId: session.user.profileId, courseId: input.courseId },
    })),
  ])

  if (!courseResult.Item) return { ok: false as const, error: 'Curso no encontrado' }
  const course = courseResult.Item as Course
  const lessons = getCourseLessons(course)
  const lesson = lessons.find(l => l.lessonId === input.lessonId)
  if (!lesson) return { ok: false as const, error: 'Lección no encontrada' }

  if (!enrollmentResult.Item) return { ok: false as const, error: 'Debe inscribirse en el curso antes de marcar lecciones' }
  const enrollment = enrollmentResult.Item as TrainingProgress
  if (enrollment.status === 'completada') return { ok: false as const, error: 'El curso ya está completado' }
  if (enrollment.status !== 'activa') return { ok: false as const, error: 'Inscripción inactiva' }

  // Las prácticas presenciales solo las valida el instructor
  const permissions = (session.user.permissions as Permission[]) ?? []
  if (lesson.contentType === 'practica' && !permissions.includes('training.manage')) {
    return { ok: false as const, error: 'Las prácticas las registra el instructor tras validar su asistencia' }
  }

  // Secuencialidad: las lecciones obligatorias previas deben estar completadas
  const seqError = checkSequentialUnlock(lessons, input.lessonId, enrollment)
  if (seqError) return { ok: false as const, error: seqError }

  // Las evaluaciones formales siempre exigen nota mínima (14/20 por defecto)
  const minimumScore = lesson.minimumScore ?? (lesson.contentType === 'evaluacion' ? '14' : undefined)

  if (minimumScore && input.score == null) {
    return { ok: false as const, error: 'Esta lección requiere puntaje' }
  }

  const finalStatus: LessonProgressEntry['status'] =
    minimumScore && input.score != null
      ? input.score >= Number(minimumScore) ? 'aprobada' : 'reprobada'
      : 'completada'

  const ts = now()
  const existing = enrollment.lessonProgress?.[input.lessonId]
  const entry: LessonProgressEntry = {
    status: finalStatus,
    ...(input.score != null ? { score: String(input.score) } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    startedAt: existing?.startedAt ?? ts,
    completedAt: ts,
  }

  // SET lessonProgress.#lid = :entry using ExpressionAttributeNames for the dynamic key
  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId: session.user.profileId, courseId: input.courseId },
    UpdateExpression: 'SET lessonProgress.#lid = :entry',
    ExpressionAttributeNames: { '#lid': input.lessonId },
    ExpressionAttributeValues: { ':entry': entry },
  }))

  // Check if all required lessons are now completed
  const updatedLp = { ...(enrollment.lessonProgress ?? {}), [input.lessonId]: entry }
  const completedIds = new Set(
    Object.entries(updatedLp)
      .filter(([, v]) => ['completada', 'aprobada'].includes(v.status))
      .map(([k]) => k),
  )
  const requiredLessons = lessons.filter(l => l.required)
  const allRequiredDone = requiredLessons.length > 0 && requiredLessons.every(l => completedIds.has(l.lessonId))

  let courseCompleted = false
  if (allRequiredDone) {
    const scoreValues = Object.values(updatedLp)
      .filter(v => v.score != null)
      .map(v => Number(v.score))
    const avg = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : null

    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId: session.user.profileId, courseId: input.courseId },
      UpdateExpression: 'SET #st = :s, completedAt = :ca, finalGrade = :fg',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':s': 'completada',
        ':ca': ts,
        ':fg': avg != null ? avg.toFixed(2) : null,
      },
    }))
    courseCompleted = true
  }

  revalidatePath('/capacitacion')
  revalidatePath(`/capacitacion/${course.slug}`)
  return { ok: true as const, status: finalStatus, courseCompleted }
  } catch (err) {
    console.error('[markLessonComplete]', err)
    return { ok: false as const, error: 'Error al registrar el progreso. Inténtelo de nuevo.' }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECUENCIALIDAD
// Una lección está bloqueada mientras alguna lección OBLIGATORIA anterior
// (en el orden plano módulo→lección) no esté completada/aprobada.
// ═══════════════════════════════════════════════════════════════════

function checkSequentialUnlock(
  lessons: CourseLesson[],
  lessonId: string,
  enrollment: TrainingProgress,
): string | null {
  const idx = lessons.findIndex(l => l.lessonId === lessonId)
  if (idx <= 0) return null
  const lp = enrollment.lessonProgress ?? {}
  const blocker = lessons.slice(0, idx).find(prev =>
    prev.required && !['completada', 'aprobada'].includes(lp[prev.lessonId]?.status ?? ''),
  )
  return blocker ? `Debe completar antes la lección «${blocker.title}»` : null
}

// ═══════════════════════════════════════════════════════════════════
// ENVIAR QUIZ DE LECCIÓN
// - Mini-quiz (texto/video/lectura_archivo): se aprueba respondiendo TODO
//   correctamente (reintentos ilimitados). Al aprobar, la lección queda completada.
// - Evaluación formal: nota = puntos/total × 20, mínima 14/20.
//   Las preguntas open_text van a TABLE.trainingEvaluations (cola del instructor);
//   mientras haya redacciones pendientes la lección queda 'en_curso' con
//   notes = `AUTO:<puntosAuto>:<maxAuto>:TOTAL:<maxTotal>` para que la
//   calificación final se recomponga al revisar (ver panel de evaluaciones).
// ═══════════════════════════════════════════════════════════════════

const normalizeAnswer = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export async function submitLessonQuiz(input: {
  courseId: string
  lessonId: string
  answers: Record<string, string>   // questionId → respuesta del alumno
}) {
  try {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }
  const profileId = session.user.profileId

  const [courseResult, enrollmentResult] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId: input.courseId } })),
    ddb.send(new GetCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId, courseId: input.courseId },
    })),
  ])

  if (!courseResult.Item) return { ok: false as const, error: 'Curso no encontrado' }
  const course = courseResult.Item as Course
  const lessons = getCourseLessons(course)
  const lesson = lessons.find(l => l.lessonId === input.lessonId)
  if (!lesson) return { ok: false as const, error: 'Lección no encontrada' }
  const quiz = lesson.quiz ?? []
  if (quiz.length === 0) return { ok: false as const, error: 'Esta lección no tiene cuestionario' }

  if (!enrollmentResult.Item) return { ok: false as const, error: 'Debe inscribirse en el curso' }
  const enrollment = enrollmentResult.Item as TrainingProgress
  if (enrollment.status !== 'activa') return { ok: false as const, error: 'Inscripción inactiva' }

  const seqError = checkSequentialUnlock(lessons, input.lessonId, enrollment)
  if (seqError) return { ok: false as const, error: seqError }

  // ── Calificación automática ──
  const wrongIds: string[] = []
  let autoEarned = 0
  let autoMax = 0
  let totalMax = 0
  const openTextQuestions = [] as typeof quiz

  for (const q of quiz) {
    const pts = q.points > 0 ? q.points : 1
    totalMax += pts
    if (q.type === 'open_text') { openTextQuestions.push(q); continue }
    autoMax += pts
    const given = input.answers[q.questionId] ?? ''
    const correct = q.correctAnswer != null &&
      normalizeAnswer(given) === normalizeAnswer(q.correctAnswer)
    if (correct) autoEarned += pts
    else wrongIds.push(q.questionId)
  }

  const isEvaluacion = lesson.contentType === 'evaluacion'
  const ts = now()

  // ── Mini-quiz: exige todo correcto; no persiste nada si falla ──
  if (!isEvaluacion) {
    if (wrongIds.length > 0) {
      return { ok: true as const, passed: false as const, wrongIds, pendingReview: false as const }
    }
    const res = await markLessonComplete({ courseId: input.courseId, lessonId: input.lessonId })
    if (!res.ok) return res
    return {
      ok: true as const, passed: true as const, wrongIds: [] as string[],
      pendingReview: false as const, courseCompleted: res.courseCompleted,
    }
  }

  // ── Evaluación formal ──
  // Redacciones → cola de revisión del instructor
  for (const q of openTextQuestions) {
    const answer = (input.answers[q.questionId] ?? '').trim()
    const evalItem: EvalResponse = {
      evalId: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      profileId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      questionId: q.questionId,
      type: 'open_text',
      prompt: q.prompt,
      answer,
      status: 'pending_review',
      maxScore: q.points > 0 ? q.points : 1,
      createdAt: ts,
    }
    await ddb.send(new PutCommand({ TableName: TABLE.trainingEvaluations, Item: evalItem }))
  }

  const existing = enrollment.lessonProgress?.[input.lessonId]

  if (openTextQuestions.length > 0) {
    // Nota provisional — se finaliza cuando el instructor califica las redacciones
    const entry: LessonProgressEntry = {
      status: 'en_curso',
      startedAt: existing?.startedAt ?? ts,
      notes: `AUTO:${autoEarned}:${autoMax}:TOTAL:${totalMax}`,
    }
    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId, courseId: input.courseId },
      UpdateExpression: 'SET lessonProgress.#lid = :entry',
      ExpressionAttributeNames: { '#lid': input.lessonId },
      ExpressionAttributeValues: { ':entry': entry },
    }))
    revalidatePath(`/capacitacion/${course.slug}`)
    return {
      ok: true as const, passed: false as const, wrongIds,
      pendingReview: true as const,
      autoScore20: totalMax > 0 ? Number(((autoEarned / totalMax) * 20).toFixed(1)) : 0,
    }
  }

  // Sin redacciones: nota inmediata sobre 20
  const score20 = totalMax > 0 ? (autoEarned / totalMax) * 20 : 0
  const res = await markLessonComplete({
    courseId: input.courseId,
    lessonId: input.lessonId,
    score: Number(score20.toFixed(2)),
  })
  if (!res.ok) return res
  return {
    ok: true as const,
    passed: score20 >= 14,
    wrongIds,
    pendingReview: false as const,
    score20: Number(score20.toFixed(1)),
    courseCompleted: res.courseCompleted,
  }
  } catch (err) {
    console.error('[submitLessonQuiz]', err)
    return { ok: false as const, error: 'Error al enviar el cuestionario. Inténtelo de nuevo.' }
  }
}

// ═══════════════════════════════════════════════════════════════════
// DESMARCAR LECCIÓN
// ═══════════════════════════════════════════════════════════════════

export async function unmarkLesson(courseId: string, lessonId: string) {
  try {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId: session.user.profileId, courseId },
  }))
  if (!Item) return { ok: false as const, error: 'No inscrito' }
  const enrollment = Item as TrainingProgress
  if (enrollment.status === 'completada') return { ok: false as const, error: 'El curso ya está completado' }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId: session.user.profileId, courseId },
    UpdateExpression: 'REMOVE lessonProgress.#lid',
    ExpressionAttributeNames: { '#lid': lessonId },
  }))

  const { Item: courseItem } = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
  }))
  if (courseItem) revalidatePath(`/capacitacion/${(courseItem as Course).slug}`)
  revalidatePath('/capacitacion')
  return { ok: true as const }
  } catch (err) {
    console.error('[unmarkLesson]', err)
    return { ok: false as const, error: 'Error al procesar. Inténtelo de nuevo.' }
  }
}
