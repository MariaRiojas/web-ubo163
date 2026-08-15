'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  ddb, TABLE, GetCommand, PutCommand, UpdateCommand, QueryCommand, generateId, now,
} from '@/lib/db/dynamodb'
import { getUploadPresignedUrl, getDownloadPresignedUrl } from '@/lib/storage/s3'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'
import {
  TRAMITE_LABELS, TRAMITES_CON_RESOLUCION,
  type TramiteTipo, type AspiranteTramite,
} from '@/lib/db/schema/aspirante-tramites'
import type { Permission } from '@/lib/auth/permissions'

type Result = { ok: true } | { ok: false; error: string }

function canManage(session: any): boolean {
  const perms = (session?.user?.permissions ?? []) as Permission[]
  return perms.includes('area.instruction.manage')
}

const WS_PATH = '/areas/instruccion/aspirantes-y-postulantes'

/** Efecto de cada pase sobre el perfil (situación / grado / estado). */
function efectoEnPerfil(tipo: TramiteTipo): Record<string, unknown> {
  switch (tipo) {
    case 'ascenso_aspirante': return { grade: 'aspirante', situacion: 'formacion' }
    case 'pase_esbas':        return { situacion: 'escuela' }
    case 'graduacion':        return { situacion: 'graduado', grade: 'seccionario', status: 'activo' }
    case 'baja':              return { situacion: 'baja', status: 'retirado' }
    case 'reincorporacion':   return { situacion: 'formacion', status: 'aspirante_en_curso' }
    default:                  return {}
  }
}

async function updateProfile(profileId: string, patch: Record<string, unknown>) {
  const entries = Object.entries({ ...patch, updatedAt: now() })
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}
  const sets = entries.map(([k, v], i) => { names[`#f${i}`] = k; values[`:v${i}`] = v; return `#f${i} = :v${i}` })
  await ddb.send(new UpdateCommand({
    TableName: TABLE.profiles, Key: { profileId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names, ExpressionAttributeValues: values,
  }))
}

/** URL prefirmada para subir una resolución/documento PDF (subida directa a S3). */
export async function getResolucionUploadUrl(input: { profileId: string; contentType: string; sizeBytes?: number }) {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false as const, error: 'Sin permiso' }
  if (input.contentType !== 'application/pdf') return { ok: false as const, error: 'La resolución debe ser un PDF' }
  if (input.sizeBytes && input.sizeBytes > 20 * 1024 * 1024) return { ok: false as const, error: 'El PDF no debe superar 20 MB' }
  const key = `tramites/${input.profileId}/${generateId()}.pdf`
  const url = await getUploadPresignedUrl(key, input.contentType)
  return { ok: true as const, url, key }
}

/** URL prefirmada para ver un documento adjunto (resolución/licencia). */
export async function getDocumentoUrl(key: string) {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false as const, error: 'Sin permiso' }
  if (!key.startsWith('tramites/') && !key.startsWith('admission/')) return { ok: false as const, error: 'Key inválida' }
  const url = await getDownloadPresignedUrl(key)
  return { ok: true as const, url }
}

/** Registra un pase de etapa (con su resolución) para un efectivo + actualiza su perfil. */
export async function registrarPase(input: {
  profileId: string
  tipo: TramiteTipo
  fecha?: string
  detalle?: string
  promocion?: string
  resolucionKey?: string
  normativa?: string
}): Promise<Result> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (input.tipo === 'licencia') return { ok: false, error: 'Usa la acción de licencias' }
  if (TRAMITES_CON_RESOLUCION.includes(input.tipo) && !input.resolucionKey) {
    return { ok: false, error: `Adjunta la resolución (PDF) para «${TRAMITE_LABELS[input.tipo]}»` }
  }

  const { Item: profile } = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId: input.profileId } }))
  if (!profile) return { ok: false, error: 'Efectivo no encontrado' }

  const ts = now()
  const actor = auditActor(session)
  const item: AspiranteTramite = {
    tramiteId: generateId(),
    profileId: input.profileId,
    createdAt: ts,
    updatedAt: ts,
    tipo: input.tipo,
    fecha: input.fecha || ts,
    ...(input.detalle ? { detalle: input.detalle } : {}),
    ...(input.promocion ? { promocion: input.promocion } : {}),
    ...(input.resolucionKey ? { resolucionKey: input.resolucionKey } : {}),
    ...(input.normativa ? { normativa: input.normativa } : {}),
    registradoPor: actor.actorId,
    registradoPorNombre: actor.actorName,
  }
  await ddb.send(new PutCommand({ TableName: TABLE.aspiranteTramites, Item: item }))
  await updateProfile(input.profileId, efectoEnPerfil(input.tipo))

  await writeAuditLog({
    entityType: 'training', entityId: item.tramiteId, entityLabel: (profile as any).fullName,
    action: 'status_change', ...actor,
    summary: `${TRAMITE_LABELS[input.tipo]}: ${(profile as any).fullName}${input.promocion ? ` — ${input.promocion}` : ''}`,
    before: { situacion: (profile as any).situacion ?? null, grade: (profile as any).grade },
    after: { tipo: input.tipo, ...efectoEnPerfil(input.tipo) },
  })

  revalidatePath(WS_PATH)
  return { ok: true }
}

