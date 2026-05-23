/**
 * Tabla DynamoDB: {PREFIX}-incidents
 * PK: incidentId
 * GSI: sectionId-createdAt-index (sectionId → incidentId)
 * GSI: status-createdAt-index (status → incidentId)
 */

export const INCIDENT_PRIORITIES = ['baja', 'media', 'alta', 'urgente'] as const
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number]

export const INCIDENT_STATUSES = ['pendiente', 'en_proceso', 'resuelta', 'rechazada'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INCIDENT_CATEGORIES = [
  'equipamiento', 'infraestructura', 'personal', 'vehiculo', 'otro',
] as const
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number]

export interface Incident {
  incidentId: string          // PK
  code?: string               // Auto-generado "INC-2026-001"
  title: string
  description: string
  priority: IncidentPriority
  status: IncidentStatus      // GSI: status-createdAt-index
  category?: IncidentCategory
  sectionId?: string          // GSI: sectionId-createdAt-index
  reportedBy: string          // profileId
  assignedTo?: string         // profileId
  resolvedAt?: string         // ISO 8601
  resolutionNotes?: string
  createdAt: string           // ISO 8601 (usado como SK en GSIs)
  updatedAt: string
}

export type NewIncident = Omit<Incident, 'createdAt' | 'updatedAt'>
