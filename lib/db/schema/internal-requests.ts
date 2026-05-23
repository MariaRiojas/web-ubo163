/**
 * Tabla DynamoDB: {PREFIX}-internal-requests
 * PK: requestId
 * GSI: toSectionId-createdAt-index
 */

export const REQUEST_TYPES = [
  'requerimiento', 'solicitud_retiro', 'reporte_averia',
  'solicitud_reporte', 'solicitud_compra', 'otro',
] as const
export type InternalRequestType = (typeof REQUEST_TYPES)[number]

export const REQUEST_STATUSES = [
  'pendiente', 'aprobada', 'en_proceso', 'completada', 'rechazada',
] as const
export type InternalRequestStatus = (typeof REQUEST_STATUSES)[number]

export const REQUEST_PRIORITIES = ['baja', 'media', 'alta', 'urgente'] as const
export type InternalRequestPriority = (typeof REQUEST_PRIORITIES)[number]

export interface InternalRequestItem {
  name: string
  quantity?: number
  code?: string
}

export interface InternalRequest {
  requestId: string          // PK
  code: string
  type: InternalRequestType
  title: string
  description?: string
  priority: InternalRequestPriority
  status: InternalRequestStatus
  fromSectionId?: string
  toSectionId: string        // GSI: toSectionId-createdAt-index
  requestedBy: string        // profileId
  approvedBy?: string
  assignedTo?: string
  items?: InternalRequestItem[]
  attachments?: string[]     // array de S3 keys
  responseNotes?: string
  createdAt: string          // ISO 8601
  updatedAt: string
  resolvedAt?: string
}

export type NewInternalRequest = Omit<InternalRequest, 'createdAt' | 'updatedAt'>
