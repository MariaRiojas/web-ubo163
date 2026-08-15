import 'server-only'
import { ddb, TABLE, GetCommand, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Announcement } from '@/lib/db/schema/announcements'
import type { Profile } from '@/lib/db/schema/profiles'
import type { Section } from '@/lib/db/schema/sections'

export interface AnuncioView {
  id: string
  title: string
  content: string
  priority: 'normal' | 'importante' | 'urgente'
  status: string
  isPinned: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
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
  audienceSummary: string[]
  isRead?: boolean
  reviewNotes?: string | null
  reviewer?: { fullName: string; grade: string } | null
  directRecipient?: { fullName: string } | null
}

export interface AnunciosData {
  buzon: AnuncioView[]
  misAnuncios: AnuncioView[]
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
    canCreate: boolean
    canPublish: boolean
  }
}

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
  if (a.directToProfileId && directRecipientName) return [`Directo: ${directRecipientName}`]
  const tags: string[] = []
  if (a.audienceAllBomberos) tags.push('Todos los bomberos activos')
  for (const g of a.audienceGrades ?? []) tags.push(GRADE_LABELS[g] ?? g)
  if (a.audienceAspirantes) tags.push('Aspirantes')
  if (a.audiencePostulantes) tags.push('Postulantes')
  if (tags.length === 0) tags.push('Sin audiencia definida')
  return tags
}

function matchesAudience(
  a: Announcement,
  profileId: string,
  myGrade: string,
  myStatus: string,
): boolean {
  if (a.directToProfileId === profileId) return true
  const isActivo = myStatus === 'activo' || myStatus === 'reserva'
  const isAspirante = myStatus === 'aspirante_en_curso'
  const isPostulante = myStatus === 'postulante'
  if (a.audienceAllBomberos && isActivo) return true
  if (a.audienceAspirantes && isAspirante) return true
  if (a.audiencePostulantes && isPostulante) return true
  if ((a.audienceGrades ?? []).includes(myGrade)) return true
  return false
}

async function enrichProfiles(
  announcements: Announcement[],
): Promise<{
  authorsById: Map<string, Profile>
  sectionsById: Map<string, Section>
  extraProfilesById: Map<string, Profile>
}> {
  const authorIds = [...new Set(announcements.map(a => a.authorId))]
  const sectionIds = [...new Set(announcements.map(a => a.originSectionId).filter(Boolean) as string[])]
  const extraIds = [...new Set([
    ...announcements.map(a => a.directToProfileId).filter(Boolean) as string[],
    ...announcements.map(a => a.reviewedBy).filter(Boolean) as string[],
  ])]

  const [authorsResult, sectionsResult, extraResult] = await Promise.all([
    authorIds.length > 0
      ? ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: authorIds.map(id => ({ profileId: id })),
              ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
            },
          },
        }))
      : Promise.resolve({ Responses: {} }),
    sectionIds.length > 0
      ? ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.sections]: {
              Keys: sectionIds.map(id => ({ sectionId: id })),
              ProjectionExpression: 'sectionId, #k, #n',
              ExpressionAttributeNames: { '#k': 'key', '#n': 'name' },
            },
          },
        }))
      : Promise.resolve({ Responses: {} }),
    extraIds.length > 0
      ? ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: extraIds.map(id => ({ profileId: id })),
              ProjectionExpression: 'profileId, fullName, grade',
            },
          },
        }))
      : Promise.resolve({ Responses: {} }),
  ])

  const authorsById = new Map<string, Profile>()
  for (const p of authorsResult.Responses?.[TABLE.profiles] ?? []) {
    authorsById.set(p.profileId as string, p as Profile)
  }
  const sectionsById = new Map<string, Section>()
  for (const s of sectionsResult.Responses?.[TABLE.sections] ?? []) {
    sectionsById.set(s.sectionId as string, s as Section)
  }
  const extraProfilesById = new Map<string, Profile>()
  for (const p of extraResult.Responses?.[TABLE.profiles] ?? []) {
    extraProfilesById.set(p.profileId as string, p as Profile)
  }

  return { authorsById, sectionsById, extraProfilesById }
}

