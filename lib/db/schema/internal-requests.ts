import {
  pgTable, uuid, text, timestamp, jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'

export const REQUEST_TYPES = [
  'requerimiento', 'solicitud_retiro', 'reporte_averia',
  'solicitud_reporte', 'solicitud_compra', 'otro',
] as const

export const REQUEST_STATUSES = [
  'pendiente', 'aprobada', 'en_proceso', 'completada', 'rechazada',
] as const

export const REQUEST_PRIORITIES = [
  'baja', 'media', 'alta', 'urgente',
] as const

export const internalRequests = pgTable('internal_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  type: text('type').notNull().default('requerimiento'),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull().default('media'),
  status: text('status').notNull().default('pendiente'),
  fromSectionId: uuid('from_section_id').references(() => sections.id),
  toSectionId: uuid('to_section_id').references(() => sections.id),
  requestedBy: uuid('requested_by').notNull().references(() => profiles.id),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  assignedTo: uuid('assigned_to').references(() => profiles.id),
  items: jsonb('items').$type<{ name: string; quantity?: number; code?: string }[]>(),
  attachments: text('attachments').array().default([]),
  responseNotes: text('response_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})

export const internalRequestsRelations = relations(internalRequests, ({ one }) => ({
  fromSection: one(sections, { fields: [internalRequests.fromSectionId], references: [sections.id], relationName: 'fromSection' }),
  toSection: one(sections, { fields: [internalRequests.toSectionId], references: [sections.id], relationName: 'toSection' }),
  requester: one(profiles, { fields: [internalRequests.requestedBy], references: [profiles.id], relationName: 'requester' }),
  approver: one(profiles, { fields: [internalRequests.approvedBy], references: [profiles.id], relationName: 'approver' }),
  assignee: one(profiles, { fields: [internalRequests.assignedTo], references: [profiles.id], relationName: 'assignee' }),
}))

export type InternalRequest = typeof internalRequests.$inferSelect
export type NewInternalRequest = typeof internalRequests.$inferInsert
