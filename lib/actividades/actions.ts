'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, PutCommand, DeleteCommand, UpdateCommand, generateId, now } from '@/lib/db/dynamodb'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'
import {
  ACTIVITY_TYPES, ACTIVITY_STATUSES,
  type Activity, type ActivityType, type ActivityStatus,
} from '@/lib/db/schema/activities'
import type { Permission } from '@/lib/auth/permissions'

type Result = { ok: true; activityId?: string } | { ok: false; error: string }

const RUTA = '/actividades'

async function requireManage() {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: 'No autenticado' }
  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('activities.manage'))
    return { ok: false as const, error: 'Solo Jefatura y Administración cargan actividades' }
  return { ok: true as const, session }
}

export interface ActividadInput {
  activityId?: string
  title: string
  type: ActivityType
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  entidad?: string
  location?: string
  description?: string
  requiereRepresentante?: boolean
  requiereEscolta?: boolean
  escoltaCantidad?: number
  representanteProfileId?: string
  sectionId?: string
  status?: ActivityStatus
  isPinned?: boolean
}

function validar(input: ActividadInput): string | null {
  if (!input.title?.trim()) return 'El título es obligatorio'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '')) return 'La fecha es obligatoria'
  if (input.endDate && input.endDate < input.date) return 'La fecha de fin no puede ser anterior al inicio'
  if (!ACTIVITY_TYPES.includes(input.type)) return 'Tipo de actividad inválido'
  if (input.status && !ACTIVITY_STATUSES.includes(input.status)) return 'Estado inválido'
  if (input.startTime && !/^\d{2}:\d{2}$/.test(input.startTime)) return 'Hora de inicio inválida'
  if (input.endTime && !/^\d{2}:\d{2}$/.test(input.endTime)) return 'Hora de fin inválida'
  return null
}

/** Quita claves vacías: DynamoDB no acepta undefined y '' ensucia la ficha. */
function limpio(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = v
  }
  return out
}

export async function guardarActividad(input: ActividadInput): Promise<Result> {
  const ctx = await requireManage()
  if (!ctx.ok) return ctx
  const err = validar(input)
  if (err) return { ok: false, error: err }

  const ts = now()
  const profileId = (ctx.session.user as any).profileId as string
  const esNueva = !input.activityId
  const activityId = input.activityId ?? generateId()

  const base = limpio({
    title: input.title.trim(),
    type: input.type,
    date: input.date,
    endDate: input.endDate,
    startTime: input.startTime,
    endTime: input.endTime,
    entidad: input.entidad?.trim(),
    location: input.location?.trim(),
    description: input.description?.trim(),
    requiereRepresentante: input.requiereRepresentante ?? false,
    requiereEscolta: input.requiereEscolta ?? false,
    escoltaCantidad: input.requiereEscolta ? (input.escoltaCantidad ?? 0) : undefined,
    representanteProfileId: input.representanteProfileId,
    sectionId: input.sectionId,
    status: input.status ?? 'programada',
    isPinned: input.isPinned ?? false,
  })

  let anterior: Activity | undefined
  if (!esNueva) {
    const { Item } = await ddb.send(new GetCommand({ TableName: TABLE.activities, Key: { activityId } }))
    if (!Item) return { ok: false, error: 'La actividad ya no existe' }
    anterior = Item as Activity
  }

  const item: Activity = {
    ...(base as any),
    activityId,
    createdBy: anterior?.createdBy ?? profileId,
    createdAt: anterior?.createdAt ?? ts,
    updatedAt: ts,
  }

  await ddb.send(new PutCommand({ TableName: TABLE.activities, Item: item }))

  await writeAuditLog({
    entityType: 'activity',
    entityId: activityId,
    entityLabel: item.title,
    action: esNueva ? 'create' : 'update',
    ...auditActor(ctx.session),
    summary: `${esNueva ? 'Creó' : 'Actualizó'} la actividad "${item.title}" del ${item.date}`,
    ...(anterior ? { before: { title: anterior.title, date: anterior.date, status: anterior.status } } : {}),
    after: { title: item.title, date: item.date, status: item.status },
  })

  revalidatePath(RUTA)
  revalidatePath('/dashboard')
  return { ok: true, activityId }
}

export async function cambiarEstadoActividad(
  activityId: string,
  status: ActivityStatus,
): Promise<Result> {
  const ctx = await requireManage()
  if (!ctx.ok) return ctx
  if (!ACTIVITY_STATUSES.includes(status)) return { ok: false, error: 'Estado inválido' }

  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE.activities,
      Key: { activityId },
      UpdateExpression: 'SET #s = :s, updatedAt = :ts',
      ConditionExpression: 'attribute_exists(activityId)',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status, ':ts': now() },
    }))
  } catch (e: any) {
    if (e?.name === 'ConditionalCheckFailedException') return { ok: false, error: 'La actividad ya no existe' }
    return { ok: false, error: 'No se pudo actualizar' }
  }

  revalidatePath(RUTA)
  return { ok: true }
}

export async function eliminarActividad(activityId: string): Promise<Result> {
  const ctx = await requireManage()
  if (!ctx.ok) return ctx

  const { Item } = await ddb.send(new GetCommand({ TableName: TABLE.activities, Key: { activityId } }))
  if (!Item) return { ok: false, error: 'La actividad ya no existe' }

  await ddb.send(new DeleteCommand({ TableName: TABLE.activities, Key: { activityId } }))
  await writeAuditLog({
    entityType: 'activity',
    entityId: activityId,
    entityLabel: (Item as Activity).title,
    action: 'delete',
    ...auditActor(ctx.session),
    summary: `Eliminó la actividad "${(Item as Activity).title}" del ${(Item as Activity).date}`,
    before: { title: (Item as Activity).title, date: (Item as Activity).date },
  })

  revalidatePath(RUTA)
  return { ok: true }
}
