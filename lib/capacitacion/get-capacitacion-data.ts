import 'server-only'
import { db } from '@/lib/db'
import {
  courses,
  courseLessons,
  courseEnrollments,
  lessonProgress,
  libraryDocuments,
  externalCertificates,
  profiles,
  type Course,
  type CourseEnrollment,
} from '@/lib/db/schema'
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm'
import { GRADE_HIERARCHY, type Grade } from '@/lib/cgbvp/grades'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface CapacitacionSummary {
  totalHours: number
  completedCount: number
  inProgressCount: number
  verifiedCertificates: number
  /** Ring % progreso — horas acumuladas / horas objetivo (1000h) */
  progressPercent: number
}

export interface CourseInProgress {
  id: string
  slug: string
  title: string
  subtitle: string | null
  category: string
  categorySlug: 'brec' | 'matpel' | 'rescate' | 'default'
  durationHours: number | null
  completedHours: number
  percent: number
  nextLessonTitle: string | null
  nextLessonNumber: number | null
}

export interface CatalogCardData {
  id: string
  slug: string
  title: string
  subtitle: string | null
  category: string
  categorySlug: 'matpel' | 'rescate' | 'cuerdas' | 'normas' | 'autoproteccion' | 'default'
  durationHours: number | null
  minGradeLabel: string | null
  status: 'completado' | 'progreso' | 'disponible' | 'locked'
  progressPercent: number | null
}

export interface EsbasCardData {
  id: string
  slug: string
  isEnrolled: boolean
  status: 'completado' | 'en_curso' | 'no_iniciado'
  finalGrade: string | null
  /** promoción ESBAS-2023-II etc. */
  promotion: string | null
  completedHours: number | null
  totalHours: number | null
}

export interface LibraryCardData {
  id: string
  title: string
  description: string | null
  category: string
  fileKey: string
  fileSizeBytes: number | null
  mimeType: string | null
  uploadedAt: Date
}

