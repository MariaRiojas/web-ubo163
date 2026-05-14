/**
 * Schema de solicitudes inter-áreas.
 *
 * Diferencia con `incidents`:
 *   - Incidencia = reporte de un problema existente (algo está mal)
 *   - Solicitud  = pedido proactivo (necesito algo / pido acción)
 *
 * Diseño según `docs/ARQUITECTURA_MENU.md` §3.4.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'
import { inventory } from './inventory'

export const AREA_REQUEST_CATEGORIES = [
  'repuesto',
  'reparacion',
  'reposicion_insumo',
  'mantenimiento',
  'capacitacion',
  'permiso',
  'otro',
] as const
export type AreaRequestCategory = (typeof AREA_REQUEST_CATEGORIES)[number]

export const AREA_REQUEST_STATUSES = [
  'pendiente',      // Recién creada, sin revisar
  'aprobada',       // Aprobada por el responsable del área destino
  'rechazada',      // Rechazada con motivo
  'en_proceso',     // Aprobada y en ejecución
  'completada',     // Resuelta satisfactoriamente
  'cancelada',      // Cancelada por el solicitante
] as const
export type AreaRequestStatus = (typeof AREA_REQUEST_STATUSES)[number]

export const AREA_REQUEST_PRIORITIES = ['baja', 'media', 'alta', 'urgente'] as const
export type AreaRequestPriority = (typeof AREA_REQUEST_PRIORITIES)[number]

/**
 * Solicitud de un efectivo a una sección específica.
 */
export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Correlativo legible ej: "SOL-2026-0042" */
  code: text('code').unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull().default('media'),
  status: text('status').notNull().default('pendiente'),

  /** Quién hace la solicitud */
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),

  /** Sección que recibe la solicitud */
  targetSectionId: uuid('target_section_id')
    .notNull()
    .references(() => sections.id),

  /** Referencia opcional a un ítem de inventario (ej: "este vendaje específico") */
  relatedInventoryId: uuid('related_inventory_id').references(() => inventory.id),

  /** Responsable asignado dentro del área destino */
  assignedTo: uuid('assigned_to').references(() => profiles.id),

  /** Momento de aprobación/rechazo */
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewNotes: text('review_notes'),

  /** Momento de resolución */
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const requestsRelations = relations(requests, ({ one, many }) => ({
  creator: one(profiles, {
    fields: [requests.createdBy],
    references: [profiles.id],
    relationName: 'requestCreator',
  }),
  targetSection: one(sections, {
    fields: [requests.targetSectionId],
    references: [sections.id],
  }),
  relatedInventory: one(inventory, {
    fields: [requests.relatedInventoryId],
    references: [inventory.id],
  }),
  assignee: one(profiles, {
    fields: [requests.assignedTo],
    references: [profiles.id],
    relationName: 'requestAssignee',
  }),
  reviewer: one(profiles, {
    fields: [requests.reviewedBy],
    references: [profiles.id],
    relationName: 'requestReviewer',
  }),
  attachments: many(requestAttachments),
}))

/**
 * Archivos adjuntos a una solicitud (fotos, PDFs, documentos).
 */
export const requestAttachments = pgTable('request_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  fileKey: text('file_key').notNull(),
  fileName: text('file_name').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
})

export const requestAttachmentsRelations = relations(requestAttachments, ({ one }) => ({
  request: one(requests, {
    fields: [requestAttachments.requestId],
    references: [requests.id],
  }),
  uploader: one(profiles, {
    fields: [requestAttachments.uploadedBy],
    references: [profiles.id],
  }),
}))

export type Request = typeof requests.$inferSelect
export type NewRequest = typeof requests.$inferInsert
export type RequestAttachment = typeof requestAttachments.$inferSelect
export type NewRequestAttachment = typeof requestAttachments.$inferInsert
