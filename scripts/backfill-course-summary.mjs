/**
 * Backfill — resumen denormalizado de cursos (lessonCount / lessonIds / requiredLessonIds)
 *
 * Los listados de capacitación (`/capacitacion`, dashboard) dejaron de hacer
 * Scan completo de `modules[].lessons[]` (contenido HTML + quiz) para calcular
 * conteos de lecciones y % de avance. En su lugar leen un resumen liviano
 * persistido en el propio item `Course`. Este script rellena ese resumen en
 * los cursos existentes (el path de escritura — POST/PUT en app/api/courses —
 * ya lo calcula en cada alta/edición nueva).
 *
 * Réplica en JS plano de `getCourseLessons()` / `computeCourseSummary()`
 * (lib/db/schema/training.ts) porque este script corre con `node` puro
 * (sin transpilar TS) — mantener ambas en sync si cambia la lógica de origen.
 *
 * Uso:
 *   AWS_PROFILE=manbuild node scripts/backfill-course-summary.mjs
 *
 * Variables opcionales:
 *   TABLE_PREFIX (default: ubo163-dev)
 *   AWS_REGION   (default: us-east-1)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const PREFIX = process.env.TABLE_PREFIX ?? 'ubo163-dev'
const TABLE_NAME = `${PREFIX}-training-courses`
const REGION = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1'

const client = new DynamoDBClient({ region: REGION })
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
  unmarshallOptions: { wrapNumbers: false },
})

// ─── Réplica de getCourseModules()/getCourseLessons() (lib/db/schema/training.ts) ───

function getCourseModules(course) {
  if (course.modules && course.modules.length > 0) {
    return [...course.modules].sort((a, b) => a.displayOrder - b.displayOrder)
  }
  return [{
    moduleId: 'mod-legacy',
    displayOrder: 0,
    title: 'Contenido del curso',
    lessons: course.lessons ?? [],
  }]
}

function getCourseLessons(course) {
  return getCourseModules(course).flatMap(m =>
    [...m.lessons].sort((a, b) => a.displayOrder - b.displayOrder),
  )
}

function computeCourseSummary(course) {
  const lessons = getCourseLessons(course)
  return {
    lessonCount: lessons.length,
    lessonIds: lessons.map(l => l.lessonId),
    requiredLessonIds: lessons.filter(l => l.required).map(l => l.lessonId),
  }
}

// ─── Scan + backfill ──────────────────────────────────────────────────────

async function scanAllCourses() {
  const items = []
  let ExclusiveStartKey
  do {
    const res = await ddb.send(new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey }))
    items.push(...(res.Items ?? []))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

async function main() {
  console.log(`[backfill-course-summary] Tabla: ${TABLE_NAME} · Región: ${REGION}`)
  const courses = await scanAllCourses()
  console.log(`[backfill-course-summary] ${courses.length} curso(s) encontrados.`)

  let ok = 0
  let failed = 0

  for (const course of courses) {
    const summary = computeCourseSummary(course)
    const label = `${course.courseId} — ${course.title ?? '(sin título)'}`
    try {
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { courseId: course.courseId },
        UpdateExpression: 'SET #lessonCount = :lessonCount, #lessonIds = :lessonIds, #requiredLessonIds = :requiredLessonIds',
        ExpressionAttributeNames: {
          '#lessonCount': 'lessonCount',
          '#lessonIds': 'lessonIds',
          '#requiredLessonIds': 'requiredLessonIds',
        },
        ExpressionAttributeValues: {
          ':lessonCount': summary.lessonCount,
          ':lessonIds': summary.lessonIds,
          ':requiredLessonIds': summary.requiredLessonIds,
        },
      }))
      ok++
      console.log(`  OK   ${label} → lessonCount=${summary.lessonCount}, required=${summary.requiredLessonIds.length}`)
    } catch (err) {
      failed++
      console.error(`  FAIL ${label} →`, err?.message ?? err)
    }
  }

  console.log(`[backfill-course-summary] Listo. OK=${ok} FAIL=${failed} TOTAL=${courses.length}`)
  if (failed > 0) process.exitCode = 1
}

main().catch(err => {
  console.error('[backfill-course-summary] Error fatal:', err)
  process.exitCode = 1
})
