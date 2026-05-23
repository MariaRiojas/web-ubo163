/**
 * Tabla DynamoDB: {PREFIX}-sections
 * PK: sectionId (String, UUID)
 * GSI: key-index (key → sectionId)
 */

export const SECTION_KEYS = [
  'jefatura',
  'maquinas',
  'servicios_generales',
  'instruccion',
  'prehospitalaria',
  'administracion',
  'imagen',
] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_TYPES = ['jefatura', 'linea', 'asesoramiento'] as const
export type SectionType = (typeof SECTION_TYPES)[number]

export interface Section {
  sectionId: string        // PK
  key: SectionKey          // GSI: key-index
  name: string
  type: SectionType
  description?: string
  normativeRef?: string    // Ej: "Art. 116a RIF CGBVP"
  icon?: string            // Nombre del ícono Lucide
  displayOrder?: number
}

export type NewSection = Section