/** Aplica un mismo pase (con una sola resolución) a varios efectivos. */
export async function registrarPaseBulk(input: {
  profileIds: string[]
  tipo: TramiteTipo
  fecha?: string
  detalle?: string
  promocion?: string
  resolucionKey?: string
  normativa?: string
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!input.profileIds?.length) return { ok: false, error: 'Selecciona al menos un efectivo' }

  let count = 0
  for (const profileId of input.profileIds) {
    const res = await registrarPase({ ...input, profileId })
    if (res.ok) count++
  }
  revalidatePath(WS_PATH)
  return { ok: true, count }
}

/** Otorga/registra una licencia (aprobada) con su documento. */
export async function otorgarLicencia(input: {
  profileId: string; desde: string; hasta?: string; motivo?: string; docKey?: string
}): Promise<Result> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!input.desde) return { ok: false, error: 'Indica la fecha de inicio' }

  const { Item: profile } = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId: input.profileId } }))
  if (!profile) return { ok: false, error: 'Efectivo no encontrado' }

  const ts = now()
  const actor = auditActor(session)
  const item: AspiranteTramite = {
    tramiteId: generateId(), profileId: input.profileId, createdAt: ts, updatedAt: ts,
    tipo: 'licencia', fecha: input.desde,
    ...(input.hasta ? { hasta: input.hasta } : {}),
    ...(input.motivo ? { detalle: input.motivo } : {}),
    ...(input.docKey ? { resolucionKey: input.docKey } : {}),
    licenciaEstado: 'aprobada', resueltaPor: actor.actorId, resueltaAt: ts,
    registradoPor: actor.actorId, registradoPorNombre: actor.actorName,
  }
  await ddb.send(new PutCommand({ TableName: TABLE.aspiranteTramites, Item: item }))
  await updateProfile(input.profileId, { situacion: 'licencia', status: 'licencia' })

  await writeAuditLog({
    entityType: 'training', entityId: item.tramiteId, entityLabel: (profile as any).fullName,
    action: 'status_change', ...actor,
    summary: `Licencia otorgada a ${(profile as any).fullName} (${input.desde}${input.hasta ? ` → ${input.hasta}` : ''})`,
    after: { motivo: input.motivo },
  })
  revalidatePath(WS_PATH)
  return { ok: true }
}

/** Resuelve una solicitud de licencia pendiente (aprobar/rechazar). */
export async function resolverLicencia(input: { tramiteId: string; aprobar: boolean }): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  const { Item } = await ddb.send(new GetCommand({ TableName: TABLE.aspiranteTramites, Key: { tramiteId: input.tramiteId } }))
  if (!Item) return { ok: false, error: 'Solicitud no encontrada' }
  const tr = Item as AspiranteTramite
  const ts = now(); const actor = auditActor(session)
  await ddb.send(new UpdateCommand({
    TableName: TABLE.aspiranteTramites, Key: { tramiteId: input.tramiteId },
    UpdateExpression: 'SET licenciaEstado = :e, resueltaPor = :p, resueltaAt = :t, updatedAt = :t',
    ExpressionAttributeValues: { ':e': input.aprobar ? 'aprobada' : 'rechazada', ':p': actor.actorId, ':t': ts },
  }))
  if (input.aprobar) await updateProfile(tr.profileId, { situacion: 'licencia', status: 'licencia' })

  await writeAuditLog({
    entityType: 'training', entityId: input.tramiteId, action: 'status_change', ...actor,
    summary: `Licencia ${input.aprobar ? 'aprobada' : 'rechazada'} (solicitud ${input.tramiteId})`,
  })
  revalidatePath(WS_PATH)
  return { ok: true }
}

