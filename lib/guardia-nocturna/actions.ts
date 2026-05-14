"use server"

import { db } from '@/lib/db'
import {
  guardReservations,
  guardBedsV2,
  guardDormitories,
  profiles,
} from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'

// ═══════════════════════════════════════════════════════════════════
// RESERVAR CAMA (efectivo)
// ═══════════════════════════════════════════════════════════════════

export interface ReserveBedInput {
  bedId: string
  date: string  // ISO yyyy-mm-dd
}

export async function reserveBed(input: ReserveBedInput) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('guard.reserve_bed')) {
    return { ok: false as const, error: 'No tiene permiso para reservar camas' }
  }

  // Validar que la fecha no es pasada
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(input.date)
  if (targetDate < today) {
    return { ok: false as const, error: 'No puede reservar una fecha pasada' }
  }

  // Validar que la cama existe, está disponible, y pertenece al dormitorio del género del efectivo
  const bed = await db.query.guardBedsV2.findFirst({
    where: eq(guardBedsV2.id, input.bedId),
  })
  if (!bed) return { ok: false as const, error: 'Cama no encontrada' }
  if (bed.status === 'indisponible') {
    return { ok: false as const, error: 'La cama está fuera de servicio' }
  }

  // Verificar género del dormitorio
  const dormitory = await db.query.guardDormitories.findFirst({
    where: eq(guardDormitories.id, bed.dormitoryId),
  })
  if (!dormitory) {
    return { ok: false as const, error: 'Dormitorio no encontrado' }
  }

  // El efectivo debe tener el mismo género que el dormitorio
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.user.profileId),
  })
  if (!profile) {
    return { ok: false as const, error: 'Perfil no encontrado' }
  }
  if (profile.gender !== dormitory.gender) {
    return {
      ok: false as const,
      error: 'Solo puede reservar camas del dormitorio correspondiente a su género',
    }
  }

  // Verificar que la cama no esté reservada ese día
  const existing = await db.query.guardReservations.findFirst({
    where: and(
      eq(guardReservations.bedId, input.bedId),
      eq(guardReservations.date, input.date),
    ),
  })
  if (existing && existing.status !== 'cancelada') {
    return { ok: false as const, error: 'Esa cama ya está reservada para esa fecha' }
  }

  // Verificar que el efectivo no tenga ya otra reserva ese día
  const mineOnThisDate = await db
    .select({ id: guardReservations.id })
    .from(guardReservations)
    .innerJoin(guardBedsV2, eq(guardReservations.bedId, guardBedsV2.id))
    .where(
      and(
        eq(guardReservations.profileId, session.user.profileId),
        eq(guardReservations.date, input.date),
        eq(guardBedsV2.dormitoryId, dormitory.id),
      ),
    )
    .limit(1)
  if (
    mineOnThisDate.length > 0 &&
    // Permitir si existe pero está cancelada (se reintenta)
    mineOnThisDate[0]?.id !== existing?.id
  ) {
    return {
      ok: false as const,
      error: 'Ya tiene una reserva activa para esa fecha',
    }
  }

  try {
    if (existing && existing.status === 'cancelada') {
      // Reactivar la reserva cancelada
      await db
        .update(guardReservations)
        .set({ status: 'activa', profileId: session.user.profileId, updatedAt: new Date() })
        .where(eq(guardReservations.id, existing.id))
    } else {
      await db.insert(guardReservations).values({
        profileId: session.user.profileId,
        bedId: input.bedId,
        date: input.date,
        status: 'activa',
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return { ok: false as const, error: `No se pudo registrar: ${msg}` }
  }

  revalidatePath('/guardia-nocturna')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// CANCELAR RESERVA (efectivo)
// ═══════════════════════════════════════════════════════════════════

export async function cancelReservation(reservationId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const reservation = await db.query.guardReservations.findFirst({
    where: eq(guardReservations.id, reservationId),
  })
  if (!reservation) {
    return { ok: false as const, error: 'Reserva no encontrada' }
  }

  // Solo el dueño o un jefe puede cancelar
  const permissions = (session.user.permissions as Permission[]) ?? []
  const isOwner = reservation.profileId === session.user.profileId
  const canManage =
    permissions.includes('guard.manage_male') ||
    permissions.includes('guard.manage_female')
  if (!isOwner && !canManage) {
    return { ok: false as const, error: 'No puede cancelar una reserva ajena' }
  }

  // No se puede cancelar una guardia ya cumplida
  if (reservation.status === 'cumplida') {
    return { ok: false as const, error: 'No puede cancelar una guardia ya cumplida' }
  }

  await db
    .update(guardReservations)
    .set({ status: 'cancelada', updatedAt: new Date() })
    .where(eq(guardReservations.id, reservationId))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// TOGGLE ESTADO DE CAMA (jefe de guardia)
// ═══════════════════════════════════════════════════════════════════

export interface ToggleBedInput {
  bedId: string
  reason?: string
}

export async function toggleBedStatus(input: ToggleBedInput) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  const hasAnyBedConfigPermission =
    permissions.includes('guard.config_beds_male') ||
    permissions.includes('guard.config_beds_female')

  if (!hasAnyBedConfigPermission) {
    return {
      ok: false as const,
      error: 'Solo el Jefe de Guardia o la Jefatura puede cambiar el estado de una cama',
    }
  }

  const bed = await db.query.guardBedsV2.findFirst({
    where: eq(guardBedsV2.id, input.bedId),
  })
  if (!bed) return { ok: false as const, error: 'Cama no encontrada' }

  const dormitory = await db.query.guardDormitories.findFirst({
    where: eq(guardDormitories.id, bed.dormitoryId),
  })
  if (!dormitory) return { ok: false as const, error: 'Dormitorio no encontrado' }

  // Validar que el jefe tenga permiso específicamente para ese género
  const requiredPerm =
    dormitory.gender === 'masculino'
      ? 'guard.config_beds_male'
      : 'guard.config_beds_female'
  if (!permissions.includes(requiredPerm)) {
    return {
      ok: false as const,
      error: `Solo el Jefe de Guardia ${
        dormitory.gender === 'masculino' ? 'Masculina' : 'Femenina'
      } puede modificar camas de este dormitorio`,
    }
  }

  const newStatus = bed.status === 'indisponible' ? 'disponible' : 'indisponible'
  await db
    .update(guardBedsV2)
    .set({
      status: newStatus,
      unavailableReason: newStatus === 'indisponible' ? input.reason ?? null : null,
      updatedAt: new Date(),
    })
    .where(eq(guardBedsV2.id, input.bedId))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const, newStatus }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR ASISTENCIA (jefe de guardia)
// ═══════════════════════════════════════════════════════════════════

export async function markReservationStatus(
  reservationId: string,
  newStatus: 'cumplida' | 'no_asistio',
) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  const canManage =
    permissions.includes('guard.manage_male') ||
    permissions.includes('guard.manage_female')
  if (!canManage) {
    return {
      ok: false as const,
      error: 'Solo el Jefe de Guardia puede marcar asistencia',
    }
  }

  const reservation = await db.query.guardReservations.findFirst({
    where: eq(guardReservations.id, reservationId),
  })
  if (!reservation) {
    return { ok: false as const, error: 'Reserva no encontrada' }
  }

  // Verificar género específico
  const bed = await db.query.guardBedsV2.findFirst({
    where: eq(guardBedsV2.id, reservation.bedId),
  })
  if (!bed) return { ok: false as const, error: 'Cama no encontrada' }

  const dormitory = await db.query.guardDormitories.findFirst({
    where: eq(guardDormitories.id, bed.dormitoryId),
  })
  if (!dormitory) return { ok: false as const, error: 'Dormitorio no encontrado' }

  const requiredPerm =
    dormitory.gender === 'masculino' ? 'guard.manage_male' : 'guard.manage_female'
  if (!permissions.includes(requiredPerm)) {
    return {
      ok: false as const,
      error: 'No puede gestionar reservas de ese dormitorio',
    }
  }

  await db
    .update(guardReservations)
    .set({
      status: newStatus,
      checkInAt: newStatus === 'cumplida' ? new Date() : null,
      verifiedBy: session.user.profileId,
      updatedAt: new Date(),
    })
    .where(eq(guardReservations.id, reservationId))

  revalidatePath('/guardia-nocturna')
  return { ok: true as const }
}
