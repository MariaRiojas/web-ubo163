/**
 * Capacitación (LMS)
 *
 * Tablas DynamoDB:
 *   {PREFIX}-training-courses       PK: courseId  + GSI type-index
 *   {PREFIX}-training-progress      PK: profileId, SK: courseId
 *   {PREFIX}-training-certificates  PK: profileId, SK: certificateId
 */

export const COURSE_CATEGORIES = [
  'esbas', 'escuela_tecnica', 'webinar', 'workshop', 'norma', 'otro',
] as const
export type CourseCategory = (typeof COURSE_CATEGORIES)[number]

export const LESSON_CONTENT_TYPES = [
  'texto', 'video', 'practica', 'evaluacion', 'lectura_archivo',
] as const
export type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number]

export const LESSON_PROGRESS_STATUSES = [
  'no_iniciada', 'en_curso', 'completada', 'aprobada', 'reprobada',
] as const
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number]

export const ENROLLMENT_STATUSES = [
  'activa', 'completada', 'reprobada', 'abandonada',
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const LIBRARY_CATEGORIES = [
  'reglamentos', 'manuales', 'procedimientos', 'normativa_externa', 'fichas_tecnicas', 'general',
] as const
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]

/**
 * Pregunta de un quiz. Embebida dentro de `CourseLesson.quiz`.
 * - En lecciones texto/video/lectura_archivo → mini-quiz (1-3 preguntas).
 * - En lecciones `evaluacion` → banco de preguntas del examen formal.
 */
export interface QuizQuestion {
  questionId: string
  type: 'multiple_choice' | 'fill_blank' | 'open_text'
  prompt: string
  options?: string[]       // solo para multiple_choice
  correctAnswer?: string   // multiple_choice y fill_blank (open_text se califica a mano)
  points: number           // default 1
}

/**
 * Módulo de un curso. Agrupa lecciones. Un curso tiene N módulos ordenados.
 */
export interface CourseModule {
  moduleId: string
  displayOrder: number
  title: string
  description?: string
  lessons: CourseLesson[]
}

