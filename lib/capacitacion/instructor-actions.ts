"use server"

import {
  ddb, TABLE, GetCommand, PutCommand, UpdateCommand, ScanCommand, now,
} from '@/lib/db/dynamodb'
import type {
  Course, TrainingProgress, LessonProgressEntry, EvalResponse, TrainingCertificate,
} from '@/lib/db/schema/training'
import { getCourseLessons } from '@/lib/db/schema/training'
import type { Profile } from '@/lib/db/schema/profiles'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'
import { GRADE_LABEL, type Grade } from '@/lib/cgbvp/grades'
import { checkAndFinalizeCourse } from './completion'
import { uploadFile } from '@/lib/storage/s3'

async function requireManage() {
  const session = await auth()
  if (!session?.user?.profileId) return { error: 'No autenticado' as const }
  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('training.manage')) return { error: 'Sin permiso' as const }
  return { profileId: session.user.profileId as string }
}

// ═══════════════════════════════════════════════════════════════════
// CALIFICAR RESPUESTA DE REDACCIÓN (open_text) — cola de evaluaciones
// ═══════════════════════════════════════════════════════════════════

export async function gradeEvalResponse(evalId: string, score: number) {
  try {
    const guard = await requireManage()
    if ('error' in guard) return { ok: false as const, error: guard.error }
    const graderId = guard.profileId

    if (!Number.isFinite(score) || score < 0) {
      return { ok: false as const, error: 'Nota inválida' }
    }

    // 1 · Recuperar la respuesta
    const { Item } = await ddb.send(new GetCommand({
      TableName: TABLE.trainingEvaluations,
      Key: { evalId },
    }))
    if (!Item) return { ok: false as const, error: 'Respuesta no encontrada' }
    const evalItem = Item as EvalResponse

    if (score > evalItem.maxScore) {
      return { ok: false as const, error: `La nota no puede exceder ${evalItem.maxScore}` }
    }

    const ts = now()

    // 2 · Actualizar la respuesta → graded
    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingEvaluations,
      Key: { evalId },
      UpdateExpression: 'SET score = :sc, #st = :g, gradedBy = :gb, gradedAt = :ga',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':sc': score, ':g': 'graded', ':gb': graderId, ':ga': ts,
      },
    }))

    // 3 · ¿Quedan redacciones pendientes de esta lección para este alumno?
    const { profileId, courseId, lessonId } = evalItem
    const { Items: allForLesson } = await ddb.send(new ScanCommand({
      TableName: TABLE.trainingEvaluations,
      FilterExpression: 'profileId = :p AND courseId = :c AND lessonId = :l',
      ExpressionAttributeValues: { ':p': profileId, ':c': courseId, ':l': lessonId },
    }))
    const responses = (allForLesson ?? []) as EvalResponse[]
    const stillPending = responses.some(r => r.status === 'pending_review')

    if (stillPending) {
      revalidatePath('/areas/instruccion/evaluaciones')
      revalidatePath('/areas/instruccion/progreso')
      return { ok: true as const, finalized: false as const }
    }

    // 4 · Finalización: recomponer la nota /20 de la lección de evaluación
    const [courseRes, progressRes] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId } })),
      ddb.send(new GetCommand({
        TableName: TABLE.trainingProgress,
        Key: { profileId, courseId },
      })),
    ])
    if (!courseRes.Item || !progressRes.Item) {
      return { ok: true as const, finalized: false as const }
    }
    const course = courseRes.Item as Course
    const enrollment = progressRes.Item as TrainingProgress
    const entry = enrollment.lessonProgress?.[lessonId]

    // notes = "AUTO:<autoEarned>:<autoMax>:TOTAL:<totalMax>" (en puntos)
    const m = /AUTO:([\d.]+):([\d.]+):TOTAL:([\d.]+)/.exec(entry?.notes ?? '')
    const autoEarned = m ? Number(m[1]) : 0
    const totalMax = m ? Number(m[3]) : 0

    const sumGraded = responses.reduce((acc, r) => acc + (r.score ?? 0), 0)
    const final20 = totalMax > 0 ? ((autoEarned + sumGraded) / totalMax) * 20 : 0
    const final20Str = final20.toFixed(2)
    const finalStatus: LessonProgressEntry['status'] = final20 >= 14 ? 'aprobada' : 'reprobada'

    const updatedEntry: LessonProgressEntry = {
      status: finalStatus,
      score: final20Str,
      startedAt: entry?.startedAt ?? ts,
      completedAt: ts,
      validatedBy: graderId,
      notes: entry?.notes,
    }

    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId, courseId },
      UpdateExpression: 'SET lessonProgress.#lid = :entry',
      ExpressionAttributeNames: { '#lid': lessonId },
      ExpressionAttributeValues: { ':entry': updatedEntry },
    }))

    // 5 · ¿El curso quedó completo?
    const updatedLp = { ...(enrollment.lessonProgress ?? {}), [lessonId]: updatedEntry }
    const courseCompleted = await checkAndFinalizeCourse(course, profileId, courseId, updatedLp)

    revalidatePath('/areas/instruccion/evaluaciones')
    revalidatePath('/areas/instruccion/progreso')
    revalidatePath(`/capacitacion/${course.slug}`)
    return {
      ok: true as const,
      finalized: true as const,
      lessonStatus: finalStatus,
      lessonScore: final20Str,
      courseCompleted,
    }
  } catch (err) {
    console.error('[gradeEvalResponse]', err)
    return { ok: false as const, error: 'Error al calificar. Inténtelo de nuevo.' }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR PRÁCTICA ASISTIDA — solo instructor
// ═══════════════════════════════════════════════════════════════════

export async function markPracticeAttendance(input: {
  profileId: string
  courseId: string
  lessonId: string
}) {
  try {
    const guard = await requireManage()
    if ('error' in guard) return { ok: false as const, error: guard.error }
    const instructorId = guard.profileId

    const [courseRes, progressRes] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId: input.courseId } })),
      ddb.send(new GetCommand({
        TableName: TABLE.trainingProgress,
        Key: { profileId: input.profileId, courseId: input.courseId },
      })),
    ])
    if (!courseRes.Item) return { ok: false as const, error: 'Curso no encontrado' }
    if (!progressRes.Item) return { ok: false as const, error: 'El efectivo no está inscrito en el curso' }

    const course = courseRes.Item as Course
    const enrollment = progressRes.Item as TrainingProgress
    const lesson = getCourseLessons(course).find(l => l.lessonId === input.lessonId)
    if (!lesson) return { ok: false as const, error: 'Lección no encontrada' }

    const ts = now()
    const existing = enrollment.lessonProgress?.[input.lessonId]
    const entry: LessonProgressEntry = {
      status: 'completada',
      startedAt: existing?.startedAt ?? ts,
      completedAt: ts,
      validatedBy: instructorId,
      ...(existing?.score != null ? { score: existing.score } : {}),
      ...(existing?.notes ? { notes: existing.notes } : {}),
    }

    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId: input.profileId, courseId: input.courseId },
      UpdateExpression: 'SET lessonProgress.#lid = :entry',
      ExpressionAttributeNames: { '#lid': input.lessonId },
      ExpressionAttributeValues: { ':entry': entry },
    }))

    const updatedLp = { ...(enrollment.lessonProgress ?? {}), [input.lessonId]: entry }
    const courseCompleted = await checkAndFinalizeCourse(course, input.profileId, input.courseId, updatedLp)

    revalidatePath('/areas/instruccion/progreso')
    revalidatePath(`/capacitacion/${course.slug}`)
    return { ok: true as const, courseCompleted }
  } catch (err) {
    console.error('[markPracticeAttendance]', err)
    return { ok: false as const, error: 'Error al registrar la práctica. Inténtelo de nuevo.' }
  }
}

