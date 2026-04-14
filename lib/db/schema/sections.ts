import { pgTable, uuid, text, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sectionRoles } from './section-roles'
import { incidents } from './incidents'
import { inventory } from './inventory'

// Claves de sección según Art. 112 RIF CGBVP
export const SECTION_KEYS = [
  'jefatura',            // Art. 113-115 — Primer y Segundo Jefe
  'maquinas',            // Art. 116a — Sección de Línea
  'servicios_generales', // Art. 116b — Sección de Línea
  'instruccion',         // Art. 116c — Sección de Línea
  'prehospitalaria',     // Art. 116d — Sección de Línea
  'administracion',      // Art. 117a — Sección de Asesoramiento
  'imagen',              // Art. 117b — Sección de Asesoramiento
] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_TYPES = ['jefatura', 'linea', 'asesoramiento'] as const
export type SectionType = (typeof SECTION_TYPES)[number]

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').unique().notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),           // 'jefatura' | 'linea' | 'asesoramiento'
  description: text('description'),
  normativeRef: text('normative_ref'),    // Ej: "Art. 116a RIF CGBVP"
  icon: text('icon'),                     // Nombre del ícono Lucide
  displayOrder: integer('display_order').default(0),
})

export const sectionsRelations = relations(sections, ({ many }) => ({
  sectionRoles: many(sectionRoles),
  incidents: many(incidents),
  inventory: many(inventory),
}))

export type Section = typeof sections.$inferSelect
export type NewSection = typeof sections.$inferInsert
