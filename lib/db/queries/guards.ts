import { ddb, TABLE, QueryCommand, ScanCommand } from '@/lib/db/dynamodb'
import type { GuardBed, GuardReservation } from '../schema/guard-nocturna'

/** Todas las camas de todos los dormitorios */
export async function getAllBeds(): Promise<GuardBed[]> {
  const res = await ddb.send(new ScanCommand({ TableName: TABLE.guardBeds }))
  const items = (res.Items ?? []) as GuardBed[]
  return items.sort((a, b) => a.number - b.number)
}

/** Reservas en un rango de fechas YYYY-MM-DD (scan con filtro lexicográfico) */
export async function getReservationsByDateRange(
  from: string,
  to: string
): Promise<GuardReservation[]> {
  // `date` es palabra reservada DynamoDB
  const res = await ddb.send(new ScanCommand({
    TableName: TABLE.guardReservations,
    FilterExpression: '#d BETWEEN :from AND :to',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':from': from, ':to': to },
  }))
  return (res.Items ?? []) as GuardReservation[]
}

/** Reservas de un perfil específico (via GSI profileId-index) */
export async function getReservationsByProfile(profileId: string): Promise<GuardReservation[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE.guardReservations,
    IndexName: 'profileId-index',
    KeyConditionExpression: 'profileId = :pid',
    ExpressionAttributeValues: { ':pid': profileId },
  }))
  const items = (res.Items ?? []) as GuardReservation[]
  return items.sort((a, b) => a.date.localeCompare(b.date))
}

/** Reservas activas para una fecha dada */
export async function getReservationsByDate(date: string): Promise<GuardReservation[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE.guardReservations,
    KeyConditionExpression: '#d = :date',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':date': date },
  }))
  return (res.Items ?? []) as GuardReservation[]
}

/** Camas disponibles para una fecha: excluye las que ya tienen reserva activa */
export async function getAvailableBeds(date: string): Promise<GuardBed[]> {
  const [allBeds, reservations] = await Promise.all([
    getAllBeds(),
    getReservationsByDate(date),
  ])

  const occupiedBedIds = new Set(
    reservations
      .filter((r) => r.status === 'activa')
      .map((r) => r.bedId)
  )

  return allBeds.filter(
    (b) => b.status === 'disponible' && !occupiedBedIds.has(b.bedId)
  )
}
