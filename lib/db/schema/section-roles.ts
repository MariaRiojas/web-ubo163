import { pgTable, uuid, text, timestamp, boolean, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'

export const SECTION_ROLE_TYPES = [
  'primer_jefe',
  'segundo_jefe',
  'jefe_seccion',
  'adjunto',
  'miembro',
] as const
export type SectionRoleType = (typeof SECTION_ROLE_TYPES)[number]

export const sectionRoles = pgTable(
  'section_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),         // SectionRoleType
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
    assignedBy: uuid('assigned_by').references(() => profiles.id),
    isActive: boolean('is_active').default(true),
  },
  (table) => ({
    // Un perfil solo puede tener un rol activo por sección
    uniqueActiveRole: unique().on(table.profileId, table.sectionId, table.isActive),
  })
)

export const sectionRolesRelations = relations(sectionRoles, ({ one }) => ({
  profile: one(profiles, {
    fields: [sectionRoles.profileId],
    references: [profiles.id],
  }),
  section: one(sections, {
    fields: [sectionRoles.sectionId],
    references: [sections.id],
  }),
  assignedByProfile: one(profiles, {
    fields: [sectionRoles.assignedBy],
    references: [profiles.id],
  }),
}))

export type SectionRole = typeof sectionRoles.$inferSelect
export type NewSectionRole = typeof sectionRoles.$inferInsert
