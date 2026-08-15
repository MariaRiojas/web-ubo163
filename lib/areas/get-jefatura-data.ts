import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import type { Emergency } from '@/lib/db/schema/emergencies'
import type { Profile } from '@/lib/db/schema/profiles'
import type { ServiceHour } from '@/lib/db/schema/service-hours'
import type { GuardReservation } from '@/lib/db/schema/guard-nocturna'
import type { Incident } from '@/lib/db/schema/incidents'
import type { Request } from '@/lib/db/schema/requests'

export interface RecentEmergency {
  id: string
  numeroParte: string
  tipo: string | null
  tipoDescripcion: string | null
  estado: string | null
  fechaDespacho: string | null
  direccion: string | null
  distrito: string | null
  alMandoTexto: string | null
  vehiculos: string[]
  duracionMin: number | null
}

export interface CompanyMonthStats {
  totalPersonnel: number
  totalHoursThisMonth: number
  emergenciesThisMonth: number
  guardiaThisMonth: number
  openIncidents: number
  openRequests: number
}

export interface JefaturaExtraData {
  recentEmergencies: RecentEmergency[]
  monthStats: CompanyMonthStats
  emergencyCountByType: { tipo: string; count: number }[]
}

export async function getJefaturaExtraData(): Promise<JefaturaExtraData> {
  const nowDate = new Date()
  const firstOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString().slice(0, 10)

  // Everything below is independent of everything else — one round-trip.
  // The emergencies scan (used for the recent list + by-type breakdown) runs
  // alongside the six COUNT/aggregate scans instead of before them.
  const [
    allEmg,
    personnelCount,
    emergenciesThisMonth,
    guardiaThisMonth,
    openIncidents,
    openRequests,
    hoursSum,
  ] = await Promise.all([
    // Recent emergencies (last 20 by date GSI)
    ddb.send(new ScanCommand({
      TableName: TABLE.emergencies,
      Limit: 100,
    })).then(r => {
      const items = (r.Items ?? []) as Emergency[]
      items.sort((a, b) => (b.fechaDespacho ?? '').localeCompare(a.fechaDespacho ?? ''))
      return items
    }),

    // Personnel (activo + reserva)
    ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      FilterExpression: '#st IN (:a, :r)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':a': 'activo', ':r': 'reserva' },
      Select: 'COUNT',
    })).then(r => r.Count ?? 0),

    // Emergencies this month
    ddb.send(new ScanCommand({
      TableName: TABLE.emergencies,
      FilterExpression: '#d >= :from',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':from': firstOfMonth },
      Select: 'COUNT',
    })).then(r => r.Count ?? 0),

    // Guard reservations this month
    ddb.send(new ScanCommand({
      TableName: TABLE.guardReservations,
      FilterExpression: '#d >= :from AND #st = :activa',
      ExpressionAttributeNames: { '#d': 'date', '#st': 'status' },
      ExpressionAttributeValues: { ':from': firstOfMonth, ':activa': 'activa' },
      Select: 'COUNT',
    })).then(r => r.Count ?? 0),

    // Open incidents
    ddb.send(new ScanCommand({
      TableName: TABLE.incidents,
      FilterExpression: '#st IN (:p, :e)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':p': 'pendiente', ':e': 'en_proceso' },
      Select: 'COUNT',
    })).then(r => r.Count ?? 0),

    // Open requests
    ddb.send(new ScanCommand({
      TableName: TABLE.requests,
      FilterExpression: '#st IN (:p, :a, :e)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':p': 'pendiente', ':a': 'aprobada', ':e': 'en_proceso' },
      Select: 'COUNT',
    })).then(r => r.Count ?? 0),

    // Hours this month (scan service-hours)
    ddb.send(new ScanCommand({
      TableName: TABLE.serviceHours,
      FilterExpression: '#d >= :from',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':from': firstOfMonth },
      ProjectionExpression: 'hours',
    })).then(r => {
      const items = (r.Items ?? []) as ServiceHour[]
      const total = items.reduce((acc, h) => acc + Number(h.hours ?? 0), 0)
      return Math.round(total * 10) / 10
    }),
  ])

  const emergencyRows = allEmg.slice(0, 20)

  const recentEmergencies: RecentEmergency[] = emergencyRows.map(em => {
    const despacho = em.fechaDespacho
    const retorno = em.fechaRetorno
    const duracionMin = despacho && retorno
      ? Math.round((new Date(retorno).getTime() - new Date(despacho).getTime()) / 60000)
      : null
    const vehiculos = (em.vehiculos ?? []).map(v => v.nombreVehiculo ?? v.codigoVehiculo).filter(Boolean)
    return {
      id: em.emergencyId,
      numeroParte: em.numeroParte,
      tipo: em.tipo ?? null,
      tipoDescripcion: em.tipoEmergenciaDesc ?? null,
      estado: em.estado ?? null,
      fechaDespacho: em.fechaDespacho ?? null,
      direccion: em.direccion ?? null,
      distrito: em.distrito ?? null,
      alMandoTexto: em.alMandoTexto ?? null,
      vehiculos,
      duracionMin,
    }
  })

  // Emergency count by type
  const monthEmg = allEmg.filter(e => (e.date ?? '') >= firstOfMonth)
  const typeCount = new Map<string, number>()
  for (const e of monthEmg) {
    const tipo = e.tipoEmergenciaDesc ?? e.tipo ?? 'Sin clasificar'
    typeCount.set(tipo, (typeCount.get(tipo) ?? 0) + 1)
  }
  const emergencyCountByType = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tipo, count]) => ({ tipo, count }))

  return {
    recentEmergencies,
    monthStats: {
      totalPersonnel: personnelCount,
      totalHoursThisMonth: hoursSum,
      emergenciesThisMonth,
      guardiaThisMonth,
      openIncidents,
      openRequests,
    },
    emergencyCountByType,
  }
}
