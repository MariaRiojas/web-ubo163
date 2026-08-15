import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Profile } from '@/lib/db/schema/profiles'
import type { ServiceHour } from '@/lib/db/schema/service-hours'
import type { InternalRequest } from '@/lib/db/schema/internal-requests'

export interface ServiceHoursContributor {
  profileId: string
  fullName: string
  grade: string
  codigoCgbvp: string | null
  totalHours: number
  breakdown: {
    guardia_nocturna: number
    emergencia: number
    instruccion: number
    administrativo: number
    mantenimiento: number
    evento_institucional: number
    comision: number
  }
}

export interface PersonnelDistribution {
  byStatus: Record<string, number>
  byGrade: Record<string, number>
}

export interface PendingInternalRequest {
  id: string
  code: string
  type: string
  title: string
  priority: string
  status: string
  requesterName: string | null
  createdAt: string
}

export interface AdministracionExtraData {
  topContributors: ServiceHoursContributor[]
  totalHoursThisMonth: number
  personnelDistribution: PersonnelDistribution
  pendingInternalRequests: PendingInternalRequest[]
  stats: {
    activePersonnelCount: number
    totalHoursThisMonth: number
    pendingRequestsCount: number
    avgHoursPerPerson: number
  }
}

export async function getAdministracionExtraData(): Promise<AdministracionExtraData> {
  const nowDate = new Date()
  const firstOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
    .toISOString().slice(0, 10)

  // All profiles
  const { Items: profItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.profiles,
    ProjectionExpression: 'profileId, fullName, grade, #st, codigoCgbvp',
    ExpressionAttributeNames: { '#st': 'status' },
  }))
  const allProfiles = (profItems ?? []) as Profile[]

  // Service hours this month — scan by profileId from active profiles
  // We query by profileId (PK) for each active profile — use parallel queries for top N
  const activeProfiles = allProfiles.filter(p => p.status === 'activo' || p.status === 'reserva')

  const byProfile = new Map<string, { total: number; breakdown: ServiceHoursContributor['breakdown'] }>()

  // Batch query service hours for active profiles (parallel, max 20)
  const TOP = 30
  const profilesToQuery = activeProfiles.slice(0, 60)
  await Promise.all(profilesToQuery.map(async (p) => {
    const { Items } = await ddb.send(new QueryCommand({
      TableName: TABLE.serviceHours,
      KeyConditionExpression: 'profileId = :pid AND sk >= :from',
      ExpressionAttributeValues: {
        ':pid': p.profileId,
        ':from': firstOfMonth,
      },
      ProjectionExpression: 'hours, #t',
      ExpressionAttributeNames: { '#t': 'type' },
    }))
    const hours = (Items ?? []) as ServiceHour[]
    if (hours.length === 0) return
    const entry = {
      total: 0,
      breakdown: {
        guardia_nocturna: 0, emergencia: 0, instruccion: 0,
        administrativo: 0, mantenimiento: 0, evento_institucional: 0, comision: 0,
      } as ServiceHoursContributor['breakdown'],
    }
    for (const h of hours) {
      const val = Number(h.hours ?? 0)
      entry.total += val
      const key = h.type as keyof typeof entry.breakdown
      if (key in entry.breakdown) (entry.breakdown[key] as number) += val
    }
    if (entry.total > 0) byProfile.set(p.profileId, entry)
  }))

  const profileById = new Map(allProfiles.map(p => [p.profileId, p]))

  const topContributors: ServiceHoursContributor[] = activeProfiles
    .filter(p => byProfile.has(p.profileId))
    .map(p => {
      const entry = byProfile.get(p.profileId)!
      return {
        profileId: p.profileId,
        fullName: p.fullName,
        grade: p.grade,
        codigoCgbvp: p.codigoCgbvp ?? null,
        totalHours: Math.round(entry.total * 100) / 100,
        breakdown: entry.breakdown,
      }
    })
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 15)

  const totalHoursThisMonth = Math.round(
    Array.from(byProfile.values()).reduce((acc, e) => acc + e.total, 0) * 10,
  ) / 10

  const byStatus: Record<string, number> = {}
  const byGrade: Record<string, number> = {}
  for (const p of allProfiles) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    byGrade[p.grade] = (byGrade[p.grade] ?? 0) + 1
  }

  // Pending internal requests
  const { Items: reqItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.internalRequests,
    FilterExpression: '#st IN (:p, :a, :e)',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':p': 'pendiente', ':a': 'aprobada', ':e': 'en_proceso' },
    Limit: 20,
  }))
  const internalRows = ((reqItems ?? []) as InternalRequest[])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)

  const requesterIds = [...new Set(internalRows.map(r => r.requestedBy).filter(Boolean))]
  const requesterNames = new Map<string, string>()
  if (requesterIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: requesterIds.map(pid => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName',
        },
      },
    }))
    for (const p of Responses?.[TABLE.profiles] ?? []) {
      requesterNames.set(p.profileId as string, p.fullName as string)
    }
  }

  const pendingInternalRequests: PendingInternalRequest[] = internalRows.map(r => ({
    id: r.requestId,
    code: r.code,
    type: r.type,
    title: r.title,
    priority: r.priority,
    status: r.status,
    requesterName: r.requestedBy ? (requesterNames.get(r.requestedBy) ?? null) : null,
    createdAt: r.createdAt,
  }))

  const activeCount = activeProfiles.length

  return {
    topContributors,
    totalHoursThisMonth,
    personnelDistribution: { byStatus, byGrade },
    pendingInternalRequests,
    stats: {
      activePersonnelCount: activeCount,
      totalHoursThisMonth,
      pendingRequestsCount: pendingInternalRequests.length,
      avgHoursPerPerson: activeCount > 0
        ? Math.round((totalHoursThisMonth / activeCount) * 10) / 10
        : 0,
    },
  }
}
