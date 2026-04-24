import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { emergencies } from "@/lib/db/schema"
import { and, gte, lt, desc, eq } from "drizzle-orm"
import type { Permission } from "@/lib/auth/permissions"
import { AnalisisClient } from "./analisis-client"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string; distrito?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canView = permissions.includes("company.manage") || permissions.includes("company.view_all")
  if (!canView) redirect("/dashboard")

  const params = await searchParams
  const now = new Date()
  const year = params.anio ? parseInt(params.anio) : now.getFullYear()
  const month = params.mes ? parseInt(params.mes) : now.getMonth() + 1
  const distritoFilter = params.distrito || null

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 1)

  const conditions = [
    gte(emergencies.fechaDespacho, from),
    lt(emergencies.fechaDespacho, to),
  ]
  if (distritoFilter) conditions.push(eq(emergencies.distrito, distritoFilter))

  const data = await db.query.emergencies.findMany({
    where: and(...conditions),
    orderBy: [desc(emergencies.fechaDespacho)],
    with: { tipoEmergencia: true, vehiculos: true },
  })

  const filtered = data

  const total = filtered.length

  // Response times
  let totalMin = 0, countResp = 0, minResp = Infinity, maxResp = 0
  for (const e of filtered) {
    if (!e.fechaDespacho || !e.vehiculos?.length) continue
    for (const v of e.vehiculos) {
      if (v.horaSalida) {
        const diff = (v.horaSalida.getTime() - e.fechaDespacho.getTime()) / 60000
        if (diff > 0 && diff < 120) {
          totalMin += diff
          countResp++
          if (diff < minResp) minResp = diff
          if (diff > maxResp) maxResp = diff
        }
      }
    }
  }
  const avgResp = countResp > 0 ? Math.round(totalMin / countResp) : 0
  const minRespVal = countResp > 0 ? Math.round(minResp) : 0
  const maxRespVal = countResp > 0 ? Math.round(maxResp) : 0

  // By distrito
  const distritoCounts: Record<string, number> = {}
  for (const e of filtered) {
    const d = e.distrito || "Sin distrito"
    distritoCounts[d] = (distritoCounts[d] || 0) + 1
  }
  const byDistrito = Object.entries(distritoCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // By category (first word of tipo)
  const catCounts: Record<string, number> = {}
  for (const e of filtered) {
    const cat = (e.tipo || "Sin tipo").split(" ")[0]
    catCounts[cat] = (catCounts[cat] || 0) + 1
  }
  const byCategory = Object.entries(catCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Top 10 types (full descripcion)
  const typeCounts: Record<string, number> = {}
  for (const e of filtered) {
    const t = e.tipoEmergencia?.descripcion ?? e.tipo ?? "Sin tipo"
    typeCounts[t] = (typeCounts[t] || 0) + 1
  }
  const top10Types = Object.entries(typeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // By vehicle
  const vehCounts: Record<string, number> = {}
  for (const e of filtered) {
    for (const v of e.vehiculos ?? []) {
      const code = v.codigoVehiculo || v.nombreVehiculo || "?"
      vehCounts[code] = (vehCounts[code] || 0) + 1
    }
  }
  const byVehicle = Object.entries(vehCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // By hour of day (0-23)
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
  for (const e of filtered) {
    if (e.fechaDespacho) hourCounts[e.fechaDespacho.getHours()].count++
  }

  // By day of week (Dom=0 ... Sáb=6)
  const dayCounts = DAYS.map((name, i) => ({ name, index: i, count: 0 }))
  for (const e of filtered) {
    if (e.fechaDespacho) dayCounts[e.fechaDespacho.getDay()].count++
  }

  // Response time by type
  const respByType: Record<string, { total: number; count: number }> = {}
  for (const e of filtered) {
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
  const responseByType = Object.entries(respByType)
    .map(([name, v]) => ({ name, minutos: Math.round(v.total / v.count), partes: v.count }))
    .sort((a, b) => b.partes - a.partes)

  // All distinct distritos for filter dropdown
  const allDistritos = await db.selectDistinct({ distrito: emergencies.distrito }).from(emergencies)
  const distritosOptions = allDistritos.map((d) => d.distrito).filter(Boolean) as string[]

  return (
    <AnalisisClient
      year={year}
      month={month}
      distritoFilter={distritoFilter}
      distritosOptions={distritosOptions}
      total={total}
      avgResp={avgResp}
      minResp={minRespVal}
      maxResp={maxRespVal}
      countResp={countResp}
      byDistrito={byDistrito}
      byCategory={byCategory}
      top10Types={top10Types}
      byVehicle={byVehicle}
      hourCounts={hourCounts}
      dayCounts={dayCounts}
      responseByType={responseByType}
    />
  )
}
