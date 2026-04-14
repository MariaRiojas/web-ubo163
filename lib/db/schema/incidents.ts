import {
  pgTable,
  uuid,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'

export const INCIDENT_PRIORITIES = ['baja', 'media', 'alta', 'urgente'] as const
export const INCIDENT_STATUSES = [
  'pendiente',
  'en_proceso',
  'resuelta',
  'rechazada',
] as const
export const INCIDENT_CATEGORIES = [
  'equipamiento',
  'infraestructura',
  'personal',
  'vehiculo',
  'otro',
] as const

export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Auto-generado: "INC-2026-001" */
  code: text('code').unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('media'),
  status: text('status').notNull().default('pendiente'),
  category: text('category'),
  sectionId: uuid('section_id').references(() => sections.id),
  reportedBy: uuid('reported_by')
    .notNull()
    .references(() => profiles.id),
  assignedTo: uuid('assigned_to').references(() => profiles.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const incidentsRelations = relations(incidents, ({ one }) => ({
  section: one(sections, {
    fields: [incidents.sectionId],
    references: [sections.id],
  }),
  reportedByProfile: one(profiles, {
    fields: [incidents.reportedBy],
    references: [profiles.id],
    relationName: 'reportedBy',
  }),
  assignedToProfile: one(profiles, {
    fields: [incidents.assignedTo],
    references: [profiles.id],
    relationName: 'assignedTo',
  }),
}))

export type Incident = typeof incidents.$inferSelect
export type NewIncident = typeof incidents.$inferInsert
