import 'server-only'
import { db } from '@/lib/db'
import {
  emergencies,
  emergencyVehicles,
  emergencyTypes,
  profiles,
  serviceHours,
  guardReservations,
  incidents,
  requests,
} from '@/lib/db/schema'
import { eq, desc, gte, sql, and, or, count } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface RecentEmergency {
  id: number
  numeroParte: string
  tipo: string | null
  tipoDescripcion: string | null
  estado: string | null
  fechaDespacho: Date | null
  direccion: string | null
  distrito: string | null
  alMandoTexto: string | null
  vehiculos: string[]              // nombres o códigos
  duracionMin: number | null       // minutos en escena
}

export interface CompanyMonthStats {
  totalPersonnel: number           // profiles activos
  totalHoursThisMonth: number
  emergenciesThisMonth: number
  guardiaThisMonth: number         // reservas nocturnas este mes
  openIncidents: number
  openRequests: number
}

export interface JefaturaExtraData {
  recentEmergencies: RecentEmergency[]
  monthStats: CompanyMonthStats
  emergencyCountByType: { tipo: string; count: number }[]
}

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

export async function getJefaturaExtraData(): Promise<JefaturaExtraData> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── Emergencias recientes (últimas 20) ────────────────────────
  const emergencyRows = await db
    .select({
      em: emergencies,
      tipoDescripcion: emergencyTypes.descripcion,
    })
    .from(emergencies)
    .leftJoin(emergencyTypes, eq(emergencies.tipoEmergenciaId, emergencyTypes.id))
    .orderBy(desc(emergencies.fechaDespacho))
    .limit(20)

  // Vehículos por emergencia (batch)
  const emergencyIds = emergencyRows.map((r) => r.em.id)
  const vehiculosRows = emergencyIds.length > 0
    ? await db
        .select({
          emergencyId: emergencyVehicles.emergencyId,
          nombre: emergencyVehicles.nombreVehiculo,
          codigo: emergencyVehicles.codigoVehiculo,
        })
        .from(emergencyVehicles)
        .where(
          sql`${emergencyVehicles.emergencyId} = ANY(ARRAY[${sql.raw(emergencyIds.join(','))}]::int[])`,
        )
    : []

  const vehiculosByEmergency = new Map<number, string[]>()
  for (const v of vehiculosRows) {
    const label = v.nombre ?? v.codigo
    const arr = vehiculosByEmergency.get(v.emergencyId) ?? []
    arr.push(label)
    vehiculosByEmergency.set(v.emergencyId, arr)
  }

  const recentEmergencies: RecentEmergency[] = emergencyRows.map((r) => {
    const despacho = r.em.fechaDespacho
    const retorno = r.em.fechaRetorno
    const duracionMin =
      despacho && retorno
        ? Math.round((new Date(retorno).getTime() - new Date(despacho).getTime()) / 60000)
        : null
    return {
      id: r.em.id,
      numeroParte: r.em.numeroParte,
      tipo: r.em.tipo,
      tipoDescripcion: r.tipoDescripcion,
      estado: r.em.estado,
      fechaDespacho: r.em.fechaDespacho,
      direccion: r.em.direccion,
      distrito: r.em.distrito,
      alMandoTexto: r.em.alMandoTexto,
      vehiculos: vehiculosByEmergency.get(r.em.id) ?? [],
      duracionMin,
    }
  })

  // ── Estadísticas del mes ──────────────────────────────────────
  const [
    personnelCount,
    hoursSum,
    emergenciesCount,
    guardiaCount,
    openIncidentsCount,
    openRequestsCount,
  ] = await Promise.all([
    // Personal activo
    db
      .select({ count: count() })
      .from(profiles)
      .where(
        or(
          eq(profiles.status, 'activo'),
          eq(profiles.status, 'reserva'),
        ),
      )
      .then((r) => r[0]?.count ?? 0),

    // Horas del mes
    db
      .select({ total: sql<string>`COALESCE(SUM(${serviceHours.hours}), 0)` })
      .from(serviceHours)
      .where(gte(serviceHours.date, firstOfMonth.toISOString().slice(0, 10)))
      .then((r) => Math.round(Number(r[0]?.total ?? 0) * 10) / 10),

    // Emergencias del mes
    db
      .select({ count: count() })
      .from(emergencies)
      .where(gte(emergencies.fechaDespacho, firstOfMonth))
      .then((r) => r[0]?.count ?? 0),

    // Guardias del mes (reservas activas)
    db
      .select({ count: count() })
      .from(guardReservations)
      .where(
        and(
          gte(guardReservations.date, firstOfMonth.toISOString().slice(0, 10)),
          eq(guardReservations.status, 'activa'),
        ),
      )
      .then((r) => r[0]?.count ?? 0),

    // Incidencias abiertas
    db
      .select({ count: count() })
      .from(incidents)
      .where(
        or(eq(incidents.status, 'pendiente'), eq(incidents.status, 'en_proceso')),
      )
      .then((r) => r[0]?.count ?? 0),

    // Solicitudes abiertas
    db
      .select({ count: count() })
      .from(requests)
      .where(
        or(
          eq(requests.status, 'pendiente'),
          eq(requests.status, 'aprobada'),
          eq(requests.status, 'en_proceso'),
        ),
      )
      .then((r) => r[0]?.count ?? 0),
  ])

  // ── Emergencias por tipo (este mes) ──────────────────────────
  const typeCountRows = await db
    .select({
      tipo: sql<string>`COALESCE(${emergencyTypes.descripcion}, ${emergencies.tipo}, 'Sin clasificar')`,
      count: count(),
    })
    .from(emergencies)
    .leftJoin(emergencyTypes, eq(emergencies.tipoEmergenciaId, emergencyTypes.id))
    .where(gte(emergencies.fechaDespacho, firstOfMonth))
    .groupBy(emergencyTypes.descripcion, emergencies.tipo)
    .orderBy(desc(count()))
    .limit(8)

  const emergencyCountByType = typeCountRows.map((r) => ({
    tipo: r.tipo,
    count: r.count,
  }))

  return {
    recentEmergencies,
    monthStats: {
      totalPersonnel: Number(personnelCount),
      totalHoursThisMonth: hoursSum,
      emergenciesThisMonth: Number(emergenciesCount),
      guardiaThisMonth: Number(guardiaCount),
      openIncidents: Number(openIncidentsCount),
      openRequests: Number(openRequestsCount),
    },
    emergencyCountByType,
  }
}
