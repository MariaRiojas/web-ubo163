'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import { getUploadPresignedUrl, getDownloadPresignedUrl } from '@/lib/storage/s3'
import { describeToday } from './horario'
import { distanceToCompany, GEOFENCE_RADIUS_M } from './geo'
import { limaDateStr } from './horario'
import type { InstructionAttendance } from '@/lib/db/schema/instruction-attendance'

type Result = { ok: true; status: 'presente' | 'tardanza' } | { ok: false; error: string }

const FORMACION_GRADES = new Set(['postulante', 'aspirante'])

type FormacionCtx = { ok: false; error: string } | { ok: true; profileId: string; profile: any }

async function requireFormacionProfile(): Promise<FormacionCtx> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  const profileId = session.user.profileId as string
  if (!profileId) return { ok: false, error: 'Perfil no encontrado' }
  const { Item: profile } = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId } }))
  if (!profile) return { ok: false, error: 'Perfil no encontrado' }
  if (!FORMACION_GRADES.has((profile as any).grade))
    return { ok: false, error: 'Solo postulantes y aspirantes registran asistencia de instrucción' }
  if ((profile as any).status === 'retirado') return { ok: false, error: 'Perfil inactivo' }
  return { ok: true, profileId, profile }
}

/** URL prefirmada para subir la foto de evidencia (selfie) del registro de asistencia. */
export async function getAsistenciaSelfieUploadUrl(input: { contentType: string; sizeBytes?: number }) {
  const ctx = await requireFormacionProfile()
  if (!ctx.ok) return { ok: false as const, error: ctx.error }
  if (input.contentType !== 'image/jpeg' && input.contentType !== 'image/png')
    return { ok: false as const, error: 'La evidencia debe ser una foto (JPG/PNG)' }
  if (input.sizeBytes && input.sizeBytes > 5 * 1024 * 1024)
    return { ok: false as const, error: 'La foto no debe superar 5 MB' }
  const ext = input.contentType === 'image/png' ? 'png' : 'jpg'
  const key = `asistencia/${ctx.profileId}/${limaDateStr()}-${generateId()}.${ext}`
  const url = await getUploadPresignedUrl(key, input.contentType)
  return { ok: true as const, url, key }
}

/** URL prefirmada para VER una evidencia (instructor con permiso, o el propio dueño). */
export async function getAsistenciaSelfieUrl(key: string) {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: 'No autenticado' }
  if (!key.startsWith('asistencia/')) return { ok: false as const, error: 'Key inválida' }
  const perms = (session.user.permissions ?? []) as string[]
  const esOwner = key.startsWith(`asistencia/${session.user.profileId}/`)
  if (!esOwner && !perms.includes('area.instruction.manage') && !perms.includes('area.instruction.view'))
    return { ok: false as const, error: 'Sin permiso' }
  const url = await getDownloadPresignedUrl(key)
  return { ok: true as const, url }
}

/**
 * Auto-registro de asistencia a instrucción. Solo postulantes/aspirantes.
 * Requiere estar dentro del geocerco de la compañía y adjuntar evidencia (selfie).
 * La tardanza se determina con el reloj del servidor contra el horario del día.
 */
export async function registrarMiAsistencia(input: {
  comentario?: string
  lat?: number
  lng?: number
  accuracyM?: number
  selfieKey?: string
}): Promise<Result> {
  const ctx = await requireFormacionProfile()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { profileId } = ctx

  // 1) Geolocalización obligatoria + geocerco
  if (typeof input.lat !== 'number' || typeof input.lng !== 'number')
    return { ok: false, error: 'Necesitamos tu ubicación para validar la asistencia. Activa el GPS y permite el acceso.' }
  const distanceM = distanceToCompany(input.lat, input.lng)
  if (distanceM > GEOFENCE_RADIUS_M)
    return { ok: false, error: `Estás a ${distanceM} m de la compañía. Debes estar en la estación para marcar asistencia (máx. ${GEOFENCE_RADIUS_M} m).` }

  // 2) Evidencia obligatoria
  if (!input.selfieKey || !input.selfieKey.startsWith(`asistencia/${profileId}/`))
    return { ok: false, error: 'Falta la foto de evidencia.' }

  // 3) Tardanza + comentario
  const t = describeToday()
  const comentario = (input.comentario ?? '').trim()
  const isLate = t.hasScheduledSession && t.isLate
  if (isLate && !comentario) return { ok: false, error: 'Indica el motivo de la tardanza' }

  const ts = now()
  const item: InstructionAttendance = {
    profileId,
    date: t.dateStr,
    dayType: t.dayType,
    sessionLabel: t.sessionLabel,
    status: isLate ? 'tardanza' : 'presente',
    ...(t.scheduledStartISO ? { scheduledStart: t.scheduledStartISO } : {}),
    registeredAt: ts,
    ...(isLate ? { lateMinutes: t.lateMinutes } : {}),
    ...(comentario ? { comentario } : {}),
    lat: input.lat,
    lng: input.lng,
    ...(typeof input.accuracyM === 'number' ? { accuracyM: Math.round(input.accuracyM) } : {}),
    distanceM,
    geoValidated: true,
    selfieKey: input.selfieKey,
    createdAt: ts,
    updatedAt: ts,
  }

  try {
    await ddb.send(new PutCommand({
      TableName: TABLE.instructionAttendance,
      Item: item,
      ConditionExpression: 'attribute_not_exists(profileId) AND attribute_not_exists(#d)',
      ExpressionAttributeNames: { '#d': 'date' },
    }))
  } catch (e: any) {
    if (e?.name === 'ConditionalCheckFailedException')
      return { ok: false, error: 'Ya registraste tu asistencia de hoy' }
    return { ok: false, error: 'No se pudo registrar la asistencia' }
  }

  revalidatePath('/asistencia-instruccion')
  return { ok: true, status: item.status }
}
