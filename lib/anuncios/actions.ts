"use server"

import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Announcement } from '@/lib/db/schema/announcements'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'

export interface CreateDraftInput {
  title: string
  content: string
  priority: 'normal' | 'importante' | 'urgente'
  originSectionId?: string | null
  audienceAllBomberos: boolean
  audienceGrades: string[]
  audienceAspirantes: boolean
  audiencePostulantes: boolean
  directToProfileId?: string | null
  expiresAt?: string | null
  isPinned?: boolean
  submitForApproval?: boolean
}

// ═══════════════════════════════════════════════════════════════════
// CREAR BORRADOR
// ═══════════════════════════════════════════════════════════════════

export async function createAnnouncementDraft(input: CreateDraftInput) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('announcements.create_draft')) {
    return { ok: false as const, error: 'No tiene permisos para crear anuncios' }
  }
  if (!input.title.trim() || !input.content.trim()) {
    return { ok: false as const, error: 'Título y contenido son obligatorios' }
  }

  const hasAnyAudience =
    !!input.directToProfileId ||
    input.audienceAllBomberos ||
    input.audienceAspirantes ||
    input.audiencePostulantes ||
    (input.audienceGrades && input.audienceGrades.length > 0)
  if (!hasAnyAudience) return { ok: false as const, error: 'Debe seleccionar al menos una audiencia' }

  const isDirect = !!input.directToProfileId
  if (isDirect) {
    const { Item } = await ddb.send(new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId: input.directToProfileId },
    }))
    if (!Item) return { ok: false as const, error: 'Destinatario no encontrado' }
  }

  // Detect origin section from profile's roles
  let originSectionId: string | null = input.originSectionId ?? null
  if (!originSectionId) {
    const { Items } = await ddb.send(new QueryCommand({
      TableName: TABLE.sectionRoles,
      KeyConditionExpression: 'profileId = :pid',
      FilterExpression: 'isActive = :t',
      ExpressionAttributeValues: { ':pid': session.user.profileId, ':t': true },
      Limit: 1,
    }))
    originSectionId = (Items?.[0] as any)?.sectionId ?? null
  }

  const initialStatus = input.submitForApproval ? 'pendiente_aprobacion' : 'borrador'
  const ts = now()
  const announcementId = generateId()

  const item: Announcement = {
    announcementId,
    title: input.title.trim(),
    content: input.content.trim(),
    priority: input.priority,
    status: initialStatus as any,
    authorId: session.user.profileId,
    ...(originSectionId ? { originSectionId } : {}),
    audienceAllBomberos: isDirect ? false : input.audienceAllBomberos,
    audienceGrades: isDirect ? [] : input.audienceGrades,
    audienceAspirantes: isDirect ? false : input.audienceAspirantes,
    audiencePostulantes: isDirect ? false : input.audiencePostulantes,
    ...(input.directToProfileId ? { directToProfileId: input.directToProfileId } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    isPinned: input.isPinned ?? false,
    reads: [],
    createdAt: ts,
    updatedAt: ts,
  }

  await ddb.send(new PutCommand({ TableName: TABLE.announcements, Item: item }))

  revalidatePath('/anuncios')
  return { ok: true as const, id: announcementId, status: initialStatus }
}

// ═══════════════════════════════════════════════════════════════════
// EDITAR BORRADOR
// ═══════════════════════════════════════════════════════════════════

export async function updateAnnouncementDraft(id: string, input: CreateDraftInput) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }
  const existing = Item as Announcement
  if (existing.authorId !== session.user.profileId) return { ok: false as const, error: 'No es el autor' }
  if (!['borrador', 'rechazado'].includes(existing.status)) {
    return { ok: false as const, error: 'Solo se pueden editar borradores o anuncios rechazados' }
  }

  const isDirect = !!input.directToProfileId
  const newStatus = input.submitForApproval ? 'pendiente_aprobacion' : 'borrador'

  await ddb.send(new UpdateCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
    UpdateExpression: `SET title = :t, content = :c, priority = :p, #st = :ns,
      audienceAllBomberos = :ab, audienceGrades = :ag,
      audienceAspirantes = :aa, audiencePostulantes = :aq,
      isPinned = :ip, updatedAt = :ua
      ${isDirect ? ', directToProfileId = :dp' : ', directToProfileId = :null'}
      ${input.expiresAt ? ', expiresAt = :ea' : ''}
      ${input.submitForApproval ? ' REMOVE reviewedBy, reviewedAt, reviewNotes' : ''}`,
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':t': input.title.trim(),
      ':c': input.content.trim(),
      ':p': input.priority,
      ':ns': newStatus,
      ':ab': isDirect ? false : input.audienceAllBomberos,
      ':ag': isDirect ? [] : input.audienceGrades,
      ':aa': isDirect ? false : input.audienceAspirantes,
      ':aq': isDirect ? false : input.audiencePostulantes,
      ':ip': input.isPinned ?? false,
      ':ua': now(),
      ':null': null,
      ...(isDirect ? { ':dp': input.directToProfileId } : {}),
      ...(input.expiresAt ? { ':ea': input.expiresAt } : {}),
    },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const, status: newStatus }
}