export interface CapacitacionData {
  summary: CapacitacionSummary
  inProgressCourses: CourseInProgress[]
  escuelaTecnica: CatalogCardData[]
  esbas: EsbasCardData | null
  library: LibraryCardData[]
  /** Lista de categorías disponibles en el catálogo para filtrar */
  availableCategories: string[]
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function mapCategorySlugForBanner(
  title: string, category: string,
): 'brec' | 'matpel' | 'rescate' | 'default' {
  const t = title.toLowerCase()
  if (t.includes('brec') || t.includes('brei')) return 'brec'
  if (t.includes('matpel') || t.includes('hazmat')) return 'matpel'
  if (category === 'escuela_tecnica' || t.includes('rescate') || t.includes('cuerda')) return 'rescate'
  return 'default'
}

function mapCategorySlugForCatalog(
  title: string, category: string,
): CatalogCardData['categorySlug'] {
  const t = title.toLowerCase()
  if (t.includes('matpel') || t.includes('hazmat')) return 'matpel'
  if (t.includes('cuerda')) return 'cuerdas'
  if (t.includes('nfpa') || t.includes('norma')) return 'normas'
  if (t.includes('superviv')) return 'autoproteccion'
  if (t.includes('brec') || t.includes('brei') || t.includes('rec') || t.includes('rescate'))
    return 'rescate'
  return 'default'
}

function formatCourseCategory(category: string, title: string): string {
  const t = title.toUpperCase()
  if (t.includes('MATPEL')) {
    if (t.includes('III')) return 'MATPEL · NIVEL 3'
    if (t.includes('II')) return 'MATPEL · NIVEL 2'
    return 'MATPEL · NIVEL 1'
  }
  if (t.includes('BREC')) return 'RESCATE TÉCNICO'
  if (t.includes('BREI')) return 'RESCATE TÉCNICO'
  if (t.includes('CUERDA')) return 'CUERDAS'
  if (t.includes('SUPERVIV')) return 'AUTOPROTECCIÓN'
  if (t.includes('NFPA')) return 'NORMAS'
  if (category === 'escuela_tecnica') return 'ESCUELA TÉCNICA'
  if (category === 'esbas') return 'CURSO ESBAS'
  if (category === 'webinar') return 'WEBINAR'
  if (category === 'workshop') return 'TALLER'
  if (category === 'norma') return 'NORMAS'
  return category.toUpperCase()
}

const GRADE_LABEL_SHORT: Record<string, string> = {
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brig. Mayor',
  brigadier_general: 'Brig. General',
}

function gradeMeetsMinimum(
  userGrade: string | null,
  minGrade: string | null,
): boolean {
  if (!minGrade) return true
  const userIdx = GRADE_HIERARCHY.indexOf((userGrade ?? 'aspirante') as Grade)
  const minIdx = GRADE_HIERARCHY.indexOf(minGrade as Grade)
  if (userIdx < 0 || minIdx < 0) return false
  return userIdx >= minIdx
}

// ═══════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export async function getCapacitacionData(
  profileId: string,
): Promise<CapacitacionData> {
  // Perfil (para filtros por grado)
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  })
  const userGrade = profile?.grade ?? 'aspirante'
  const userStatus = profile?.status ?? 'activo'

  // ── Todos los cursos activos ─────────────────────────────────
  const allCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.active, true))
    .orderBy(asc(courses.category), asc(courses.title))

  // ── Inscripciones del efectivo ───────────────────────────────
  const enrollments = await db
    .select()
    .from(courseEnrollments)
    .where(eq(courseEnrollments.profileId, profileId))

  const enrollmentByCourseId = new Map<string, CourseEnrollment>()
  for (const e of enrollments) enrollmentByCourseId.set(e.courseId, e)

  // ── Progreso por lección (para cursos en curso) ──────────────
  const activeEnrollments = enrollments.filter((e) => e.status === 'activa')
  const progressRows = activeEnrollments.length > 0
    ? await db
        .select()
        .from(lessonProgress)
        .where(
          inArray(lessonProgress.enrollmentId, activeEnrollments.map((e) => e.id)),
        )
    : []

  // Agrupar progresos por enrollment
  const progressByEnrollment = new Map<string, typeof progressRows>()
  for (const p of progressRows) {
    const list = progressByEnrollment.get(p.enrollmentId) ?? []
    list.push(p)
    progressByEnrollment.set(p.enrollmentId, list)
  }

  // ── Lecciones de cursos activos (para calcular próxima) ──────
  const activeCourseIds = activeEnrollments.map((e) => e.courseId)
  const allActiveLessons = activeCourseIds.length > 0
    ? await db
        .select()
        .from(courseLessons)
        .where(inArray(courseLessons.courseId, activeCourseIds))
        .orderBy(asc(courseLessons.courseId), asc(courseLessons.displayOrder))
    : []

  const lessonsByCourseId = new Map<string, typeof allActiveLessons>()
  for (const l of allActiveLessons) {
    const list = lessonsByCourseId.get(l.courseId) ?? []
    list.push(l)
    lessonsByCourseId.set(l.courseId, list)
  }

  // ── Construir cursos en progreso ─────────────────────────────
  const inProgressCourses: CourseInProgress[] = activeEnrollments.map((e) => {
    const course = allCourses.find((c) => c.id === e.courseId)!
    const lessons = lessonsByCourseId.get(e.courseId) ?? []
    const prog = progressByEnrollment.get(e.id) ?? []

    const completedLessonIds = new Set(
      prog.filter((p) => ['completada', 'aprobada'].includes(p.status)).map((p) => p.lessonId),
    )
    const completed = lessons.filter((l) => completedLessonIds.has(l.id)).length
    const total = lessons.length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0

    // Próxima lección: primera no completada
    const nextLesson = lessons.find((l) => !completedLessonIds.has(l.id))

    const completedHours = course.durationHours
      ? Math.round((course.durationHours * percent) / 100)
      : 0

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      category: formatCourseCategory(course.category, course.title),
      categorySlug: mapCategorySlugForBanner(course.title, course.category),
      durationHours: course.durationHours,
      completedHours,
      percent,
      nextLessonTitle: nextLesson?.title ?? null,
      nextLessonNumber: nextLesson ? (nextLesson.displayOrder + 1) : null,
    }
  })

  // ── Catálogo Escuela Técnica ─────────────────────────────────
  const escuelaCourses = allCourses.filter((c) => c.category === 'escuela_tecnica')
  const escuelaTecnica: CatalogCardData[] = escuelaCourses.map((c) => {
    const enroll = enrollmentByCourseId.get(c.id)
    const meetsGrade = gradeMeetsMinimum(userGrade, c.minGrade)

    let status: CatalogCardData['status']
    let progressPercent: number | null = null
    if (enroll?.status === 'completada') {
      status = 'completado'
    } else if (enroll?.status === 'activa') {
      status = 'progreso'
      // Calcular % aproximado
      const lessons = lessonsByCourseId.get(c.id) ?? []
      const prog = progressByEnrollment.get(enroll.id) ?? []
      const completed = prog.filter((p) => ['completada', 'aprobada'].includes(p.status)).length
      progressPercent = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0
    } else if (!meetsGrade) {
      status = 'locked'
    } else {
      status = 'disponible'
    }

    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      category: formatCourseCategory(c.category, c.title),
      categorySlug: mapCategorySlugForCatalog(c.title, c.category),
      durationHours: c.durationHours,
      minGradeLabel: c.minGrade ? `${GRADE_LABEL_SHORT[c.minGrade] ?? c.minGrade} +` : null,
      status,
      progressPercent,
    }
  })

  // ── Card ESBAS ───────────────────────────────────────────────
  const esbasCourse = allCourses.find((c) => c.category === 'esbas')
  let esbas: EsbasCardData | null = null
  if (esbasCourse) {
    const enroll = enrollmentByCourseId.get(esbasCourse.id)
    let status: EsbasCardData['status'] = 'no_iniciado'
    if (enroll?.status === 'completada') status = 'completado'
    else if (enroll?.status === 'activa') status = 'en_curso'

    let completedHours: number | null = null
    if (enroll) {
      const lessons = lessonsByCourseId.get(esbasCourse.id) ?? []
      const prog = progressByEnrollment.get(enroll.id) ?? []
      const completedCount = prog.filter((p) => ['completada', 'aprobada'].includes(p.status)).length
      const pct = lessons.length > 0 ? completedCount / lessons.length : 0
      completedHours = esbasCourse.durationHours
        ? Math.round(esbasCourse.durationHours * pct)
        : null
    }

    esbas = {
      id: esbasCourse.id,
      slug: esbasCourse.slug,
      isEnrolled: !!enroll,
      status,
      finalGrade: enroll?.finalGrade ?? null,
      promotion: profile?.esbasPromotion ?? null,
      completedHours,
      totalHours: esbasCourse.durationHours,
    }
  }

  // ── Summary ──────────────────────────────────────────────────
  const completedEnrollments = enrollments.filter((e) => e.status === 'completada')
  const totalHours = completedEnrollments.reduce((acc, e) => {
    const c = allCourses.find((c) => c.id === e.courseId)
    return acc + (c?.durationHours ?? 0)
  }, 0)

  // Certificados verificados
  const [verifiedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(externalCertificates)
    .where(
      and(
        eq(externalCertificates.profileId, profileId),
        eq(externalCertificates.verified, true),
      ),
    )

  const summary: CapacitacionSummary = {
    totalHours,
    completedCount: completedEnrollments.length,
    inProgressCount: activeEnrollments.length,
    verifiedCertificates: Number(verifiedRow?.count ?? 0),
    progressPercent: Math.min(100, Math.round((totalHours / 1000) * 100)),
  }

  // ── Biblioteca (top 4 visibles según grado) ──────────────────
  const isPostulante = userStatus === 'postulante'
  const isAspirante = userStatus === 'aspirante_en_curso'

  const libraryRaw = await db
    .select()
    .from(libraryDocuments)
    .orderBy(desc(libraryDocuments.uploadedAt))

  const library: LibraryCardData[] = libraryRaw
    .filter((doc) => {
      if (isPostulante) return doc.visibleToPostulantes
      if (isAspirante) return doc.visibleToAspirantes || doc.visibleToPostulantes
      return gradeMeetsMinimum(userGrade, doc.minGrade)
    })
    .slice(0, 4)
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      fileKey: doc.fileKey,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt ?? new Date(),
    }))

  // ── Categorías disponibles (deducidas de títulos) ────────────
  const categorySet = new Set<string>()
  for (const c of escuelaCourses) {
    const slug = mapCategorySlugForCatalog(c.title, c.category)
    categorySet.add(slug)
  }
  const availableCategories = Array.from(categorySet)

  return {
    summary,
    inProgressCourses,
    escuelaTecnica,
    esbas,
    library,
    availableCategories,
  }
}

