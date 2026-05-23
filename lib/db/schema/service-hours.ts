/**
 * Tabla DynamoDB: {PREFIX}-service-hours
 * PK: profileId, SK: sk (formato "YYYY-MM-DDTHH:mm:ss.sssZ#{hourId}")
 */

export const HOUR_TYPES = [
  'guardia_nocturna',
  'emergencia',
  'instruccion',
  'administrativo',
  'mantenimiento',
  'evento_institucional',
  'comision',
] as const
export type HourType = (typeof HOUR_TYPES)[number]

export interface ServiceHour {
  profileId: string    // PK
  sk: string           // SK — "{date}T00:00:00Z#{hourId}"
  hourId: string       // ID único del registro
  date: string         // YYYY-MM-DD
  hours: string        // decimal como string
  type: HourType
  description?: string
  verifiedBy?: string  // profileId
  verifiedAt?: string  // ISO 8601
  autoRegistered?: boolean
  createdAt: string    // ISO 8601
}

export type NewServiceHour = Omit<ServiceHour, 'createdAt'>
