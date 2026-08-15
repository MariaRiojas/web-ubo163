import 'server-only'
import { ddb, TABLE, GetCommand, QueryCommand, ScanCommand } from '@/lib/db/dynamodb'
import type { Course, CourseLesson, TrainingProgress, LessonProgressEntry, TrainingCertificate } from '@/lib/db/schema/training'
import { getCourseLessons } from '@/lib/db/schema/training'
import type { Profile } from '@/lib/db/schema/profiles'
import { GRADE_HIERARCHY, type Grade } from '@/lib/cgbvp/grades'

/**
 * Resumen liviano de curso usado por los listados de `/capacitacion`
 * (in-progress, escuela técnica, ESBAS). Excluye `modules`/`lessons`
 * (contenido HTML + quiz) — se pide con ProjectionExpression en el Scan.
 */
type CourseSummaryItem = Pick<
  Course,
  | 'courseId' | 'slug' | 'title' | 'subtitle' | 'category' | 'durationHours' | 'minGrade'
  | 'lessonCount' | 'lessonIds' | 'requiredLessonIds'
>

const COURSE_SUMMARY_PROJECTION =
  'courseId, slug, title, subtitle, category, durationHours, minGrade, lessonCount, lessonIds, requiredLessonIds'

/**
 * Cursos legacy que aún no pasaron por `scripts/backfill-course-summary.mjs`
 * (o fueron escritos por fuera de `app/api/courses`) no traen `lessonCount`
 * en el item proyectado. Para esos (debería ser 0 en producción tras el
 * backfill; ruta rara/defensiva) se hace un GetCommand puntual del item
 * completo y se calcula el resumen con `getCourseLessons`, en vez de
 * arrastrar un Scan completo de la tabla para todos los cursos.
 */
async function hydrateLessonSummaries(
  courses: CourseSummaryItem[],
): Promise<Map<string, { lessonCount: number; lessonIds: string[] }>> {
  const map = new Map<string, { lessonCount: number; lessonIds: string[] }>()
  const missing: string[] = []

  for (const c of courses) {
    if (typeof c.lessonCount === 'number' && c.lessonIds) {
      map.set(c.courseId, { lessonCount: c.lessonCount, lessonIds: c.lessonIds })
    } else {
      missing.push(c.courseId)
    }
  }

  if (missing.length > 0) {
    const fullItems = await Promise.all(
      missing.map(courseId =>
        ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId } })),
      ),
    )
    for (const { Item } of fullItems) {
      if (!Item) continue
      const course = Item as Course
      const lessons = getCourseLessons(course)
      map.set(course.courseId, { lessonCount: lessons.length, lessonIds: lessons.map(l => l.lessonId) })
    }
  }

  return map
}

function resolveLessonSummary(
  course: CourseSummaryItem,
  summaries: Map<string, { lessonCount: number; lessonIds: string[] }>,
): { lessonCount: number; lessonIds: string[] } {
  return summaries.get(course.courseId) ?? { lessonCount: 0, lessonIds: [] }
}

export interface CapacitacionSummary {
  totalHours: number
  completedCount: number
  inProgressCount: number
  verifiedCertificates: number
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
  title: string
  moduleLabel: string
  isEnrolled: boolean
  status: 'completado' | 'en_curso' | 'no_iniciado'
  finalGrade: string | null
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
  uploadedAt: string
}

export interface CapacitacionData {
  summary: CapacitacionSummary
  inProgressCourses: CourseInProgress[]
  escuelaTecnica: CatalogCardData[]
  esbasModules: EsbasCardData[]
  library: LibraryCardData[]
  availableCategories: string[]
}

