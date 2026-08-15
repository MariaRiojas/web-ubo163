'use server'

import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand, PutCommand, QueryCommand, ScanCommand, generateId, now } from '@/lib/db/dynamodb'
import { getDownloadPresignedUrl } from '@/lib/storage/s3'
import { getApplicationsByCohortOrdered } from '@/lib/admission/get-admission'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'
import {
  ADMISSION_STATUS_LABELS,
  type AdmissionStatus, type AdmissionApplication, type AdmissionEtapa,
} from '@/lib/db/schema/admission'
import type { AuditAction } from '@/lib/db/schema/audit'
import type { Permission } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'

function canManage(session: any): boolean {
  const perms = (session?.user?.permissions ?? []) as Permission[]
  return perms.includes('area.instruction.manage')
}

type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Helper compartido: carga la postulación, aplica un SET dinámico + audita.
 * Guardado por `area.instruction.manage`. Cada acción del pipeline lo reutiliza.
 */
async function guardedPatch(
  applicationId: string,
  build: (app: AdmissionApplication, ts: string) => {
    updates: Record<string, unknown>
    action: AuditAction
    summary: string
    before?: unknown
    after?: unknown
  },
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.admissionApplications,
    Key: { applicationId },
  }))
  if (!Item) return { ok: false, error: 'Postulación no encontrada' }
  const app = Item as AdmissionApplication

  const ts = now()
  const { updates, action, summary, before, after } = build(app, ts)
  updates.updatedAt = ts
  updates.reviewedBy = session.user.profileId
  updates.reviewedAt = ts

  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}
  const sets: string[] = []
  let i = 0
  for (const [k, v] of Object.entries(updates)) {
    const nk = `#f${i}`, vk = `:v${i}`
    names[nk] = k
    values[vk] = v
    sets.push(`${nk} = ${vk}`)
    i++
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.admissionApplications,
    Key: { applicationId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }))

  await writeAuditLog({
    entityType: 'admission',
    entityId: applicationId,
    entityLabel: app.fullName,
    action,
    ...auditActor(session),
    summary,
    before,
    after,
  })

  revalidatePath('/areas/instruccion/admision')
  return { ok: true }
}

/** Cambia el estado de una postulación (revisión de Instrucción) + audita. */
export async function updateAdmissionStatus(input: {
  applicationId: string
  status: AdmissionStatus
  observaciones?: string
}) {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false as const, error: 'Sin permiso' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.admissionApplications,
    Key: { applicationId: input.applicationId },
  }))
  if (!Item) return { ok: false as const, error: 'Postulación no encontrada' }
  const app = Item as AdmissionApplication

  const ts = now()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.admissionApplications,
    Key: { applicationId: input.applicationId },
    UpdateExpression: 'SET #s = :s, observaciones = :o, reviewedBy = :rb, reviewedAt = :ts, updatedAt = :ts',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': input.status,
      ':o': input.observaciones ?? app.observaciones ?? null,
      ':rb': session.user.profileId,
      ':ts': ts,
    },
  }))

  await writeAuditLog({
    entityType: 'admission',
    entityId: input.applicationId,
    entityLabel: app.fullName,
    action: input.status === 'aprobado_siguiente_etapa' ? 'approve'
      : input.status === 'descartado' ? 'reject' : 'status_change',
    ...auditActor(session),
    summary: `${ADMISSION_STATUS_LABELS[input.status]}: postulación de ${app.fullName} (DNI ${app.dni}) — ${app.cohortName ?? app.cohortId}`,
    before: { status: app.status },
    after: { status: input.status, observaciones: input.observaciones },
  })

  revalidatePath('/areas/instruccion/admision')
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────
// Pipeline de admisión (etapas). Cada acción avanza `etapa` + audita.
// ─────────────────────────────────────────────────────────────────────────

