"use server"

import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, generateId, now } from '@/lib/db/dynamodb'
import type { GuardBed, GuardDormitory, GuardReservation } from '@/lib/db/schema/guard-nocturna'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'

// ═══════════════════════════════════════════════════════════════════
// RESERVAR CAMA
// Nota: el cliente debe pasar bunkId y dormId para evitar un scan extra.
// ═══════════════════════════════════════════════════════════════════

export interface ReserveBedInput {
  bedId: string
  bunkId: string
  dormId: string
  date: string  // ISO yyyy-mm-dd
}

export async function reserveBed(input: ReserveBedInput) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('guard.reserve_bed')) {
    return { ok: false as const, error: 'No tiene permiso para reservar camas' }
  }

  const today = new Date().toISOString().slice(0, 10)
  if (input.date < today) {
    return { ok: false as const, error: 'No puede reservar una fecha pasada' }
  }

  // Get bed, dormitory, and profile in parallel
  const [bedResult, dormResult, profileResult] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: TABLE.guardBeds,
      Key: { bunkId: input.bunkId, bedId: input.bedId },
    })),
    ddb.send(new GetCommand({
      TableName: TABLE.guardDormitories,
      Key: { dormId: input.dormId },
    })),
    ddb.send(new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId: session.user.profileId },
      ProjectionExpression: 'profileId, gender',
    })),
  ])

  const bed = (bedResult.Item ?? null) as GuardBed | null
  if (!bed) return { ok: false as const, error: 'Cama no encontrada' }
  if (bed.status === 'indisponible') return { ok: false as const, error: 'La cama está fuera de servicio' }

  const dormitory = (dormResult.Item ?? null) as GuardDormitory | null
  if (!dormitory) return { ok: false as const, error: 'Dormitorio no encontrado' }

  const profile = profileResult.Item as any
  if (!profile) return { ok: false as const, error: 'Perfil no encontrado' }
  if (profile.gender !== dormitory.gender) {
    return { ok: false as const, error: 'Solo puede reservar camas del dormitorio correspondiente a su género' }
  }

  // Check if bed is already reserved for that date (PK=date, SK=profileId — scan by dormId+date+bedId)
  const { Items: existingItems } = await ddb.send(new QueryCommand({
    TableName: TABLE.guardReservations,
    KeyConditionExpression: '#d = :date',
    FilterExpression: 'bedId = :bid',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':date': input.date, ':bid': input.bedId },
  }))
  const existingForBed = existingItems?.find(r => (r as GuardReservation).status !== 'cancelada')
  if (existingForBed) return { ok: false as const, error: 'Esa cama ya está reservada para esa fecha' }

  // Check if this user already has a reservation for that date in this dormitory
  const { Items: mineItems } = await ddb.send(new QueryCommand({
    TableName: TABLE.guardReservations,
    KeyConditionExpression: '#d = :date AND profileId = :pid',
    FilterExpression: 'dormId = :did AND #st <> :cancelled',
    ExpressionAttributeNames: { '#d': 'date', '#st': 'status' },
    ExpressionAttributeValues: { ':date': input.date, ':pid': session.user.profileId, ':did': input.dormId, ':cancelled': 'cancelada' },
  }))
  if (mineItems && mineItems.length > 0) {
    return { ok: false as const, error: 'Ya tiene una reserva activa para esa fecha' }
  }

  const ts = now()
  await ddb.send(new PutCommand({
    TableName: TABLE.guardReservations,
    Item: {
      date: input.date,
      profileId: session.user.profileId,
      bedId: input.bedId,
      bunkId: input.bunkId,
      dormId: input.dormId,
      status: 'activa',
      createdAt: ts,
      updatedAt: ts,
    } satisfies GuardReservation,
  }))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// CANCELAR RESERVA
// La clave DynamoDB de GuardReservation es (date, profileId).
// ═══════════════════════════════════════════════════════════════════

