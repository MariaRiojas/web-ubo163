import 'server-only'
import { ddb, TABLE, UpdateCommand, now } from '@/lib/db/dynamodb'
import type { Course, LessonProgressEntry } from '@/lib/db/schema/training'
import { getCourseLessons } from '@/lib/db/schema/training'

/**
 * Re-evalúa si un curso quedó completado tras un cambio en el progreso de
 * lecciones y, de ser así, marca la inscripción como `completada` con
 * `finalGrade` = promedio de las notas de lección.
 *
 * Es la MISMA lógica del bloque de completado de `markLessonComplete`
 * (lib/capacitacion/actions.ts), extraída aquí para reutilizarla desde las
 * acciones del instructor sin duplicarla.
 *
 * @returns `true` si el curso quedó marcado como completado en esta llamada.
 */
export async function checkAndFinalizeCourse(
  course: Pick<Course, 'modules' | 'lessons'>,
  profileId: string,
  courseId: string,
  updatedLessonProgress: Record<string, LessonProgressEntry>,
): Promise<boolean> {
  const lessons = getCourseLessons(course)

  const completedIds = new Set(
    Object.entries(updatedLessonProgress)
      .filter(([, v]) => ['completada', 'aprobada'].includes(v.status))
      .map(([k]) => k),
  )
  const requiredLessons = lessons.filter(l => l.required)
  const allRequiredDone =
    requiredLessons.length > 0 && requiredLessons.every(l => completedIds.has(l.lessonId))

  if (!allRequiredDone) return false

  const scoreValues = Object.values(updatedLessonProgress)
    .filter(v => v.score != null)
    .map(v => Number(v.score))
  const avg = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : null

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingProgress,
    Key: { profileId, courseId },
    UpdateExpression: 'SET #st = :s, completedAt = :ca, finalGrade = :fg',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':s': 'completada',
      ':ca': now(),
      ':fg': avg != null ? avg.toFixed(2) : null,
    },
  }))

  return true
}