/**
 * Alta manual de un postulante/aspirante en formación (Instrucción).
 * Para quienes ingresaron sin el formulario público. Crea el Profile directamente
 * en situación `formacion` con todos los datos + orden de antigüedad.
 * Idempotente por DNI: si ya existe un perfil con ese DNI, no lo duplica.
 */
export async function altaManual(input: {
  fullName: string
  grade: 'postulante' | 'aspirante'
  dni?: string
  birthDate?: string
  phone?: string
  email?: string
  profession?: string
  distrito?: string
  residencia?: string
  convocatoriaIngresoLabel?: string
  ordenAntiguedad?: number
}): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }

  const fullName = input.fullName?.trim()
  if (!fullName || fullName.length < 3) return { ok: false, error: 'Ingresa el nombre completo' }
  if (input.grade !== 'postulante' && input.grade !== 'aspirante') return { ok: false, error: 'Grado inválido' }
  const dni = input.dni?.trim()
  if (dni && !/^\d{8}$/.test(dni)) return { ok: false, error: 'El DNI debe tener 8 dígitos' }

  // Dedupe por DNI (evita duplicar un efectivo ya registrado).
  if (dni) {
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE.profiles, IndexName: 'dni-index',
      KeyConditionExpression: 'dni = :d', ExpressionAttributeValues: { ':d': dni },
    })).catch(() => ({ Items: [] as any[] }))
    if ((q.Items ?? []).length > 0) return { ok: false, error: 'Ya existe un efectivo con ese DNI' }
  }

  const ts = now()
  const profileId = generateId()
  const status = input.grade === 'aspirante' ? 'aspirante_en_curso' : 'postulante'
  const item: Record<string, unknown> = {
    profileId,
    fullName,
    grade: input.grade,
    status,
    situacion: 'formacion',
    ...(dni ? { dni } : {}),
    ...(input.birthDate ? { birthDate: input.birthDate } : {}),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    ...(input.profession?.trim() ? { profession: input.profession.trim() } : {}),
    ...(input.distrito?.trim() ? { distrito: input.distrito.trim() } : {}),
    ...(input.residencia?.trim() ? { residencia: input.residencia.trim() } : {}),
    ...(input.convocatoriaIngresoLabel?.trim() ? { convocatoriaIngresoLabel: input.convocatoriaIngresoLabel.trim() } : {}),
    ...(typeof input.ordenAntiguedad === 'number' && !isNaN(input.ordenAntiguedad) ? { ordenAntiguedad: input.ordenAntiguedad } : {}),
    joinDate: ts.split('T')[0],
    createdAt: ts,
    updatedAt: ts,
  }
  await ddb.send(new PutCommand({ TableName: TABLE.profiles, Item: item }))

  await writeAuditLog({
    entityType: 'training', entityId: profileId, entityLabel: fullName,
    action: 'create', ...auditActor(session),
    summary: `Alta manual de ${input.grade}: ${fullName}${dni ? ` (DNI ${dni})` : ''}`,
    after: { grade: input.grade, situacion: 'formacion', ordenAntiguedad: input.ordenAntiguedad },
  })
  revalidatePath(WS_PATH)
  return { ok: true, profileId }
}

/** Edita los datos personales de un postulante/aspirante (Instrucción). */
export async function editarDatos(input: {
  profileId: string
  patch: Partial<{ fullName: string; dni: string; birthDate: string; phone: string; email: string; profession: string; distrito: string; residencia: string }>
}): Promise<Result> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }

  const allowed = ['fullName', 'dni', 'birthDate', 'phone', 'email', 'profession', 'distrito', 'residencia'] as const
  const patch: Record<string, unknown> = {}
  for (const k of allowed) {
    const v = (input.patch as any)[k]
    if (v !== undefined) patch[k] = v
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nada que actualizar' }

  const { Item: before } = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId: input.profileId } }))
  if (!before) return { ok: false, error: 'Efectivo no encontrado' }

  await updateProfile(input.profileId, patch)
  await writeAuditLog({
    entityType: 'training', entityId: input.profileId, entityLabel: (before as any).fullName,
    action: 'update', ...auditActor(session),
    summary: `Datos actualizados de ${(before as any).fullName} (${Object.keys(patch).join(', ')})`,
    before: Object.fromEntries(Object.keys(patch).map(k => [k, (before as any)[k]])),
    after: patch,
  })
  revalidatePath(WS_PATH)
  return { ok: true }
}
