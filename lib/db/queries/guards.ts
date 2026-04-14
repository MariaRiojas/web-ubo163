import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '../index'
import { guardBeds, guardShifts } from '../schema'

/** Camas con estado actual */
export async function getAllBeds() {
  return db.query.guardBeds.findMany({
    orderBy: guardBeds.number,
  })
}

/** Turnos de guardia por rango de fechas */
export async function getShiftsByDateRange(from: string, to: string) {
  return db.query.guardShifts.findMany({
    where: and(
      gte(guardShifts.date, from),
      lte(guardShifts.date, to)
    ),
    with: {
      profile: true,
      bed: true,
    },
  })
}

/** Turnos de un perfil específico */
export async function getShiftsByProfile(profileId: string) {
  return db.query.guardShifts.findMany({
    where: eq(guardShifts.profileId, profileId),
    with: { bed: true },
    orderBy: guardShifts.date,
  })
}

/** Camas disponibles para una fecha */
export async function getAvailableBeds(date: string) {
  const occupiedShifts = await db.query.guardShifts.findMany({
    where: and(
      eq(guardShifts.date, date),
      eq(guardShifts.status, 'reservada')
    ),
    columns: { bedId: true },
  })
  const occupiedIds = occupiedShifts.map((s) => s.bedId)

  const beds = await db.query.guardBeds.findMany({
    where: eq(guardBeds.status, 'disponible'),
    orderBy: guardBeds.number,
  })

  return beds.filter((b) => !occupiedIds.includes(b.id))
}
