import 'server-only'
import { ddb, TABLE, ScanCommand, GetCommand, PutCommand, now } from '@/lib/db/dynamodb'
import type { Course, TrainingProgress } from '@/lib/db/schema/training'

/**
 * Inscribe automáticamente al perfil en los cursos obligatorios para su figura.
 * Idempotente: si ya existe una inscripción, no crea duplicados.
 *
 * @param profileId - ID del perfil del efectivo
 * @param figura - Figura/grade del efectivo: 'postulante' o 'aspirante'
 * @returns Número de nuevas inscripciones creadas en esta llamada
 *
 * @example
 * // Al crear un postulante en /api/personnel POST
 * const enrollCount = await autoEnrollMandatoryCourses(profileId, 'postulante')
 * console.log(`Se inscribió automáticamente en ${enrollCount} curso(s)`)
 */
export async function autoEnrollMandatoryCourses(
  profileId: string,
  figura: 'postulante' | 'aspirante'
): Promise<number> {
  try {
    // Determinar qué campo de obligatoriedad buscar según la figura
    const mandatoryField = figura === 'postulante' ? 'mandatoryForPostulantes' : 'mandatoryForAspirantes'

    // Buscar todos los cursos activos y obligatorios para esta figura.
    // Solo se necesita el courseId (y los booleanos que ya filtra el Scan) —
    // el item completo trae modules[].lessons[] (HTML + quiz) que no se usa aquí.
    const coursesRes = await ddb.send(new ScanCommand({
      TableName: TABLE.trainingCourses,
      FilterExpression: `active = :true AND ${mandatoryField} = :true`,
      ExpressionAttributeValues: {
        ':true': true,
      },
      ProjectionExpression: 'courseId, active, mandatoryForPostulantes, mandatoryForAspirantes',
    }))

    const courses = (coursesRes.Items ?? []) as Course[]
    if (courses.length === 0) {
      return 0 // No hay cursos obligatorios para esta figura
    }

    let enrollCount = 0
    const timestamp = now()

    // Para cada curso, verificar si ya existe inscripción
    for (const course of courses) {
      try {
        // Verificar si ya existe un trainingProgress para este profileId y courseId
        const existingRes = await ddb.send(new GetCommand({
          TableName: TABLE.trainingProgress,
          Key: { profileId, courseId: course.courseId },
        }))

        // Si ya existe, saltar (idempotente)
        if (existingRes.Item) {
          continue
        }

        // Crear nueva inscripción
        await ddb.send(new PutCommand({
          TableName: TABLE.trainingProgress,
          Item: {
            profileId,
            courseId: course.courseId,
            status: 'activa',
            enrolledAt: timestamp,
            lessonProgress: {},
          } as TrainingProgress,
        }))

        enrollCount++
      } catch (courseError) {
        // Log del error pero continuar con otros cursos
        console.error('[autoEnrollMandatoryCourses] Error enrolling in course', course.courseId, courseError)
      }
    }

    return enrollCount
  } catch (error) {
    // Envolver toda la función en try/catch
    // Auto-enrollment debe NUNCA romper el flujo de registro
    console.error('[autoEnrollMandatoryCourses]', error)
    return 0
  }
}
