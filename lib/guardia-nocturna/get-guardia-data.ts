import 'server-only'
import { db } from '@/lib/db'
import {
  guardDormitories,
  guardBunks,
  guardBedsV2,
  guardReservations,
  profiles,
  type GuardBedV2,
  type GuardReservation,
  type Gender,
} from '@/lib/db/schema'
import { and, eq, gte, lte, desc, asc, sql } from 'drizzle-orm'

export type DormitoryGender = 'masculino' | 'femenino'

// ═══════════════════════════════════════════════════════════════════
// TIPOS DE SALIDA
// ═══════════════════════════════════════════════════════════════════

export interface BedWithReservation {
  bed: GuardBedV2
  reservation: {
    id: string
    profileId: string
    profileName: string
    profileGrade: string
    profileCodigoCgbvp: string | null
    status: string
  } | null
  /** true si es del usuario actual */
  isMine: boolean
}

export interface BunkWithBeds {
  id: string
  label: string
  displayOrder: number
  notes: string | null
  beds: BedWithReservation[]
}

export interface DormitorySnapshot {
  id: string
  name: string
  gender: DormitoryGender
  notes: string | null
  totalBeds: number
  /** Camarotes con sus camas — ordenados por displayOrder */
  bunks: BunkWithBeds[]
  /** Camas sueltas (sin camarote) — si existen */
  looseBeds: BedWithReservation[]
}

export interface DayReservationStats {
  date: string         // ISO yyyy-mm-dd
  totalBeds: number
  reserved: number
  isFull: boolean
  hasMineReservation: boolean
}

export interface EfectivoStats {
  nextReservation: {
    date: string                    // ISO
    bedNumber: number
    bunkLabel: string | null
    position: string | null
  } | null
  completedThisMonth: number
  pendingReservations: number
  hoursCreditedThisMonth: number
}

export interface JefeDashboardItem {
  id: string
  date: string
  bedNumber: number
  bunkLabel: string | null
  position: string | null
  status: string
  profile: {
    id: string
    fullName: string
    grade: string
    codigoCgbvp: string | null
  }
}

