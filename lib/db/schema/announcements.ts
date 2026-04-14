import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

export const ANNOUNCEMENT_PRIORITIES = ['normal', 'importante', 'urgente'] as const

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  priority: text('priority').default('normal'),
  authorId: uuid('author_id')
    .notNull()
    .references(() => profiles.id),
  /** null = dirigido a todos | array de section_ids = solo esas secciones */
  targetSections: uuid('target_sections').array(),
  /** null = todos los grados | array de grados específicos */
  targetGrades: text('target_grades').array(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isPinned: boolean('is_pinned').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(profiles, {
    fields: [announcements.authorId],
    references: [profiles.id],
  }),
}))

export type Announcement = typeof announcements.$inferSelect
export type NewAnnouncement = typeof announcements.$inferInsert
