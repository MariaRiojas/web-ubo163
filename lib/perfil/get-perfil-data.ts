import 'server-only'
import { ddb, TABLE, GetCommand, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Profile } from '@/lib/db/schema/profiles'
import type { CgbvpAttendance } from '@/lib/db/schema/cgbvp'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Course, TrainingProgress } from '@/lib/db/schema/training'
import type { Emergency } from '@/lib/db/schema/emergencies'
import { MIN_HOURS_PER_QUARTER } from '@/lib/cgbvp/requirements'
import { GRADE_HIERARCHY, type Grade } from '@/lib/cgbvp/grades'

export interface TrimesterSummary {
  year: number
  quarter: 1 | 2 | 3 | 4
  quarterLabel: string
  monthsIso: string[]
  hoursAccumulated: number
  hoursTarget: number
  hoursRemaining: number
  percentage: number
  daysRemaining: number
  projection: number
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
  canApplyFrom: string | null
}

export interface PerfilData {
  profile: Profile
  enTurno: boolean
  coursesCompletedCount: number
  coursesInProgressCount: number
  totalHours: number
  trimester: TrimesterSummary
  attendanceRecent: CgbvpAttendance[]
  recentEmergencies: {
    id: string
    numeroParte: string
    tipo: string | null
    tipoCodigo: 'incendio' | 'medica' | 'rescate' | 'otro'
    fechaDespacho: string | null
  }[]
  equipment: InventoryItem[]
  equipmentCount: number
  equipmentNearReplacement: number
  enrolledCourses: (TrainingProgress & { course: Course })[]
  statusHistory: []
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

function computeNextGrade(params: {
  currentGrade: Grade
  joinDate: string | null
  totalHours: number
  esbasDone: boolean
}): NextGradeInfo {
  const { currentGrade, joinDate, totalHours, esbasDone } = params
  const idx = GRADE_HIERARCHY.indexOf(currentGrade)
  if (idx === -1 || idx === GRADE_HIERARCHY.length - 1) {
    return { nextGrade: null, nextGradeLabel: null, requirements: [], canApplyFrom: null }
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
  const YEARS_IN_GRADE: Record<Grade, number> = {
    aspirante: 1, seccionario: 3, subteniente: 4, teniente: 5, capitan: 5,
    teniente_brigadier: 5, brigadier: 5, brigadier_mayor: 5, brigadier_general: 99,
  }
  const MIN_HOURS_ACCUMULATED: Record<Grade, number> = {
    aspirante: 120, seccionario: 600, subteniente: 1200, teniente: 2000, capitan: 3200,
    teniente_brigadier: 4400, brigadier: 5600, brigadier_mayor: 6800, brigadier_general: 99999,
  }
  const yearsRequired = YEARS_IN_GRADE[currentGrade] ?? 3
  const hoursRequired = MIN_HOURS_ACCUMULATED[currentGrade] ?? 600
  const joinMs = joinDate ? new Date(joinDate).getTime() : null
  const yearsInGrade = joinMs ? (Date.now() - joinMs) / (1000 * 60 * 60 * 24 * 365.25) : 0
  const yearsMet = yearsInGrade >= yearsRequired
  const hoursMet = totalHours >= hoursRequired
  const canApplyFrom = joinMs
    ? new Date(joinMs + yearsRequired * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null
  return {
    nextGrade: next,
    nextGradeLabel: GRADE_LABELS_ES[next],
    canApplyFrom,
    requirements: [
      {
        label: `${yearsRequired} años en el grado actual`,
        met: yearsMet,
        detail: yearsMet ? `✓ ${Math.floor(yearsInGrade)} años cumplidos` : `${yearsInGrade.toFixed(1)} años`,
      },
      {
        label: `${hoursRequired} horas acumuladas`,
        met: hoursMet,
        detail: hoursMet ? `✓ ${totalHours} h` : `${totalHours} / ${hoursRequired} h`,
      },
      { label: 'ESBAS aprobado', met: esbasDone, detail: esbasDone ? '✓ completado' : 'pendiente' },
    ],
  }
}

export async function getPerfilData(profileId: string): Promise<PerfilData> {
  const { Item: profileItem } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId },
  }))
  if (!profileItem) throw new Error(`Profile ${profileId} no encontrado`)
  const profile = profileItem as Profile

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromDate = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const [
    attRecentResult,
    allAttResult,
    emgResult,
    eqResult,
    progResult,
  ] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.cgbvpAttendance,
      KeyConditionExpression: 'profileId = :pid AND #d >= :from',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':pid': profileId, ':from': fromDate },
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.cgbvpAttendance,
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
      ProjectionExpression: 'horasAcumuladas',
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.emergencies,
      FilterExpression: 'alMandoId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
      Limit: 50,
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.inventory,
      FilterExpression: 'assignedProfileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.trainingProgress,
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    })),
  ])

  const attendanceRecent = ((attRecentResult.Items ?? []) as CgbvpAttendance[])
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)

  const totalHours = Math.round(
    ((allAttResult.Items ?? []) as CgbvpAttendance[]).reduce((acc, r) => acc + (r.horasAcumuladas ?? 0), 0) * 10,
  ) / 10

  const emgAll = (emgResult.Items ?? []) as Emergency[]
  emgAll.sort((a, b) => (b.fechaDespacho ?? '').localeCompare(a.fechaDespacho ?? ''))
  const recentEmergencies = emgAll.slice(0, 5).map(e => ({
    id: e.emergencyId,
    numeroParte: e.numeroParte,
    tipo: e.tipo ?? null,
    tipoCodigo: mapTipoEmergencia(e.tipo ?? null),
    fechaDespacho: e.fechaDespacho ?? null,
  }))

  const equipment = (eqResult.Items ?? []) as InventoryItem[]
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
  const sixMonthsIso = sixMonthsFromNow.toISOString().slice(0, 10)
  const equipmentNearReplacement = equipment.filter(e =>
    e.endOfLifeDate && e.endOfLifeDate < sixMonthsIso,
  ).length

  const enrollments = (progResult.Items ?? []) as TrainingProgress[]
  const courseIds = [...new Set(enrollments.map(e => e.courseId))]
  const coursesById = new Map<string, Course>()
  if (courseIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.trainingCourses]: { Keys: courseIds.map(id => ({ courseId: id })) },
      },
    }))
    for (const c of Responses?.[TABLE.trainingCourses] ?? []) {
      coursesById.set(c.courseId as string, c as Course)
    }
  }

  const enrolledCourses = enrollments
    .filter(e => coursesById.has(e.courseId))
    .map(e => ({ ...e, course: coursesById.get(e.courseId)! }))
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))

  const coursesCompletedCount = enrolledCourses.filter(e => e.status === 'completada').length
  const coursesInProgressCount = enrolledCourses.filter(e => e.status === 'activa').length
  const esbasDone = enrolledCourses.some(e => e.course.category === 'esbas' && e.status === 'completada')

  // Trimester calculation
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const quarter = quarterFromMonth(currentMonth)
  const [qM1, _qM2, qM3] = quarterMonths(quarter)

  const quarterRows = attendanceRecent.filter(a => a.anio === year && a.mes >= qM1 && a.mes <= qM3)
  const hoursAccumulated = quarterRows.reduce((acc, r) => acc + (r.horasAcumuladas ?? 0), 0)
  const grade = profile.grade as Grade
  const hoursTarget = MIN_HOURS_PER_QUARTER[grade] ?? 120
  const hoursRemaining = Math.max(0, hoursTarget - hoursAccumulated)
  const percentage = hoursTarget > 0 ? Math.min(100, Math.round((hoursAccumulated / hoursTarget) * 100)) : 0

  const lastDayOfQuarter = new Date(year, qM3, 0)
  const daysRemaining = Math.max(0, Math.ceil((lastDayOfQuarter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const firstDayOfQuarter = new Date(year, qM1 - 1, 1)
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - firstDayOfQuarter.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDaysQuarter = daysElapsed + daysRemaining
  const projection = Math.round((hoursAccumulated / daysElapsed) * totalDaysQuarter)

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
    status: projection >= hoursTarget ? 'al_dia' : projection >= hoursTarget * 0.8 ? 'riesgo' : 'incumple',
  }

  const nextGrade = computeNextGrade({
    currentGrade: grade,
    joinDate: profile.joinDate ?? null,
    totalHours,
    esbasDone,
  })

  return {
    profile,
    enTurno: false,
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
    statusHistory: [],
    nextGrade,
  }
}
