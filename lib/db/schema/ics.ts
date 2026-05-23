/**
 * Sistema de Comando de Incidentes (SCI) — tipos TypeScript.
 * Tabla DynamoDB: {PREFIX}-ics  PK: icsId
 *
 * NOTA: el SCI no se construye en esta fase — solo los tipos base.
 */

export const ICS_SECTIONS = [
  'comando', 'operaciones', 'planificacion', 'logistica', 'administracion',
] as const
export type IcsSection = (typeof ICS_SECTIONS)[number]

export const ICS_POSITIONS = [
  'comandante_incidente', 'oficial_seguridad', 'oficial_enlace', 'oficial_informacion_publica',
  'jefe_operaciones', 'jefe_rama', 'jefe_division', 'jefe_grupo', 'lider_equipo',
  'jefe_planificacion', 'lider_situacion', 'lider_recursos', 'lider_documentacion',
  'jefe_logistica', 'lider_comunicaciones', 'lider_suministros', 'lider_medico_rehab',
  'jefe_administracion', 'lider_tiempo', 'lider_compras',
] as const
export type IcsPositionRole = (typeof ICS_POSITIONS)[number]

export const ICS_STATUSES = ['activo', 'transferido', 'cerrado'] as const
export type IcsStatus = (typeof ICS_STATUSES)[number]

export const ICS_RESOURCE_TYPES = [
  'vehiculo', 'personal', 'insumo', 'equipo', 'logistica_apoyo',
] as const
export type IcsResourceType = (typeof ICS_RESOURCE_TYPES)[number]

export const ICS_RESOURCE_STATUSES = [
  'solicitado', 'en_camino', 'en_sitio', 'operando', 'liberado',
] as const
export type IcsResourceStatus = (typeof ICS_RESOURCE_STATUSES)[number]

export interface IcsPosition {
  positionId: string
  section: IcsSection
  position: IcsPositionRole
  profileId?: string
  externalName?: string
  assignedAt: string
  releasedAt?: string
  notes?: string
}

export interface IcsResource {
  resourceId: string
  resourceType: IcsResourceType
  description: string
  status: IcsResourceStatus
  requestedBy?: string
  requestedAt: string
  assignedPositionId?: string
  arrivedAt?: string
  releasedAt?: string
  notes?: string
}

export interface IcsTimelineEvent {
  eventId: string
  eventType: string
  description: string
  eventAt: string      // ISO 8601
  registeredBy?: string
  metadata?: string    // JSON serializado
  createdAt: string
}

export interface IncidentCommandSystem {
  icsId: string        // PK
  emergencyId?: string
  code?: string
  name: string
  address?: string
  status: IcsStatus
  complexityLevel?: number
  openedAt: string
  openedBy?: string
  closedAt?: string
  closedBy?: string
  closingSummary?: string
  positions?: IcsPosition[]    // denormalizado
  resources?: IcsResource[]    // denormalizado
  timeline?: IcsTimelineEvent[]
  createdAt: string
  updatedAt: string
}

export type NewIncidentCommandSystem = Omit<IncidentCommandSystem, 'createdAt' | 'updatedAt'>
export type IcsPosition_ = IcsPosition
export type IcsResource_ = IcsResource
export type IcsTimelineEvent_ = IcsTimelineEvent
