'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, now } from '@/lib/db/dynamodb'
import { detectarTurno, periodoKey } from '@/lib/turnos'
import { esEfectivoActivo } from './get-data'
import {
  INSPECTION_ITEM_STATUSES, type InspectionItemStatus,
  type MachineInspection, type InspectionItemResult,
} from '@/lib/db/schema/machine-inspection'

type Result = { ok: true } | { ok: false; error: string }

type ActivoCtx = { ok: false; error: string } | { ok: true; profileId: string; name: string }

async function requireActivo(): Promise<ActivoCtx> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  const profileId = session.user.profileId as string
  if (!profileId) return { ok: false, error: 'Perfil no encontrado' }
  const { Item: profile } = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId } }))
  if (!profile) return { ok: false, error: 'Perfil no encontrado' }
  if (!esEfectivoActivo((profile as any).grade, (profile as any).status))
    return { ok: false, error: 'Solo efectivos activos (seccionario o superior) pueden registrar el checklist' }
  return { ok: true, profileId, name: (profile as any).fullName as string }
}

/**
 * Marca (o actualiza) el resultado de un ítem en el checklist del TURNO VIGENTE.
 * La cadencia es por turno de piloto (07:00 / 15:00 / 23:00), no por día.
 */
export async function marcarItemInspeccion(input: {
  maquinaRef: string
  itemId: string
  status: InspectionItemStatus
  observacion?: string
}): Promise<Result> {
  const ctx = await requireActivo()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  if (!input.maquinaRef || !input.itemId) return { ok: false, error: 'Datos incompletos' }
  if (!INSPECTION_ITEM_STATUSES.includes(input.status)) return { ok: false, error: 'Estado inválido' }
  if ((input.status === 'faltante' || input.status === 'danado') && !input.observacion?.trim())
    return { ok: false, error: 'Agrega una observación para ítems faltantes o dañados' }

  const t = detectarTurno()
  const periodo = periodoKey(t.fecha, t.turno)
  const ts = now()
  const result: InspectionItemResult = {
    status: input.status,
    ...(input.observacion?.trim() ? { observacion: input.observacion.trim() } : {}),
    byProfileId: ctx.profileId,
    byName: ctx.name,
    at: ts,
  }

  // Asegurar que exista el registro del turno, luego setear el resultado del ítem.
  const base: MachineInspection = {
    maquinaRef: input.maquinaRef, date: periodo, fecha: t.fecha, turno: t.turno,
    results: {}, createdAt: ts, updatedAt: ts,
  }
  await ddb.send(new PutCommand({
    TableName: TABLE.machineInspections,
    Item: base,
    ConditionExpression: 'attribute_not_exists(maquinaRef)',
  })).catch(() => { /* ya existe el del turno */ })

  await ddb.send(new UpdateCommand({
    TableName: TABLE.machineInspections,
    Key: { maquinaRef: input.maquinaRef, date: periodo },
    UpdateExpression: 'SET results.#i = :r, updatedAt = :u',
    ExpressionAttributeNames: { '#i': input.itemId },
    ExpressionAttributeValues: { ':r': result, ':u': ts },
  }))

  revalidatePath(`/parque-motor/${encodeURIComponent(input.maquinaRef)}`)
  revalidatePath('/parque-motor')
  return { ok: true }
}

/** Quita la marca de un ítem (por si se marcó por error). */
export async function limpiarItemInspeccion(input: { maquinaRef: string; itemId: string }): Promise<Result> {
  const ctx = await requireActivo()
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const t = detectarTurno()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.machineInspections,
    Key: { maquinaRef: input.maquinaRef, date: periodoKey(t.fecha, t.turno) },
    UpdateExpression: 'REMOVE results.#i SET updatedAt = :u',
    ExpressionAttributeNames: { '#i': input.itemId },
    ExpressionAttributeValues: { ':u': now() },
  })).catch(() => {})
  revalidatePath(`/parque-motor/${encodeURIComponent(input.maquinaRef)}`)
  return { ok: true }
}
