import 'server-only'
import { ddb, TABLE, GetCommand, QueryCommand, ScanCommand } from '@/lib/db/dynamodb'
import type { Course, TrainingProgress } from '@/lib/db/schema/training'
import { getCourseLessons } from '@/lib/db/schema/training'

/**
 * Igual que en `lib/capacitacion/get-capacitacion-data.ts`: el Scan de
 * `trainingCourses` para el KPI "Mi capacitación" solo necesita título +
 * conteo de lecciones, no `modules[].lessons[]` completos (HTML + quiz).
 */
type CourseSummaryItem = Pick<Course, 'courseId' | 'title' | 'lessonCount' | 'lessonIds'>
const COURSE_SUMMARY_PROJECTION = 'courseId, title, lessonCount, lessonIds'
import type { GuardReservation, GuardBed } from '@/lib/db/schema/guard-nocturna'
import type { Incident } from '@/lib/db/schema/incidents'
import type { InternalRequest } from '@/lib/db/schema/internal-requests'
import type { Emergency } from '@/lib/db/schema/emergencies'
import type { Announcement } from '@/lib/db/schema/announcements'

// ════════════════════════════════════════════════════════════════════
// Dashboard institucional — capa de datos (server-only)
//
// Todas las consultas son Scans/Queries individuales, cada una envuelta
// en `safe()` para que un fallo aislado (p. ej. tabla vacía o permiso
// puntual) no tumbe la página completa: se degrada a un fallback neutro.
// ════════════════════════════════════════════════════════════════════

export interface GuardTonight {
  reserved: number
  total: number
  available: number
}

export interface TrainingSnapshot {
  activeCount: number
  completedCount: number
  /** % del curso activo más avanzado (o 0 si no hay activos) */
  percent: number
  featured: { title: string; percent: number } | null
}

export interface LastEmergency {
  numeroParte: string | null
  tipo: string | null
  fecha: string | null
  direccion: string | null
  distrito: string | null
  estado: string | null
}

export interface DashboardAnnouncement {
  id: string
  title: string
  priority: 'normal' | 'importante' | 'urgente'
  date: string | null
}

export interface CompanyStatus {
  estado: string
  timestamp: string | null
}

export interface DashboardData {
  guard: GuardTonight | null
  openIncidents: number
  pendingRequests: number
  training: TrainingSnapshot
  lastEmergency: LastEmergency | null
  announcements: DashboardAnnouncement[]
  companyStatus: CompanyStatus | null
}

export interface DashboardViewer {
  profileId: string
  grade: string
  status: string
}

