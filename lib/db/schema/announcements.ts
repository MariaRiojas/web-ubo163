/**
 * Tabla DynamoDB: {PREFIX}-announcements
 * PK: announcementId
 * GSI: status-createdAt-index (status → createdAt)
 */

export const ANNOUNCEMENT_STATUSES = [
  'borrador',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado',
  'archivado',
] as const
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

export const ANNOUNCEMENT_PRIORITIES = ['normal', 'importante', 'urgente'] as const
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number]

export interface Announcement {
  announcementId: string         // PK
  title: string
  content: string
  priority: AnnouncementPriority
  status: AnnouncementStatus     // GSI: status-createdAt-index
  authorId: string               // profileId
  originSectionId?: string
  audienceAllBomberos: boolean
  audienceGrades?: string[]
  audienceAspirantes: boolean
  audiencePostulantes: boolean
  directToProfileId?: string
  reviewedBy?: string            // profileId
  reviewedAt?: string
  reviewNotes?: string
  publishedAt?: string
  expiresAt?: string
  isPinned: boolean
  reads?: string[]               // denormalizado: lista de profileIds que leyeron
  createdAt: string              // ISO 8601 (SK en GSI)
  updatedAt: string
}

export type NewAnnouncement = Omit<Announcement, 'createdAt' | 'updatedAt'>
