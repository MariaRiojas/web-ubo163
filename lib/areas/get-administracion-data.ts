import 'server-only'
import { db } from '@/lib/db'
import { profiles, serviceHours, internalRequests } from '@/lib/db/schema'
import { eq, gte, sql, and, inArray, desc } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

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
  createdAt: Date
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

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

export async function getAdministracionExtraData(): Promise<AdministracionExtraData> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  // ── Horas de servicio del mes en curso ────────────────────────
  const hoursRows = await db
    .select({
      profileId: serviceHours.profileId,
      type: serviceHours.type,
      hours: serviceHours.hours,
    })
    .from(serviceHours)
    .where(gte(serviceHours.date, firstOfMonth))

  // Agrupar por perfil
  const byProfile = new Map<string, ServiceHoursContributor['breakdown'] & { total: number }>()
  for (const row of hoursRows) {
    const h = Number(row.hours)
    let entry = byProfile.get(row.profileId)
    if (!entry) {
      entry = {
        total: 0,
        guardia_nocturna: 0, emergencia: 0, instruccion: 0,
        administrativo: 0, mantenimiento: 0, evento_institucional: 0, comision: 0,
      }
      byProfile.set(row.profileId, entry)
    }
    entry.total += h
    const key = row.type as keyof typeof entry
    if (key in entry && key !== 'total') {
      (entry[key] as number) += h
    }
  }

  // Traer perfiles activos
  const activeProfiles = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      grade: profiles.grade,
      status: profiles.status,
      codigoCgbvp: profiles.codigoCgbvp,
    })
    .from(profiles)
    .where(inArray(profiles.status, ['activo', 'reserva']))
    .orderBy(profiles.fullName)

  // Top contribuidores (con horas este mes)
  const topContributors: ServiceHoursContributor[] = activeProfiles
    .filter((p) => byProfile.has(p.id))
    .map((p) => {
      const entry = byProfile.get(p.id)!
      const { total, ...breakdown } = entry
      return {
        profileId: p.id,
        fullName: p.fullName,
        grade: p.grade,
        codigoCgbvp: p.codigoCgbvp,
        totalHours: Math.round(total * 100) / 100,
        breakdown: breakdown as ServiceHoursContributor['breakdown'],
      }
    })
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 15)

  const totalHoursThisMonth = Array.from(byProfile.values()).reduce(
    (acc, e) => acc + e.total, 0,
  )

  // ── Distribución de personal ──────────────────────────────────
  const allProfiles = await db
    .select({
      grade: profiles.grade,
      status: profiles.status,
    })
    .from(profiles)

  const byStatus: Record<string, number> = {}
  const byGrade: Record<string, number> = {}
  for (const p of allProfiles) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    byGrade[p.grade] = (byGrade[p.grade] ?? 0) + 1
  }

  // ── Solicitudes internas pendientes ──────────────────────────
  const internalRows = await db
    .select({
      req: internalRequests,
      requesterName: profiles.fullName,
    })
    .from(internalRequests)
    .leftJoin(profiles, eq(internalRequests.requestedBy, profiles.id))
    .where(
      inArray(internalRequests.status, ['pendiente', 'aprobada', 'en_proceso']),
    )
    .orderBy(desc(internalRequests.createdAt))
    .limit(20)

  const pendingInternalRequests: PendingInternalRequest[] = internalRows.map((r) => ({
    id: r.req.id,
    code: r.req.code,
    type: r.req.type,
    title: r.req.title,
    priority: r.req.priority,
    status: r.req.status,
    requesterName: r.requesterName,
    createdAt: r.req.createdAt ?? new Date(),
  }))

  const activeCount = activeProfiles.length

  return {
    topContributors,
    totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
    personnelDistribution: { byStatus, byGrade },
    pendingInternalRequests,
    stats: {
      activePersonnelCount: activeCount,
      totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
      pendingRequestsCount: pendingInternalRequests.length,
      avgHoursPerPerson: activeCount > 0
        ? Math.round((totalHoursThisMonth / activeCount) * 10) / 10
        : 0,
    },
  }
}