// ═══════════════════════════════════════════════════════════════════
// EMITIR CERTIFICADO PDF — solo instructor, curso completado y nota ≥ 14
// ═══════════════════════════════════════════════════════════════════

export async function issueCertificate(input: { profileId: string; courseId: string }) {
  try {
    const guard = await requireManage()
    if ('error' in guard) return { ok: false as const, error: guard.error }
    const verifiedBy = guard.profileId

    const [courseRes, progressRes, profileRes] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId: input.courseId } })),
      ddb.send(new GetCommand({
        TableName: TABLE.trainingProgress,
        Key: { profileId: input.profileId, courseId: input.courseId },
      })),
      ddb.send(new GetCommand({
        TableName: TABLE.profiles,
        Key: { profileId: input.profileId },
        ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
      })),
    ])

    if (!courseRes.Item) return { ok: false as const, error: 'Curso no encontrado' }
    if (!progressRes.Item) return { ok: false as const, error: 'El efectivo no está inscrito en el curso' }
    if (!profileRes.Item) return { ok: false as const, error: 'Perfil no encontrado' }

    const course = courseRes.Item as Course
    const enrollment = progressRes.Item as TrainingProgress
    const profile = profileRes.Item as Profile

    // Validaciones
    if (enrollment.status !== 'completada') {
      return { ok: false as const, error: 'El curso aún no está completado por el efectivo' }
    }
    const finalGradeNum = enrollment.finalGrade != null ? Number(enrollment.finalGrade) : NaN
    if (!Number.isFinite(finalGradeNum) || finalGradeNum < 14) {
      return {
        ok: false as const,
        error: `Nota final ${Number.isFinite(finalGradeNum) ? finalGradeNum.toFixed(2) : 'N/D'}/20 — se requiere ≥ 14 para certificar`,
      }
    }

    // Generar PDF (import dinámico para no cargar react-pdf salvo que se use)
    const { renderCertificatePdf } = await import('./certificate-pdf')
    const issueDateEs = new Date().toLocaleDateString('es-PE', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const pdfBuffer = await renderCertificatePdf({
      fullName: profile.fullName,
      gradeLabel: GRADE_LABEL[profile.grade as Grade] ?? profile.grade ?? '',
      codigoCgbvp: profile.codigoCgbvp ?? null,
      courseTitle: course.title,
      finalGrade: finalGradeNum.toFixed(2),
      issueDateEs,
    })

    // Subir a S3
    const fileKey = `certificates/${input.profileId}/${input.courseId}.pdf`
    await uploadFile(fileKey, pdfBuffer, 'application/pdf')

    // Registrar certificado
    const ts = now()
    const certificate: TrainingCertificate = {
      profileId: input.profileId,
      certificateId: `cert-${input.courseId}`,
      title: `Certificado — ${course.title}`,
      fileKey,
      fileSizeBytes: pdfBuffer.length,
      mimeType: 'application/pdf',
      issuedAt: ts,
      verified: true,
      verifiedBy,
      verifiedAt: ts,
      uploadedAt: ts,
    }
    await ddb.send(new PutCommand({ TableName: TABLE.trainingCertificates, Item: certificate }))

    // Guardar la key en el progreso del curso
    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId: input.profileId, courseId: input.courseId },
      UpdateExpression: 'SET certificateKey = :k',
      ExpressionAttributeValues: { ':k': fileKey },
    }))

    revalidatePath('/areas/instruccion/progreso')
    return {
      ok: true as const,
      certificateId: certificate.certificateId,
      fileKey,
    }
  } catch (err) {
    console.error('[issueCertificate]', err)
    return { ok: false as const, error: 'Error al emitir el certificado. Inténtelo de nuevo.' }
  }
}
