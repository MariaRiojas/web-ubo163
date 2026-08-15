import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { GuardDormitory, GuardBunk, GuardBed, GuardReservation } from '@/lib/db/schema/guard-nocturna'
import type { Profile } from '@/lib/db/schema/profiles'

export type DormitoryGender = 'masculino' | 'femenino'

export interface BedWithReservation {
  bed: GuardBed
  reservation: {
    date: string
    profileId: string
    profileName: string
    profileGrade: string
    profileCodigoCgbvp: string | null
    status: string
  } | null
  isMine: boolean
}

export interface BunkWithBeds {
  bunkId: string
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
  bunks: BunkWithBeds[]
  looseBeds: BedWithReservation[]
}

export interface DayReservationStats {
  date: string
  totalBeds: number
  reserved: number
  isFull: boolean
  hasMineReservation: boolean
}

export interface EfectivoStats {
  nextReservation: {
    date: string
    bedNumber: number
    bunkLabel: string | null
    position: string | null
  } | null
  completedThisMonth: number
  pendingReservations: number
  hoursCreditedThisMonth: number
}

export interface JefeDashboardItem {
  date: string
  bedNumber: number
  bunkLabel: string | null
  position: string | null
  status: string
  profile: {
    profileId: string
    fullName: string
    grade: string
    codigoCgbvp: string | null
  }
}

export interface GuardiaData {
  dormitory: DormitorySnapshot
  selectedDate: string
  monthStats: DayReservationStats[]
  stats: EfectivoStats
  monthLabel: string
  monthYear: string
  jefeUpcoming: JefeDashboardItem[] | null
}