// ═══════════════════════════════════════════════════════════════════
// ENVIAR A APROBACIÓN
// ═══════════════════════════════════════════════════════════════════

export async function submitForApproval(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }
  const existing = Item as Announcement
  if (existing.authorId !== session.user.profileId) return { ok: false as const, error: 'No es el autor' }
  if (!['borrador', 'rechazado'].includes(existing.status)) {
    return { ok: false as const, error: 'Solo se pueden enviar borradores o rechazados' }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
    UpdateExpression: 'SET #st = :s, updatedAt = :ua REMOVE reviewedBy, reviewedAt, reviewNotes',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'pendiente_aprobacion', ':ua': now() },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// APROBAR
// ═══════════════════════════════════════════════════════════════════

export async function approveAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('announcements.publish')) {
    return { ok: false as const, error: 'Solo el Primer Jefe puede aprobar anuncios' }
  }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }
  if ((Item as Announcement).status !== 'pendiente_aprobacion') {
    return { ok: false as const, error: 'Solo se pueden aprobar anuncios pendientes' }
  }

  const ts = now()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
    UpdateExpression: 'SET #st = :s, reviewedBy = :rb, reviewedAt = :ra, publishedAt = :pa, updatedAt = :ua REMOVE reviewNotes',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'aprobado', ':rb': session.user.profileId, ':ra': ts, ':pa': ts, ':ua': ts },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// RECHAZAR
// ═══════════════════════════════════════════════════════════════════

export async function rejectAnnouncement(id: string, reason: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('announcements.publish')) {
    return { ok: false as const, error: 'Solo el Primer Jefe puede rechazar anuncios' }
  }
  if (!reason.trim()) return { ok: false as const, error: 'Debe indicar un motivo de rechazo' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }
  if ((Item as Announcement).status !== 'pendiente_aprobacion') {
    return { ok: false as const, error: 'Solo se pueden rechazar anuncios pendientes' }
  }

  const ts = now()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
    UpdateExpression: 'SET #st = :s, reviewedBy = :rb, reviewedAt = :ra, reviewNotes = :rn, updatedAt = :ua',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'rechazado', ':rb': session.user.profileId, ':ra': ts, ':rn': reason.trim(), ':ua': ts },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR COMO LEÍDO
// ═══════════════════════════════════════════════════════════════════

export async function markAnnouncementAsRead(announcementId: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }
  const profileId = session.user.profileId

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId },
    ProjectionExpression: 'reads',
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }

  if (((Item as any).reads ?? []).includes(profileId)) {
    return { ok: true as const, alreadyRead: true as const }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.announcements,
    Key: { announcementId },
    UpdateExpression: 'SET reads = list_append(if_not_exists(reads, :empty), :pid)',
    ExpressionAttributeValues: { ':empty': [], ':pid': [profileId] },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// ARCHIVAR
// ═══════════════════════════════════════════════════════════════════

export async function archiveMyAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }
  const existing = Item as Announcement

  if (existing.authorId !== session.user.profileId) {
    const permissions = (session.user.permissions as Permission[]) ?? []
    if (!permissions.includes('announcements.publish')) {
      return { ok: false as const, error: 'No puede archivar anuncios ajenos' }
    }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
    UpdateExpression: 'SET #st = :s, updatedAt = :ua',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'archivado', ':ua': now() },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// ELIMINAR BORRADOR
// ═══════════════════════════════════════════════════════════════════

export async function deleteMyDraft(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))
  if (!Item) return { ok: false as const, error: 'Anuncio no encontrado' }
  const existing = Item as Announcement
  if (existing.authorId !== session.user.profileId) return { ok: false as const, error: 'No es el autor' }
  if (!['borrador', 'rechazado'].includes(existing.status)) {
    return { ok: false as const, error: 'Solo se pueden eliminar borradores o rechazados' }
  }

  await ddb.send(new DeleteCommand({
    TableName: TABLE.announcements,
    Key: { announcementId: id },
  }))

  revalidatePath('/anuncios')
  return { ok: true as const }
}
