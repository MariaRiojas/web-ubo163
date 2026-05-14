import 'server-only'
import { db } from '@/lib/db'
import {
  profiles,
  cgbvpAttendance,
  cgbvpStatusHistory,
  emergencies,
  inventory,
  courses,
  courseEnrollments,
} from '@/lib/db/schema'
import { eq, desc, and, gte, or, lte, count, sql } from 'drizzle-orm'
import { MIN_HOURS_PER_QUARTER } from '@/lib/cgbvp/requirements'
import { GRADE_HIERARCHY, type Grade } from '@/lib/cgbvp/grades'

export type Profile = typeof profiles.$inferSelect
export type AttendanceRow = typeof cgbvpAttendance.$inferSelect
export type InventoryRow = typeof inventory.$inferSelect
export type CourseRow = typeof courses.$inferSelect
export type EnrollmentRow = typeof courseEnrollments.$inferSelect
export type StatusHistoryRow = typeof cgbvpStatusHistory.$inferSelect

export interface TrimesterSummary {
  year: number
  quarter: 1 | 2 | 3 | 4
  quarterLabel: string            // "2° trimestre 2026 · abril a junio"
  monthsIso: string[]             // ["2026-04", "2026-05", "2026-06"]
  hoursAccumulated: number
  hoursTarget: number
  hoursRemaining: number
  percentage: number              // 0-100
  daysRemaining: number
  projection: number              // proyección lineal al cierre
  status: 'al_dia' | 'riesgo' | 'incumple'
}

export interface NextGradeInfo {
  nextGrade: Grade | null
  nextGradeLabel: string | null
  requirements: {
    label: string
    met: boolean
    detail: string
  }[]
  canApplyFrom: string | null     // ISO date "2027-04-01"
}

export interface PerfilData {
  profile: Profile
  // KPIs generales
  enTurno: boolean
  coursesCompletedCount: number
  coursesInProgressCount: number
  totalHours: number
  // Trimestre actual (para card "Historial operativo")
  trimester: TrimesterSummary
  // Historial mensual ordenado desc (últimos 12 meses)
  attendanceRecent: AttendanceRow[]
  // Últimas emergencias donde fue miembro del parte
  recentEmergencies: {
    id: number
    numeroParte: string | null
    tipo: string | null
    tipoCodigo: 'incendio' | 'medica' | 'rescate' | 'otro'
    fechaDespacho: Date | null
  }[]
  // Equipos asignados (inventario.assignedProfileId = this.profile.id)
  equipment: InventoryRow[]
  equipmentCount: number
  equipmentNearReplacement: number
  // Cursos completados y en progreso con datos del catálogo
  enrolledCourses: (EnrollmentRow & { course: CourseRow })[]
  // Historial de grados (para timeline de ascensos)
  statusHistory: StatusHistoryRow[]
  // Próximo ascenso posible
  nextGrade: NextGradeInfo
}

const MONTH_NAMES_ES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function quarterFromMonth(month1Based: number): 1 | 2 | 3 | 4 {
  if (month1Based <= 3) return 1
  if (month1Based <= 6) return 2
  if (month1Based <= 9) return 3
  return 4
}

function quarterMonths(q: 1 | 2 | 3 | 4): [number, number, number] {
  return [q * 3 - 2, q * 3 - 1, q * 3]
}

function buildTrimesterLabel(q: 1 | 2 | 3 | 4, year: number): string {
  const [m1, _m2, m3] = quarterMonths(q)
  const ordinal = ['', '1°', '2°', '3°', '4°'][q]
  return `${ordinal} trimestre ${year} · ${MONTH_NAMES_ES[m1]} a ${MONTH_NAMES_ES[m3]}`
}

/** Calcula el tipo de emergencia a partir del campo libre. */
function mapTipoEmergencia(tipo: string | null): 'incendio' | 'medica' | 'rescate' | 'otro' {
  if (!tipo) return 'otro'
  const t = tipo.toLowerCase()
  if (t.includes('incendio') || t.includes('fuego') || t.includes('quema')) return 'incendio'
  if (t.includes('médica') || t.includes('medica') || t.includes('paramédic') || t.includes('parto'))
    return 'medica'
  if (t.includes('rescate') || t.includes('colapso') || t.includes('ahog') || t.includes('veh'))
    return 'rescate'
  return 'otro'
}

