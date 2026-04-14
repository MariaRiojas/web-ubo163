import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

export const CONTENT_TYPES = [
  'post',
  'reel',
  'video',
  'story',
  'carousel',
] as const

export const CONTENT_CATEGORIES = [
  'aniversario',
  'cumpleanos',
  'fecha_especial',
  'prevencion',
  'emergencias',
  'reclutamiento',
  'reconocimiento',
  'comunidad',
  'institucional',
] as const

export const CONTENT_STATUSES = [
  'planificado',
  'en_proceso',
  'publicado',
  'cancelado',
] as const

export const contentCalendar = pgTable('content_calendar', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  date: date('date').notNull(),
  type: text('type'),
  platform: text('platform').array(),        // ['facebook', 'instagram', 'tiktok']
  category: text('category'),
  status: text('status').default('planificado'),
  assignedTo: uuid('assigned_to').references(() => profiles.id),
  templateUrl: text('template_url'),         // Link a Canva u otro
  mediaUrls: text('media_urls').array(),
  caption: text('caption'),
  notes: text('notes'),
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: text('recurrence_rule'),   // Ej: 'YEARLY'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const contentCalendarRelations = relations(contentCalendar, ({ one }) => ({
  assignedToProfile: one(profiles, {
    fields: [contentCalendar.assignedTo],
    references: [profiles.id],
  }),
}))

export type ContentCalendarItem = typeof contentCalendar.$inferSelect
export type NewContentCalendarItem = typeof contentCalendar.$inferInsert