/** Marca «WhatsApp enviado»: etapa → contactado + timestamp de contacto. */
export async function marcarWhatsappEnviado(input: { applicationId: string }): Promise<ActionResult> {
  return guardedPatch(input.applicationId, (app, ts) => ({
    updates: { etapa: 'contactado' as AdmissionEtapa, contactadoWhatsappAt: ts },
    action: 'status_change',
    summary: `WhatsApp enviado a ${app.fullName} (DNI ${app.dni})`,
    before: { etapa: app.etapa ?? null },
    after: { etapa: 'contactado' },
  }))
}

/** Registra el resultado de la entrevista personal (apto/observado). */
export async function registrarEntrevista(input: {
  applicationId: string
  resultado: 'apto' | 'observado'
  observacion?: string
  fecha?: string
}): Promise<ActionResult> {
  return guardedPatch(input.applicationId, (app, ts) => ({
    updates: {
      etapa: 'entrevista' as AdmissionEtapa,
      entrevista: {
        resultado: input.resultado,
        observacion: input.observacion || undefined,
        fecha: input.fecha || ts,
      },
    },
    action: 'status_change',
    summary: `Entrevista personal (${input.resultado}) — ${app.fullName} (DNI ${app.dni})`,
    before: { entrevista: app.entrevista ?? null },
    after: { entrevista: { resultado: input.resultado } },
  }))
}

/** Registra el resultado de la evaluación psicológica (apto/observado). */
export async function registrarPsicologica(input: {
  applicationId: string
  resultado: 'apto' | 'observado'
  observacion?: string
  fecha?: string
}): Promise<ActionResult> {
  return guardedPatch(input.applicationId, (app, ts) => ({
    updates: {
      etapa: 'psicologica' as AdmissionEtapa,
      psicologica: {
        resultado: input.resultado,
        observacion: input.observacion || undefined,
        fecha: input.fecha || ts,
      },
    },
    action: 'status_change',
    summary: `Evaluación psicológica (${input.resultado}) — ${app.fullName} (DNI ${app.dni})`,
    before: { psicologica: app.psicologica ?? null },
    after: { psicologica: { resultado: input.resultado } },
  }))
}

/**
 * Programa y/o registra la prueba física.
 * - Sólo `fechaProgramada` → programa la cita (resultado pendiente).
 * - `resultado` (apto/no_apto) → registra el resultado de la prueba.
 */
export async function registrarFisica(input: {
  applicationId: string
  resultado?: 'apto' | 'no_apto'
  fechaProgramada?: string
  fecha?: string
  observacion?: string
}): Promise<ActionResult> {
  return guardedPatch(input.applicationId, (app, ts) => {
    const prev = app.fisica
    return {
      updates: {
        etapa: 'fisica' as AdmissionEtapa,
        fisica: {
          resultado: input.resultado ?? prev?.resultado ?? null,
          observacion: input.observacion ?? prev?.observacion ?? undefined,
          fecha: input.resultado ? (input.fecha || ts) : prev?.fecha ?? undefined,
          fechaProgramada: input.fechaProgramada ?? prev?.fechaProgramada ?? undefined,
        },
      },
      action: 'status_change',
      summary: input.resultado
        ? `Prueba física (${input.resultado}) — ${app.fullName} (DNI ${app.dni})`
        : `Prueba física programada${input.fechaProgramada ? ` para ${input.fechaProgramada}` : ''} — ${app.fullName}`,
      before: { fisica: app.fisica ?? null },
      after: { fisica: { resultado: input.resultado ?? null, fechaProgramada: input.fechaProgramada } },
    }
  })
}

/**
 * Aprueba al postulante: marca la postulación como aprobada Y crea automáticamente
 * su PERFIL (grade postulante, situación formación) para que inicie en la compañía y
 * aparezca en el workspace de Aspirantes y Postulantes. Idempotente por DNI.
 */
