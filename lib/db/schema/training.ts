/**
 * Schema de Capacitación (LMS básico del CRM).
 *
 * Reemplaza gradualmente a `esbas.ts` que solo contempla la malla ESBAS.
 * Este modelo es genérico: cualquier curso (ESBAS, Escuela Técnica,
 * webinars, workshops) usa la misma estructura.
 *
 * Diseño según `docs/ARQUITECTURA_MENU.md` §4.
 *
 * Modelo:
 *
 *   courses ─< course_lessons
 *      └─< course_enrollments (profile inscrito en un curso)
 *               └─< lesson_progress (progreso por lección)
 *
 *   library_documents (material de consulta libre)
 *   certificates      (certificados externos subidos por el efectivo)
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

// ═══════════════════════════════════════════════════════════════════
// CATEGORÍAS Y ENUMS
// ═══════════════════════════════════════════════════════════════════

export const COURSE_CATEGORIES = [
  'esbas',                 // Curso ESBAS (obligatorio para aspirantes)
  'escuela_tecnica',       // Cursos avanzados (MATPEL, BREC, etc.)
  'webinar',               // Sesiones puntuales
  'workshop',              // Talleres prácticos
  'norma',                 // Cursos sobre normas NFPA u otras
  'otro',
] as const
export type CourseCategory = (typeof COURSE_CATEGORIES)[number]

export const LESSON_CONTENT_TYPES = [
  'texto',                 // Contenido textual (markdown)
  'video',                 // Video embebido
  'practica',              // Actividad práctica a registrar
  'evaluacion',            // Evaluación con preguntas/calificación
  'lectura_archivo',       // Material descargable (PDF)
] as const
export type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number]

export const LESSON_PROGRESS_STATUSES = [
  'no_iniciada',
  'en_curso',
  'completada',
  'aprobada',
  'reprobada',
] as const
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number]

export const ENROLLMENT_STATUSES = [
  'activa',
  'completada',
  'reprobada',
  'abandonada',
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

// ═══════════════════════════════════════════════════════════════════
// CATÁLOGO DE CURSOS
// ═══════════════════════════════════════════════════════════════════

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Slug único — ej: "matpel-1", "brec", "esbas" */
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  category: text('category').notNull(),
  /** Duración estimada en horas */
  durationHours: integer('duration_hours'),
  /** Grado mínimo requerido para inscribirse (null = sin restricción) */
  minGrade: text('min_grade'),
  /**
   * Si el curso está disponible para postulantes (typically solo ESBAS lo está)
   */
  availableForPostulantes: boolean('available_for_postulantes').notNull().default(false),
  /** Si está disponible para aspirantes */
  availableForAspirantes: boolean('available_for_aspirantes').notNull().default(false),
  /** Si es obligatorio para cierto segmento */
  mandatoryForPostulantes: boolean('mandatory_for_postulantes').notNull().default(false),
  mandatoryForAspirantes: boolean('mandatory_for_aspirantes').notNull().default(false),
  /** URL de imagen de portada */
  coverImageKey: text('cover_image_key'),
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const coursesRelations = relations(courses, ({ many, one }) => ({
  lessons: many(courseLessons),
  enrollments: many(courseEnrollments),
  creator: one(profiles, {
    fields: [courses.createdBy],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// LECCIONES
// ═══════════════════════════════════════════════════════════════════

export const courseLessons = pgTable('course_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  /** Orden dentro del curso */
  displayOrder: integer('display_order').notNull().default(0),
  title: text('title').notNull(),
  description: text('description'),
  contentType: text('content_type').notNull().default('texto'),
  /** Contenido principal (texto markdown, URL de video, texto de práctica) */
  content: text('content'),
  /** Si tiene un archivo complementario (PDF, documento) */
  materialKey: text('material_key'),
  /** Duración estimada en minutos */
  durationMinutes: integer('duration_minutes'),
  /** Lección prerequisito (debe completarse antes) */
  prerequisiteLessonId: uuid('prerequisite_lesson_id'),
  /** Si es obligatoria para aprobar el curso */
  required: boolean('required').notNull().default(true),
  /** Puntaje mínimo para aprobar (0-20, null = no tiene evaluación) */
  minimumScore: decimal('minimum_score', { precision: 4, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const courseLessonsRelations = relations(courseLessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseLessons.courseId],
    references: [courses.id],
  }),
  progress: many(lessonProgress),
}))

// ═══════════════════════════════════════════════════════════════════
// INSCRIPCIONES
// ═══════════════════════════════════════════════════════════════════

export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('activa'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Calificación final del curso (promedio) */
    finalGrade: decimal('final_grade', { precision: 4, scale: 2 }),
    /** Key del certificado generado al aprobar */
    certificateKey: text('certificate_key'),
  },
  (t) => ({
    uniqueEnrollment: unique().on(t.courseId, t.profileId),
  }),
)

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  profile: one(profiles, {
    fields: [courseEnrollments.profileId],
    references: [profiles.id],
  }),
  progress: many(lessonProgress),
}))