/** Ejecuta `fn` y, ante cualquier error, registra y devuelve `fallback`. */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[dashboard] fallo en "${label}":`, err)
    return fallback
  }
}

// ─── Guardia de esta noche ──────────────────────────────────────────
async function getGuardTonight(): Promise<GuardTonight | null> {
  const todayIso = new Date().toISOString().slice(0, 10)

  const [reservationsResult, bedsResult] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.guardReservations,
      KeyConditionExpression: '#d = :date',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':date': todayIso },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.guardBeds,
    })),
  ])

  const reservations = (reservationsResult.Items ?? []) as GuardReservation[]
  const reserved = reservations.filter(r => r.status !== 'cancelada').length

  const beds = (bedsResult.Items ?? []) as GuardBed[]
  const total = beds.length
  const available = beds.filter(b => b.status !== 'indisponible').length

  return { reserved, total, available }
}

// ─── Incidencias abiertas (pendiente / en_proceso) ──────────────────
async function getOpenIncidents(): Promise<number> {
  const { Count = 0 } = await ddb.send(new ScanCommand({
    TableName: TABLE.incidents,
    Select: 'COUNT',
    FilterExpression: '#st = :pend OR #st = :prog',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':pend': 'pendiente', ':prog': 'en_proceso' },
  }))
  return Count
}

// ─── Requerimientos internos pendientes ─────────────────────────────
async function getPendingRequests(): Promise<number> {
  const { Count = 0 } = await ddb.send(new ScanCommand({
    TableName: TABLE.internalRequests,
    Select: 'COUNT',
    FilterExpression: '#st = :pend',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':pend': 'pendiente' },
  }))
  return Count
}

// ─── Progreso de capacitación del usuario ───────────────────────────
async function getTrainingSnapshot(profileId: string): Promise<TrainingSnapshot> {
  const [progressResult, coursesResult] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.trainingProgress,
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.trainingCourses,
      FilterExpression: 'active = :t',
      ExpressionAttributeValues: { ':t': true },
      ProjectionExpression: COURSE_SUMMARY_PROJECTION,
    })),
  ])

  const enrollments = (progressResult.Items ?? []) as TrainingProgress[]
  const courses = (coursesResult.Items ?? []) as CourseSummaryItem[]
  const courseById = new Map(courses.map(c => [c.courseId, c]))

  const activeEnrollments = enrollments.filter(e => e.status === 'activa')
  const completedCount = enrollments.filter(e => e.status === 'completada').length

  // Cursos legacy sin resumen persistido (pre-backfill): GetCommand puntual
  // del item completo, solo para los pocos cursos con inscripción activa.
  const missingSummaryIds = Array.from(new Set(
    activeEnrollments
      .map(e => courseById.get(e.courseId))
      .filter((c): c is CourseSummaryItem => !!c && typeof c.lessonCount !== 'number')
      .map(c => c.courseId),
  ))
  const fallbackLessonIds = new Map<string, string[]>()
  if (missingSummaryIds.length > 0) {
    const fullItems = await Promise.all(
      missingSummaryIds.map(courseId =>
        ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId } })),
      ),
    )
    for (const { Item } of fullItems) {
      if (!Item) continue
      const course = Item as Course
      fallbackLessonIds.set(course.courseId, getCourseLessons(course).map(l => l.lessonId))
    }
  }

  let featured: { title: string; percent: number } | null = null
  for (const e of activeEnrollments) {
    const course = courseById.get(e.courseId)
    if (!course) continue
    const lessonIds = course.lessonIds ?? fallbackLessonIds.get(course.courseId) ?? []
    if (lessonIds.length === 0) continue
    const lessonIdSet = new Set(lessonIds)
    const lp = e.lessonProgress ?? {}
    const completed = Object.entries(lp).filter(
      ([lessonId, v]) => lessonIdSet.has(lessonId) && ['completada', 'aprobada'].includes(v.status),
    ).length
    const percent = Math.round((completed / lessonIds.length) * 100)
    if (!featured || percent > featured.percent) {
      featured = { title: course.title, percent }
    }
  }

  return {
    activeCount: activeEnrollments.length,
    completedCount,
    percent: featured?.percent ?? 0,
    featured,
  }
}

// ─── Última emergencia CGBVP ────────────────────────────────────────
async function getLastEmergency(): Promise<LastEmergency | null> {
  const { Items = [] } = await ddb.send(new ScanCommand({
    TableName: TABLE.emergencies,
  }))
  const emergencies = (Items as Emergency[]).sort((a, b) =>
    (b.fechaDespacho ?? b.date ?? b.createdAt ?? '').localeCompare(
      a.fechaDespacho ?? a.date ?? a.createdAt ?? '',
    ),
  )
  const latest = emergencies[0]
  if (!latest) return null
  return {
    numeroParte: latest.numeroParte ?? null,
    tipo: latest.tipoEmergenciaDesc ?? latest.tipo ?? null,
    fecha: latest.fechaDespacho ?? latest.date ?? null,
    direccion: latest.direccion ?? null,
    distrito: latest.distrito ?? null,
    estado: latest.estado ?? null,
  }
}

// ─── Últimos anuncios publicados (audiencia del usuario) ────────────
function matchesAudience(a: Announcement, viewer: DashboardViewer): boolean {
  if (a.directToProfileId === viewer.profileId) return true
  const isActivo = viewer.status === 'activo' || viewer.status === 'reserva'
  const isAspirante = viewer.status === 'aspirante_en_curso'
  const isPostulante = viewer.status === 'postulante'
  if (a.audienceAllBomberos && isActivo) return true
  if (a.audienceAspirantes && isAspirante) return true
  if (a.audiencePostulantes && isPostulante) return true
  if ((a.audienceGrades ?? []).includes(viewer.grade)) return true
  return false
}

async function getLatestAnnouncements(viewer: DashboardViewer): Promise<DashboardAnnouncement[]> {
  const nowIso = new Date().toISOString()
  const { Items = [] } = await ddb.send(new QueryCommand({
    TableName: TABLE.announcements,
    IndexName: 'status-createdAt-index',
    KeyConditionExpression: '#st = :aprobado',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':aprobado': 'aprobado' },
    ScanIndexForward: false,
    Limit: 20,
  }))

  const announcements = (Items as Announcement[])
    .filter(a => !(a.expiresAt && a.expiresAt < nowIso))
    .filter(a => matchesAudience(a, viewer))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)
    })
    .slice(0, 3)

  return announcements.map(a => ({
    id: a.announcementId,
    title: a.title,
    priority: a.priority,
    date: a.publishedAt ?? a.createdAt ?? null,
  }))
}

// ─── Estado de compañía CGBVP (último snapshot) ─────────────────────
async function getCompanyStatus(): Promise<CompanyStatus | null> {
  const { Items = [] } = await ddb.send(new ScanCommand({
    TableName: TABLE.cgbvpStatus,
  }))
  const sorted = (Items as any[]).sort((a, b) =>
    (b.timestamp ?? '').localeCompare(a.timestamp ?? ''),
  )
  const latest = sorted[0]
  if (!latest) return null
  return {
    estado: latest.estado ?? 'operativo',
    timestamp: latest.timestamp ?? null,
  }
}

// ════════════════════════════════════════════════════════════════════
// ENTRADA PRINCIPAL — todas las consultas en paralelo, tolerante a fallos
// ════════════════════════════════════════════════════════════════════
export async function getDashboardData(viewer: DashboardViewer): Promise<DashboardData> {
  const [
    guard,
    openIncidents,
    pendingRequests,
    training,
    lastEmergency,
    announcements,
    companyStatus,
  ] = await Promise.all([
    safe('guardia', getGuardTonight, null),
    safe('incidencias', getOpenIncidents, 0),
    safe('requerimientos', getPendingRequests, 0),
    safe('capacitacion', () => getTrainingSnapshot(viewer.profileId), {
      activeCount: 0, completedCount: 0, percent: 0, featured: null,
    } as TrainingSnapshot),
    safe('emergencia', getLastEmergency, null),
    safe('anuncios', () => getLatestAnnouncements(viewer), [] as DashboardAnnouncement[]),
    safe('estado_compania', getCompanyStatus, null),
  ])

  return {
    guard,
    openIncidents,
    pendingRequests,
    training,
    lastEmergency,
    announcements,
    companyStatus,
  }
}
