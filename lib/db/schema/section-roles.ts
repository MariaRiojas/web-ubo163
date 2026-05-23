/**
 * Tabla DynamoDB: {PREFIX}-section-roles
 * PK: profileId (String)
 * SK: sectionId (String)
 * GSI: sectionId-index (sectionId → profileId)
 */

export const SECTION_ROLE_TYPES = [
  'primer_jefe',
  'segundo_jefe',
  'jefe_seccion',
  'adjunto',
  'miembro',
  'jefe_guardia_masculina',
  'jefe_guardia_femenina',
] as const
export type SectionRoleType = (typeof SECTION_ROLE_TYPES)[number]

export interface SectionRole {
  profileId: string       // PK
  sectionId: string       // SK + GSI
  role: SectionRoleType
  isActive: boolean
  assignedAt: string      // ISO 8601
  assignedBy?: string     // profileId de quien asignó
}

export type NewSectionRole = SectionRole