export async function aprobarPostulante(input: { applicationId: string }): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.admissionApplications, Key: { applicationId: input.applicationId },
  }))
  if (!Item) return { ok: false, error: 'Postulación no encontrada' }
  const app = Item as AdmissionApplication

  const ts = now()

  // 1) Marcar la postulación como aprobada.
  await ddb.send(new UpdateCommand({
    TableName: TABLE.admissionApplications, Key: { applicationId: input.applicationId },
    UpdateExpression: 'SET etapa = :e, #s = :st, profileCreado = :pc, reviewedBy = :rb, reviewedAt = :ts, updatedAt = :ts',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':e': 'aprobado', ':st': 'aprobado_siguiente_etapa', ':pc': true,
      ':rb': session.user.profileId, ':ts': ts,
    },
  }))

  // 2) Crear el perfil si no existe ya uno con ese DNI (idempotente).
  let profileId: string | undefined
  if (app.dni) {
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE.profiles, IndexName: 'dni-index',
      KeyConditionExpression: 'dni = :d', ExpressionAttributeValues: { ':d': app.dni },
    })).catch(() => ({ Items: [] as any[] }))
    if ((q.Items ?? []).length > 0) profileId = (q.Items as any[])[0].profileId
  }
  if (!profileId) {
    profileId = generateId()
    await ddb.send(new PutCommand({
      TableName: TABLE.profiles,
      Item: {
        profileId,
        fullName: app.fullName,
        ...(app.dni ? { dni: app.dni } : {}),
        grade: 'postulante',
        status: 'postulante',
        situacion: 'formacion',
        ...(app.celular ? { phone: app.celular } : {}),
        ...(app.correo ? { email: app.correo } : {}),
        ...(app.profession ? { profession: app.profession } : {}),
        ...(app.birthDate ? { birthDate: app.birthDate } : {}),
        ...(app.distrito ? { distrito: app.distrito } : {}),
        ...(app.residencia ? { residencia: app.residencia } : {}),
        convocatoriaIngreso: app.cohortId,
        ...(app.cohortName ? { convocatoriaIngresoLabel: app.cohortName } : {}),
        joinDate: ts.split('T')[0],
        createdAt: ts,
        updatedAt: ts,
      },
    }))
  }

  await writeAuditLog({
    entityType: 'admission', entityId: input.applicationId, entityLabel: app.fullName,
    action: 'approve', ...auditActor(session),
    summary: `Aprobado e incorporado a la compañía: ${app.fullName} (DNI ${app.dni}) — ${app.cohortName ?? app.cohortId}`,
    before: { etapa: app.etapa ?? null, status: app.status },
    after: { etapa: 'aprobado', profileId },
  })

  revalidatePath('/areas/instruccion/admision')
  revalidatePath('/areas/instruccion/aspirantes-y-postulantes')
  return { ok: true }
}

/** Descarta al postulante: etapa → descartado + motivo opcional. */
export async function descartarPostulante(input: {
  applicationId: string
  observacion?: string
}): Promise<ActionResult> {
  return guardedPatch(input.applicationId, (app) => ({
    updates: {
      etapa: 'descartado' as AdmissionEtapa,
      status: 'descartado' as AdmissionStatus,
      observaciones: input.observacion || app.observaciones || undefined,
    },
    action: 'reject',
    summary: `Descartado: ${app.fullName} (DNI ${app.dni})${input.observacion ? ` — ${input.observacion}` : ''}`,
    before: { etapa: app.etapa ?? null, status: app.status },
    after: { etapa: 'descartado', status: 'descartado' },
  }))
}

