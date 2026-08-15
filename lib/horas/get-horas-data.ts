import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import { HOUR_TYPES, type ServiceHour, type HourType } from '@/lib/db/schema/service-hours'

export interface MyHoursSummary {
  trimestre: string
  totalHoras: number
  guardias: number
  porTipo: Record<HourType, number>
}

export interface RecentHourItem {
  id: string
  date: string
  type: string
  hours: number
  description: string
  verified: boolean
}

export interface TeamMemberHours {
  profileId: string
  name: string
  grade: string
  hours: number
  guardias: number
}

export interface PendingVerificationItem {
  id: string
  profileId: string
  profileName: string
  date: string
  type: string
  hours: number
  description: string
  submittedAt: string
}

export interface HorasData {
  myHours: MyHoursSummary
  recentHours: RecentHourItem[]
  teamSummary: TeamMemberHours[]
  pendingVerification: PendingVerificationItem[]
}

interface HorasDataOptions {
  canViewAll: boolean
  canVerify: boolean
}

/** Trimestre actual: "T{n} {año}" + fecha ISO (YYYY-MM-DD) de inicio del trimestre */
function currentQuarter(date: Date = new Date()): { trimestre: string; startIso: string } {
  const quarter = Math.ceil((date.getMonth() + 1) / 3)
  const startMonth = (quarter - 1) * 3
  const start = new Date(date.getFullYear(), startMonth, 1)
  return {
    trimestre: `T${quarter} ${date.getFullYear()}`,
    startIso: start.toISOString().slice(0, 10),
  }
}

function emptyPorTipo(): Record<HourType, number> {
  return HOUR_TYPES.reduce((acc, t) => {
    acc[t] = 0
    return acc
  }, {} as Record<HourType, number>)
}

/** Datos reales de horas de servicio para /horas — trimestre actual del efectivo autenticado. */
export async function getHorasData(profileId: string, opts: HorasDataOptions): Promise<HorasData> {
  const { trimestre, startIso } = currentQuarter()

  // ── Mis horas del trimestre (Query por PK profileId, SK >= inicio trimestre) ──
  const { Items: myItemsRaw } = await ddb.send(new QueryCommand({
    TableName: TABLE.serviceHours,
    KeyConditionExpression: 'profileId = :pid AND sk >= :from',
    ExpressionAttributeValues: { ':pid': profileId, ':from': startIso },
  }))
  const myHourItems = (myItemsRaw ?? []) as ServiceHour[]

  const porTipo = emptyPorTipo()
  let totalHoras = 0
  let guardias = 0
  for (const h of myHourItems) {
    const val = Number(h.hours ?? 0)
    totalHoras += val
    if (h.type in porTipo) porTipo[h.type] += val
    if (h.type === 'guardia_nocturna') guardias += 1
  }

  const recentHours: RecentHourItem[] = [...myHourItems]
    .sort((a, b) => b.sk.localeCompare(a.sk))
    .slice(0, 25)
    .map(h => ({
      id: h.hourId,
      date: h.date,
      type: h.type,
      hours: Number(h.hours ?? 0),
      description: h.description ?? '',
      verified: Boolean(h.verifiedAt),
    }))

  const myHours: MyHoursSummary = {
    trimestre,
    totalHoras: Math.round(totalHoras * 100) / 100,
    guardias,
    porTipo,
  }

  let teamSummary: TeamMemberHours[] = []
  let pendingVerification: PendingVerificationItem[] = []

  if (opts.canViewAll || opts.canVerify) {
    // Scan de todas las horas del trimestre actual (tabla pequeña, uso interno de sección)
    const { Items: allItemsRaw } = await ddb.send(new ScanCommand({
      TableName: TABLE.serviceHours,
      FilterExpression: '#d >= :from',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':from': startIso },
    }))
    const allHours = (allItemsRaw ?? []) as ServiceHour[]

    if (opts.canViewAll) {
      const byProfile = new Map<string, { total: number; guardias: number }>()
      for (const h of allHours) {
        const entry = byProfile.get(h.profileId) ?? { total: 0, guardias: 0 }
        entry.total += Number(h.hours ?? 0)
        if (h.type === 'guardia_nocturna') entry.guardias += 1
        byProfile.set(h.profileId, entry)
      }

      if (byProfile.size > 0) {
        const teamProfileIds = [...byProfile.keys()]
        const { Responses } = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: teamProfileIds.map(pid => ({ profileId: pid })),
              ProjectionExpression: 'profileId, fullName, grade',
            },
          },
        }))
        const profiles = (Responses?.[TABLE.profiles] ?? []) as { profileId: string; fullName: string; grade: string }[]
        const profileMap = new Map(profiles.map(p => [p.profileId, p]))

        teamSummary = teamProfileIds
          .map(pid => {
            const entry = byProfile.get(pid)!
            const profile = profileMap.get(pid)
            return {
              profileId: pid,
              name: profile?.fullName ?? pid,
              grade: profile?.grade ?? '',
              hours: Math.round(entry.total * 100) / 100,
              guardias: entry.guardias,
            }
          })
          .sort((a, b) => b.hours - a.hours)
      }
    }

    if (opts.canVerify) {
      const pendingItems = allHours.filter(h => !h.verifiedAt)

      if (pendingItems.length > 0) {
        const pendingProfileIds = [...new Set(pendingItems.map(h => h.profileId))]
        const { Responses } = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: pendingProfileIds.map(pid => ({ profileId: pid })),
              ProjectionExpression: 'profileId, fullName',
            },
          },
        }))
        const nameMap = new Map<string, string>()
        for (const p of Responses?.[TABLE.profiles] ?? []) {
          nameMap.set(p.profileId as string, p.fullName as string)
        }

        pendingVerification = pendingItems
          .sort((a, b) => b.sk.localeCompare(a.sk))
          .map(h => ({
            id: h.hourId,
            profileId: h.profileId,
            profileName: nameMap.get(h.profileId) ?? h.profileId,
            date: h.date,
            type: h.type,
            hours: Number(h.hours ?? 0),
            description: h.description ?? '',
            submittedAt: h.createdAt,
          }))
      }
    }
  }

  return { myHours, recentHours, teamSummary, pendingVerification }
}
