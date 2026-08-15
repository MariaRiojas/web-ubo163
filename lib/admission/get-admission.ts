import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import type { AdmissionApplication } from '@/lib/db/schema/admission'

export interface ActiveCohort {
  cohortId: string
  name: string
  year?: number
  period?: string
  startDate?: string
  endDate?: string     // fecha de cierre de la convocatoria
}

/** Convocatoria pasada (histórico): cohorte cerrada o graduada. */
export interface ClosedCohort {
  cohortId: string
  name: string
  status: string       // 'cerrada' | 'graduada'
  year?: number
  period?: string
  endDate?: string
  createdAt?: string
}

/**
 * Devuelve la convocatoria (cohorte) activa más reciente, o null si no hay
 * ninguna abierta. Lectura pública usada por el formulario del landing.
 */
export async function getActiveCohort(): Promise<ActiveCohort | null> {
  try {
    const res = await ddb.send(new ScanCommand({
      TableName: TABLE.trainingCohorts,
      FilterExpression: '#s = :activa',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':activa': 'activa' },
    }))
    const cohorts = (res.Items ?? []) as any[]
    if (cohorts.length === 0) return null
    // Más reciente por createdAt/year
    cohorts.sort((a, b) => String(b.createdAt ?? b.year ?? '').localeCompare(String(a.createdAt ?? a.year ?? '')))
    const c = cohorts[0]
    return {
      cohortId: c.cohortId,
      name: c.name ?? 'Convocatoria',
      year: c.year,
      period: c.period,
      startDate: c.startDate || undefined,
      endDate: c.endDate || undefined,
    }
  } catch (err) {
    console.error('[getActiveCohort] error:', err)
    return null
  }
}

/**
 * Convocatorias pasadas (histórico): cohortes con estado 'cerrada' o 'graduada',
 * de la más reciente a la más antigua. Alimenta la columna «Histórico».
 */
export async function getClosedCohorts(): Promise<ClosedCohort[]> {
  try {
    const res = await ddb.send(new ScanCommand({
      TableName: TABLE.trainingCohorts,
      FilterExpression: '#s = :cerrada OR #s = :graduada',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':cerrada': 'cerrada', ':graduada': 'graduada' },
    }))
    const cohorts = (res.Items ?? []) as any[]
    return cohorts
      .map(c => ({
        cohortId: c.cohortId,
        name: c.name ?? 'Convocatoria',
        status: c.status,
        year: c.year,
        period: c.period,
        endDate: c.endDate || undefined,
        createdAt: c.createdAt || undefined,
      }))
      .sort((a, b) => String(b.createdAt ?? b.year ?? '').localeCompare(String(a.createdAt ?? a.year ?? '')))
  } catch (err) {
    console.error('[getClosedCohorts] error:', err)
    return []
  }
}

/** Lista las postulaciones de una convocatoria (más recientes primero). */
export async function getApplicationsByCohort(cohortId: string): Promise<AdmissionApplication[]> {
  try {
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE.admissionApplications,
      IndexName: 'cohortId-createdAt-index',
      KeyConditionExpression: 'cohortId = :c',
      ExpressionAttributeValues: { ':c': cohortId },
      ScanIndexForward: false,
    }))
    return (res.Items ?? []) as AdmissionApplication[]
  } catch (err) {
    console.error('[getApplicationsByCohort] error:', err)
    return []
  }
}

/**
 * Lista las postulaciones de una convocatoria ordenadas por N.° de llegada
 * (antigüedad inicial). Las que aún no tienen `ordenLlegada` caen al final,
 * ordenadas por fecha de registro.
 */
export async function getApplicationsByCohortOrdered(cohortId: string): Promise<AdmissionApplication[]> {
  const apps = await getApplicationsByCohort(cohortId)
  return apps.sort((a, b) => {
    const oa = a.ordenLlegada ?? Number.MAX_SAFE_INTEGER
    const ob = b.ordenLlegada ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return String(a.createdAt).localeCompare(String(b.createdAt))
  })
}

/** Cuenta las postulaciones existentes de una convocatoria (para asignar ordenLlegada). */
export async function countApplicationsForCohort(cohortId: string): Promise<number> {
  try {
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE.admissionApplications,
      IndexName: 'cohortId-createdAt-index',
      KeyConditionExpression: 'cohortId = :c',
      ExpressionAttributeValues: { ':c': cohortId },
      Select: 'COUNT',
    }))
    return res.Count ?? 0
  } catch (err) {
    console.error('[countApplicationsForCohort] error:', err)
    return 0
  }
}

/** ¿Ya existe una postulación con este DNI en esta convocatoria? (dedupe) */
export async function existsApplicationForDni(cohortId: string, dni: string): Promise<boolean> {
  try {
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE.admissionApplications,
      IndexName: 'cohortId-createdAt-index',
      KeyConditionExpression: 'cohortId = :c',
      FilterExpression: 'dni = :d',
      ExpressionAttributeValues: { ':c': cohortId, ':d': dni },
      Select: 'COUNT',
    }))
    return (res.Count ?? 0) > 0
  } catch (err) {
    console.error('[existsApplicationForDni] error:', err)
    return false
  }
}
