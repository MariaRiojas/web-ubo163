/**
 * Solicitudes inter-áreas.
 *
 * Tabla DynamoDB: {PREFIX}-requests
 * PK: requestId
 * GSI: sectionId-createdAt-index (targetSectionId → createdAt)
 */

export const AREA_REQUEST_CATEGORIES = [
  'repuesto', 'reparacion', 'reposicion_insumo', 'mantenimiento',
  'capacitacion', 'permiso', 'otro',
] as const
export type AreaRequestCategory = (typeof AREA_REQUEST_CATEGORIES)[number]

export const AREA_REQUEST_STATUSES = [
  'pendiente', 'aprobada', 'rechazada', 'en_proceso', 'completada', 'cancelada',
] as const
export type AreaRequestStatus = (typeof AREA_REQUEST_STATUSES)[number]

export const AREA_REQUEST_PRIORITIES = ['baja', 'media', 'alta', 'urgente'] as const
export type AreaRequestPriority = (typeof AREA_REQUEST_PRIORITIES)[number]

export interface Request {
  requestId: string          // PK
  code?: string              // "SOL-2026-0042"
  title: string
  description: string
  category: AreaRequestCategory
  priority: AreaRequestPriority
  status: AreaRequestStatus
  createdBy: string          // profileId
  sectionId: string          // GSI: sectionId-createdAt-index (targetSectionId)
  relatedInventoryId?: string
  assignedTo?: string        // profileId
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  resolvedAt?: string
  resolutionNotes?: string
  attachments?: RequestAttachment[]  // denormalizado
  createdAt: string          // ISO 8601
  updatedAt: string
}

export interface RequestAttachment {
  attachmentId: string
  fileKey: string
  fileName: string
  fileSizeBytes?: number
  mimeType?: string
  uploadedBy?: string
  uploadedAt: string
}

export type NewRequest = Omit<Request, 'createdAt' | 'updatedAt'>