// ═══════════════════════════════════════════════════════════════════
// PROGRESO POR LECCIÓN
// ═══════════════════════════════════════════════════════════════════

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => courseEnrollments.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => courseLessons.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('no_iniciada'),
    /** Puntaje obtenido (si la lección tiene evaluación) */
    score: decimal('score', { precision: 4, scale: 2 }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Instructor que validó (para prácticas) */
    validatedBy: uuid('validated_by').references(() => profiles.id),
    notes: text('notes'),
  },
  (t) => ({
    uniqueProgress: unique().on(t.enrollmentId, t.lessonId),
  }),
)

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  enrollment: one(courseEnrollments, {
    fields: [lessonProgress.enrollmentId],
    references: [courseEnrollments.id],
  }),
  lesson: one(courseLessons, {
    fields: [lessonProgress.lessonId],
    references: [courseLessons.id],
  }),
  validator: one(profiles, {
    fields: [lessonProgress.validatedBy],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// BIBLIOTECA
// ═══════════════════════════════════════════════════════════════════

export const LIBRARY_CATEGORIES = [
  'reglamentos',           // RIF, NDR, Directivas
  'manuales',              // Manuales técnicos
  'procedimientos',        // POE, protocolos
  'normativa_externa',     // NFPA, normas internacionales
  'fichas_tecnicas',       // Datasheets de equipos
  'general',
] as const
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]

export const libraryDocuments = pgTable('library_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull().default('general'),
  fileKey: text('file_key').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  /** Grado mínimo requerido para verlo (null = todos) */
  minGrade: text('min_grade'),
  /** Si también lo pueden ver aspirantes */
  visibleToAspirantes: boolean('visible_to_aspirantes').notNull().default(false),
  /** Si también lo pueden ver postulantes */
  visibleToPostulantes: boolean('visible_to_postulantes').notNull().default(false),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
})

export const libraryDocumentsRelations = relations(libraryDocuments, ({ one }) => ({
  uploader: one(profiles, {
    fields: [libraryDocuments.uploadedBy],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// CERTIFICADOS EXTERNOS
// (Los que sube el propio efectivo a su legajo)
// ═══════════════════════════════════════════════════════════════════

export const externalCertificates = pgTable('external_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  issuer: text('issuer'),
  description: text('description'),
  fileKey: text('file_key').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  /** Fecha de emisión del certificado */
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  /** Fecha de expiración (si aplica) */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  /** Si fue verificado por el área de Instrucción */
  verified: boolean('verified').notNull().default(false),
  verifiedBy: uuid('verified_by').references(() => profiles.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
})

export const externalCertificatesRelations = relations(externalCertificates, ({ one }) => ({
  profile: one(profiles, {
    fields: [externalCertificates.profileId],
    references: [profiles.id],
  }),
  verifier: one(profiles, {
    fields: [externalCertificates.verifiedBy],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// TIPOS INFERIDOS
// ═══════════════════════════════════════════════════════════════════

export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type CourseLesson = typeof courseLessons.$inferSelect
export type NewCourseLesson = typeof courseLessons.$inferInsert
export type CourseEnrollment = typeof courseEnrollments.$inferSelect
export type NewCourseEnrollment = typeof courseEnrollments.$inferInsert
export type LessonProgress = typeof lessonProgress.$inferSelect
export type NewLessonProgress = typeof lessonProgress.$inferInsert
export type LibraryDocument = typeof libraryDocuments.$inferSelect
export type NewLibraryDocument = typeof libraryDocuments.$inferInsert
export type ExternalCertificate = typeof externalCertificates.$inferSelect
export type NewExternalCertificate = typeof externalCertificates.$inferInsert
