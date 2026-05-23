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
  lessons?: CourseLesson[] // denormalizado
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
  content?: string
  materialKey?: string
  durationMinutes?: number
  prerequisiteLessonId?: string
  required: boolean
  minimumScore?: string  // decimal como string
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

export type NewCourse = Omit<Course, 'createdAt' | 'updatedAt'>
export type NewTrainingProgress = TrainingProgress
export type NewTrainingCertificate = Omit<TrainingCertificate, 'uploadedAt'>

// Legacy aliases
export type CourseEnrollment = TrainingProgress
export type ExternalCertificate = TrainingCertificate
export type LessonProgress = LessonProgressEntry
