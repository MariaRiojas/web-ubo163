"use server"

import { db } from '@/lib/db'
import {
  announcements,
  announcementReads,
  sectionRoles,
  sections,
  profiles,
} from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

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
  /** Si es true, se envía directamente a aprobación al crear */
  submitForApproval?: boolean
}

// ═══════════════════════════════════════════════════════════════════
// CREAR BORRADOR
// ═══════════════════════════════════════════════════════════════════

export async function createAnnouncementDraft(input: CreateDraftInput) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('announcements.create_draft')) {
    return { ok: false as const, error: 'No tiene permisos para crear anuncios' }
  }

  if (!input.title.trim() || !input.content.trim()) {
    return { ok: false as const, error: 'Título y contenido son obligatorios' }
  }

  // Validar audiencia
  const hasAnyAudience =
    !!input.directToProfileId ||
    input.audienceAllBomberos ||
    input.audienceAspirantes ||
    input.audiencePostulantes ||
    (input.audienceGrades && input.audienceGrades.length > 0)
  if (!hasAnyAudience) {
    return {
      ok: false as const,
      error: 'Debe seleccionar al menos una audiencia',
    }
  }

  // Si es directo a una persona, los otros filtros no se aplican
  const isDirect = !!input.directToProfileId
  if (isDirect) {
    const targetProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, input.directToProfileId!),
    })
    if (!targetProfile) {
      return { ok: false as const, error: 'Destinatario no encontrado' }
    }
  }

  // Determinar originSection
  let originSectionId: string | null = null
  if (input.originSectionId) {
    const section = await db.query.sections.findFirst({
      where: eq(sections.id, input.originSectionId),
    })
    if (!section) {
      return { ok: false as const, error: 'Sección origen inválida' }
    }
    originSectionId = section.id
  } else {
    // Detectar sección del autor — tomamos la primera donde tenga rol jefe activo
    const roles = await db
      .select({ sectionId: sectionRoles.sectionId })
      .from(sectionRoles)
      .where(
        and(
          eq(sectionRoles.profileId, session.user.profileId),
          eq(sectionRoles.isActive, true),
        ),
      )
      .limit(1)
    originSectionId = roles[0]?.sectionId ?? null
  }

  const initialStatus = input.submitForApproval ? 'pendiente_aprobacion' : 'borrador'

  const [created] = await db
    .insert(announcements)
    .values({
      title: input.title.trim(),
      content: input.content.trim(),
      priority: input.priority,
      status: initialStatus,
      authorId: session.user.profileId,
      originSectionId,
      audienceAllBomberos: isDirect ? false : input.audienceAllBomberos,
      audienceGrades: isDirect ? [] : input.audienceGrades,
      audienceAspirantes: isDirect ? false : input.audienceAspirantes,
      audiencePostulantes: isDirect ? false : input.audiencePostulantes,
      directToProfileId: input.directToProfileId ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isPinned: input.isPinned ?? false,
    })
    .returning({ id: announcements.id })

  revalidatePath('/anuncios')
  return { ok: true as const, id: created.id, status: initialStatus }
}

// ═══════════════════════════════════════════════════════════════════
// EDITAR BORRADOR PROPIO
// ═══════════════════════════════════════════════════════════════════

export async function updateAnnouncementDraft(
  id: string,
  input: CreateDraftInput,
) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  })
  if (!existing) return { ok: false as const, error: 'Anuncio no encontrado' }
  if (existing.authorId !== session.user.profileId) {
    return { ok: false as const, error: 'No es el autor' }
  }
  if (!['borrador', 'rechazado'].includes(existing.status)) {
    return {
      ok: false as const,
      error: 'Solo se pueden editar borradores o anuncios rechazados',
    }
  }

  const isDirect = !!input.directToProfileId
  const newStatus = input.submitForApproval ? 'pendiente_aprobacion' : 'borrador'

  await db
    .update(announcements)
    .set({
      title: input.title.trim(),
      content: input.content.trim(),
      priority: input.priority,
      status: newStatus,
      originSectionId: input.originSectionId ?? existing.originSectionId,
      audienceAllBomberos: isDirect ? false : input.audienceAllBomberos,
      audienceGrades: isDirect ? [] : input.audienceGrades,
      audienceAspirantes: isDirect ? false : input.audienceAspirantes,
      audiencePostulantes: isDirect ? false : input.audiencePostulantes,
      directToProfileId: input.directToProfileId ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isPinned: input.isPinned ?? false,
      // Si se re-envía después de rechazo, limpiamos review
      reviewedBy: input.submitForApproval ? null : existing.reviewedBy,
      reviewedAt: input.submitForApproval ? null : existing.reviewedAt,
      reviewNotes: input.submitForApproval ? null : existing.reviewNotes,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id))

  revalidatePath('/anuncios')
  return { ok: true as const, status: newStatus }
}