export interface Course {
  courseId: string         // PK
  slug: string
  title: string
  subtitle?: string
  description?: string
  category: CourseCategory // GSI: type-index
  durationHours?: number
  minGrade?: string
  availableForPostulantes: boolean
  availableForAspirantes: boolean
  mandatoryForPostulantes: boolean
  mandatoryForAspirantes: boolean
  coverImageKey?: string
  active: boolean
  modules?: CourseModule[] // jerarquía curso→módulo→lección (nuevo)
  lessons?: CourseLesson[] // legacy: lecciones planas (cursos de producción existentes)
  /**
   * Resumen denormalizado, mantenido en escritura (POST/PUT) y por el script
   * de backfill, para que los listados (`/capacitacion`, dashboard) puedan
   * calcular conteos/porcentajes con un ProjectionExpression liviano en vez
   * de descargar `modules[].lessons[]` completos (HTML + quiz) en cada Scan.
   * Ver `computeCourseSummary()`.
   */
  lessonCount?: number       // total de lecciones (todos los módulos, igual a getCourseLessons(course).length)
  lessonIds?: string[]       // IDs de TODAS las lecciones (mismo orden/conjunto que getCourseLessons)
  requiredLessonIds?: string[] // IDs de las lecciones con required === true
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface CourseLesson {
  lessonId: string
  courseId: string
  displayOrder: number
  title: string
  description?: string
  contentType: LessonContentType
  content?: string       // HTML/texto narrativo (texto, practica, evaluacion)
  videoUrl?: string      // URL YouTube/Vimeo (video)
  materialKey?: string
  durationMinutes?: number
  prerequisiteLessonId?: string
  required: boolean
  minimumScore?: string  // decimal como string
  /**
   * Mini-quiz mostrado al final de lecciones texto/video/lectura_archivo.
   * En lecciones `evaluacion` este array ES el banco formal de preguntas
   * (nota mínima aprobatoria 14/20).
   */
  quiz?: QuizQuestion[]
}

/**
 * Respuesta de alumno a una pregunta `open_text` de una evaluación.
 * Persistida en TABLE.trainingEvaluations. Va a la cola de revisión del instructor.
 */
export interface EvalResponse {
  evalId: string          // PK
  profileId: string       // GSI: profileId-index
  courseId: string
  lessonId: string
  questionId: string
  type: 'open_text'
  prompt: string
  answer: string
  status: 'pending_review' | 'graded'
  score?: number
  maxScore: number
  gradedBy?: string       // profileId del instructor
  gradedAt?: string
  createdAt: string
}

export interface TrainingProgress {
  profileId: string        // PK
  courseId: string         // SK
  status: EnrollmentStatus
  enrolledAt: string
  completedAt?: string
  finalGrade?: string      // decimal como string
  certificateKey?: string
  lessonProgress?: Record<string, LessonProgressEntry>  // lessonId → progress
}

export interface LessonProgressEntry {
  status: LessonProgressStatus
  score?: string
  startedAt?: string
  completedAt?: string
  validatedBy?: string
  notes?: string
}

export interface TrainingCertificate {
  profileId: string        // PK
  certificateId: string    // SK
  title: string
  issuer?: string
  description?: string
  fileKey: string
  fileSizeBytes?: number
  mimeType?: string
  issuedAt?: string
  expiresAt?: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
  uploadedAt: string
}

export interface LibraryDocument {
  docId: string
  title: string
  description?: string
  category: LibraryCategory
  fileKey: string
  fileSizeBytes?: number
  mimeType?: string
  minGrade?: string
  visibleToAspirantes: boolean
  visibleToPostulantes: boolean
  uploadedBy?: string
  uploadedAt: string
}

/**
 * Único punto de migración módulo↔legacy. TODOS los consumidores deben leer los
 * módulos de un curso a través de esta función.
 *
 * - Si el curso ya tiene `modules[]`, los devuelve tal cual (ordenados).
 * - Si es un curso legacy con `lessons[]` planas, las envuelve en un único
 *   módulo sintético `mod-legacy` para que rendericen sin cambios.
 */
export function getCourseModules(course: Pick<Course, 'modules' | 'lessons'>): CourseModule[] {
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

/**
 * Lista plana de lecciones de un curso (respeta orden de módulos → lecciones).
 * Conveniencia para consumidores que necesitan un array plano de lecciones.
 */
export function getCourseLessons(course: Pick<Course, 'modules' | 'lessons'>): CourseLesson[] {
  return getCourseModules(course).flatMap(m =>
    [...m.lessons].sort((a, b) => a.displayOrder - b.displayOrder),
  )
}

/**
 * Calcula el resumen denormalizado (`lessonCount`, `lessonIds`,
 * `requiredLessonIds`) que se persiste en el item `Course` junto a `modules`
 * en cada escritura (ver `app/api/courses/route.ts` y `[id]/route.ts`) y que
 * el script `scripts/backfill-course-summary.mjs` rellena para items
 * existentes. Único punto de cómputo — TODOS los escritores deben usarlo.
 */
export function computeCourseSummary(
  course: Pick<Course, 'modules' | 'lessons'>,
): { lessonCount: number; lessonIds: string[]; requiredLessonIds: string[] } {
  const lessons = getCourseLessons(course)
  return {
    lessonCount: lessons.length,
    lessonIds: lessons.map(l => l.lessonId),
    requiredLessonIds: lessons.filter(l => l.required).map(l => l.lessonId),
  }
}

export type NewCourse = Omit<Course, 'createdAt' | 'updatedAt'>
export type NewTrainingProgress = TrainingProgress
export type NewTrainingCertificate = Omit<TrainingCertificate, 'uploadedAt'>

// Legacy aliases
export type CourseEnrollment = TrainingProgress
export type ExternalCertificate = TrainingCertificate
export type LessonProgress = LessonProgressEntry
