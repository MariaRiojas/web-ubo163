"use server"

import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, generateId, now } from '@/lib/db/dynamodb'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'
import type { ContentType, ContentCategory, ContentStatus } from '@/lib/db/schema/content-calendar'

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

async function requireImageManage(): Promise<string> {
  const session = await auth()
  if (!session?.user?.profileId) throw new Error('No autenticado')
  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.image.manage')) throw new Error('Sin permiso de gestión de imagen')
  return session.user.profileId as string
}

// ── Calendario ──────────────────────────────────────────────────────────────

export async function createCalendarEvent(input: {
  title: string
  date: string
  type?: ContentType
  platform?: string[]
  category?: ContentCategory
  caption?: string
  notes?: string
}): Promise<Result<{ eventId: string }>> {
  try {
    await requireImageManage()
    const eventId = generateId()
    await ddb.send(new PutCommand({
      TableName: TABLE.contentCalendar,
      Item: {
        eventId,
        ...input,
        status: 'planificado' as ContentStatus,
        createdAt: now(),
      },
    }))
    revalidatePath('/areas/imagen', 'layout')
    return { ok: true, data: { eventId } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function updateCalendarEventStatus(
  eventId: string,
  status: ContentStatus,
): Promise<Result> {
  try {
    await requireImageManage()
    await ddb.send(new UpdateCommand({
      TableName: TABLE.contentCalendar,
      Key: { eventId },
      UpdateExpression: 'SET #st = :s',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':s': status },
    }))
    revalidatePath('/areas/imagen', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<Result> {
  try {
    await requireImageManage()
    await ddb.send(new DeleteCommand({
      TableName: TABLE.contentCalendar,
      Key: { eventId },
    }))
    revalidatePath('/areas/imagen', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── Comunicados ─────────────────────────────────────────────────────────────

export async function createComunicado(input: {
  title: string
  content: string
  priority: 'normal' | 'importante' | 'urgente'
  audienceAllBomberos: boolean
  audienceGrades?: string[]
  sectionId: string
}): Promise<Result<{ announcementId: string }>> {
  try {
    const authorId = await requireImageManage()
    const announcementId = generateId()
    const ts = now()
    await ddb.send(new PutCommand({
      TableName: TABLE.announcements,
      Item: {
        announcementId,
        title: input.title,
        content: input.content,
        priority: input.priority,
        status: 'borrador',
        authorId,
        originSectionId: input.sectionId,
        audienceAllBomberos: input.audienceAllBomberos,
        audienceGrades: input.audienceGrades ?? [],
        audienceAspirantes: false,
        audiencePostulantes: false,
        isPinned: false,
        createdAt: ts,
        updatedAt: ts,
      },
    }))
    revalidatePath('/areas/imagen', 'layout')
    return { ok: true, data: { announcementId } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function submitComunicadoForApproval(announcementId: string): Promise<Result> {
  try {
    const profileId = await requireImageManage()
    await ddb.send(new UpdateCommand({
      TableName: TABLE.announcements,
      Key: { announcementId },
      UpdateExpression: 'SET #st = :s, updatedAt = :u',
      ConditionExpression: '#st = :d AND authorId = :a',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':s': 'pendiente_aprobacion',
        ':d': 'borrador',
        ':u': now(),
        ':a': profileId,
      },
    }))
    revalidatePath('/areas/imagen', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
