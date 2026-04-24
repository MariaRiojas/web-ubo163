import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { emergencies, emergencyTypes, emergencyVehicles, profiles } from "@/lib/db/schema"
import { eq, and, gte, lt, sql, desc } from "drizzle-orm"
import type { Permission } from "@/lib/auth/permissions"
import { EstadisticasClient } from "./estadisticas-client"

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canView = permissions.includes("company.manage") || permissions.includes("company.view_all") || permissions.includes("reports.view_all")
  if (!canView) redirect("/dashboard")

  const params = await searchParams
  const now = new Date()
  const year = params.anio ? parseInt(params.anio) : now.getFullYear()
  const month = params.mes ? parseInt(params.mes) : now.getMonth() + 1

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 1)

  // All emergencies for the month with relations
  const data = await db.query.emergencies.findMany({
    where: and(gte(emergencies.fechaDespacho, from), lt(emergencies.fechaDespacho, to)),
    orderBy: [desc(emergencies.fechaDespacho)],
    with: {
      tipoEmergencia: true,
      alMando: { columns: { id: true, apellidos: true, nombres: true } },
      vehiculos: true,
      dotacion: true,
    },
  })

  const total = data.length
  const cerradas = data.filter((e) => e.estado === "CERRADO").length

  // Most frequent type
  const typeCounts: Record<string, number> = {}
  for (const e of data) {
    const t = e.tipoEmergencia?.descripcion ?? e.tipo ?? "Sin tipo"
    typeCounts[t] = (typeCounts[t] || 0) + 1
  }
  const tipoFrecuente = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]

  // Avg response time (fechaDespacho → first vehicle horaSalida as proxy for llegada)
  let totalMinutes = 0
  let countResp = 0
  for (const e of data) {
    if (!e.fechaDespacho || !e.vehiculos?.length) continue
    for (const v of e.vehiculos) {
      if (v.horaSalida) {
        const diff = (v.horaSalida.getTime() - e.fechaDespacho.getTime()) / 60000
        if (diff > 0 && diff < 120) {
          totalMinutes += diff
          countResp++
        }
      }
    }
  }
  const avgResponseMin = countResp > 0 ? Math.round(totalMinutes / countResp) : 0

  // Peak hour
  const hourCounts: Record<number, number> = {}
  for (const e of data) {
    if (e.fechaDespacho) {
      const h = e.fechaDespacho.getHours()
      hourCounts[h] = (hourCounts[h] || 0) + 1
    }
  }
  const peakEntry = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
  const peakHour = peakEntry ? parseInt(peakEntry[0]) : 0
  const peakCount = peakEntry ? Number(peakEntry[1]) : 0

  // Daily counts
  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyCounts = Array.from({ length: daysInMonth }, (_, i) => ({
    dia: i + 1,
    cantidad: 0,
  }))
  for (const e of data) {
    if (e.fechaDespacho) {
      const d = e.fechaDespacho.getDate()
      dailyCounts[d - 1].cantidad++
    }
  }

  // Category distribution
  const categoryDist = Object.entries(typeCounts).map(([name, value]) => ({ name, value }))

  // Response times by type
  const respByType: Record<string, { total: number; count: number }> = {}
  for (const e of data) {
    const t = e.tipoEmergencia?.descripcion ?? e.tipo ?? "Sin tipo"
    if (!e.fechaDespacho || !e.vehiculos?.length) continue
    for (const v of e.vehiculos) {
      if (v.horaSalida) {
        const diff = (v.horaSalida.getTime() - e.fechaDespacho.getTime()) / 60000
        if (diff > 0 && diff < 120) {
          if (!respByType[t]) respByType[t] = { total: 0, count: 0 }
          respByType[t].total += diff
          respByType[t].count++
        }
      }
    }
  }
  const responseByType = Object.entries(respByType).map(([name, v]) => ({
    name,
    minutos: Math.round(v.total / v.count),
  }))

  // Vehicle usage
  const vehicleCounts: Record<string, number> = {}
  for (const e of data) {
    for (const v of e.vehiculos ?? []) {
      const code = v.codigoVehiculo || v.nombreVehiculo || "?"
      vehicleCounts[code] = (vehicleCounts[code] || 0) + 1
    }
  }
  const vehicleUsage = Object.entries(vehicleCounts)
    .map(([name, cantidad]) => ({ name, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  // Top al_mando
  const mandoCounts: Record<string, number> = {}
  for (const e of data) {
    const name = e.alMando
      ? `${e.alMando.apellidos ?? ""} ${e.alMando.nombres ?? ""}`.trim()
      : e.alMandoTexto
    if (name) mandoCounts[name] = (mandoCounts[name] || 0) + 1
  }
  const topMando = Object.entries(mandoCounts)
    .map(([name, cantidad]) => ({ name, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10)

  return (
    <EstadisticasClient
      year={year}
      month={month}
      total={total}
      cerradas={cerradas}
      tipoFrecuente={tipoFrecuente ? { name: tipoFrecuente[0], count: tipoFrecuente[1] } : null}
      avgResponseMin={avgResponseMin}
      peakHour={peakHour}
      peakCount={peakCount}
      dailyCounts={dailyCounts}
      categoryDist={categoryDist}
      responseByType={responseByType}
      vehicleUsage={vehicleUsage}
      topMando={topMando}
    />
  )
}