/** Calcula la info del próximo ascenso según NDR. */
function computeNextGrade(params: {
  currentGrade: Grade
  joinDate: Date | null
  totalHours: number
  esbasDone: boolean
}): NextGradeInfo {
  const { currentGrade, joinDate, totalHours, esbasDone } = params
  const idx = GRADE_HIERARCHY.indexOf(currentGrade)
  if (idx === -1 || idx === GRADE_HIERARCHY.length - 1) {
    return {
      nextGrade: null,
      nextGradeLabel: null,
      requirements: [],
      canApplyFrom: null,
    }
  }
  const next = GRADE_HIERARCHY[idx + 1]
  const GRADE_LABELS_ES: Record<Grade, string> = {
    aspirante: 'Aspirante',
    seccionario: 'Seccionario',
    subteniente: 'Subteniente',
    teniente: 'Teniente',
    capitan: 'Capitán',
    teniente_brigadier: 'Teniente Brigadier',
    brigadier: 'Brigadier',
    brigadier_mayor: 'Brigadier Mayor',
    brigadier_general: 'Brigadier General',
  }

  // Años mínimos en grado actual según NDR
  const YEARS_IN_GRADE: Record<Grade, number> = {
    aspirante: 1,
    seccionario: 3,
    subteniente: 4,
    teniente: 5,
    capitan: 5,
    teniente_brigadier: 5,
    brigadier: 5,
    brigadier_mayor: 5,
    brigadier_general: 99,
  }
  // Horas mínimas acumuladas (aproximación — la NDR detalla más)
  const MIN_HOURS_ACCUMULATED: Record<Grade, number> = {
    aspirante: 120,
    seccionario: 600,
    subteniente: 1200,
    teniente: 2000,
    capitan: 3200,
    teniente_brigadier: 4400,
    brigadier: 5600,
    brigadier_mayor: 6800,
    brigadier_general: 99999,
  }

  const yearsRequired = YEARS_IN_GRADE[currentGrade] ?? 3
  const hoursRequired = MIN_HOURS_ACCUMULATED[currentGrade] ?? 600

  const yearsInGrade = joinDate
    ? (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : 0
  const yearsMet = yearsInGrade >= yearsRequired
  const hoursMet = totalHours >= hoursRequired

  // Fecha mínima para postular
  const canApplyFrom = joinDate
    ? new Date(joinDate.getTime() + yearsRequired * 365.25 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    : null

  return {
    nextGrade: next,
    nextGradeLabel: GRADE_LABELS_ES[next],
    canApplyFrom,
    requirements: [
      {
        label: `${yearsRequired} años en el grado actual`,
        met: yearsMet,
        detail: yearsMet
          ? `✓ ${Math.floor(yearsInGrade)} años cumplidos`
          : `${yearsInGrade.toFixed(1)} años`,
      },
      {
        label: `${hoursRequired} horas acumuladas`,
        met: hoursMet,
        detail: hoursMet ? `✓ ${totalHours} h` : `${totalHours} / ${hoursRequired} h`,
      },
      {
        label: 'ESBAS aprobado',
        met: esbasDone,
        detail: esbasDone ? '✓ completado' : 'pendiente',
      },
    ],
  }
}

/**
 * Obtiene todos los datos del perfil para el legajo institucional.
 * Un único call server-side; devuelve shape plano para el componente cliente.
 */
export async function getPerfilData(profileId: string): Promise<PerfilData> {
  // ── Profile ────────────────────────────────────────────────────
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  })
  if (!profile) {
    throw new Error(`Profile ${profileId} no encontrado`)
  }

  // ── Attendance de los últimos 12 meses ─────────────────────────
  const attendanceRecent = await db
    .select()
    .from(cgbvpAttendance)
    .where(eq(cgbvpAttendance.profileId, profileId))
    .orderBy(desc(cgbvpAttendance.anio), desc(cgbvpAttendance.mes))
    .limit(12)

  // Total acumulado de horas (todo el historial)
  const totalHoursResult = await db
    .select({
      total: sql<number>`coalesce(sum(${cgbvpAttendance.horasAcumuladas}), 0)`,
    })
    .from(cgbvpAttendance)
    .where(eq(cgbvpAttendance.profileId, profileId))
  const totalHours = Number(totalHoursResult[0]?.total ?? 0)

  // ── Trimestre actual ───────────────────────────────────────────
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const quarter = quarterFromMonth(currentMonth)
  const [qM1, _qM2, qM3] = quarterMonths(quarter)

  // Horas del trimestre actual sumando los 3 meses
  const quarterRows = attendanceRecent.filter(
    (a) => a.anio === year && a.mes >= qM1 && a.mes <= qM3,
  )
  const hoursAccumulated = quarterRows.reduce(
    (acc, r) => acc + (r.horasAcumuladas ?? 0),
    0,
  )

  const grade = profile.grade as Grade
  const hoursTarget = MIN_HOURS_PER_QUARTER[grade] ?? 120
  const hoursRemaining = Math.max(0, hoursTarget - hoursAccumulated)
  const percentage = hoursTarget > 0
    ? Math.min(100, Math.round((hoursAccumulated / hoursTarget) * 100))
    : 0

  // Días hasta fin de trimestre
  const lastDayOfQuarter = new Date(year, qM3, 0)  // último día del mes qM3
  const daysRemaining = Math.max(
    0,
    Math.ceil((lastDayOfQuarter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  )
  // Días transcurridos del trimestre
  const firstDayOfQuarter = new Date(year, qM1 - 1, 1)
  const daysElapsed = Math.max(
    1,
    Math.ceil((now.getTime() - firstDayOfQuarter.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const totalDaysQuarter = daysElapsed + daysRemaining
  const projection = Math.round((hoursAccumulated / daysElapsed) * totalDaysQuarter)

  const trimesterStatus: TrimesterSummary['status'] =
    projection >= hoursTarget ? 'al_dia'
      : projection >= hoursTarget * 0.8 ? 'riesgo'
      : 'incumple'

  const trimester: TrimesterSummary = {
    year,
    quarter,
    quarterLabel: buildTrimesterLabel(quarter, year),
    monthsIso: [
      `${year}-${String(qM1).padStart(2, '0')}`,
      `${year}-${String(_qM2).padStart(2, '0')}`,
      `${year}-${String(qM3).padStart(2, '0')}`,
    ],
    hoursAccumulated,
    hoursTarget,
    hoursRemaining,
    percentage,
    daysRemaining,
    projection,
    status: trimesterStatus,
  }

  // ── Emergencias recientes donde el profile fue miembro de la dotación ──
  // Simplificación: usar alMandoId o emergencyCrewMembers. Por ahora usamos alMandoId.
  const recentEmerg = await db
    .select({
      id: emergencies.id,
      numeroParte: emergencies.numeroParte,
      tipo: emergencies.tipo,
      fechaDespacho: emergencies.fechaDespacho,
    })
    .from(emergencies)
    .where(eq(emergencies.alMandoId, profileId))
    .orderBy(desc(emergencies.fechaDespacho))
    .limit(5)

  const recentEmergencies = recentEmerg.map((e) => ({
    ...e,
    tipoCodigo: mapTipoEmergencia(e.tipo),
  }))

  // ── Equipos asignados ──────────────────────────────────────────
  const equipment = await db
    .select()
    .from(inventory)
    .where(eq(inventory.assignedProfileId, profileId))
    .orderBy(desc(inventory.createdAt))

  // Contamos los que vencen en menos de 6 meses
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
  const equipmentNearReplacement = equipment.filter((e) => {
    if (e.endOfLifeDate) {
      return new Date(e.endOfLifeDate) < sixMonthsFromNow
    }
    return false
  }).length

  // ── Cursos inscritos ───────────────────────────────────────────
  const enrolled = await db
    .select({
      enrollment: courseEnrollments,
      course: courses,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courseEnrollments.profileId, profileId))
    .orderBy(desc(courseEnrollments.enrolledAt))

  const enrolledCourses = enrolled.map((e) => ({ ...e.enrollment, course: e.course }))
  const coursesCompletedCount = enrolledCourses.filter((e) => e.status === 'completada').length
  const coursesInProgressCount = enrolledCourses.filter((e) => e.status === 'activa').length
  const esbasDone = enrolledCourses.some(
    (e) => e.course.category === 'esbas' && e.status === 'completada',
  )

  // ── Historial de grados (timeline de ascensos) ─────────────────
  const statusHistory = await db
    .select()
    .from(cgbvpStatusHistory)
    .where(eq(cgbvpStatusHistory.profileId, profileId))
    .orderBy(desc(cgbvpStatusHistory.createdAt))
    .limit(20)

  // ── Próximo grado ──────────────────────────────────────────────
  const nextGrade = computeNextGrade({
    currentGrade: grade,
    joinDate: profile.joinDate ? new Date(profile.joinDate) : null,
    totalHours,
    esbasDone,
  })

  // ── En turno ahora ─────────────────────────────────────────────
  // (heurística simple — el ERP ya tiene cgbvpShiftAttendance; por performance
  // dejamos esto en false para la primera versión del perfil, la pantalla
  // "mi-compania" ya resuelve esto con más precisión)
  const enTurno = false

  return {
    profile,
    enTurno,
    coursesCompletedCount,
    coursesInProgressCount,
    totalHours,
    trimester,
    attendanceRecent,
    recentEmergencies,
    equipment,
    equipmentCount: equipment.length,
    equipmentNearReplacement,
    enrolledCourses,
    statusHistory,
    nextGrade,
  }
}