/** Cierra la convocatoria activa: cohorte status → 'cerrada' + audita. */
export async function cerrarConvocatoria(input: { cohortId: string }): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCohorts,
    Key: { cohortId: input.cohortId },
  }))
  if (!Item) return { ok: false, error: 'Convocatoria no encontrada' }
  const cohort = Item as { cohortId: string; name?: string; status?: string }

  const ts = now()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingCohorts,
    Key: { cohortId: input.cohortId },
    UpdateExpression: 'SET #s = :cerrada, updatedAt = :ts',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':cerrada': 'cerrada', ':ts': ts },
  }))

  await writeAuditLog({
    entityType: 'admission',
    entityId: input.cohortId,
    entityLabel: cohort.name ?? input.cohortId,
    action: 'status_change',
    ...auditActor(session),
    summary: `Convocatoria cerrada: ${cohort.name ?? input.cohortId}`,
    before: { status: cohort.status ?? 'activa' },
    after: { status: 'cerrada' },
  })

  revalidatePath('/areas/instruccion/admision')
  return { ok: true }
}

/** URL firmada para ver el CERTIJOVEN de una postulación (solo gestores). */
export async function getCertijovenUrl(certijovenKey: string) {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false as const, error: 'Sin permiso' }
  if (!certijovenKey.startsWith('admission/')) return { ok: false as const, error: 'Key inválida' }
  const url = await getDownloadPresignedUrl(certijovenKey)
  return { ok: true as const, url }
}

/**
 * Abre una nueva convocatoria (cohorte). Solo puede haber una activa a la vez:
 * si ya hay una abierta, la rechaza para no partir el formulario público.
 */
export async function crearConvocatoria(input: {
  name: string; type: string; year: string; period: string
  resolution?: string; startDate?: string; endDate?: string
}): Promise<{ ok: true; cohortId: string } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }
  const name = input.name?.trim()
  if (!name || !input.type || !input.year || !input.period) {
    return { ok: false, error: 'Completa nombre, tipo, año y periodo' }
  }

  // Evitar dos convocatorias activas a la vez.
  const actives = await ddb.send(new ScanCommand({
    TableName: TABLE.trainingCohorts,
    FilterExpression: '#s = :a', ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':a': 'activa' },
  })).catch(() => ({ Items: [] as any[] }))
  if ((actives.Items ?? []).length > 0) {
    return { ok: false, error: 'Ya hay una convocatoria abierta. Ciérrala antes de abrir otra.' }
  }

  const cohortId = generateId()
  const ts = now()
  await ddb.send(new PutCommand({
    TableName: TABLE.trainingCohorts,
    Item: {
      cohortId, name, type: input.type,
      resolution: input.resolution?.trim() || '',
      startDate: input.startDate || '', endDate: input.endDate || '',
      status: 'activa', year: input.year, period: input.period,
      createdBy: (session.user as any).profileId || '',
      createdAt: ts, updatedAt: ts,
    },
  }))

  await writeAuditLog({
    entityType: 'admission', entityId: cohortId, entityLabel: name,
    action: 'create', ...auditActor(session),
    summary: `Convocatoria abierta: ${name}`,
    after: { status: 'activa', year: input.year, period: input.period },
  })
  revalidatePath('/areas/instruccion/admision')
  return { ok: true, cohortId }
}

/** Roster de una convocatoria (para consultar el histórico): estado final de cada postulante. */
export async function getConvocatoriaRoster(cohortId: string): Promise<
  | { ok: true; roster: Array<{ applicationId: string; fullName: string; dni: string; etapa: AdmissionEtapa; ordenLlegada?: number }> }
  | { ok: false; error: string }
> {
  const session = await auth()
  const perms = (session?.user?.permissions ?? []) as Permission[]
  if (!session?.user || (!perms.includes('area.instruction.view') && !perms.includes('area.instruction.manage'))) {
    return { ok: false, error: 'Sin permiso' }
  }
  const apps = await getApplicationsByCohortOrdered(cohortId)
  const roster = apps.map(a => ({
    applicationId: a.applicationId,
    fullName: a.fullName,
    dni: a.dni,
    etapa: (a.etapa ?? 'inscrito') as AdmissionEtapa,
    ordenLlegada: a.ordenLlegada,
  }))
  return { ok: true, roster }
}
