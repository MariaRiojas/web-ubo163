/**
 * Tabla DynamoDB: {PREFIX}-content-calendar
 * PK: eventId
 * GSI: date-index (date → eventId)
 */

export const CONTENT_TYPES = ['post', 'reel', 'video', 'story', 'carousel'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const CONTENT_CATEGORIES = [
  'aniversario', 'cumpleanos', 'fecha_especial', 'prevencion',
  'emergencias', 'reclutamiento', 'reconocimiento', 'comunidad', 'institucional',
] as const
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]

export const CONTENT_STATUSES = [
  'planificado', 'en_proceso', 'publicado', 'cancelado',
] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export interface ContentCalendarItem {
  eventId: string      // PK
  title: string
  date: string         // YYYY-MM-DD (GSI: date-index)
  type?: ContentType
  platform?: string[]  // ['facebook', 'instagram', 'tiktok']
  category?: ContentCategory
  status?: ContentStatus
  assignedTo?: string  // profileId
  templateUrl?: string
  mediaUrls?: string[]
  caption?: string
  notes?: string
  isRecurring?: boolean
  recurrenceRule?: string
  createdAt: string    // ISO 8601
}

export type NewContentCalendarItem = Omit<ContentCalendarItem, 'createdAt'>