function monthBoundsIso(year: number, month1Based: number): [string, string] {
  const last = new Date(year, month1Based, 0).getDate()
  return [
    `${year}-${String(month1Based).padStart(2, '0')}-01`,
    `${year}-${String(month1Based).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  ]
}

const MESES_LARGOS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export async function getGuardiaData(
  profileId: string,
  opts: { gender: DormitoryGender; date?: string; canManage: boolean },
): Promise<GuardiaData | null> {
  const { gender, canManage } = opts
  const todayIso = new Date().toISOString().slice(0, 10)
  const selectedDate = opts.date ?? todayIso

  // Find dormitory for this gender
  const { Items: dormItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.guardDormitories,
    FilterExpression: 'gender = :g AND active = :t',
    ExpressionAttributeValues: { ':g': gender, ':t': true },
  }))
  const dormitory = (dormItems?.[0] ?? null) as GuardDormitory | null
  if (!dormitory) return null

  const dormId = dormitory.dormId

  // Bunks + Beds + Day reservations in parallel
  const [bunksResult, bedsResult, dayReservationsResult] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.guardBunks,
      KeyConditionExpression: 'dormId = :did',
      ExpressionAttributeValues: { ':did': dormId },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.guardBeds,
      FilterExpression: 'dormId = :did',
      ExpressionAttributeValues: { ':did': dormId },
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.guardReservations,
      KeyConditionExpression: '#d = :date',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':date': selectedDate },
    })),
  ])

  const bunks = ((bunksResult.Items ?? []) as GuardBunk[]).sort((a, b) =>
    a.displayOrder - b.displayOrder || a.label.localeCompare(b.label),
  )
  const beds = ((bedsResult.Items ?? []) as GuardBed[]).sort((a, b) => a.number - b.number)

  // Filter day reservations to only those in this dormitory
  const bedIdsToDormBed = new Map<string, GuardBed>()
  for (const bed of beds) bedIdsToDormBed.set(bed.bedId, bed)

  const dayReservations = ((dayReservationsResult.Items ?? []) as GuardReservation[]).filter(r =>
    r.dormId === dormId,
  )

  // Batch-get profile data for reservation holders
  const reservationProfileIds = [...new Set(dayReservations.map(r => r.profileId))]
  const profileMap = new Map<string, Profile>()
  if (reservationProfileIds.length > 0) {
    const chunkSize = 100
    for (let i = 0; i < reservationProfileIds.length; i += chunkSize) {
      const chunk = reservationProfileIds.slice(i, i + chunkSize)
      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: chunk.map(pid => ({ profileId: pid })),
            ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
          },
        },
      }))
      for (const p of Responses?.[TABLE.profiles] ?? []) {
        profileMap.set(p.profileId as string, p as Profile)
      }
    }
  }

  // Build reservation map by bedId
  const resByBedId = new Map<string, GuardReservation & { profile: Profile | undefined }>()
  for (const r of dayReservations) {
    resByBedId.set(r.bedId, { ...r, profile: profileMap.get(r.profileId) })
  }

  const bedToWithReservation = (bed: GuardBed): BedWithReservation => {
    const r = resByBedId.get(bed.bedId)
    if (!r) return { bed, reservation: null, isMine: false }
    return {
      bed,
      reservation: {
        date: r.date,
        profileId: r.profileId,
        profileName: r.profile?.fullName ?? r.profileId,
        profileGrade: r.profile?.grade ?? '',
        profileCodigoCgbvp: r.profile?.codigoCgbvp ?? null,
        status: r.status,
      },
      isMine: r.profileId === profileId,
    }
  }

  // Build bunk groups
  const bunksWithBeds: BunkWithBeds[] = bunks.map(b => ({
    bunkId: b.bunkId,
    label: b.label,
    displayOrder: b.displayOrder,
    notes: b.notes ?? null,
    beds: beds.filter(bed => bed.bunkId === b.bunkId).map(bedToWithReservation),
  }))
  const looseBeds = beds.filter(bed => !bed.bunkId).map(bedToWithReservation)

  const dormitorySnapshot: DormitorySnapshot = {
    id: dormId,
    name: dormitory.name,
    gender: dormitory.gender,
    notes: dormitory.notes ?? null,
    totalBeds: beds.length,
    bunks: bunksWithBeds,
    looseBeds,
  }

  // Monthly stats
  const selectedYear = parseInt(selectedDate.slice(0, 4))
  const selectedMonth = parseInt(selectedDate.slice(5, 7))
  const [firstOfMonth, lastOfMonth] = monthBoundsIso(selectedYear, selectedMonth)

  const { Items: monthResItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.guardReservations,
    FilterExpression: '#d >= :from AND #d <= :to AND dormId = :did AND #st <> :cancelled',
    ExpressionAttributeNames: { '#d': 'date', '#st': 'status' },
    ExpressionAttributeValues: { ':from': firstOfMonth, ':to': lastOfMonth, ':did': dormId, ':cancelled': 'cancelada' },
  }))
  const monthReservations = (monthResItems ?? []) as GuardReservation[]

  const reservationsByDate = new Map<string, { count: number; hasMine: boolean }>()
  for (const r of monthReservations) {
    const curr = reservationsByDate.get(r.date) ?? { count: 0, hasMine: false }
    curr.count++
    if (r.profileId === profileId) curr.hasMine = true
    reservationsByDate.set(r.date, curr)
  }

  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const availableBedsCount = beds.filter(b => b.status !== 'indisponible').length
  const monthStats: DayReservationStats[] = []
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

  // KPIs — use profileId-index GSI to query by profileId
  const realToday = new Date()
  const realYear = realToday.getFullYear()
  const realMonth = realToday.getMonth() + 1
  const [firstReal, lastReal] = monthBoundsIso(realYear, realMonth)

  const { Items: myResItems } = await ddb.send(new QueryCommand({
    TableName: TABLE.guardReservations,
    IndexName: 'profileId-index',
    KeyConditionExpression: 'profileId = :pid',
    ExpressionAttributeValues: { ':pid': profileId },
  }))
  const myReservations = (myResItems ?? []) as GuardReservation[]

  const completedThisMonth = myReservations.filter(r =>
    r.status === 'cumplida' && r.date >= firstReal && r.date <= lastReal,
  ).length
  const pendingReservations = myReservations.filter(r =>
    r.status === 'activa' && r.date >= todayIso,
  ).length

  const upcoming = myReservations.filter(r => r.status === 'activa' && r.date >= todayIso)
  upcoming.sort((a, b) => a.date.localeCompare(b.date))
  const nextRes = upcoming[0] ?? null

  let nextReservation: EfectivoStats['nextReservation'] = null
  if (nextRes) {
    const bed = bedIdsToDormBed.get(nextRes.bedId)
    const bunk = bed?.bunkId ? bunks.find(b => b.bunkId === bed.bunkId) : null
    nextReservation = {
      date: nextRes.date,
      bedNumber: bed?.number ?? 0,
      bunkLabel: bunk?.label ?? null,
      position: bed?.position ?? null,
    }
  }

  const stats: EfectivoStats = {
    nextReservation,
    completedThisMonth,
    pendingReservations,
    hoursCreditedThisMonth: completedThisMonth * 12,
  }

  // Jefe dashboard
  let jefeUpcoming: JefeDashboardItem[] | null = null
  if (canManage) {
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { Items: jefeResItems } = await ddb.send(new ScanCommand({
      TableName: TABLE.guardReservations,
      FilterExpression: '#d >= :from AND #d <= :to AND dormId = :did',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: {
        ':from': threeDaysAgo.toISOString().slice(0, 10),
        ':to': sevenDaysFromNow.toISOString().slice(0, 10),
        ':did': dormId,
      },
    }))
    const jefeReservations = (jefeResItems ?? []) as GuardReservation[]
    jefeReservations.sort((a, b) => a.date.localeCompare(b.date) || a.bedId.localeCompare(b.bedId))

    const jefeProfileIds = [...new Set(jefeReservations.map(r => r.profileId))]
    const jefeProfileMap = new Map<string, Profile>()
    if (jefeProfileIds.length > 0) {
      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: jefeProfileIds.map(pid => ({ profileId: pid })),
            ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
          },
        },
      }))
      for (const p of Responses?.[TABLE.profiles] ?? []) {
        jefeProfileMap.set(p.profileId as string, p as Profile)
      }
    }

    jefeUpcoming = jefeReservations.map(r => {
      const bed = bedIdsToDormBed.get(r.bedId)
      const bunk = bed?.bunkId ? bunks.find(b => b.bunkId === bed.bunkId) : null
      const profile = jefeProfileMap.get(r.profileId)
      return {
        date: r.date,
        bedNumber: bed?.number ?? 0,
        bunkLabel: bunk?.label ?? null,
        position: bed?.position ?? null,
        status: r.status,
        profile: {
          profileId: r.profileId,
          fullName: profile?.fullName ?? r.profileId,
          grade: profile?.grade ?? '',
          codigoCgbvp: profile?.codigoCgbvp ?? null,
        },
      }
    })
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