// ═══════════════════════════════════════════════════════════════════
// DETALLE DE CURSO
// ═══════════════════════════════════════════════════════════════════

export interface CourseDetailData {
  course: Course
  enrollment: CourseEnrollment | null
  lessons: {
    id: string
    displayOrder: number
    title: string
    description: string | null
    contentType: string
    durationMinutes: number | null
    required: boolean
    status: 'no_iniciada' | 'en_curso' | 'completada' | 'aprobada' | 'reprobada'
    score: string | null
    isCurrent: boolean
    isLocked: boolean
  }[]
  meta: {
    totalLessons: number
    completedLessons: number
    percent: number
    canEnroll: boolean
    canEnrollReason?: string
  }
}

export async function getCourseDetail(
  slug: string,
  profileId: string,
): Promise<CourseDetailData | null> {
  const course = await db.query.courses.findFirst({
    where: eq(courses.slug, slug),
  })
  if (!course) return null

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  })

  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, course.id),
        eq(courseEnrollments.profileId, profileId),
      ),
    )
    .limit(1)

  const lessons = await db
    .select()
    .from(courseLessons)
    .where(eq(courseLessons.courseId, course.id))
    .orderBy(asc(courseLessons.displayOrder))

  const progresses = enrollment
    ? await db
        .select()
        .from(lessonProgress)
        .where(eq(lessonProgress.enrollmentId, enrollment.id))
    : []

  const progressByLessonId = new Map(progresses.map((p) => [p.lessonId, p]))

  // Calcular lección actual (primera no completada)
  const completedIds = new Set(
    progresses.filter((p) => ['completada', 'aprobada'].includes(p.status)).map((p) => p.lessonId),
  )
  const currentLessonId = lessons.find((l) => !completedIds.has(l.id))?.id

  const lessonData = lessons.map((l) => {
    const prog = progressByLessonId.get(l.id)
    const status = (prog?.status ?? 'no_iniciada') as
      | 'no_iniciada' | 'en_curso' | 'completada' | 'aprobada' | 'reprobada'
    return {
      id: l.id,
      displayOrder: l.displayOrder,
      title: l.title,
      description: l.description,
      contentType: l.contentType,
      durationMinutes: l.durationMinutes,
      required: l.required,
      status,
      score: prog?.score ?? null,
      isCurrent: l.id === currentLessonId && !!enrollment,
      // Lock hasta que se inscriba
      isLocked: !enrollment,
    }
  })

  // Validar si puede inscribirse
  let canEnroll = !enrollment
  let canEnrollReason: string | undefined
  if (enrollment) {
    canEnroll = false
    canEnrollReason = 'Ya está inscrito en este curso'
  } else {
    const userGrade = profile?.grade ?? 'aspirante'
    const userStatus = profile?.status ?? 'activo'
    // ESBAS tiene reglas especiales
    if (course.category === 'esbas') {
      const ok =
        course.availableForPostulantes && userStatus === 'postulante'
        || course.availableForAspirantes && userStatus === 'aspirante_en_curso'
        || course.availableForAspirantes && userStatus === 'activo'
      if (!ok) {
        canEnroll = false
        canEnrollReason = 'Este curso no está disponible para su figura actual'
      }
    } else if (!gradeMeetsMinimum(userGrade, course.minGrade)) {
      canEnroll = false
      canEnrollReason = `Requiere grado ${
        course.minGrade ? GRADE_LABEL_SHORT[course.minGrade] ?? course.minGrade : '—'
      } o superior`
    }
  }

  return {
    course,
    enrollment: enrollment ?? null,
    lessons: lessonData,
    meta: {
      totalLessons: lessons.length,
      completedLessons: completedIds.size,
      percent: lessons.length > 0 ? Math.round((completedIds.size / lessons.length) * 100) : 0,
      canEnroll,
      canEnrollReason,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// BIBLIOTECA COMPLETA
// ═══════════════════════════════════════════════════════════════════

export async function getFullLibrary(profileId: string): Promise<LibraryCardData[]> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  })
  const userGrade = profile?.grade ?? 'aspirante'
  const userStatus = profile?.status ?? 'activo'
  const isPostulante = userStatus === 'postulante'
  const isAspirante = userStatus === 'aspirante_en_curso'

  const all = await db
    .select()
    .from(libraryDocuments)
    .orderBy(asc(libraryDocuments.category), desc(libraryDocuments.uploadedAt))

  return all
    .filter((doc) => {
      if (isPostulante) return doc.visibleToPostulantes
      if (isAspirante) return doc.visibleToAspirantes || doc.visibleToPostulantes
      return gradeMeetsMinimum(userGrade, doc.minGrade)
    })
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      fileKey: doc.fileKey,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt ?? new Date(),
    }))
}