function toView(
  a: Announcement,
  authorsById: Map<string, Profile>,
  sectionsById: Map<string, Section>,
  extraProfilesById: Map<string, Profile>,
  options: { isRead?: boolean; profileId: string } = { profileId: '' },
): AnuncioView {
  const author = authorsById.get(a.authorId)
  const section = a.originSectionId ? sectionsById.get(a.originSectionId) : null
  const directRecipient = a.directToProfileId ? extraProfilesById.get(a.directToProfileId) : null
  const reviewer = a.reviewedBy ? extraProfilesById.get(a.reviewedBy) : null
  return {
    id: a.announcementId,
    title: a.title,
    content: a.content,
    priority: a.priority,
    status: a.status,
    isPinned: a.isPinned,
    publishedAt: a.publishedAt ?? null,
    expiresAt: a.expiresAt ?? null,
    createdAt: a.createdAt,
    author: {
      id: a.authorId,
      fullName: author?.fullName ?? '',
      grade: author?.grade ?? '',
      codigoCgbvp: author?.codigoCgbvp ?? null,
    },
    originSection: section
      ? { id: section.sectionId, key: section.key, name: section.name }
      : null,
    audienceSummary: buildAudienceSummary(a, directRecipient?.fullName),
    isRead: options.isRead,
    reviewNotes: a.reviewNotes ?? null,
    reviewer: reviewer ? { fullName: reviewer.fullName, grade: reviewer.grade } : null,
    directRecipient: directRecipient ? { fullName: directRecipient.fullName } : null,
  }
}

export async function getAnunciosData(
  profileId: string,
  capabilities: { canCreate: boolean; canPublish: boolean },
): Promise<AnunciosData> {
  const { Item: profileItem } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId },
  }))
  if (!profileItem) throw new Error('Profile not found')
  const me = profileItem as Profile
  const myGrade = me.grade
  const myStatus = me.status
  const nowIso = new Date().toISOString()

  // Parallel: scan approved for buzón, scan by author, query pending for jefe
  const [approvedResult, authorResult, pendingResult] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.announcements,
      IndexName: 'status-createdAt-index',
      KeyConditionExpression: '#st = :aprobado',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':aprobado': 'aprobado' },
      ScanIndexForward: false,
      Limit: 100,
    })),
    capabilities.canCreate
      ? ddb.send(new ScanCommand({
          TableName: TABLE.announcements,
          FilterExpression: 'authorId = :pid',
          ExpressionAttributeValues: { ':pid': profileId },
          Limit: 100,
        }))
      : Promise.resolve({ Items: [] }),
    capabilities.canPublish
      ? ddb.send(new QueryCommand({
          TableName: TABLE.announcements,
          IndexName: 'status-createdAt-index',
          KeyConditionExpression: '#st = :pend',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':pend': 'pendiente_aprobacion' },
          ScanIndexForward: false,
          Limit: 50,
        }))
      : Promise.resolve({ Items: [] }),
  ])

  // Filter approved announcements for buzón (audience + not expired)
  const allApproved = (approvedResult.Items ?? []) as Announcement[]
  const buzonRaw = allApproved.filter(a => {
    if (a.expiresAt && a.expiresAt < nowIso) return false
    return matchesAudience(a, profileId, myGrade, myStatus)
  })

  // Sort: pinned first, then by publishedAt desc
  buzonRaw.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)
  })

  const misAnunciosRaw = (authorResult.Items ?? []) as Announcement[]
  misAnunciosRaw.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const pendRaw = (pendingResult.Items ?? []) as Announcement[]
  pendRaw.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Enrich with profile/section data
  const allAnnouncements = [...buzonRaw, ...misAnunciosRaw, ...pendRaw]
  const { authorsById, sectionsById, extraProfilesById } = await enrichProfiles(allAnnouncements)

  // Read tracking: reads are stored as string[] on each announcement item
  const buzon = buzonRaw.map(a => {
    const isRead = (a.reads ?? []).includes(profileId)
    return toView(a, authorsById, sectionsById, extraProfilesById, { isRead, profileId })
  })
  const buzonUnread = buzon.filter(a => !a.isRead).length

  const misAnuncios = misAnunciosRaw.map(a =>
    toView(a, authorsById, sectionsById, extraProfilesById, { profileId }),
  )
  const myCounts = {
    misBorradores: misAnuncios.filter(a => a.status === 'borrador').length,
    misPendientes: misAnuncios.filter(a => a.status === 'pendiente_aprobacion').length,
    misAprobados: misAnuncios.filter(a => a.status === 'aprobado').length,
    misRechazados: misAnuncios.filter(a => a.status === 'rechazado').length,
  }

  const pendientesAprobacion = pendRaw.map(a =>
    toView(a, authorsById, sectionsById, extraProfilesById, { profileId }),
  )

  return {
    buzon,
    misAnuncios,
    pendientesAprobacion,
    counts: { buzonUnread, ...myCounts, pendientesTotal: pendientesAprobacion.length },
    capabilities,
  }
}
