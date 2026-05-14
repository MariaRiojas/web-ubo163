import 'server-only'
import { db } from '@/lib/db'
import {
  announcements,
  announcementReads,
  profiles,
  sections,
  type Announcement,
} from '@/lib/db/schema'
import { and, eq, or, desc, sql, inArray, isNull, not } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS DE SALIDA
// ═══════════════════════════════════════════════════════════════════

export interface AnuncioView {
  id: string
  title: string
  content: string
  priority: 'normal' | 'importante' | 'urgente'
  status: string
  isPinned: boolean
  publishedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  author: {
    id: string
    fullName: string
    grade: string
    codigoCgbvp: string | null
  }
  originSection: {
    id: string
    key: string
    name: string
  } | null
  /** Audiencia serializada en lenguaje humano */
  audienceSummary: string[]
  /** Para vista de buzón: si el efectivo ya leyó */
  isRead?: boolean
  /** Para revisión: notas del revisor */
  reviewNotes?: string | null
  reviewer?: {
    fullName: string
    grade: string
  } | null
  /** Info de destinatario directo (si aplica) */
  directRecipient?: {
    fullName: string
  } | null
}

export interface AnunciosData {
  /** Vista del efectivo: anuncios cuya audiencia lo incluye */
  buzon: AnuncioView[]
  /** Vista del autor: sus propios anuncios (borradores, pendientes, aprobados, rechazados) */
  misAnuncios: AnuncioView[]
  /** Vista del Primer Jefe: pendientes de aprobar */
  pendientesAprobacion: AnuncioView[]
  counts: {
    buzonUnread: number
    misBorradores: number
    misPendientes: number
    misAprobados: number
    misRechazados: number
    pendientesTotal: number
  }
  capabilities: {
    canCreate: boolean      // announcements.create_draft
    canPublish: boolean     // announcements.publish (Primer Jefe)
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const GRADE_LABELS: Record<string, string> = {
  postulante: 'Postulantes',
  aspirante: 'Aspirantes',
  seccionario: 'Seccionarios',
  subteniente: 'Subtenientes',
  teniente: 'Tenientes',
  capitan: 'Capitanes',
  teniente_brigadier: 'Ten. Brigadieres',
  brigadier: 'Brigadieres',
  brigadier_mayor: 'Brig. Mayores',
  brigadier_general: 'Brig. Generales',
}

function buildAudienceSummary(a: Announcement, directRecipientName?: string | null): string[] {
  const tags: string[] = []
  if (a.directToProfileId && directRecipientName) {
    tags.push(`Directo: ${directRecipientName}`)
    return tags
  }
  if (a.audienceAllBomberos) {
    tags.push('Todos los bomberos activos')
  }
  if (a.audienceGrades && a.audienceGrades.length > 0) {
    for (const g of a.audienceGrades) {
      tags.push(GRADE_LABELS[g] ?? g)
    }
  }
  if (a.audienceAspirantes) tags.push('Aspirantes')
  if (a.audiencePostulantes) tags.push('Postulantes')
  if (tags.length === 0) tags.push('Sin audiencia definida')
  return tags
}

// ═══════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export async function getAnunciosData(
  profileId: string,
  capabilities: { canCreate: boolean; canPublish: boolean },
): Promise<AnunciosData> {
  // Perfil del usuario actual
  const me = await db.query.profiles.findFirst({ where: eq(profiles.id, profileId) })
  if (!me) throw new Error('Profile not found')

  const myGrade = me.grade
  const myStatus = me.status
  const isPostulante = myStatus === 'postulante'
  const isAspirante = myStatus === 'aspirante_en_curso'
  const isActivo = myStatus === 'activo' || myStatus === 'reserva'

  // ── Query reusable para JOIN con autor, sección y destinatario ───
  type BaseRow = {
    a: Announcement
    author: {
      id: string
      fullName: string
      grade: string
      codigoCgbvp: string | null
    }
    sectionKey: string | null
    sectionName: string | null
    directName: string | null
    reviewerName: string | null
    reviewerGrade: string | null
  }

  async function querySelect(whereClause: any): Promise<BaseRow[]> {
    const directAlias = profiles
    const reviewerAlias = profiles
    // Drizzle no soporta múltiples aliases del mismo tabla sin alias manual,
    // así que hacemos dos queries separadas si hace falta — aquí simplificamos
    // omitiendo reviewer/direct por ahora y los resolvemos después.
    const rows = await db
      .select({
        a: announcements,
        author: {
          id: profiles.id,
          fullName: profiles.fullName,
          grade: profiles.grade,
          codigoCgbvp: profiles.codigoCgbvp,
        },
        sectionKey: sections.key,
        sectionName: sections.name,
      })
      .from(announcements)
      .innerJoin(profiles, eq(announcements.authorId, profiles.id))
      .leftJoin(sections, eq(announcements.originSectionId, sections.id))
      .where(whereClause)
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt), desc(announcements.createdAt))
      .limit(100)