export interface CourseDetailData {
  course: Course
  enrollment: TrainingProgress | null
  lessons: {
    lessonId: string
    displayOrder: number
    title: string
    description: string | null
    contentType: string
    content: string | null
    videoUrl: string | null
    fileKey: string | null
    minimumScore: string | null
    durationMinutes: number | null
    required: boolean
    hasQuiz: boolean
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

function mapCategorySlugForBanner(title: string, category: string): CourseInProgress['categorySlug'] {
  const t = title.toLowerCase()
  if (t.includes('brec') || t.includes('brei')) return 'brec'
  if (t.includes('matpel') || t.includes('hazmat')) return 'matpel'
  if (category === 'escuela_tecnica' || t.includes('rescate') || t.includes('cuerda')) return 'rescate'
  return 'default'
}

function mapCategorySlugForCatalog(title: string, category: string): CatalogCardData['categorySlug'] {
  const t = title.toLowerCase()
  if (t.includes('matpel') || t.includes('hazmat')) return 'matpel'
  if (t.includes('cuerda')) return 'cuerdas'
  if (t.includes('nfpa') || t.includes('norma')) return 'normas'
  if (t.includes('superviv')) return 'autoproteccion'
  if (t.includes('brec') || t.includes('brei') || t.includes('rescate')) return 'rescate'
  return 'default'
}

function formatCourseCategory(category: string, title: string): string {
  const t = title.toUpperCase()
  if (t.includes('MATPEL')) {
    if (t.includes('III')) return 'MATPEL · NIVEL 3'
    if (t.includes('II')) return 'MATPEL · NIVEL 2'
    return 'MATPEL · NIVEL 1'
  }
  if (t.includes('BREC') || t.includes('BREI')) return 'RESCATE TÉCNICO'
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
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

function gradeMeetsMinimum(userGrade: string | null, minGrade: string | null): boolean {
  if (!minGrade) return true
  const userIdx = GRADE_HIERARCHY.indexOf((userGrade ?? 'aspirante') as Grade)
  const minIdx = GRADE_HIERARCHY.indexOf(minGrade as Grade)
  if (userIdx < 0 || minIdx < 0) return false
  return userIdx >= minIdx
}

export async function getCapacitacionData(profileId: string): Promise<CapacitacionData> {
  const [profileResult, coursesResult, progressResult] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId },
      ProjectionExpression: 'profileId, grade, #st, esbasPromotion',
      ExpressionAttributeNames: { '#st': 'status' },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.trainingCourses,
      FilterExpression: 'active = :t',
      ExpressionAttributeValues: { ':t': true },
      ProjectionExpression: COURSE_SUMMARY_PROJECTION,
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.trainingProgress,
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    })),
  ])

  const profile = (profileResult.Item ?? null) as Profile | null
  const userGrade = profile?.grade ?? 'aspirante'
  const userStatus = profile?.status ?? 'activo'

  const allCourses = ((coursesResult.Items ?? []) as CourseSummaryItem[]).sort((a, b) =>
    a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
  )
  const enrollments = (progressResult.Items ?? []) as TrainingProgress[]
  const enrollmentByCourseId = new Map<string, TrainingProgress>()
  for (const e of enrollments) enrollmentByCourseId.set(e.courseId, e)

  const lessonSummaries = await hydrateLessonSummaries(allCourses)

  // Helper: compute lesson progress for a course from denormalized map,
  // intersected against the course's actual lesson set (defensivo: una
  // lección puede haber sido borrada del curso después de registrar avance).
  function getLessonProgress(enrollment: TrainingProgress, lessonIds: string[]) {
    const lp = enrollment.lessonProgress ?? {}
    const lessonIdSet = new Set(lessonIds)
    const completedIds = new Set(
      Object.entries(lp)
        .filter(([k, v]) => ['completada', 'aprobada'].includes(v.status) && lessonIdSet.has(k))
        .map(([k]) => k),
    )
    return { lp, completedIds }
  }

  // Build in-progress cards. `nextLessonTitle`/`nextLessonNumber` necesitan
  // título/orden reales de lección — se hace un GetCommand puntual (item
  // completo) SOLO para los cursos con inscripción activa, en vez de traer
  // `modules[].lessons[]` de TODO el catálogo como antes.
  const activeEnrollments = enrollments.filter(e => e.status === 'activa')
  const activeCourseIds = Array.from(new Set(activeEnrollments.map(e => e.courseId)))
  const fullActiveCourses = await Promise.all(
    activeCourseIds.map(courseId =>
      ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId } })),
    ),
  )
  const fullCourseById = new Map<string, Course>()
  for (const { Item } of fullActiveCourses) {
    if (Item) fullCourseById.set((Item as Course).courseId, Item as Course)
  }

  const inProgressCourses: CourseInProgress[] = activeEnrollments.map(e => {
    const course = allCourses.find(c => c.courseId === e.courseId)!
    if (!course) return null
    const fullCourse = fullCourseById.get(e.courseId)
    const lessons = fullCourse ? getCourseLessons(fullCourse) : []
    const { lessonIds } = resolveLessonSummary(course, lessonSummaries)
    const { completedIds } = getLessonProgress(e, lessonIds)
    const completed = completedIds.size
    const total = lessonIds.length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    const nextLesson = lessons.find(l => !completedIds.has(l.lessonId))
    const completedHours = course.durationHours ? Math.round((course.durationHours * percent) / 100) : 0
    return {
      id: course.courseId,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle ?? null,
      category: formatCourseCategory(course.category, course.title),
      categorySlug: mapCategorySlugForBanner(course.title, course.category),
      durationHours: course.durationHours ?? null,
      completedHours,
      percent,
      nextLessonTitle: nextLesson?.title ?? null,
      nextLessonNumber: nextLesson ? nextLesson.displayOrder + 1 : null,
    }
  }).filter(Boolean) as CourseInProgress[]

  // Escuela técnica catalog
  const escuelaCourses = allCourses.filter(c => c.category === 'escuela_tecnica')
  const escuelaTecnica: CatalogCardData[] = escuelaCourses.map(c => {
    const enroll = enrollmentByCourseId.get(c.courseId)
    const meetsGrade = gradeMeetsMinimum(userGrade, c.minGrade ?? null)
    let status: CatalogCardData['status']
    let progressPercent: number | null = null

    if (enroll?.status === 'completada') {
      status = 'completado'
    } else if (enroll?.status === 'activa') {
      status = 'progreso'
      const { lessonIds } = resolveLessonSummary(c, lessonSummaries)
      const { completedIds } = getLessonProgress(enroll, lessonIds)
      progressPercent = lessonIds.length > 0 ? Math.round((completedIds.size / lessonIds.length) * 100) : 0
    } else if (!meetsGrade) {
      status = 'locked'
    } else {
      status = 'disponible'
    }

    return {
      id: c.courseId,
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle ?? null,
      category: formatCourseCategory(c.category, c.title),
      categorySlug: mapCategorySlugForCatalog(c.title, c.category),
      durationHours: c.durationHours ?? null,
      minGradeLabel: c.minGrade ? `${GRADE_LABEL_SHORT[c.minGrade] ?? c.minGrade} +` : null,
      status,
      progressPercent,
    }
  })

  // ESBAS modules (all courses with category === 'esbas', sorted by title)
  const esbasCourses = allCourses
    .filter(c => c.category === 'esbas')
    .sort((a, b) => a.title.localeCompare(b.title))

  const esbasModules: EsbasCardData[] = esbasCourses.map((esbasCourse, idx) => {
    const enroll = enrollmentByCourseId.get(esbasCourse.courseId)
    let status: EsbasCardData['status'] = 'no_iniciado'
    if (enroll?.status === 'completada') status = 'completado'
    else if (enroll?.status === 'activa') status = 'en_curso'

    let completedHours: number | null = null
    if (enroll) {
      const { lessonIds } = resolveLessonSummary(esbasCourse, lessonSummaries)
      const { completedIds } = getLessonProgress(enroll, lessonIds)
      const pct = lessonIds.length > 0 ? completedIds.size / lessonIds.length : 0
      completedHours = esbasCourse.durationHours ? Math.round(esbasCourse.durationHours * pct) : null
    }

    return {
      id: esbasCourse.courseId,
      slug: esbasCourse.slug,
      title: esbasCourse.title,
      moduleLabel: `MÓDULO ${['I', 'II', 'III', 'IV', 'V'][idx] ?? String(idx + 1)}`,
      isEnrolled: !!enroll,
      status,
      finalGrade: enroll?.finalGrade ?? null,
      promotion: profile?.esbasPromotion ?? null,
      completedHours,
      totalHours: esbasCourse.durationHours ?? null,
    }
  })

  // Summary
  const completedEnrollments = enrollments.filter(e => e.status === 'completada')
  const totalHours = completedEnrollments.reduce((acc, e) => {
    const c = allCourses.find(c => c.courseId === e.courseId)
    return acc + (c?.durationHours ?? 0)
  }, 0)

  // Verified certificates
  const { Count: certCount } = await ddb.send(new QueryCommand({
    TableName: TABLE.trainingCertificates,
    KeyConditionExpression: 'profileId = :pid',
    FilterExpression: 'verified = :t',
    ExpressionAttributeValues: { ':pid': profileId, ':t': true },
    Select: 'COUNT',
  }))
  const verifiedCertificates = certCount ?? 0

  const summary: CapacitacionSummary = {
    totalHours,
    completedCount: completedEnrollments.length,
    inProgressCount: activeEnrollments.length,
    verifiedCertificates,
    progressPercent: Math.min(100, Math.round((totalHours / 1000) * 100)),
  }

  // Library — no libraryDocuments table in serverless version
  const library: LibraryCardData[] = []

  const categorySet = new Set<string>()
  for (const c of escuelaCourses) categorySet.add(mapCategorySlugForCatalog(c.title, c.category))
  const availableCategories = Array.from(categorySet)

  return { summary, inProgressCourses, escuelaTecnica, esbasModules, library, availableCategories }
}