export async function cancelReservation(date: string, reservationProfileId: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.guardReservations,
    Key: { date, profileId: reservationProfileId },
  }))
  if (!Item) return { ok: false as const, error: 'Reserva no encontrada' }
  const reservation = Item as GuardReservation

  const permissions = (session.user.permissions as Permission[]) ?? []
  const isOwner = reservation.profileId === session.user.profileId
  const canManage = permissions.includes('guard.manage_male') || permissions.includes('guard.manage_female')
  if (!isOwner && !canManage) return { ok: false as const, error: 'No puede cancelar una reserva ajena' }
  if (reservation.status === 'cumplida') return { ok: false as const, error: 'No puede cancelar una guardia ya cumplida' }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.guardReservations,
    Key: { date, profileId: reservationProfileId },
    UpdateExpression: 'SET #st = :s, updatedAt = :ua',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'cancelada', ':ua': now() },
  }))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// TOGGLE ESTADO DE CAMA
// ═══════════════════════════════════════════════════════════════════

export interface ToggleBedInput {
  bedId: string
  bunkId: string
  reason?: string
}

export async function toggleBedStatus(input: ToggleBedInput) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  const hasAnyBedConfigPermission =
    permissions.includes('guard.config_beds_male') || permissions.includes('guard.config_beds_female')
  if (!hasAnyBedConfigPermission) {
    return { ok: false as const, error: 'Solo el Jefe de Guardia o la Jefatura puede cambiar el estado de una cama' }
  }

  const { Item: bedItem } = await ddb.send(new GetCommand({
    TableName: TABLE.guardBeds,
    Key: { bunkId: input.bunkId, bedId: input.bedId },
  }))
  if (!bedItem) return { ok: false as const, error: 'Cama no encontrada' }
  const bed = bedItem as GuardBed

  const { Item: dormItem } = await ddb.send(new GetCommand({
    TableName: TABLE.guardDormitories,
    Key: { dormId: bed.dormId },
  }))
  if (!dormItem) return { ok: false as const, error: 'Dormitorio no encontrado' }
  const dormitory = dormItem as GuardDormitory

  const requiredPerm = dormitory.gender === 'masculino' ? 'guard.config_beds_male' : 'guard.config_beds_female'
  if (!permissions.includes(requiredPerm)) {
    return { ok: false as const, error: `Solo el Jefe de Guardia ${dormitory.gender === 'masculino' ? 'Masculina' : 'Femenina'} puede modificar camas de este dormitorio` }
  }

  const newStatus = bed.status === 'indisponible' ? 'disponible' : 'indisponible'
  await ddb.send(new UpdateCommand({
    TableName: TABLE.guardBeds,
    Key: { bunkId: input.bunkId, bedId: input.bedId },
    UpdateExpression: 'SET #st = :s, unavailableReason = :ur, updatedAt = :ua',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':s': newStatus,
      ':ur': newStatus === 'indisponible' ? (input.reason ?? null) : null,
      ':ua': now(),
    },
  }))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const, newStatus }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR ASISTENCIA (jefe de guardia)
// ═══════════════════════════════════════════════════════════════════

export async function markReservationStatus(
  date: string,
  reservationProfileId: string,
  newStatus: 'cumplida' | 'no_asistio',
) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  const canManage = permissions.includes('guard.manage_male') || permissions.includes('guard.manage_female')
  if (!canManage) return { ok: false as const, error: 'Solo el Jefe de Guardia puede marcar asistencia' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.guardReservations,
    Key: { date, profileId: reservationProfileId },
  }))
  if (!Item) return { ok: false as const, error: 'Reserva no encontrada' }
  const reservation = Item as GuardReservation

  // Verify gender permission
  const { Item: dormItem } = await ddb.send(new GetCommand({
    TableName: TABLE.guardDormitories,
    Key: { dormId: reservation.dormId },
  }))
  if (!dormItem) return { ok: false as const, error: 'Dormitorio no encontrado' }
  const dormitory = dormItem as GuardDormitory

  const requiredPerm = dormitory.gender === 'masculino' ? 'guard.manage_male' : 'guard.manage_female'
  if (!permissions.includes(requiredPerm)) {
    return { ok: false as const, error: 'No puede gestionar reservas de ese dormitorio' }
  }

  const ts = now()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.guardReservations,
    Key: { date, profileId: reservationProfileId },
    UpdateExpression: 'SET #st = :s, checkInAt = :ci, verifiedBy = :vb, updatedAt = :ua',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':s': newStatus,
      ':ci': newStatus === 'cumplida' ? ts : null,
      ':vb': session.user.profileId,
      ':ua': ts,
    },
  }))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const }
}
