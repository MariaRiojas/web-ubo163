"use server"

import { db } from '@/lib/db'
import {
  courses,
  courseLessons,
  courseEnrollments,
  lessonProgress,
  profiles,
} from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { and, eq, sql, asc } from 'drizzle-orm'
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
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  })
  if (!course) return { ok: false as const, error: 'Curso no encontrado' }
  if (!course.active) return { ok: false as const, error: 'Curso inactivo' }

  // Validar permisos según categoría del curso
  if (course.category === 'esbas') {
    if (!permissions.includes('training.access_esbas')) {
      return { ok: false as const, error: 'No tiene acceso al ESBAS' }
    }
  } else if (course.category === 'escuela_tecnica') {
    if (!permissions.includes('training.access_escuela_tecnica')) {
      return {
        ok: false as const,
        error: 'La Escuela Técnica está disponible desde Seccionario en actividad',
      }
    }
  }

  // Validar grado / figura
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.user.profileId),
  })
  if (!profile) return { ok: false as const, error: 'Perfil no encontrado' }

  if (course.category === 'esbas') {
    // ESBAS: postulantes y aspirantes lo necesitan; efectivos pueden repasarlo
    // (sólo si está habilitado en availableFor*)
    const ok =
      (course.availableForPostulantes && profile.status === 'postulante') ||
      (course.availableForAspirantes && profile.status === 'aspirante_en_curso') ||
      (course.availableForAspirantes && profile.status === 'activo')
    if (!ok) {
      return {
        ok: false as const,
        error: 'Este curso no está disponible para su figura actual',
      }
    }
  } else {
    if (!gradeMeetsMinimum(profile.grade, course.minGrade)) {
      return {
        ok: false as const,
        error: `Requiere grado ${course.minGrade} o superior`,
      }
    }
  }

  // Verificar duplicado
  const existing = await db.query.courseEnrollments.findFirst({
    where: and(
      eq(courseEnrollments.courseId, courseId),
      eq(courseEnrollments.profileId, session.user.profileId),
    ),
  })
  if (existing) {
    if (existing.status === 'activa' || existing.status === 'completada') {
      return { ok: false as const, error: 'Ya está inscrito en este curso' }
    }
    // Si estaba abandonada/reprobada, la reactivamos
    await db
      .update(courseEnrollments)
      .set({ status: 'activa' })
      .where(eq(courseEnrollments.id, existing.id))
    revalidatePath('/capacitacion')
    revalidatePath(`/capacitacion/${course.slug}`)
    return { ok: true as const, reused: true as const, enrollmentId: existing.id }
  }

  const [created] = await db
    .insert(courseEnrollments)
    .values({
      courseId,
      profileId: session.user.profileId,
      status: 'activa',
    })
    .returning({ id: courseEnrollments.id })

  revalidatePath('/capacitacion')
  revalidatePath(`/capacitacion/${course.slug}`)
  return { ok: true as const, reused: false as const, enrollmentId: created.id }
}

// ═══════════════════════════════════════════════════════════════════
// DESINSCRIBIRSE
// ═══════════════════════════════════════════════════════════════════

export async function unenrollFromCourse(courseId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.profileId, session.user.profileId),
      ),
    )
    .limit(1)

  if (!enrollment) return { ok: false as const, error: 'No está inscrito' }
  if (enrollment.status === 'completada') {
    return { ok: false as const, error: 'No puede desinscribirse de un curso completado' }
  }

  await db
    .update(courseEnrollments)
    .set({ status: 'abandonada' })
    .where(eq(courseEnrollments.id, enrollment.id))

  revalidatePath('/capacitacion')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR LECCIÓN COMPLETA
// ═══════════════════════════════════════════════════════════════════