// ═══════════════════════════════════════════════════════════════════
// ENVIAR A APROBACIÓN (draft → pendiente)
// ═══════════════════════════════════════════════════════════════════

export async function submitForApproval(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  })
  if (!existing) return { ok: false as const, error: 'Anuncio no encontrado' }
  if (existing.authorId !== session.user.profileId) {
    return { ok: false as const, error: 'No es el autor' }
  }
  if (!['borrador', 'rechazado'].includes(existing.status)) {
    return {
      ok: false as const,
      error: 'Solo se pueden enviar borradores o rechazados',
    }
  }

  await db
    .update(announcements)
    .set({
      status: 'pendiente_aprobacion',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// APROBAR (Primer Jefe)
// ═══════════════════════════════════════════════════════════════════

export async function approveAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('announcements.publish')) {
    return {
      ok: false as const,
      error: 'Solo el Primer Jefe puede aprobar anuncios',
    }
  }

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  })
  if (!existing) return { ok: false as const, error: 'Anuncio no encontrado' }
  if (existing.status !== 'pendiente_aprobacion') {
    return {
      ok: false as const,
      error: 'Solo se pueden aprobar anuncios pendientes',
    }
  }

  const now = new Date()
  await db
    .update(announcements)
    .set({
      status: 'aprobado',
      reviewedBy: session.user.profileId,
      reviewedAt: now,
      reviewNotes: null,
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(announcements.id, id))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// RECHAZAR (Primer Jefe)
// ═══════════════════════════════════════════════════════════════════

export async function rejectAnnouncement(id: string, reason: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('announcements.publish')) {
    return {
      ok: false as const,
      error: 'Solo el Primer Jefe puede rechazar anuncios',
    }
  }
  if (!reason.trim()) {
    return { ok: false as const, error: 'Debe indicar un motivo de rechazo' }
  }

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  })
  if (!existing) return { ok: false as const, error: 'Anuncio no encontrado' }
  if (existing.status !== 'pendiente_aprobacion') {
    return {
      ok: false as const,
      error: 'Solo se pueden rechazar anuncios pendientes',
    }
  }

  await db
    .update(announcements)
    .set({
      status: 'rechazado',
      reviewedBy: session.user.profileId,
      reviewedAt: new Date(),
      reviewNotes: reason.trim(),
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// MARCAR COMO LEÍDO
// ═══════════════════════════════════════════════════════════════════

export async function markAnnouncementAsRead(announcementId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  // Verificar si ya fue leído
  const existing = await db.query.announcementReads.findFirst({
    where: and(
      eq(announcementReads.announcementId, announcementId),
      eq(announcementReads.profileId, session.user.profileId),
    ),
  })
  if (existing) return { ok: true as const, alreadyRead: true as const }

  await db.insert(announcementReads).values({
    announcementId,
    profileId: session.user.profileId,
  })

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// ARCHIVAR PROPIO
// ═══════════════════════════════════════════════════════════════════

export async function archiveMyAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  })
  if (!existing) return { ok: false as const, error: 'Anuncio no encontrado' }
  if (existing.authorId !== session.user.profileId) {
    const permissions = (session.user.permissions as Permission[]) ?? []
    if (!permissions.includes('announcements.publish')) {
      return { ok: false as const, error: 'No puede archivar anuncios ajenos' }
    }
  }

  await db
    .update(announcements)
    .set({ status: 'archivado', updatedAt: new Date() })
    .where(eq(announcements.id, id))

  revalidatePath('/anuncios')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// ELIMINAR BORRADOR PROPIO
// ═══════════════════════════════════════════════════════════════════

export async function deleteMyDraft(id: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  })
  if (!existing) return { ok: false as const, error: 'Anuncio no encontrado' }
  if (existing.authorId !== session.user.profileId) {
    return { ok: false as const, error: 'No es el autor' }
  }
  if (!['borrador', 'rechazado'].includes(existing.status)) {
    return {
      ok: false as const,
      error: 'Solo se pueden eliminar borradores o rechazados',
    }
  }

  await db.delete(announcements).where(eq(announcements.id, id))

  revalidatePath('/anuncios')
  return { ok: true as const }
}