export interface GuardiaData {
  /** Dormitorio que corresponde al género del efectivo */
  dormitory: DormitorySnapshot
  /** Fecha seleccionada para la vista del efectivo (default: hoy) */
  selectedDate: string
  /** Estadísticas diarias del mes (para pintar el calendario) */
  monthStats: DayReservationStats[]
  /** KPIs del efectivo */
  stats: EfectivoStats
  /** Mes activo */
  monthLabel: string             // "Mayo · 2026"
  monthYear: string              // ISO "2026-05"
  /** Para el Jefe de Guardia (si aplica): reservas próximas */
  jefeUpcoming: JefeDashboardItem[] | null
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function monthBoundsIso(year: number, month1Based: number): [string, string] {
  const first = new Date(year, month1Based - 1, 1)
  const last = new Date(year, month1Based, 0)
  return [
    first.toISOString().slice(0, 10),
    last.toISOString().slice(0, 10),
  ]
}

const MESES_LARGOS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ═══════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Trae todos los datos para la página de guardia nocturna desde el punto
 * de vista del efectivo. Si el usuario tiene manage_* para su género, el
 * server action luego puede mostrar también la vista del Jefe de Guardia.
 *
 * @param profileId ID del efectivo actual
 * @param opts.gender Género a consultar (normalmente viene de profile.gender)
 * @param opts.date Fecha seleccionada (ISO) — default hoy
 * @param opts.canManage Si el usuario es Jefe de Guardia de ese género
 */
export async function getGuardiaData(
  profileId: string,
  opts: {
    gender: DormitoryGender
    date?: string
    canManage: boolean
  },
): Promise<GuardiaData | null> {
  const { gender, canManage } = opts
  const todayIso = new Date().toISOString().slice(0, 10)
  const selectedDate = opts.date ?? todayIso

  // ── Dormitorio del género ────────────────────────────────────
  const dormitory = await db.query.guardDormitories.findFirst({
    where: and(eq(guardDormitories.gender, gender), eq(guardDormitories.active, true)),
  })
  if (!dormitory) return null

  // ── Camarotes ordenados ──────────────────────────────────────
  const bunks = await db
    .select()
    .from(guardBunks)
    .where(eq(guardBunks.dormitoryId, dormitory.id))
    .orderBy(asc(guardBunks.displayOrder), asc(guardBunks.label))

  // ── Camas del dormitorio ordenadas por número ────────────────
  const beds = await db
    .select()
    .from(guardBedsV2)
    .where(eq(guardBedsV2.dormitoryId, dormitory.id))
    .orderBy(asc(guardBedsV2.number))

  // ── Reservas del día seleccionado (con datos del efectivo) ───
  const dayReservations = await db
    .select({
      reservation: guardReservations,
      profile: {
        id: profiles.id,
        fullName: profiles.fullName,
        grade: profiles.grade,
        codigoCgbvp: profiles.codigoCgbvp,
      },
    })
    .from(guardReservations)
    .innerJoin(profiles, eq(guardReservations.profileId, profiles.id))
    .where(
      and(
        eq(guardReservations.date, selectedDate),
        sql`${guardReservations.bedId} IN (
          SELECT id FROM ${guardBedsV2} WHERE ${guardBedsV2.dormitoryId} = ${dormitory.id}
        )`,
      ),
    )

  const resByBedId = new Map<string, typeof dayReservations[number]>()
  for (const r of dayReservations) {
    resByBedId.set(r.reservation.bedId, r)
  }

  // ── Componer las camas con info de reserva ───────────────────
  const bedToWithReservation = (bed: GuardBedV2): BedWithReservation => {
    const r = resByBedId.get(bed.id)
    if (!r) return { bed, reservation: null, isMine: false }
    return {
      bed,
      reservation: {
        id: r.reservation.id,
        profileId: r.profile.id,
        profileName: r.profile.fullName,
        profileGrade: r.profile.grade,
        profileCodigoCgbvp: r.profile.codigoCgbvp,
        status: r.reservation.status,
      },
      isMine: r.profile.id === profileId,
    }
  }

  // Agrupar camas por camarote (respetando displayOrder)
  const bunksWithBeds: BunkWithBeds[] = bunks.map((b) => ({
    id: b.id,
    label: b.label,
    displayOrder: b.displayOrder,
    notes: b.notes,
    beds: beds
      .filter((bed) => bed.bunkId === b.id)
      .map(bedToWithReservation),
  }))

  const looseBeds = beds
    .filter((bed) => bed.bunkId === null)
    .map(bedToWithReservation)

  const dormitorySnapshot: DormitorySnapshot = {
    id: dormitory.id,
    name: dormitory.name,
    gender: dormitory.gender as DormitoryGender,
    notes: dormitory.notes,
    totalBeds: beds.length,
    bunks: bunksWithBeds,
    looseBeds,
  }

  // ── Estadísticas diarias del mes (para calendar) ─────────────
  const selectedYear = new Date(selectedDate).getFullYear()
  const selectedMonth = new Date(selectedDate).getMonth() + 1
  const [firstOfMonth, lastOfMonth] = monthBoundsIso(selectedYear, selectedMonth)

  const monthReservations = await db
    .select({
      date: guardReservations.date,
      bedId: guardReservations.bedId,
      profileId: guardReservations.profileId,
      status: guardReservations.status,
    })
    .from(guardReservations)
    .where(
      and(
        gte(guardReservations.date, firstOfMonth),
        lte(guardReservations.date, lastOfMonth),
        sql`${guardReservations.bedId} IN (
          SELECT id FROM ${guardBedsV2} WHERE ${guardBedsV2.dormitoryId} = ${dormitory.id}
        )`,
        sql`${guardReservations.status} != 'cancelada'`,
      ),
    )

  // Agrupar por día
  const reservationsByDate = new Map<string, { count: number; hasMine: boolean }>()
  for (const r of monthReservations) {
    const curr = reservationsByDate.get(r.date) ?? { count: 0, hasMine: false }
    curr.count++
    if (r.profileId === profileId) curr.hasMine = true
    reservationsByDate.set(r.date, curr)
  }

  // Construir un array con todas las fechas del mes
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const monthStats: DayReservationStats[] = []
  const availableBedsCount = beds.filter((b) => b.status !== 'indisponible').length
  for (let day = 1; day <= lastDayOfMonth; day++) {
    const dateIso = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const stats = reservationsByDate.get(dateIso) ?? { count: 0, hasMine: false }
    monthStats.push({
      date: dateIso,
      totalBeds: availableBedsCount,
      reserved: stats.count,
      isFull: availableBedsCount > 0 && stats.count >= availableBedsCount,
      hasMineReservation: stats.hasMine,
    })
  }

  // ── KPIs del efectivo ────────────────────────────────────────
  // Próxima reserva del efectivo
  const upcomingMine = await db
    .select({
      reservation: guardReservations,
      bed: guardBedsV2,
      bunk: guardBunks,
    })
    .from(guardReservations)
    .innerJoin(guardBedsV2, eq(guardReservations.bedId, guardBedsV2.id))
    .leftJoin(guardBunks, eq(guardBedsV2.bunkId, guardBunks.id))
    .where(
      and(
        eq(guardReservations.profileId, profileId),
        gte(guardReservations.date, todayIso),
        sql`${guardReservations.status} IN ('activa')`,
      ),
    )
    .orderBy(asc(guardReservations.date))
    .limit(1)

  const nextRes = upcomingMine[0]
  const nextReservation = nextRes
    ? {
        date: nextRes.reservation.date,
        bedNumber: nextRes.bed.number,
        bunkLabel: nextRes.bunk?.label ?? null,
        position: nextRes.bed.position,
      }
    : null

  // Cumplidas en el mes en curso (usa la fecha real de hoy, no la seleccionada)
  const realToday = new Date()
  const realYear = realToday.getFullYear()
  const realMonth = realToday.getMonth() + 1
  const [firstReal, lastReal] = monthBoundsIso(realYear, realMonth)

  const [completedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(guardReservations)
    .where(
      and(
        eq(guardReservations.profileId, profileId),
        gte(guardReservations.date, firstReal),
        lte(guardReservations.date, lastReal),
        eq(guardReservations.status, 'cumplida'),
      ),
    )

  // Pendientes (reservas activas futuras o del día)
  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(guardReservations)
    .where(
      and(
        eq(guardReservations.profileId, profileId),
        gte(guardReservations.date, todayIso),
        eq(guardReservations.status, 'activa'),
      ),
    )

  const completedThisMonth = Number(completedRow?.count ?? 0)
  const pendingReservations = Number(pendingRow?.count ?? 0)
  // Cada guardia nocturna = 12 horas (20h–08h). Horas acreditadas del mes.
  const hoursCreditedThisMonth = completedThisMonth * 12

  const stats: EfectivoStats = {
    nextReservation,
    completedThisMonth,
    pendingReservations,
    hoursCreditedThisMonth,
  }

  // ── Vista del Jefe de Guardia ────────────────────────────────
  let jefeUpcoming: JefeDashboardItem[] | null = null
  if (canManage) {
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const sevenDaysIso = sevenDaysFromNow.toISOString().slice(0, 10)

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoIso = threeDaysAgo.toISOString().slice(0, 10)

    const rows = await db
      .select({
        reservation: guardReservations,
        bed: guardBedsV2,
        bunk: guardBunks,
        profile: {
          id: profiles.id,
          fullName: profiles.fullName,
          grade: profiles.grade,
          codigoCgbvp: profiles.codigoCgbvp,
        },
      })
      .from(guardReservations)
      .innerJoin(guardBedsV2, eq(guardReservations.bedId, guardBedsV2.id))
      .leftJoin(guardBunks, eq(guardBedsV2.bunkId, guardBunks.id))
      .innerJoin(profiles, eq(guardReservations.profileId, profiles.id))
      .where(
        and(
          eq(guardBedsV2.dormitoryId, dormitory.id),
          gte(guardReservations.date, threeDaysAgoIso),
          lte(guardReservations.date, sevenDaysIso),
        ),
      )
      .orderBy(asc(guardReservations.date), asc(guardBedsV2.number))

    jefeUpcoming = rows.map((r) => ({
      id: r.reservation.id,
      date: r.reservation.date,
      bedNumber: r.bed.number,
      bunkLabel: r.bunk?.label ?? null,
      position: r.bed.position,
      status: r.reservation.status,
      profile: r.profile,
    }))
  }

  return {
    dormitory: dormitorySnapshot,
    selectedDate,
    monthStats,
    stats,
    monthLabel: `${MESES_LARGOS[selectedMonth]} · ${selectedYear}`,
    monthYear: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
    jefeUpcoming,
  }
}