export async function getCourseDetail(slug: string, profileId: string): Promise<CourseDetailData | null> {
  const { Items: courseItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.trainingCourses,
    FilterExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
  }))
  const course = (courseItems?.[0] ?? null) as Course | null
  if (!course) return null

  const [profileResult, enrollmentResult] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId },
      ProjectionExpression: 'profileId, grade, #st',
      ExpressionAttributeNames: { '#st': 'status' },
    })),
    ddb.send(new GetCommand({
      TableName: TABLE.trainingProgress,
      Key: { profileId, courseId: course.courseId },
    })),
  ])

  const profile = (profileResult.Item ?? null) as Profile | null
  const enrollment = (enrollmentResult.Item ?? null) as TrainingProgress | null
  const lessons = getCourseLessons(course)
  const lp = enrollment?.lessonProgress ?? {}

  const completedIds = new Set(
    Object.entries(lp)
      .filter(([, v]) => ['completada', 'aprobada'].includes(v.status))
      .map(([k]) => k),
  )
  const currentLessonId = lessons.find(l => !completedIds.has(l.lessonId))?.lessonId

  const lessonData = lessons.map((l, idx) => {
    const prog = lp[l.lessonId]
    const status = (prog?.status ?? 'no_iniciada') as CourseDetailData['lessons'][number]['status']
    // Secuencialidad: bloqueada mientras alguna obligatoria anterior no esté completada
    const priorRequiredIncomplete = lessons
      .slice(0, idx)
      .some(prev => prev.required && !completedIds.has(prev.lessonId))
    return {
      lessonId: l.lessonId,
      displayOrder: l.displayOrder,
      title: l.title,
      description: l.description ?? null,
      contentType: l.contentType,
      content: l.content ?? null,
      videoUrl: l.videoUrl ?? null,
      fileKey: (l as any).fileKey ?? l.materialKey ?? null,
      minimumScore: l.minimumScore ?? null,
      durationMinutes: l.durationMinutes ?? null,
      required: l.required,
      hasQuiz: (l.quiz?.length ?? 0) > 0,
      status,
      score: prog?.score ?? null,
      isCurrent: l.lessonId === currentLessonId && !!enrollment,
      isLocked: !enrollment || priorRequiredIncomplete,
    }
  })

  let canEnroll = !enrollment
  let canEnrollReason: string | undefined
  if (enrollment) {
    canEnroll = false
    canEnrollReason = 'Ya está inscrito en este curso'
  } else {
    const userGrade = profile?.grade ?? 'aspirante'
    const userStatus = profile?.status ?? 'activo'
    if (course.category === 'esbas') {
      const ok =
        (course.availableForPostulantes && userStatus === 'postulante') ||
        (course.availableForAspirantes && (userStatus === 'aspirante_en_curso' || userStatus === 'activo'))
      if (!ok) { canEnroll = false; canEnrollReason = 'Este curso no está disponible para su figura actual' }
    } else if (!gradeMeetsMinimum(userGrade, course.minGrade ?? null)) {
      canEnroll = false
      canEnrollReason = `Requiere grado ${course.minGrade ? GRADE_LABEL_SHORT[course.minGrade] ?? course.minGrade : '—'} o superior`
    }
  }

  return {
    course,
    enrollment,
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

export async function getFullLibrary(_profileId: string): Promise<LibraryCardData[]> {
  const res = await ddb.send(new ScanCommand({ TableName: TABLE.libraryDocuments }))
  return ((res.Items ?? []) as any[])
    .sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''))
    .map(item => ({
      id: item.docId,
      title: item.title,
      description: item.description ?? null,
      category: item.category,
      fileKey: item.fileKey,
      fileSizeBytes: item.fileSizeBytes ?? null,
      mimeType: item.mimeType ?? null,
      uploadedAt: item.uploadedAt,
    }))
}
