/**
 * Anuncios internos de la compañía con flujo de aprobación.
 *
 * Flujo:
 *   1. Jefe de área (o la misma Jefatura) crea un borrador
 *   2. El Primer Jefe aprueba o rechaza
 *   3. Al aprobar, se publica con la audiencia definida por el autor
 *
 * Audiencias posibles (cualquier combinación):
 *   - Todos los bomberos activos
 *   - Grados específicos (array)
 *   - Aspirantes (checkbox independiente)
 *   - Postulantes (checkbox independiente)
 *   - Una persona específica (anuncio directo/personal)
 *
 * Diseño según `docs/ARQUITECTURA_MENU.md` §2.4.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'

export const ANNOUNCEMENT_STATUSES = [
  'borrador',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado',
  'archivado',
] as const
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

export const ANNOUNCEMENT_PRIORITIES = ['normal', 'importante', 'urgente'] as const
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number]

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  priority: text('priority').notNull().default('normal'),
  status: text('status').notNull().default('borrador'),

  /** Quién creó el anuncio */
  authorId: uuid('author_id')
    .notNull()
    .references(() => profiles.id),

  /** Sección desde la cual se emite (ej. Instrucción, Máquinas). null = Jefatura */
  originSectionId: uuid('origin_section_id').references(() => sections.id),

  // ═════════════════ AUDIENCIA ═════════════════
  /** Si es para todos los bomberos activos (seccionarios y superiores) */
  audienceAllBomberos: boolean('audience_all_bomberos').notNull().default(false),

  /** Grados específicos — array de valores de GRADES */
  audienceGrades: text('audience_grades').array(),

  /** Si también va a aspirantes */
  audienceAspirantes: boolean('audience_aspirantes').notNull().default(false),

  /** Si también va a postulantes */
  audiencePostulantes: boolean('audience_postulantes').notNull().default(false),

  /** Si es un anuncio dirigido a una sola persona */
  directToProfileId: uuid('direct_to_profile_id').references(() => profiles.id),

  // ═════════════════ APROBACIÓN ═════════════════
  /** Quién aprobó o rechazó */
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),

  // ═════════════════ VIGENCIA ═════════════════
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isPinned: boolean('is_pinned').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  author: one(profiles, {
    fields: [announcements.authorId],
    references: [profiles.id],
    relationName: 'announcementAuthor',
  }),
  originSection: one(sections, {
    fields: [announcements.originSectionId],
    references: [sections.id],
  }),
  reviewer: one(profiles, {
    fields: [announcements.reviewedBy],
    references: [profiles.id],
    relationName: 'announcementReviewer',
  }),
  directRecipient: one(profiles, {
    fields: [announcements.directToProfileId],
    references: [profiles.id],
    relationName: 'announcementDirectTo',
  }),
  reads: many(announcementReads),
}))

/**
 * Registro de quién leyó qué anuncio (para mostrar "No leído").
 */
export const announcementReads = pgTable('announcement_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at', { withTimezone: true }).defaultNow(),
})

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReads.announcementId],
    references: [announcements.id],
  }),
  profile: one(profiles, {
    fields: [announcementReads.profileId],
    references: [profiles.id],
  }),
}))

export type Announcement = typeof announcements.$inferSelect
export type NewAnnouncement = typeof announcements.$inferInsert
export type AnnouncementRead = typeof announcementReads.$inferSelect
export type NewAnnouncementRead = typeof announcementReads.$inferInsert
