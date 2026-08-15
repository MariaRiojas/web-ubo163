"use server"

import { ddb, TABLE, GetCommand, UpdateCommand, now } from '@/lib/db/dynamodb'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { IncidentStatus } from '@/lib/db/schema/incidents'
import type { AreaRequestStatus } from '@/lib/db/schema/requests'
import type { InternalRequestStatus } from '@/lib/db/schema/internal-requests'
import type { Permission } from '@/lib/auth/permissions'

async function requireAreaManage(): Promise<string> {
  const session = await auth()
  if (!session?.user?.profileId) throw new Error('No autenticado')
  const perms = (session.user.permissions ?? []) as Permission[]
  const ok = perms.some(p => (p as string).startsWith('area.') && (p as string).endsWith('.manage'))
  if (!ok) throw new Error('Sin permiso para gestionar bandeja')
  return session.user.profileId as string
}

export async function updateIncidentStatus(
  incidentId: string,
  newStatus: IncidentStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let profileId: string
  try { profileId = await requireAreaManage() }
  catch (e) { return { ok: false, error: (e as Error).message } }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.incidents,
    Key: { incidentId },
  }))
  if (!Item) return { ok: false, error: 'Incidencia no encontrada' }

  const ts = now()
  const terminal = newStatus === 'resuelta' || newStatus === 'rechazada'

  await ddb.send(new UpdateCommand({
    TableName: TABLE.incidents,
    Key: { incidentId },
    UpdateExpression: `SET #st = :s, updatedAt = :ua${terminal ? ', resolvedAt = :ra' : ''}`,
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':s': newStatus,
      ':ua': ts,
      ...(terminal ? { ':ra': ts } : {}),
    },
  }))

  revalidatePath('/areas', 'layout')
  return { ok: true }
}

export async function updateRequerimientoStatus(
  requestId: string,
  newStatus: InternalRequestStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let profileId: string
  try { profileId = await requireAreaManage() }
  catch (e) { return { ok: false, error: (e as Error).message } }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.internalRequests,
    Key: { requestId },
  }))
  if (!Item) return { ok: false, error: 'Requerimiento no encontrado' }

  const ts = now()
  const isReviewed = ['aprobada', 'rechazada'].includes(newStatus)
  const isResolved = newStatus === 'completada'

  await ddb.send(new UpdateCommand({
    TableName: TABLE.internalRequests,
    Key: { requestId },
    UpdateExpression: [
      'SET #st = :s, updatedAt = :ua',
      isReviewed ? ', approvedBy = :ab' : '',
      isResolved ? ', resolvedAt = :ra' : '',
    ].join(''),
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':s': newStatus,
      ':ua': ts,
      ...(isReviewed ? { ':ab': profileId } : {}),
      ...(isResolved ? { ':ra': ts } : {}),
    },
  }))

  revalidatePath('/areas', 'layout')
  return { ok: true }
}

export async function updateRequestStatus(
  requestId: string,
  newStatus: AreaRequestStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let profileId: string
  try { profileId = await requireAreaManage() }
  catch (e) { return { ok: false, error: (e as Error).message } }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.requests,
    Key: { requestId },
  }))
  if (!Item) return { ok: false, error: 'Solicitud no encontrada' }

  const ts = now()
  const isReviewed = ['aprobada', 'rechazada'].includes(newStatus)
  const isResolved = ['completada', 'cancelada'].includes(newStatus)

  await ddb.send(new UpdateCommand({
    TableName: TABLE.requests,
    Key: { requestId },
    UpdateExpression: [
      'SET #st = :s, updatedAt = :ua',
      isReviewed ? ', reviewedAt = :rvat, reviewedBy = :rvby' : '',
      isResolved ? ', resolvedAt = :ra' : '',
    ].join(''),
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':s': newStatus,
      ':ua': ts,
      ...(isReviewed ? { ':rvat': ts, ':rvby': profileId } : {}),
      ...(isResolved ? { ':ra': ts } : {}),
    },
  }))

  revalidatePath('/areas', 'layout')
  return { ok: true }
}