    return rows.map((r) => ({
      ...r,
      directName: null,
      reviewerName: null,
      reviewerGrade: null,
    }))
  }

  // Resolver nombres de destinatarios directos y revisores en un solo batch
  async function enrichBatch(rows: BaseRow[]): Promise<BaseRow[]> {
    const profileIds = new Set<string>()
    for (const r of rows) {
      if (r.a.directToProfileId) profileIds.add(r.a.directToProfileId)
      if (r.a.reviewedBy) profileIds.add(r.a.reviewedBy)
    }
    if (profileIds.size === 0) return rows

    const extra = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        grade: profiles.grade,
      })
      .from(profiles)
      .where(inArray(profiles.id, Array.from(profileIds)))

    const byId = new Map(extra.map((p) => [p.id, p]))
    return rows.map((r) => ({
      ...r,
      directName: r.a.directToProfileId ? (byId.get(r.a.directToProfileId)?.fullName ?? null) : null,
      reviewerName: r.a.reviewedBy ? (byId.get(r.a.reviewedBy)?.fullName ?? null) : null,
      reviewerGrade: r.a.reviewedBy ? (byId.get(r.a.reviewedBy)?.grade ?? null) : null,
    }))
  }

  function toView(
    row: BaseRow,
    options: { isRead?: boolean } = {},
  ): AnuncioView {
    const a = row.a
    return {
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority as 'normal' | 'importante' | 'urgente',
      status: a.status,
      isPinned: a.isPinned,
      publishedAt: a.publishedAt,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt ?? new Date(),
      author: row.author,
      originSection: row.sectionKey && row.sectionName
        ? { id: a.originSectionId!, key: row.sectionKey, name: row.sectionName }
        : null,
      audienceSummary: buildAudienceSummary(a, row.directName),
      isRead: options.isRead,
      reviewNotes: a.reviewNotes,
      reviewer: row.reviewerName
        ? { fullName: row.reviewerName, grade: row.reviewerGrade ?? '' }
        : null,
      directRecipient: row.directName ? { fullName: row.directName } : null,
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // VISTA 1: BUZÓN DEL EFECTIVO
  // ═══════════════════════════════════════════════════════════════════

  // Condiciones de audiencia:
  // - Anuncio aprobado
  // - No expirado
  // - Cumple al menos una condición:
  //   * directToProfileId = me
  //   * audienceAllBomberos = true Y me es activo/reserva
  //   * me es postulante y audiencePostulantes = true
  //   * me es aspirante y audienceAspirantes = true
  //   * mi grado está en audienceGrades

  const audienceConditions = [
    eq(announcements.directToProfileId, profileId),
  ]
  if (isActivo) {
    audienceConditions.push(eq(announcements.audienceAllBomberos, true))
  }
  if (isAspirante) {
    audienceConditions.push(eq(announcements.audienceAspirantes, true))
  }
  if (isPostulante) {
    audienceConditions.push(eq(announcements.audiencePostulantes, true))
  }
  // Grado específico — usamos ANY para array
  audienceConditions.push(
    sql`${myGrade} = ANY(${announcements.audienceGrades})`,
  )

  const now = new Date()
  const buzonRowsRaw = await querySelect(
    and(
      eq(announcements.status, 'aprobado'),
      or(
        isNull(announcements.expiresAt),
        sql`${announcements.expiresAt} > ${now}`,
      ),
      or(...audienceConditions),
    ),
  )
  const buzonRows = await enrichBatch(buzonRowsRaw)

  // Marcas de lectura
  const buzonIds = buzonRows.map((r) => r.a.id)
  const myReads = buzonIds.length > 0
    ? await db
        .select({ announcementId: announcementReads.announcementId })
        .from(announcementReads)
        .where(
          and(
            eq(announcementReads.profileId, profileId),
            inArray(announcementReads.announcementId, buzonIds),
          ),
        )
    : []
  const readSet = new Set(myReads.map((r) => r.announcementId))

  const buzon = buzonRows.map((r) => toView(r, { isRead: readSet.has(r.a.id) }))
  const buzonUnread = buzon.filter((a) => !a.isRead).length

  // ═══════════════════════════════════════════════════════════════════
  // VISTA 2: MIS ANUNCIOS (como autor)
  // ═══════════════════════════════════════════════════════════════════

  let misAnuncios: AnuncioView[] = []
  const myCounts = {
    misBorradores: 0,
    misPendientes: 0,
    misAprobados: 0,
    misRechazados: 0,
  }
  if (capabilities.canCreate) {
    const misRowsRaw = await querySelect(eq(announcements.authorId, profileId))
    const misRows = await enrichBatch(misRowsRaw)
    misAnuncios = misRows.map((r) => toView(r))

    for (const a of misAnuncios) {
      if (a.status === 'borrador') myCounts.misBorradores++
      else if (a.status === 'pendiente_aprobacion') myCounts.misPendientes++
      else if (a.status === 'aprobado') myCounts.misAprobados++
      else if (a.status === 'rechazado') myCounts.misRechazados++
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // VISTA 3: PENDIENTES DE APROBACIÓN (Primer Jefe)
  // ═══════════════════════════════════════════════════════════════════

  let pendientesAprobacion: AnuncioView[] = []
  if (capabilities.canPublish) {
    const pendRowsRaw = await querySelect(
      eq(announcements.status, 'pendiente_aprobacion'),
    )
    const pendRows = await enrichBatch(pendRowsRaw)
    pendientesAprobacion = pendRows.map((r) => toView(r))
  }

  return {
    buzon,
    misAnuncios,
    pendientesAprobacion,
    counts: {
      buzonUnread,
      ...myCounts,
      pendientesTotal: pendientesAprobacion.length,
    },
    capabilities,
  }
}