export async function markLessonComplete(input: {
  lessonId: string
  score?: number  // 0-20
  notes?: string
}) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  // Traer lección + curso
  const lesson = await db.query.courseLessons.findFirst({
    where: eq(courseLessons.id, input.lessonId),
  })
  if (!lesson) return { ok: false as const, error: 'Lección no encontrada' }

  // Buscar inscripción del efectivo en ese curso
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, lesson.courseId),
        eq(courseEnrollments.profileId, session.user.profileId),
      ),
    )
    .limit(1)

  if (!enrollment) {
    return {
      ok: false as const,
      error: 'Debe inscribirse en el curso antes de marcar lecciones',
    }
  }
  if (enrollment.status === 'completada') {
    return { ok: false as const, error: 'El curso ya está completado' }
  }
  if (enrollment.status !== 'activa') {
    return { ok: false as const, error: 'Inscripción inactiva' }
  }

  // Validar score si la lección requiere evaluación
  if (lesson.minimumScore && input.score == null) {
    return {
      ok: false as const,
      error: 'Esta lección requiere puntaje',
    }
  }

  const finalStatus =
    lesson.minimumScore && input.score != null
      ? input.score >= Number(lesson.minimumScore)
        ? 'aprobada'
        : 'reprobada'
      : 'completada'

  // Upsert del progreso
  const [existing] = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.lessonId, input.lessonId),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(lessonProgress)
      .set({
        status: finalStatus,
        score: input.score != null ? String(input.score) : null,
        notes: input.notes ?? null,
        completedAt: new Date(),
      })
      .where(eq(lessonProgress.id, existing.id))
  } else {
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment.id,
      lessonId: input.lessonId,
      status: finalStatus,
      score: input.score != null ? String(input.score) : null,
      notes: input.notes ?? null,
      startedAt: new Date(),
      completedAt: new Date(),
    })
  }

  // Verificar si completó todas las lecciones requeridas del curso
  const allLessons = await db
    .select()
    .from(courseLessons)
    .where(eq(courseLessons.courseId, lesson.courseId))

  const allProgress = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.enrollmentId, enrollment.id))

  const requiredLessons = allLessons.filter((l) => l.required)
  const completedIds = new Set(
    allProgress.filter((p) => ['completada', 'aprobada'].includes(p.status)).map((p) => p.lessonId),
  )
  const allRequiredDone = requiredLessons.every((l) => completedIds.has(l.id))

  let courseCompleted = false
  if (allRequiredDone && requiredLessons.length > 0) {
    // Calcular nota final (promedio de lesson scores)
    const scoreValues = allProgress
      .filter((p) => p.score != null)
      .map((p) => Number(p.score))
    const avg = scoreValues.length > 0
      ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
      : null

    await db
      .update(courseEnrollments)
      .set({
        status: 'completada',
        completedAt: new Date(),
        finalGrade: avg != null ? avg.toFixed(2) : null,
      })
      .where(eq(courseEnrollments.id, enrollment.id))
    courseCompleted = true
  }

  // Obtener el slug del curso para revalidar
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, lesson.courseId),
  })
  revalidatePath('/capacitacion')
  if (course) revalidatePath(`/capacitacion/${course.slug}`)

  return {
    ok: true as const,
    status: finalStatus,
    courseCompleted,
  }
}

// ═══════════════════════════════════════════════════════════════════
// DESMARCAR LECCIÓN (revertir)
// ═══════════════════════════════════════════════════════════════════

export async function unmarkLesson(lessonId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const lesson = await db.query.courseLessons.findFirst({
    where: eq(courseLessons.id, lessonId),
  })
  if (!lesson) return { ok: false as const, error: 'Lección no encontrada' }

  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, lesson.courseId),
        eq(courseEnrollments.profileId, session.user.profileId),
      ),
    )
    .limit(1)

  if (!enrollment) return { ok: false as const, error: 'No inscrito' }
  if (enrollment.status === 'completada') {
    return { ok: false as const, error: 'El curso ya está completado' }
  }

  await db
    .delete(lessonProgress)
    .where(
      and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.lessonId, lessonId),
      ),
    )

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, lesson.courseId),
  })
  revalidatePath('/capacitacion')
  if (course) revalidatePath(`/capacitacion/${course.slug}`)

  return { ok: true as const }
}
